CREATE TABLE public.school_teacher_invitations (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (organization_id, email)
);

ALTER TABLE public.school_teacher_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.school_teacher_invitations FROM anon, authenticated;

CREATE FUNCTION public.create_school_teacher_invitation(p_organization_id uuid, p_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  address text := lower(btrim(p_email));
  invitation_token uuid;
BEGIN
  IF NOT is_org_admin(p_organization_id)
    OR NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id AND type = 'school') THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์เชิญครูให้โรงเรียนนี้' USING ERRCODE = '42501';
  END IF;
  IF address IS NULL OR char_length(address) > 254 OR address !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
    RAISE EXCEPTION 'กรุณากรอกอีเมลครูให้ถูกต้อง' USING ERRCODE = '22023';
  END IF;

  INSERT INTO school_teacher_invitations AS i (organization_id, email)
  VALUES (p_organization_id, address)
  ON CONFLICT (organization_id, email) DO UPDATE
    SET token = CASE WHEN i.expires_at <= now() THEN gen_random_uuid() ELSE i.token END,
        expires_at = CASE WHEN i.expires_at <= now() THEN now() + interval '7 days' ELSE i.expires_at END
    WHERE i.accepted_by IS NULL
  RETURNING i.token INTO invitation_token;

  IF invitation_token IS NULL THEN
    RAISE EXCEPTION 'อีเมลนี้ตอบรับคำเชิญแล้ว' USING ERRCODE = '22023';
  END IF;
  RETURN invitation_token;
END;
$$;

CREATE FUNCTION public.list_school_teacher_invitations(p_organization_id uuid)
RETURNS TABLE (email text, token uuid, status text, teacher_user_id uuid, assigned boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT i.email, CASE WHEN i.accepted_by IS NULL AND i.expires_at > now() THEN i.token END,
    CASE WHEN i.accepted_by IS NOT NULL THEN 'accepted'
         WHEN i.expires_at <= now() THEN 'expired' ELSE 'pending' END,
    CASE WHEN m.status = 'active' THEN i.accepted_by END,
    EXISTS (SELECT 1 FROM classroom_teachers ct WHERE ct.teacher_user_id = i.accepted_by)
  FROM school_teacher_invitations i
  LEFT JOIN organization_members m ON m.organization_id = i.organization_id
    AND m.user_id = i.accepted_by AND m.role = 'teacher'
  WHERE i.organization_id = p_organization_id AND is_org_admin(p_organization_id)
  ORDER BY i.email;
$$;

CREATE FUNCTION public.get_school_teacher_invitation(p_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object('school_name', o.name, 'status',
    CASE WHEN i.accepted_by IS NOT NULL THEN 'accepted'
         WHEN i.expires_at <= now() THEN 'expired' ELSE 'pending' END)
  FROM school_teacher_invitations i
  JOIN organizations o ON o.id = i.organization_id
  WHERE i.token = p_token;
$$;

CREATE FUNCTION public.accept_school_teacher_invitation(p_token uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  invitation school_teacher_invitations%ROWTYPE;
BEGIN
  SELECT * INTO invitation FROM school_teacher_invitations WHERE token = p_token FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() AND lower(u.email) = invitation.email
      AND u.email_confirmed_at IS NOT NULL AND u.raw_user_meta_data ->> 'role' = 'teacher'
  ) THEN
    RAISE EXCEPTION 'กรุณาใช้บัญชีครูที่ยืนยันอีเมลตรงกับคำเชิญ' USING ERRCODE = '42501';
  END IF;
  IF invitation.accepted_by = auth.uid() THEN RETURN; END IF;
  IF invitation.accepted_by IS NOT NULL OR invitation.expires_at <= now() THEN
    RAISE EXCEPTION 'คำเชิญนี้ถูกใช้แล้วหรือหมดอายุ' USING ERRCODE = '22023';
  END IF;

  INSERT INTO organization_members AS m (organization_id, user_id, role, status)
  VALUES (invitation.organization_id, auth.uid(), 'teacher', 'active')
  ON CONFLICT (organization_id, user_id) DO UPDATE SET status = 'active'
  WHERE m.role = 'teacher' AND m.status <> 'removed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'บัญชีนี้มีสถานะสมาชิกโรงเรียนที่ไม่สามารถใช้คำเชิญนี้ได้' USING ERRCODE = '42501';
  END IF;

  UPDATE school_teacher_invitations SET accepted_by = auth.uid() WHERE token = p_token;
END;
$$;

-- Classroom assignment requires acceptance by the teacher. Existing
-- assignments are kept, including rows created before invitations existed.
DROP POLICY "classroom_teachers: admin insert" ON public.classroom_teachers;

-- Joining the school must not grant access to other classrooms' rosters.
ALTER POLICY "classroom_students: teacher or member select" ON public.classroom_students
USING (
  is_classroom_teacher(classroom_id) OR EXISTS (
    SELECT 1 FROM classrooms c JOIN organizations o ON o.id = c.organization_id
    WHERE c.id = classroom_students.classroom_id
      AND (is_org_admin(o.id) OR (o.type <> 'school' AND is_org_member(o.id)))
  )
);

CREATE FUNCTION public.assign_school_teacher(p_classroom_id uuid, p_teacher_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  school_id uuid;
  assignment classroom_teachers%ROWTYPE;
BEGIN
  IF p_teacher_user_id IS NULL THEN
    RAISE EXCEPTION 'กรุณาเลือกครู' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('school-teacher:' || p_teacher_user_id::text, 0));
  SELECT organization_id INTO school_id FROM classrooms WHERE id = p_classroom_id FOR UPDATE;
  IF NOT FOUND OR NOT is_org_admin(school_id) THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์จัดครูในห้องนี้' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO assignment FROM classroom_teachers
  WHERE classroom_id = p_classroom_id AND teacher_user_id = p_teacher_user_id;
  IF FOUND THEN RETURN to_jsonb(assignment); END IF;

  IF EXISTS (SELECT 1 FROM organizations WHERE id = school_id AND type = 'school') AND NOT EXISTS (
    SELECT 1 FROM school_teacher_invitations i
    JOIN organization_members m ON m.organization_id = i.organization_id AND m.user_id = i.accepted_by
    WHERE i.organization_id = school_id AND i.accepted_by = p_teacher_user_id
      AND m.role = 'teacher' AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'ครูต้องตอบรับคำเชิญของโรงเรียนก่อน' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM classroom_teachers WHERE classroom_id = p_classroom_id) THEN
    RAISE EXCEPTION 'ห้องนี้มีครูประจำแล้ว' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM classroom_teachers WHERE teacher_user_id = p_teacher_user_id) THEN
    RAISE EXCEPTION 'ครูคนนี้มีห้องประจำแล้ว' USING ERRCODE = '23505';
  END IF;

  INSERT INTO classroom_teachers (classroom_id, teacher_user_id)
  VALUES (p_classroom_id, p_teacher_user_id) RETURNING * INTO assignment;
  RETURN to_jsonb(assignment);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_school_teacher_invitation(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_school_teacher_invitations(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_school_teacher_invitation(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_school_teacher_invitation(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assign_school_teacher(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_school_teacher_invitation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_school_teacher_invitations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_school_teacher_invitation(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_school_teacher_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_school_teacher(uuid, uuid) TO authenticated;
