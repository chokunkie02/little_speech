-- Subsequent school guardian requests reuse the invitation and access tables.
ALTER TABLE public.invitations ADD COLUMN is_additional_guardian boolean NOT NULL DEFAULT false;

-- Earlier school guardians may still carry custom permissions from legacy invites.
-- Use the same policy as newly approved school guardians.
UPDATE public.child_access ca
SET can_view_progress = true, can_view_audio = true, can_assign_practice = false,
    can_edit_child = false, can_export_report = true
FROM public.child_profiles cp
WHERE ca.child_id = cp.id AND ca.role = 'guardian' AND ca.revoked_at IS NULL
  AND cp.organization_id IS NOT NULL;

CREATE FUNCTION public.is_active_school_guardian(p_child_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM child_access ca
    JOIN child_profiles cp ON cp.id = ca.child_id
    WHERE ca.child_id = p_child_id AND ca.user_id = auth.uid()
      AND ca.role = 'guardian' AND ca.revoked_at IS NULL
      AND cp.organization_id IS NOT NULL AND cp.archived_at IS NULL
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_active_school_guardian(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_school_guardian(uuid) TO authenticated;

-- Direct clients can create the existing first-stage invites, but cannot set
-- the additional flag and bypass the authorized creation routine.
CREATE OR REPLACE FUNCTION public.protect_guardian_invitation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
DECLARE
  school_id uuid;
  child_owner uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT organization_id, user_id INTO school_id, child_owner
    FROM child_profiles WHERE id = NEW.child_id AND archived_at IS NULL;
    NEW.requires_teacher_approval := NEW.role = 'parent' AND school_id IS NOT NULL;

    IF current_user IN ('authenticated', 'anon') THEN
      NEW.is_additional_guardian := false;
      IF NEW.child_id IS NOT NULL AND (
        CASE WHEN NEW.requires_teacher_approval
          THEN NOT (is_student_classroom_teacher(NEW.child_id) OR is_org_admin(school_id))
          ELSE child_owner IS DISTINCT FROM auth.uid()
        END
      ) THEN
        RAISE EXCEPTION 'คุณไม่มีสิทธิ์เชิญผู้ดูแลเด็กคนนี้';
      END IF;
      IF NEW.status <> 'pending' OR NEW.accepted_by IS NOT NULL OR NEW.accepted_at IS NOT NULL
        OR NEW.requested_by IS NOT NULL OR NEW.requested_at IS NOT NULL
        OR NEW.requester_name IS NOT NULL OR NEW.requester_relationship IS NOT NULL THEN
        RAISE EXCEPTION 'คำเชิญใหม่ต้องอยู่ในสถานะรอตอบรับ';
      END IF;
    END IF;
  ELSIF current_user IN ('authenticated', 'anon') AND (
    NEW.status <> 'revoked'
    OR OLD.status <> 'pending'
    OR (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM
       (to_jsonb(OLD) - 'status' - 'updated_at')
  ) THEN
    RAISE EXCEPTION 'เปลี่ยนสถานะคำเชิญได้ผ่านขั้นตอนที่กำหนดเท่านั้น';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.create_guardian_invite(p_child_id uuid, p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  invite_email text := lower(btrim(coalesce(p_email, '')));
  invitation invitations%ROWTYPE;
  additional boolean;
BEGIN
  PERFORM 1 FROM child_profiles WHERE id = p_child_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT (
    is_student_classroom_teacher(p_child_id) OR is_active_school_guardian(p_child_id)
  ) THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์เชิญผู้ปกครองของนักเรียนคนนี้';
  END IF;
  IF invite_email <> '' AND (char_length(invite_email) > 254 OR invite_email !~ '^[^[:space:]@]+@[^[:space:]@]+$') THEN
    RAISE EXCEPTION 'กรุณาตรวจอีเมลผู้ปกครอง';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM child_access WHERE child_id = p_child_id AND role = 'guardian' AND revoked_at IS NULL
  ) INTO additional;

  IF invite_email <> '' AND EXISTS (
    SELECT 1 FROM child_access ca JOIN auth.users u ON u.id = ca.user_id
    WHERE ca.child_id = p_child_id AND ca.role = 'guardian' AND ca.revoked_at IS NULL
      AND lower(u.email) = invite_email
  ) THEN
    RAISE EXCEPTION 'บัญชีนี้เชื่อมกับนักเรียนอยู่แล้ว';
  END IF;

  UPDATE invitations SET status = 'expired', updated_at = now()
  WHERE child_id = p_child_id AND role = 'parent' AND status = 'pending'
    AND requested_at IS NULL AND expires_at <= now();

  SELECT * INTO invitation FROM invitations
  WHERE child_id = p_child_id AND lower(email) = invite_email AND role = 'parent' AND status = 'pending';
  IF FOUND THEN
    IF invitation.requested_at IS NOT NULL THEN
      RAISE EXCEPTION 'มีคำขอของบัญชีนี้รอตรวจอยู่แล้ว';
    END IF;
    IF invitation.is_additional_guardian = additional THEN
      RETURN jsonb_build_object('id', invitation.id, 'email', invitation.email, 'token', invitation.token);
    END IF;
    -- An unused link from an earlier linking stage cannot serve this stage.
    UPDATE invitations SET status = 'revoked', updated_at = now() WHERE id = invitation.id;
  END IF;

  INSERT INTO invitations (
    child_id, email, invited_by, inviter_email, role, token, expires_at, is_additional_guardian
  ) VALUES (
    p_child_id, invite_email, auth.uid(), auth.jwt() ->> 'email', 'parent',
    gen_random_uuid()::text, now() + interval '7 days', additional
  ) RETURNING * INTO invitation;
  RETURN jsonb_build_object('id', invitation.id, 'email', invitation.email, 'token', invitation.token);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_guardian_invite(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_guardian_invite(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_first_guardian_request(
  p_token text, p_name text, p_relationship text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  invitation invitations%ROWTYPE;
  student_id uuid;
  account_email text := lower(auth.jwt() ->> 'email');
BEGIN
  IF auth.uid() IS NULL OR coalesce(account_email, '') = ''
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'parent') <> 'parent' THEN
    RAISE EXCEPTION 'กรุณาเข้าสู่ระบบด้วยบัญชีผู้ปกครอง';
  END IF;
  IF p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 1 AND 120
    OR p_relationship IS NULL OR char_length(btrim(p_relationship)) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'กรุณากรอกชื่อและความสัมพันธ์กับเด็ก';
  END IF;

  SELECT child_id INTO student_id FROM invitations
  WHERE token = p_token AND requires_teacher_approval;
  PERFORM 1 FROM child_profiles WHERE id = student_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'คำเชิญนี้ไม่พร้อมใช้งาน'; END IF;

  SELECT * INTO invitation FROM invitations WHERE token = p_token FOR UPDATE;
  IF invitation.status <> 'pending'
    OR (invitation.email <> '' AND lower(invitation.email) <> account_email)
    OR auth.uid() = invitation.invited_by
    OR is_child_owner(student_id) THEN
    RAISE EXCEPTION 'คำเชิญนี้ไม่พร้อมใช้งานสำหรับบัญชีนี้';
  END IF;
  IF invitation.requested_by = auth.uid() THEN RETURN; END IF;
  IF invitation.requested_by IS NOT NULL OR invitation.expires_at <= now() THEN
    RAISE EXCEPTION 'คำเชิญนี้ถูกใช้แล้วหรือหมดอายุ';
  END IF;
  IF is_active_school_guardian(student_id) THEN
    RAISE EXCEPTION 'บัญชีนี้เชื่อมกับนักเรียนอยู่แล้ว';
  END IF;
  IF NOT invitation.is_additional_guardian AND EXISTS (
    SELECT 1 FROM child_access WHERE child_id = student_id AND role = 'guardian' AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'นักเรียนคนนี้มีผู้ปกครองที่เชื่อมแล้ว กรุณาขอลิงก์เชิญผู้ปกครองร่วม';
  END IF;

  UPDATE invitations SET email = account_email, requested_by = auth.uid(),
    requester_name = btrim(p_name), requester_relationship = btrim(p_relationship),
    requested_at = now(), updated_at = now()
  WHERE id = invitation.id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'มีคำเชิญสำหรับบัญชีนี้แล้ว กรุณาใช้ลิงก์ที่ระบุอีเมลของคุณ';
END;
$$;

CREATE OR REPLACE FUNCTION public.review_first_guardian_request(p_invitation_id uuid, p_approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  invitation invitations%ROWTYPE;
  student_id uuid;
BEGIN
  SELECT child_id INTO student_id FROM invitations
  WHERE id = p_invitation_id AND requires_teacher_approval;
  PERFORM 1 FROM child_profiles WHERE id = student_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบนักเรียนที่ใช้งานอยู่'; END IF;

  SELECT * INTO invitation FROM invitations WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND OR invitation.requested_by IS NULL THEN
    RAISE EXCEPTION 'ไม่พบคำขอ';
  END IF;
  IF p_approve IS NULL OR NOT (
    is_student_classroom_teacher(student_id) OR
    (invitation.is_additional_guardian AND is_active_school_guardian(student_id)
      AND invitation.requested_by IS DISTINCT FROM auth.uid())
  ) THEN
    RAISE EXCEPTION 'เฉพาะครูประจำห้องหรือผู้ปกครองที่มีสิทธิ์ตรวจคำขอนี้ได้';
  END IF;
  IF (p_approve AND invitation.status = 'accepted')
    OR (NOT p_approve AND invitation.status = 'revoked' AND invitation.accepted_at IS NULL) THEN
    RETURN;
  END IF;
  IF invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'คำขอนี้ถูกดำเนินการแล้ว กรุณาดูผลล่าสุด';
  END IF;

  IF p_approve THEN
    IF NOT invitation.is_additional_guardian AND EXISTS (
      SELECT 1 FROM child_access WHERE child_id = student_id AND role = 'guardian' AND revoked_at IS NULL
    ) THEN
      RAISE EXCEPTION 'นักเรียนคนนี้มีผู้ปกครองที่เชื่อมแล้ว';
    END IF;

    IF EXISTS (
      SELECT 1 FROM child_access WHERE child_id = student_id AND user_id = invitation.requested_by
        AND role = 'guardian' AND revoked_at IS NULL
    ) THEN
      RAISE EXCEPTION 'บัญชีนี้เชื่อมกับนักเรียนอยู่แล้ว';
    END IF;

    INSERT INTO child_access (
      child_id, user_id, role, granted_by, can_view_progress, can_view_audio,
      can_assign_practice, can_edit_child, can_export_report
    ) VALUES (student_id, invitation.requested_by, 'guardian', auth.uid(), true, true, false, false, true)
    ON CONFLICT (child_id, user_id) DO UPDATE
      SET role = EXCLUDED.role, granted_by = EXCLUDED.granted_by, revoked_at = NULL,
          can_view_progress = true, can_view_audio = true, can_assign_practice = false,
          can_edit_child = false, can_export_report = true;

    UPDATE invitations SET status = 'accepted', accepted_by = requested_by,
      accepted_at = now(), updated_at = now() WHERE id = invitation.id;
  ELSE
    UPDATE invitations SET status = 'revoked', updated_at = now() WHERE id = invitation.id;
  END IF;
END;
$$;

CREATE FUNCTION public.list_guardian_review_requests(p_child_id uuid)
RETURNS TABLE (id uuid, requester_name text, requester_relationship text, email text, status invitation_status, accepted_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT i.id, i.requester_name, i.requester_relationship, i.email, i.status, i.accepted_at
  FROM invitations i
  WHERE i.child_id = p_child_id AND i.requires_teacher_approval AND i.is_additional_guardian
    AND i.requested_by IS NOT NULL AND i.requested_by <> auth.uid()
    AND is_active_school_guardian(p_child_id)
  ORDER BY i.requested_at DESC;
$$;

CREATE FUNCTION public.list_school_guardian_members(p_child_id uuid)
RETURNS TABLE (id uuid, name text, relationship text, email text, is_self boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT ca.id, i.requester_name, i.requester_relationship, u.email, ca.user_id = auth.uid()
  FROM child_access ca
  JOIN child_profiles cp ON cp.id = ca.child_id
  JOIN auth.users u ON u.id = ca.user_id
  LEFT JOIN LATERAL (
    SELECT requester_name, requester_relationship FROM invitations
    WHERE child_id = ca.child_id AND accepted_by = ca.user_id AND role = 'parent' AND status = 'accepted'
    ORDER BY accepted_at DESC NULLS LAST LIMIT 1
  ) i ON true
  WHERE ca.child_id = p_child_id AND ca.role = 'guardian' AND ca.revoked_at IS NULL
    AND cp.organization_id IS NOT NULL AND cp.archived_at IS NULL
    AND (is_student_classroom_teacher(cp.id) OR is_org_admin(cp.organization_id)
      OR is_active_school_guardian(cp.id))
  ORDER BY ca.created_at, ca.id;
$$;

CREATE OR REPLACE FUNCTION public.revoke_child_access(p_access_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  student child_profiles%ROWTYPE;
  access_grant child_access%ROWTYPE;
BEGIN
  SELECT cp.* INTO student FROM child_profiles cp
  JOIN child_access ca ON ca.child_id = cp.id
  WHERE ca.id = p_access_id FOR UPDATE OF cp;
  IF NOT FOUND OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ไม่พบสิทธิ์ที่ยกเลิกได้';
  END IF;
  SELECT * INTO access_grant FROM child_access WHERE id = p_access_id AND child_id = student.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบสิทธิ์ที่ยกเลิกได้'; END IF;

  IF access_grant.role = 'guardian' AND student.organization_id IS NOT NULL THEN
    IF auth.uid() IS DISTINCT FROM access_grant.user_id AND NOT (
      is_student_classroom_teacher(student.id) OR is_org_admin(student.organization_id)
    ) THEN RAISE EXCEPTION 'คุณไม่มีสิทธิ์ถอดผู้ปกครองบัญชีนี้'; END IF;

    IF access_grant.revoked_at IS NULL THEN
      UPDATE child_access SET revoked_at = now() WHERE id = access_grant.id;
      UPDATE invitations SET status = 'revoked', updated_at = now()
      WHERE child_id = student.id AND role = 'parent' AND status = 'accepted'
        AND accepted_by = access_grant.user_id;
    END IF;
  ELSIF student.user_id = auth.uid() THEN
    UPDATE child_access SET revoked_at = now() WHERE id = access_grant.id AND revoked_at IS NULL;
  ELSE
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์ถอดบัญชีนี้';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_guardian_review_requests(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_school_guardian_members(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_child_access(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_parent_link_for_child(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_guardian_review_requests(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_school_guardian_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_child_access(uuid) TO authenticated;

-- School guardian permissions are managed through approval and individual
-- revocation. Keep legacy owner-managed grants for personal children.
CREATE FUNCTION public.protect_existing_school_guardian_grant()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND OLD.role = 'guardian'
    AND EXISTS (SELECT 1 FROM child_profiles WHERE id = OLD.child_id AND organization_id IS NOT NULL) THEN
    RAISE EXCEPTION 'จัดการสิทธิ์ผู้ปกครองโรงเรียนผ่านคำขอหรือถอดสิทธิ์รายบัญชี';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_existing_school_guardian_grant
  BEFORE UPDATE OR DELETE ON public.child_access
  FOR EACH ROW EXECUTE FUNCTION public.protect_existing_school_guardian_grant();

CREATE FUNCTION public.update_guardian_child_display(p_child_id uuid, p_nickname text, p_avatar text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM 1 FROM child_profiles WHERE id = p_child_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT is_active_school_guardian(p_child_id) THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์แก้ข้อมูลของเด็กคนนี้';
  END IF;
  IF char_length(coalesce(p_nickname, '')) > 60 OR char_length(coalesce(p_avatar, '')) NOT BETWEEN 1 AND 16 THEN
    RAISE EXCEPTION 'กรุณาตรวจชื่อเล่นและรูปประจำตัว';
  END IF;

  UPDATE child_profiles SET nickname = nullif(btrim(p_nickname), ''),
    avatar_emoji = p_avatar, updated_at = now()
  WHERE id = p_child_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_guardian_child_display(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_guardian_child_display(uuid, text, text) TO authenticated;
