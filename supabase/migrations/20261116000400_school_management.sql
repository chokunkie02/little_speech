-- School management for school admins (plan D4): academic year, bulk classrooms, student roster
-- with numbers and status, moving students, teachers per classroom with a primary teacher.
-- Everything goes through SECURITY DEFINER functions that check is_org_admin / classroom teacher.

BEGIN;

ALTER TABLE public.organizations ADD COLUMN academic_year text CHECK (academic_year IS NULL OR academic_year ~ '^25[0-9]{2}$');
ALTER TABLE public.classrooms ADD COLUMN archived_at timestamptz;
ALTER TABLE public.classroom_students ADD COLUMN student_number smallint CHECK (student_number BETWEEN 1 AND 999);
CREATE UNIQUE INDEX classroom_students_number ON public.classroom_students (classroom_id, student_number) WHERE student_number IS NOT NULL;
ALTER TABLE public.child_profiles ADD COLUMN birth_date date CHECK (birth_date IS NULL OR birth_date BETWEEN date '2000-01-01' AND current_date);
ALTER TABLE public.child_profiles ADD COLUMN enrollment_status text NOT NULL DEFAULT 'active'
  CHECK (enrollment_status IN ('active', 'moved_out', 'graduated'));
ALTER TABLE public.classroom_teachers ADD COLUMN is_primary boolean NOT NULL DEFAULT false;

-- The first teacher of a room is its primary teacher, however they were added (inbox approval, admin, import).
CREATE FUNCTION public.default_primary_teacher() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM classroom_teachers WHERE classroom_id = NEW.classroom_id AND is_primary) THEN
    NEW.is_primary := true;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER default_primary_teacher BEFORE INSERT ON public.classroom_teachers
  FOR EACH ROW EXECUTE FUNCTION public.default_primary_teacher();
UPDATE public.classroom_teachers ct SET is_primary = true
WHERE (ct.classroom_id, ct.teacher_user_id) IN (
  SELECT DISTINCT ON (classroom_id) classroom_id, teacher_user_id FROM public.classroom_teachers ORDER BY classroom_id, created_at);

-- ── helpers ─────────────────────────────────────────────────────────────────

