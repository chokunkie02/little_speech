-- End-of-year promotion (plan D4.8): move every room to the next grade in the new academic year,
-- graduate the top grade, optionally keep homeroom teachers, and allow undoing the latest promotion.
-- Every change is recorded so undo restores exactly what was there.

BEGIN;

CREATE TABLE public.school_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_year text NOT NULL,
  to_year text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  undone_at timestamptz,
  -- {students:[{child_id, from_classroom, from_number, to_classroom|null, graduated}], created_classrooms:[id],
  --  archived_classrooms:[id], copied_teachers:[{classroom_id, teacher_user_id}]}
  details jsonb NOT NULL
);
ALTER TABLE public.school_promotions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.school_promotions FROM anon, authenticated;

-- p_plan: [{classroom_id, action: "promote"|"graduate"|"skip", target_name?, target_grade?}]
CREATE FUNCTION public.promote_school_year(p_organization_id uuid, p_plan jsonb, p_keep_teachers boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  from_year text;
  to_year text;
  step jsonb;
  room classrooms%ROWTYPE;
  target uuid;
  target_name text;
  students jsonb := '[]'::jsonb;
  created jsonb := '[]'::jsonb;
  archived jsonb := '[]'::jsonb;
  copied jsonb := '[]'::jsonb;
  promoted integer := 0;
  graduated integer := 0;
  promotion_id uuid;
  kid record;
  teacher record;
BEGIN
  PERFORM require_school_admin(p_organization_id);
  PERFORM pg_advisory_xact_lock(hashtextextended('promotion:' || p_organization_id::text, 0));
  SELECT academic_year INTO from_year FROM organizations WHERE id = p_organization_id FOR UPDATE;
  IF from_year IS NULL THEN RAISE EXCEPTION 'ตั้งปีการศึกษาปัจจุบันก่อนเลื่อนชั้น'; END IF;
  to_year := (from_year::int + 1)::text;
  IF jsonb_typeof(p_plan) <> 'array' OR jsonb_array_length(p_plan) = 0 THEN RAISE EXCEPTION 'ยังไม่ได้เลือกห้อง'; END IF;

  FOR step IN SELECT * FROM jsonb_array_elements(p_plan) LOOP
    SELECT * INTO room FROM classrooms WHERE id = (step ->> 'classroom_id')::uuid AND organization_id = p_organization_id FOR UPDATE;
    IF NOT FOUND OR room.archived_at IS NOT NULL OR room.academic_year IS DISTINCT FROM from_year THEN
      RAISE EXCEPTION 'ห้อง % ไม่ได้อยู่ในปีการศึกษา % หรือถูกเก็บแล้ว', coalesce(room.name, '?'), from_year;
    END IF;
    CONTINUE WHEN step ->> 'action' = 'skip';

    IF step ->> 'action' = 'promote' THEN
      target_name := btrim(coalesce(step ->> 'target_name', ''));
      IF char_length(target_name) NOT BETWEEN 1 AND 40 THEN RAISE EXCEPTION 'กรุณาตั้งชื่อห้องปลายทางของ %', room.name; END IF;
      SELECT id INTO target FROM classrooms WHERE organization_id = p_organization_id AND archived_at IS NULL
        AND academic_year = to_year AND lower(name) = lower(target_name);
      IF target IS NULL THEN
        INSERT INTO classrooms (organization_id, name, grade_level, academic_year)
        VALUES (p_organization_id, target_name, nullif(btrim(coalesce(step ->> 'target_grade', '')), ''), to_year)
        RETURNING id INTO target;
        created := created || to_jsonb(target);
      END IF;
      FOR kid IN SELECT cs.child_id, cs.student_number FROM classroom_students cs JOIN child_profiles cp ON cp.id = cs.child_id
          WHERE cs.classroom_id = room.id AND cp.archived_at IS NULL AND cp.enrollment_status = 'active' LOOP
        DELETE FROM classroom_students WHERE classroom_id = room.id AND child_id = kid.child_id;
        INSERT INTO classroom_students (classroom_id, child_id, student_number)
        VALUES (target, kid.child_id, CASE WHEN EXISTS (SELECT 1 FROM classroom_students WHERE classroom_id = target AND student_number = kid.student_number)
          THEN NULL ELSE kid.student_number END);
        students := students || jsonb_build_object('child_id', kid.child_id, 'from_classroom', room.id,
          'from_number', kid.student_number, 'to_classroom', target, 'graduated', false);
        promoted := promoted + 1;
      END LOOP;
      IF p_keep_teachers THEN
        FOR teacher IN SELECT teacher_user_id, is_primary FROM classroom_teachers WHERE classroom_id = room.id LOOP
          INSERT INTO classroom_teachers (classroom_id, teacher_user_id, is_primary)
          VALUES (target, teacher.teacher_user_id, teacher.is_primary AND NOT EXISTS (SELECT 1 FROM classroom_teachers WHERE classroom_id = target AND is_primary))
          ON CONFLICT DO NOTHING;
          IF FOUND THEN copied := copied || jsonb_build_object('classroom_id', target, 'teacher_user_id', teacher.teacher_user_id); END IF;
        END LOOP;
      END IF;
    ELSIF step ->> 'action' = 'graduate' THEN
      FOR kid IN SELECT cs.child_id, cs.student_number FROM classroom_students cs JOIN child_profiles cp ON cp.id = cs.child_id
          WHERE cs.classroom_id = room.id AND cp.archived_at IS NULL AND cp.enrollment_status = 'active' LOOP
        DELETE FROM classroom_students WHERE classroom_id = room.id AND child_id = kid.child_id;
        UPDATE child_profiles SET enrollment_status = 'graduated' WHERE id = kid.child_id;
        students := students || jsonb_build_object('child_id', kid.child_id, 'from_classroom', room.id,
          'from_number', kid.student_number, 'to_classroom', NULL, 'graduated', true);
        graduated := graduated + 1;
      END LOOP;
    ELSE
      RAISE EXCEPTION 'ไม่รู้จักการเลื่อนชั้นแบบ %', step ->> 'action';
    END IF;

    UPDATE classrooms SET archived_at = now() WHERE id = room.id;
    archived := archived || to_jsonb(room.id);
  END LOOP;

  UPDATE organizations SET academic_year = to_year WHERE id = p_organization_id;
  INSERT INTO school_promotions (organization_id, from_year, to_year, created_by, details)
  VALUES (p_organization_id, from_year, to_year, auth.uid(), jsonb_build_object(
    'students', students, 'created_classrooms', created, 'archived_classrooms', archived, 'copied_teachers', copied))
  RETURNING id INTO promotion_id;
  RETURN jsonb_build_object('promotion_id', promotion_id, 'from_year', from_year, 'to_year', to_year,
    'promoted', promoted, 'graduated', graduated, 'created_classrooms', jsonb_array_length(created));
END;
$$;

-- The latest promotion that can still be undone (within 14 days), for the settings page.
CREATE FUNCTION public.latest_school_promotion(p_organization_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM require_school_admin(p_organization_id);
  RETURN (SELECT jsonb_build_object('id', p.id, 'from_year', p.from_year, 'to_year', p.to_year, 'created_at', p.created_at,
      'students', jsonb_array_length(p.details -> 'students'),
      'graduated', (SELECT count(*) FROM jsonb_array_elements(p.details -> 'students') s WHERE (s ->> 'graduated')::boolean))
    FROM school_promotions p
    WHERE p.organization_id = p_organization_id AND p.undone_at IS NULL AND p.created_at > now() - interval '14 days'
    ORDER BY p.created_at DESC LIMIT 1);
END;
$$;

-- Restores the rooms, students, numbers, teachers and academic year of the latest promotion.
-- Refuses when the new rooms already have students that were added after the promotion.
CREATE FUNCTION public.undo_school_promotion(p_promotion_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  promo school_promotions%ROWTYPE;
  item jsonb;
  extra integer;
  restored integer := 0;
BEGIN
  SELECT * INTO promo FROM school_promotions WHERE id = p_promotion_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบการเลื่อนชั้นนี้'; END IF;
  PERFORM require_school_admin(promo.organization_id);
  IF promo.undone_at IS NOT NULL THEN RAISE EXCEPTION 'การเลื่อนชั้นนี้ถูกย้อนกลับไปแล้ว'; END IF;
  IF EXISTS (SELECT 1 FROM school_promotions WHERE organization_id = promo.organization_id AND undone_at IS NULL AND created_at > promo.created_at) THEN
    RAISE EXCEPTION 'ย้อนกลับได้เฉพาะการเลื่อนชั้นครั้งล่าสุด';
  END IF;

  SELECT count(*) INTO extra FROM classroom_students cs
  WHERE cs.classroom_id IN (SELECT (value #>> '{}')::uuid FROM jsonb_array_elements(promo.details -> 'created_classrooms'))
    AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(promo.details -> 'students') s WHERE (s ->> 'child_id')::uuid = cs.child_id);
  IF extra > 0 THEN
    RAISE EXCEPTION 'ห้องของปีใหม่มีนักเรียนที่เพิ่มหลังเลื่อนชั้น % คน ย้ายนักเรียนเหล่านั้นออกก่อนจึงจะย้อนกลับได้', extra;
  END IF;

  UPDATE classrooms SET archived_at = NULL
  WHERE id IN (SELECT (value #>> '{}')::uuid FROM jsonb_array_elements(promo.details -> 'archived_classrooms'));

  FOR item IN SELECT * FROM jsonb_array_elements(promo.details -> 'students') LOOP
    DELETE FROM classroom_students WHERE child_id = (item ->> 'child_id')::uuid AND school_enrollment;
    IF (item ->> 'graduated')::boolean THEN
      UPDATE child_profiles SET enrollment_status = 'active' WHERE id = (item ->> 'child_id')::uuid;
    END IF;
    INSERT INTO classroom_students (classroom_id, child_id, student_number)
    VALUES ((item ->> 'from_classroom')::uuid, (item ->> 'child_id')::uuid,
      CASE WHEN EXISTS (SELECT 1 FROM classroom_students WHERE classroom_id = (item ->> 'from_classroom')::uuid
        AND student_number = (item ->> 'from_number')::integer) THEN NULL ELSE (item ->> 'from_number')::integer END);
    restored := restored + 1;
  END LOOP;

  DELETE FROM classroom_teachers ct USING jsonb_array_elements(promo.details -> 'copied_teachers') c
  WHERE ct.classroom_id = (c.value ->> 'classroom_id')::uuid AND ct.teacher_user_id = (c.value ->> 'teacher_user_id')::uuid;
  DELETE FROM classrooms c
  WHERE c.id IN (SELECT (value #>> '{}')::uuid FROM jsonb_array_elements(promo.details -> 'created_classrooms'))
    AND NOT EXISTS (SELECT 1 FROM classroom_students WHERE classroom_id = c.id);

  UPDATE organizations SET academic_year = promo.from_year WHERE id = promo.organization_id;
  UPDATE school_promotions SET undone_at = now() WHERE id = promo.id;
  RETURN restored;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.promote_school_year(uuid, jsonb, boolean), public.latest_school_promotion(uuid),
  public.undo_school_promotion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_school_year(uuid, jsonb, boolean), public.latest_school_promotion(uuid),
  public.undo_school_promotion(uuid) TO authenticated;

COMMIT;
