-- School applications ask for the OBEC school code and affiliation (plan F7) so the platform team can
-- spot duplicates and verify the school; the code is optional but must be unique among live requests.

BEGIN;

ALTER TABLE public.school_applications
  ADD COLUMN school_code text CHECK (school_code IS NULL OR school_code ~ '^[0-9]{10}$'),
  ADD COLUMN affiliation text CHECK (affiliation IS NULL OR affiliation IN ('obec', 'private', 'local', 'other'));

DROP FUNCTION public.submit_school_application(text, text, text, text, text, text);

CREATE FUNCTION public.submit_school_application(p_school_name text, p_province text, p_contact_name text, p_position text,
  p_phone text, p_note text DEFAULT NULL, p_school_code text DEFAULT NULL, p_affiliation text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  me uuid := auth.uid();
  application_id uuid;
  admin_id uuid;
  name text := btrim(coalesce(p_school_name, ''));
  code text := nullif(regexp_replace(coalesce(p_school_code, ''), '[^0-9]', '', 'g'), '');
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'กรุณาเข้าสู่ระบบก่อนลงทะเบียนโรงเรียน' USING ERRCODE = '42501'; END IF;
  IF NOT can_take_role(me, 'school_admin') THEN
    RAISE EXCEPTION 'บัญชีนี้มีข้อมูลบทบาทอื่นอยู่แล้ว กรุณาใช้บัญชีแยกสำหรับผู้ดูแลโรงเรียน' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM school_applications WHERE requester_id = me AND status = 'pending') THEN
    RAISE EXCEPTION 'บัญชีนี้มีคำขอที่รอพิจารณาอยู่แล้ว ดูสถานะได้ในกล่องข้อความ';
  END IF;
  IF code IS NOT NULL AND code !~ '^[0-9]{10}$' THEN RAISE EXCEPTION 'รหัสโรงเรียนต้องเป็นตัวเลข 10 หลัก'; END IF;
  IF code IS NOT NULL AND EXISTS (SELECT 1 FROM school_applications WHERE school_code = code AND status IN ('pending', 'approved')) THEN
    RAISE EXCEPTION 'รหัสโรงเรียนนี้มีคำขอหรือเปิดใช้งานแล้ว ติดต่อผู้ดูแลระบบของโรงเรียนเพื่อขอรหัสเข้าร่วมแทน';
  END IF;
  INSERT INTO school_applications (requester_id, school_name, province, contact_name, position, phone, note, school_code, affiliation)
  VALUES (me, name, nullif(btrim(p_province), ''), btrim(p_contact_name), btrim(p_position),
    regexp_replace(btrim(p_phone), '\s+', ' ', 'g'), nullif(btrim(coalesce(p_note, '')), ''), code,
    nullif(btrim(coalesce(p_affiliation, '')), ''))
  RETURNING id INTO application_id;
  FOR admin_id IN SELECT id FROM auth.users WHERE raw_app_meta_data -> 'platform_admin' = 'true'::jsonb LOOP
    PERFORM notify_user(admin_id, 'join_request', 'มีโรงเรียนขอใช้งาน', name || ' · ' || btrim(p_contact_name), '/inbox');
  END LOOP;
  RETURN application_id;
EXCEPTION WHEN check_violation THEN
  RAISE EXCEPTION 'กรุณาตรวจข้อมูล: ชื่อโรงเรียน ชื่อผู้ติดต่อ ตำแหน่ง และเบอร์โทร (ตัวเลข 9 หลักขึ้นไป)';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_school_application(text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_school_application(text, text, text, text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_inbox()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT jsonb_build_object(
    'to_review', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'kind', r.kind, 'requester_name', r.requester_name, 'relationship', r.relationship,
        'requester_email', (SELECT email FROM auth.users WHERE id = r.requester_id),
        'school_name', o.name, 'organization_id', r.organization_id,
        'classroom_id', r.classroom_id, 'classroom_name', c.name,
        'child_name', cp.name, 'created_at', r.created_at) ORDER BY r.created_at)
      FROM join_requests r JOIN organizations o ON o.id = r.organization_id
      LEFT JOIN classrooms c ON c.id = r.classroom_id
      LEFT JOIN child_profiles cp ON cp.id = r.child_id
      WHERE r.status = 'pending' AND (
        (r.kind = 'classroom_guardian' AND (is_student_classroom_teacher(r.child_id) OR is_org_admin(r.organization_id)))
        OR (r.kind = 'teacher' AND is_org_admin(r.organization_id)))
    ), '[]'::jsonb) || coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id, 'kind', 'school', 'requester_name', a.contact_name, 'relationship', a.position,
        'requester_email', (SELECT email FROM auth.users WHERE id = a.requester_id),
        'school_name', a.school_name, 'organization_id', NULL, 'classroom_id', NULL, 'classroom_name', NULL,
        'child_name', NULL, 'province', a.province, 'phone', a.phone, 'note', a.note, 'school_code', a.school_code, 'affiliation', a.affiliation, 'created_at', a.created_at)
        ORDER BY a.created_at)
      FROM school_applications a WHERE a.status = 'pending' AND is_platform_admin()
    ), '[]'::jsonb),
    'my_requests', coalesce((
      SELECT jsonb_agg(item ORDER BY item ->> 'created_at' DESC) FROM (
        SELECT jsonb_build_object(
          'id', r.id, 'kind', r.kind, 'status', r.status, 'school_name', o.name, 'child_name', cp.name,
          'classroom_name', c.name, 'created_at', r.created_at, 'reviewed_at', r.reviewed_at) AS item
        FROM join_requests r JOIN organizations o ON o.id = r.organization_id
        LEFT JOIN classrooms c ON c.id = r.classroom_id
        LEFT JOIN child_profiles cp ON cp.id = r.child_id
        WHERE r.requester_id = auth.uid() AND (r.status = 'pending' OR r.reviewed_at > now() - interval '30 days')
        UNION ALL
        SELECT jsonb_build_object(
          'id', a.id, 'kind', 'school', 'status', a.status, 'school_name', a.school_name, 'child_name', NULL,
          'classroom_name', NULL, 'created_at', a.created_at, 'reviewed_at', a.reviewed_at)
        FROM school_applications a
        WHERE a.requester_id = auth.uid() AND (a.status = 'pending' OR a.reviewed_at > now() - interval '30 days')
      ) mine
    ), '[]'::jsonb),
    'notifications', coalesce((
      SELECT jsonb_agg(to_jsonb(n) - 'user_id' ORDER BY n.created_at DESC)
      FROM (SELECT * FROM notifications WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 50) n
    ), '[]'::jsonb),
    'unread', (SELECT count(*) FROM notifications WHERE user_id = auth.uid() AND read_at IS NULL)
  );
$function$;

COMMIT;