CREATE FUNCTION public.classroom_org(p_classroom_id uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT organization_id FROM classrooms WHERE id = p_classroom_id;
$$;

-- Thai grade → typical age, used when no birth date is given.
CREATE FUNCTION public.age_for_grade(p_grade text) RETURNS smallint
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_grade ~ '^อ\.?\s*[1-3]$' THEN 3 + substring(p_grade FROM '[1-3]$')::int
    WHEN p_grade ~ '^ป\.?\s*[1-6]$' THEN 6 + substring(p_grade FROM '[1-6]$')::int
    WHEN p_grade ~ '^ม\.?\s*[1-6]$' THEN 12 + substring(p_grade FROM '[1-6]$')::int
    ELSE 7 END::smallint;
$$;

CREATE FUNCTION public.age_from_birth_date(p_birth date) RETURNS smallint
LANGUAGE sql STABLE AS $$
  SELECT greatest(1, least(18, extract(year FROM age(current_date, p_birth))::int))::smallint;
$$;

CREATE FUNCTION public.require_school_admin(p_org uuid) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_org IS NULL OR NOT is_school_organization(p_org) OR NOT is_org_admin(p_org) THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์จัดการโรงเรียนนี้' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- ── school overview (one call per page load) ────────────────────────────────

CREATE FUNCTION public.get_school_overview(p_organization_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE result jsonb;
BEGIN
  PERFORM require_school_admin(p_organization_id);
  WITH rooms AS (
    SELECT c.* FROM classrooms c WHERE c.organization_id = p_organization_id
  ), students AS (
    SELECT cp.id, cs.classroom_id,
      EXISTS (SELECT 1 FROM child_access ca WHERE ca.child_id = cp.id AND ca.role = 'guardian' AND ca.revoked_at IS NULL) AS linked,
      EXISTS (SELECT 1 FROM practice_sessions ps WHERE ps.child_id = cp.id AND ps.started_at > now() - interval '7 days') AS practiced
    FROM child_profiles cp LEFT JOIN classroom_students cs ON cs.child_id = cp.id AND cs.school_enrollment
    WHERE cp.organization_id = p_organization_id AND cp.archived_at IS NULL AND cp.enrollment_status = 'active'
  ), teachers AS (
    SELECT m.user_id, account_display_name(m.user_id) AS name, u.email
    FROM organization_members m JOIN auth.users u ON u.id = m.user_id
    WHERE m.organization_id = p_organization_id AND m.status = 'active' AND m.role = 'teacher'
  )
  SELECT jsonb_build_object(
    'school', (SELECT jsonb_build_object('id', o.id, 'name', o.name, 'academic_year', o.academic_year)
      FROM organizations o WHERE o.id = p_organization_id),
    'totals', jsonb_build_object(
      'classrooms', (SELECT count(*) FROM rooms WHERE archived_at IS NULL),
      'teachers', (SELECT count(*) FROM teachers),
      'students', (SELECT count(*) FROM students),
      'unassigned_students', (SELECT count(*) FROM students WHERE classroom_id IS NULL),
      'linked_students', (SELECT count(*) FROM students WHERE linked),
      'practiced_7d', (SELECT count(*) FROM students WHERE practiced),
      'pending_teachers', (SELECT count(*) FROM join_requests r WHERE r.organization_id = p_organization_id
        AND r.kind = 'teacher' AND r.status = 'pending')),
    'classrooms', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'name', r.name, 'grade_level', r.grade_level, 'academic_year', r.academic_year,
        'archived_at', r.archived_at,
        'student_count', (SELECT count(*) FROM students s WHERE s.classroom_id = r.id),
        'linked_count', (SELECT count(*) FROM students s WHERE s.classroom_id = r.id AND s.linked),
        'practiced_7d', (SELECT count(*) FROM students s WHERE s.classroom_id = r.id AND s.practiced),
        'teachers', coalesce((SELECT jsonb_agg(jsonb_build_object('user_id', ct.teacher_user_id,
            'name', account_display_name(ct.teacher_user_id), 'is_primary', ct.is_primary)
            ORDER BY ct.is_primary DESC, ct.created_at)
          FROM classroom_teachers ct WHERE ct.classroom_id = r.id), '[]'::jsonb))
      ORDER BY r.name) FROM rooms r), '[]'::jsonb),
    'teachers', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'user_id', t.user_id, 'name', t.name, 'email', t.email,
        'classrooms', coalesce((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'is_primary', ct.is_primary) ORDER BY c.name)
          FROM classroom_teachers ct JOIN rooms c ON c.id = ct.classroom_id
          WHERE ct.teacher_user_id = t.user_id AND c.archived_at IS NULL), '[]'::jsonb))
      ORDER BY t.name) FROM teachers t), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;

