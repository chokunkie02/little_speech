-- Schools apply themselves; a platform admin approves in the inbox (plan D3).
-- The applicant signs up first, so approval needs no email typing or hand-delivered password:
-- the school is created with the applicant as its owner.

BEGIN;

CREATE TABLE public.school_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_name text NOT NULL CHECK (char_length(school_name) BETWEEN 1 AND 120),
  province text CHECK (province IS NULL OR char_length(province) BETWEEN 1 AND 60),
  contact_name text NOT NULL CHECK (char_length(contact_name) BETWEEN 1 AND 120),
  position text NOT NULL CHECK (char_length(position) BETWEEN 1 AND 80),
  phone text NOT NULL CHECK (phone ~ '^[0-9+() -]{9,20}$'),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX school_applications_one_pending ON public.school_applications (requester_id) WHERE status = 'pending';
ALTER TABLE public.school_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.school_applications FROM anon, authenticated;

CREATE FUNCTION public.submit_school_application(
  p_school_name text, p_province text, p_contact_name text, p_position text, p_phone text, p_note text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  me uuid := auth.uid();
  application_id uuid;
  admin_id uuid;
  name text := btrim(coalesce(p_school_name, ''));
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'กรุณาเข้าสู่ระบบก่อนลงทะเบียนโรงเรียน' USING ERRCODE = '42501'; END IF;
  IF NOT can_take_role(me, 'school_admin') THEN
    RAISE EXCEPTION 'บัญชีนี้มีข้อมูลบทบาทอื่นอยู่แล้ว กรุณาใช้บัญชีแยกสำหรับผู้ดูแลโรงเรียน' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM school_applications WHERE requester_id = me AND status = 'pending') THEN
    RAISE EXCEPTION 'บัญชีนี้มีคำขอที่รอพิจารณาอยู่แล้ว ดูสถานะได้ในกล่องข้อความ';
  END IF;
  INSERT INTO school_applications (requester_id, school_name, province, contact_name, position, phone, note)
  VALUES (me, name, nullif(btrim(p_province), ''), btrim(p_contact_name), btrim(p_position),
    regexp_replace(btrim(p_phone), '\s+', ' ', 'g'), nullif(btrim(coalesce(p_note, '')), ''))
  RETURNING id INTO application_id;
  FOR admin_id IN SELECT id FROM auth.users WHERE raw_app_meta_data -> 'platform_admin' = 'true'::jsonb LOOP
    PERFORM notify_user(admin_id, 'join_request', 'มีโรงเรียนขอใช้งาน', name || ' · ' || btrim(p_contact_name), '/inbox');
  END LOOP;
  RETURN application_id;
EXCEPTION WHEN check_violation THEN
  RAISE EXCEPTION 'กรุณาตรวจข้อมูล: ชื่อโรงเรียน ชื่อผู้ติดต่อ ตำแหน่ง และเบอร์โทร (ตัวเลข 9 หลักขึ้นไป)';
END;
$$;

CREATE FUNCTION public.review_school_application(p_application_id uuid, p_approve boolean, p_school_name text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  app school_applications%ROWTYPE;
  school_id uuid;
  final_name text;
BEGIN
  IF NOT is_platform_admin() THEN RAISE EXCEPTION 'บัญชีนี้ไม่มีสิทธิ์พิจารณาคำขอโรงเรียน' USING ERRCODE = '42501'; END IF;
  SELECT * INTO app FROM school_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบคำขอนี้'; END IF;
  IF app.status <> 'pending' THEN RAISE EXCEPTION 'คำขอนี้ได้รับการพิจารณาแล้ว'; END IF;
  final_name := coalesce(nullif(btrim(p_school_name), ''), app.school_name);

  IF p_approve THEN
    IF NOT can_take_role(app.requester_id, 'school_admin') THEN
      RAISE EXCEPTION 'บัญชีผู้ขอมีข้อมูลบทบาทอื่นแล้ว อนุมัติเป็นผู้ดูแลโรงเรียนไม่ได้';
    END IF;
    PERFORM set_account_role(app.requester_id, 'school_admin');
    INSERT INTO organizations (name, type, created_by) VALUES (final_name, 'school', app.requester_id) RETURNING id INTO school_id;
    INSERT INTO organization_members (organization_id, user_id, role, status) VALUES (school_id, app.requester_id, 'owner', 'active');
  END IF;

  UPDATE school_applications SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    organization_id = school_id, school_name = final_name, reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = app.id;
  PERFORM notify_user(app.requester_id, CASE WHEN p_approve THEN 'request_approved' ELSE 'request_rejected' END,
    CASE WHEN p_approve THEN 'โรงเรียนของคุณพร้อมใช้งานแล้ว' ELSE 'คำขอใช้งานโรงเรียนไม่ได้รับการอนุมัติ' END,
    final_name, CASE WHEN p_approve THEN '/school' ELSE '/inbox' END);
  RETURN school_id;
END;
$$;

CREATE FUNCTION public.cancel_school_application(p_application_id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  UPDATE school_applications SET status = 'cancelled', reviewed_at = now()
  WHERE id = p_application_id AND requester_id = auth.uid() AND status = 'pending';
$$;

-- Inbox now also carries school applications (kind "school").
CREATE OR REPLACE FUNCTION public.list_my_inbox() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
        'child_name', NULL, 'province', a.province, 'phone', a.phone, 'note', a.note, 'created_at', a.created_at)
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
$$;

REVOKE EXECUTE ON FUNCTION public.submit_school_application(text, text, text, text, text, text),
  public.review_school_application(uuid, boolean, text), public.cancel_school_application(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_school_application(text, text, text, text, text, text),
  public.review_school_application(uuid, boolean, text), public.cancel_school_application(uuid) TO authenticated;

COMMIT;