CREATE FUNCTION public.set_school_academic_year(p_organization_id uuid, p_year text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM require_school_admin(p_organization_id);
  IF p_year !~ '^25[0-9]{2}$' THEN RAISE EXCEPTION 'กรุณาระบุปีการศึกษาเป็น พ.ศ. เช่น 2569'; END IF;
  UPDATE organizations SET academic_year = p_year WHERE id = p_organization_id;
END;
$$;

-- ── classrooms ──────────────────────────────────────────────────────────────

-- Creates several rooms at once (e.g. ป.1/1–ป.1/3); names that already exist this year are skipped.
CREATE FUNCTION public.create_classrooms(p_organization_id uuid, p_grade text, p_names text[]) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  year text;
  room_name text;
  created jsonb := '[]'::jsonb;
  skipped jsonb := '[]'::jsonb;
  new_id uuid;
BEGIN
  PERFORM require_school_admin(p_organization_id);
  SELECT academic_year INTO year FROM organizations WHERE id = p_organization_id;
  IF year IS NULL THEN RAISE EXCEPTION 'กรุณาตั้งปีการศึกษาปัจจุบันก่อนสร้างห้องเรียน'; END IF;
  IF coalesce(array_length(p_names, 1), 0) NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'สร้างได้ครั้งละ 1–30 ห้อง'; END IF;
  FOREACH room_name IN ARRAY p_names LOOP
    room_name := btrim(room_name);
    IF char_length(room_name) NOT BETWEEN 1 AND 40 THEN
      skipped := skipped || jsonb_build_object('name', room_name, 'reason', 'ชื่อห้องต้องยาว 1–40 ตัวอักษร');
    ELSIF EXISTS (SELECT 1 FROM classrooms WHERE organization_id = p_organization_id AND archived_at IS NULL
        AND academic_year IS NOT DISTINCT FROM year AND lower(name) = lower(room_name)) THEN
      skipped := skipped || jsonb_build_object('name', room_name, 'reason', 'มีห้องชื่อนี้ในปีการศึกษานี้แล้ว');
    ELSE
      INSERT INTO classrooms (organization_id, name, grade_level, academic_year)
      VALUES (p_organization_id, room_name, nullif(btrim(p_grade), ''), year) RETURNING id INTO new_id;
      created := created || jsonb_build_object('id', new_id, 'name', room_name);
    END IF;
  END LOOP;
  RETURN jsonb_build_object('created', created, 'skipped', skipped);
END;
$$;

CREATE FUNCTION public.update_classroom(p_classroom_id uuid, p_name text, p_grade text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE room classrooms%ROWTYPE;
BEGIN
  SELECT * INTO room FROM classrooms WHERE id = p_classroom_id FOR UPDATE;
  PERFORM require_school_admin(room.organization_id);
  IF char_length(btrim(coalesce(p_name, ''))) NOT BETWEEN 1 AND 40 THEN RAISE EXCEPTION 'ชื่อห้องต้องยาว 1–40 ตัวอักษร'; END IF;
  IF EXISTS (SELECT 1 FROM classrooms WHERE organization_id = room.organization_id AND id <> room.id AND archived_at IS NULL
      AND academic_year IS NOT DISTINCT FROM room.academic_year AND lower(name) = lower(btrim(p_name))) THEN
    RAISE EXCEPTION 'มีห้องชื่อ % ในปีการศึกษานี้แล้ว', btrim(p_name);
  END IF;
  UPDATE classrooms SET name = btrim(p_name), grade_level = nullif(btrim(p_grade), '') WHERE id = room.id;
END;
$$;

CREATE FUNCTION public.set_classroom_archived(p_classroom_id uuid, p_archived boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM require_school_admin(classroom_org(p_classroom_id));
  UPDATE classrooms SET archived_at = CASE WHEN p_archived THEN coalesce(archived_at, now()) END WHERE id = p_classroom_id;
END;
$$;

-- Deleting is only for empty rooms (e.g. created by mistake). Rooms with students are archived instead.
CREATE FUNCTION public.delete_classroom(p_classroom_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE students integer;
BEGIN
  PERFORM require_school_admin(classroom_org(p_classroom_id));
  SELECT count(*) INTO students FROM classroom_students WHERE classroom_id = p_classroom_id;
  IF students > 0 THEN
    RAISE EXCEPTION 'ห้องนี้มีนักเรียน % คน ย้ายนักเรียนออกก่อน หรือเลือกเก็บห้องเข้าคลังแทน', students;
  END IF;
  DELETE FROM classrooms WHERE id = p_classroom_id;
END;
$$;

-- ── students ────────────────────────────────────────────────────────────────

CREATE FUNCTION public.can_manage_classroom_roster(p_classroom_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT is_org_admin(classroom_org(p_classroom_id)) OR is_classroom_teacher(p_classroom_id);
$$;

CREATE FUNCTION public.list_classroom_students(p_classroom_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT can_manage_classroom_roster(p_classroom_id) THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์ดูรายชื่อห้องนี้' USING ERRCODE = '42501';
  END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
      'child_id', cp.id, 'name', cp.name, 'nickname', cp.nickname, 'student_code', cp.student_code,
      'student_number', cs.student_number, 'birth_date', cp.birth_date, 'age', cp.age,
      'guardians', (SELECT count(*) FROM child_access ca WHERE ca.child_id = cp.id AND ca.role = 'guardian' AND ca.revoked_at IS NULL),
      'last_practice_at', (SELECT max(ps.started_at) FROM practice_sessions ps WHERE ps.child_id = cp.id))
    ORDER BY cs.student_number NULLS LAST, cp.name COLLATE "th-TH-x-icu")
    FROM classroom_students cs JOIN child_profiles cp ON cp.id = cs.child_id
    WHERE cs.classroom_id = p_classroom_id AND cp.archived_at IS NULL AND cp.enrollment_status = 'active'), '[]'::jsonb);
END;
$$;

-- Adds many students in one go (typed, pasted from Excel or imported from CSV). Bad rows are skipped
-- with a reason instead of failing the whole batch.
CREATE FUNCTION public.add_classroom_students(p_classroom_id uuid, p_rows jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  room classrooms%ROWTYPE;
  owner_id uuid;
  item jsonb;
  row_no integer := 0;
  student_name text;
  code text;
  birth date;
  number integer;
  next_number integer;
  new_id uuid;
  added integer := 0;
  skipped jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO room FROM classrooms WHERE id = p_classroom_id FOR UPDATE;
  IF NOT FOUND OR NOT can_manage_classroom_roster(p_classroom_id) OR room.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์เพิ่มนักเรียนในห้องนี้' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 300 THEN
    RAISE EXCEPTION 'เพิ่มได้ครั้งละ 1–300 คน';
  END IF;
  SELECT created_by INTO owner_id FROM organizations WHERE id = room.organization_id;
  SELECT coalesce(max(student_number), 0) INTO next_number FROM classroom_students WHERE classroom_id = room.id;

  FOR item IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    row_no := row_no + 1;
    student_name := btrim(regexp_replace(coalesce(item ->> 'name', ''), '\s+', ' ', 'g'));
    code := nullif(btrim(coalesce(item ->> 'student_code', '')), '');
    birth := NULL;
    number := NULL;
    BEGIN
      birth := nullif(item ->> 'birth_date', '')::date;
      number := nullif(item ->> 'student_number', '')::integer;
    EXCEPTION WHEN others THEN
      skipped := skipped || jsonb_build_object('row', row_no, 'name', student_name, 'reason', 'วันเกิดหรือเลขที่ไม่ถูกต้อง');
      CONTINUE;
    END;
    IF char_length(student_name) NOT BETWEEN 1 AND 120 THEN
      skipped := skipped || jsonb_build_object('row', row_no, 'name', student_name, 'reason', 'ไม่มีชื่อ-นามสกุล');
      CONTINUE;
    END IF;
    IF birth IS NOT NULL AND (birth < date '2000-01-01' OR birth > current_date) THEN
      skipped := skipped || jsonb_build_object('row', row_no, 'name', student_name, 'reason', 'วันเกิดไม่อยู่ในช่วงที่เป็นไปได้');
      CONTINUE;
    END IF;
    IF EXISTS (SELECT 1 FROM classroom_students cs JOIN child_profiles cp ON cp.id = cs.child_id
        WHERE cs.classroom_id = room.id AND cp.archived_at IS NULL AND lower(cp.name) = lower(student_name)) THEN
      skipped := skipped || jsonb_build_object('row', row_no, 'name', student_name, 'reason', 'มีชื่อนี้ในห้องแล้ว');
      CONTINUE;
    END IF;
    IF code IS NOT NULL AND EXISTS (SELECT 1 FROM child_profiles WHERE organization_id = room.organization_id AND student_code = code) THEN
      skipped := skipped || jsonb_build_object('row', row_no, 'name', student_name, 'reason', 'รหัสนักเรียน ' || code || ' มีอยู่แล้วในโรงเรียน');
      CONTINUE;
    END IF;
    IF number IS NOT NULL AND (number NOT BETWEEN 1 AND 999
        OR EXISTS (SELECT 1 FROM classroom_students WHERE classroom_id = room.id AND student_number = number)) THEN
      number := NULL;  -- taken or invalid: fall back to the next free number
    END IF;
    IF number IS NULL THEN
      next_number := next_number + 1;
      number := next_number;
    ELSE
      next_number := greatest(next_number, number);
    END IF;

    INSERT INTO child_profiles (user_id, name, nickname, student_code, age, birth_date, organization_id, grade_level,
      target_sound, selected_sound_id, training_goal, avatar_emoji)
    VALUES (owner_id, student_name, nullif(btrim(coalesce(item ->> 'nickname', '')), ''), code,
      CASE WHEN birth IS NULL THEN age_for_grade(room.grade_level) ELSE age_from_birth_date(birth) END,
      birth, room.organization_id, room.grade_level, 'ก', 'ก', '', '🧒')
    RETURNING id INTO new_id;
    INSERT INTO classroom_students (classroom_id, child_id, student_number) VALUES (room.id, new_id, number);
    added := added + 1;
  END LOOP;
  RETURN jsonb_build_object('added', added, 'skipped', skipped);
END;
$$;

CREATE FUNCTION public.update_student(p_child_id uuid, p_name text, p_nickname text, p_student_code text, p_birth_date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE kid child_profiles%ROWTYPE; room uuid;
BEGIN
  SELECT * INTO kid FROM child_profiles WHERE id = p_child_id FOR UPDATE;
  room := child_classroom(p_child_id);
  IF NOT FOUND OR kid.organization_id IS NULL
    OR NOT (is_org_admin(kid.organization_id) OR (room IS NOT NULL AND is_classroom_teacher(room))) THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์แก้ข้อมูลนักเรียนคนนี้' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(coalesce(p_name, ''))) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'กรุณากรอกชื่อ-นามสกุล'; END IF;
  UPDATE child_profiles SET name = btrim(p_name), nickname = nullif(btrim(coalesce(p_nickname, '')), ''),
    student_code = nullif(btrim(coalesce(p_student_code, '')), ''), birth_date = p_birth_date,
    age = CASE WHEN p_birth_date IS NULL THEN age ELSE age_from_birth_date(p_birth_date) END
  WHERE id = kid.id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'รหัสนักเรียนนี้มีอยู่แล้วในโรงเรียน';
END;
$$;

CREATE FUNCTION public.set_student_number(p_classroom_id uuid, p_child_id uuid, p_number integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE holder text;
BEGIN
  IF NOT can_manage_classroom_roster(p_classroom_id) THEN RAISE EXCEPTION 'คุณไม่มีสิทธิ์แก้เลขที่ในห้องนี้' USING ERRCODE = '42501'; END IF;
  IF p_number IS NOT NULL AND p_number NOT BETWEEN 1 AND 999 THEN RAISE EXCEPTION 'เลขที่ต้องอยู่ระหว่าง 1–999'; END IF;
  SELECT cp.name INTO holder FROM classroom_students cs JOIN child_profiles cp ON cp.id = cs.child_id
    WHERE cs.classroom_id = p_classroom_id AND cs.student_number = p_number AND cs.child_id <> p_child_id;
  IF holder IS NOT NULL THEN RAISE EXCEPTION 'เลขที่ % เป็นของ % อยู่แล้ว', p_number, holder; END IF;
  UPDATE classroom_students SET student_number = p_number WHERE classroom_id = p_classroom_id AND child_id = p_child_id;
END;
$$;

-- Numbers everyone 1..n by Thai name order (overwrites existing numbers).
CREATE FUNCTION public.renumber_classroom(p_classroom_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT can_manage_classroom_roster(p_classroom_id) THEN RAISE EXCEPTION 'คุณไม่มีสิทธิ์แก้เลขที่ในห้องนี้' USING ERRCODE = '42501'; END IF;
  UPDATE classroom_students SET student_number = NULL WHERE classroom_id = p_classroom_id;
  UPDATE classroom_students cs SET student_number = ranked.n
  FROM (SELECT cs2.child_id, row_number() OVER (ORDER BY cp.name COLLATE "th-TH-x-icu") AS n
        FROM classroom_students cs2 JOIN child_profiles cp ON cp.id = cs2.child_id
        WHERE cs2.classroom_id = p_classroom_id AND cp.archived_at IS NULL AND cp.enrollment_status = 'active') ranked
  WHERE cs.classroom_id = p_classroom_id AND cs.child_id = ranked.child_id;
END;
$$;

-- Moves students to another room in one transaction (all or nothing).
CREATE FUNCTION public.move_students(p_child_ids uuid[], p_target_classroom_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  org uuid := classroom_org(p_target_classroom_id);
  next_number integer;
  kid uuid;
  moved integer := 0;
BEGIN
  PERFORM require_school_admin(org);
  IF EXISTS (SELECT 1 FROM classrooms WHERE id = p_target_classroom_id AND archived_at IS NOT NULL) THEN
    RAISE EXCEPTION 'ห้องปลายทางถูกเก็บเข้าคลังแล้ว';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_child_ids) AS u(child_id) LEFT JOIN child_profiles cp ON cp.id = u.child_id
      WHERE cp.id IS NULL OR cp.organization_id IS DISTINCT FROM org) THEN
    RAISE EXCEPTION 'มีนักเรียนที่ไม่ได้อยู่ในโรงเรียนนี้';
  END IF;
  SELECT coalesce(max(student_number), 0) INTO next_number FROM classroom_students WHERE classroom_id = p_target_classroom_id;
  FOREACH kid IN ARRAY p_child_ids LOOP
    CONTINUE WHEN EXISTS (SELECT 1 FROM classroom_students WHERE child_id = kid AND classroom_id = p_target_classroom_id);
    DELETE FROM classroom_students WHERE child_id = kid AND school_enrollment;
    next_number := next_number + 1;
    INSERT INTO classroom_students (classroom_id, child_id, student_number) VALUES (p_target_classroom_id, kid, next_number);
    moved := moved + 1;
  END LOOP;
  RETURN moved;
END;
$$;

-- Moved out / graduated: leaves the classroom and school lists. Parents keep their access to past results.
CREATE FUNCTION public.set_students_status(p_child_ids uuid[], p_status text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE org uuid; changed integer;
BEGIN
  IF p_status NOT IN ('active', 'moved_out', 'graduated') THEN RAISE EXCEPTION 'สถานะไม่ถูกต้อง'; END IF;
  SELECT min(organization_id::text)::uuid INTO org FROM child_profiles WHERE id = ANY (p_child_ids);
  PERFORM require_school_admin(org);
  IF EXISTS (SELECT 1 FROM child_profiles WHERE id = ANY (p_child_ids) AND organization_id IS DISTINCT FROM org) THEN
    RAISE EXCEPTION 'มีนักเรียนที่ไม่ได้อยู่ในโรงเรียนนี้';
  END IF;
  UPDATE child_profiles SET enrollment_status = p_status WHERE id = ANY (p_child_ids);
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF p_status <> 'active' THEN DELETE FROM classroom_students WHERE child_id = ANY (p_child_ids) AND school_enrollment; END IF;
  RETURN changed;
END;
$$;

-- ── teachers ────────────────────────────────────────────────────────────────

-- Teachers now join with a school code (no email invitation), so assignment checks membership instead.
CREATE OR REPLACE FUNCTION public.assign_school_teacher(p_classroom_id uuid, p_teacher_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  org uuid := classroom_org(p_classroom_id);
  assignment classroom_teachers%ROWTYPE;
BEGIN
  PERFORM require_school_admin(org);
  IF NOT EXISTS (SELECT 1 FROM organization_members WHERE organization_id = org AND user_id = p_teacher_user_id
      AND status = 'active' AND role = 'teacher') THEN
    RAISE EXCEPTION 'บัญชีนี้ยังไม่ได้เป็นครูของโรงเรียน ให้ครูใช้รหัสเข้าร่วมของโรงเรียนก่อน';
  END IF;
  INSERT INTO classroom_teachers (classroom_id, teacher_user_id, is_primary)
  VALUES (p_classroom_id, p_teacher_user_id, NOT EXISTS (SELECT 1 FROM classroom_teachers WHERE classroom_id = p_classroom_id))
  ON CONFLICT DO NOTHING;
  SELECT * INTO assignment FROM classroom_teachers WHERE classroom_id = p_classroom_id AND teacher_user_id = p_teacher_user_id;
  RETURN to_jsonb(assignment);
END;
$$;

CREATE FUNCTION public.unassign_school_teacher(p_classroom_id uuid, p_teacher_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE was_primary boolean;
BEGIN
  PERFORM require_school_admin(classroom_org(p_classroom_id));
  DELETE FROM classroom_teachers WHERE classroom_id = p_classroom_id AND teacher_user_id = p_teacher_user_id
  RETURNING is_primary INTO was_primary;
  -- The next teacher becomes primary.
  IF was_primary THEN
    UPDATE classroom_teachers SET is_primary = true WHERE classroom_id = p_classroom_id AND teacher_user_id = (
      SELECT teacher_user_id FROM classroom_teachers WHERE classroom_id = p_classroom_id ORDER BY created_at LIMIT 1);
  END IF;
END;
$$;

CREATE FUNCTION public.set_primary_teacher(p_classroom_id uuid, p_teacher_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM require_school_admin(classroom_org(p_classroom_id));
  IF NOT EXISTS (SELECT 1 FROM classroom_teachers WHERE classroom_id = p_classroom_id AND teacher_user_id = p_teacher_user_id) THEN
    RAISE EXCEPTION 'ครูคนนี้ยังไม่ได้อยู่ในห้องนี้';
  END IF;
  UPDATE classroom_teachers SET is_primary = (teacher_user_id = p_teacher_user_id) WHERE classroom_id = p_classroom_id;
END;
$$;

CREATE FUNCTION public.remove_school_teacher(p_organization_id uuid, p_teacher_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE room uuid;
BEGIN
  PERFORM require_school_admin(p_organization_id);
  FOR room IN SELECT ct.classroom_id FROM classroom_teachers ct JOIN classrooms c ON c.id = ct.classroom_id
      WHERE c.organization_id = p_organization_id AND ct.teacher_user_id = p_teacher_user_id LOOP
    PERFORM unassign_school_teacher(room, p_teacher_user_id);
  END LOOP;
  UPDATE organization_members SET status = 'removed'
  WHERE organization_id = p_organization_id AND user_id = p_teacher_user_id AND role = 'teacher';
END;
$$;

-- ── grants ──────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.classroom_org(uuid), public.require_school_admin(uuid),
  public.can_manage_classroom_roster(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION
  public.get_school_overview(uuid), public.set_school_academic_year(uuid, text),
  public.create_classrooms(uuid, text, text[]), public.update_classroom(uuid, text, text),
  public.set_classroom_archived(uuid, boolean), public.delete_classroom(uuid),
  public.list_classroom_students(uuid), public.add_classroom_students(uuid, jsonb),
  public.update_student(uuid, text, text, text, date), public.set_student_number(uuid, uuid, integer),
  public.renumber_classroom(uuid), public.move_students(uuid[], uuid), public.set_students_status(uuid[], text),
  public.unassign_school_teacher(uuid, uuid), public.set_primary_teacher(uuid, uuid), public.remove_school_teacher(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.get_school_overview(uuid), public.set_school_academic_year(uuid, text),
  public.create_classrooms(uuid, text, text[]), public.update_classroom(uuid, text, text),
  public.set_classroom_archived(uuid, boolean), public.delete_classroom(uuid),
  public.list_classroom_students(uuid), public.add_classroom_students(uuid, jsonb),
  public.update_student(uuid, text, text, text, date), public.set_student_number(uuid, uuid, integer),
  public.renumber_classroom(uuid), public.move_students(uuid[], uuid), public.set_students_status(uuid[], text),
  public.unassign_school_teacher(uuid, uuid), public.set_primary_teacher(uuid, uuid), public.remove_school_teacher(uuid, uuid)
  TO authenticated;

COMMIT;
