-- Keep existing grants and personal/family invitations. School parent invites
-- use the same token and transition to accepted only after a teacher decision.
ALTER TABLE public.invitations
  ADD COLUMN requires_teacher_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN requested_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN requested_at timestamptz,
  ADD COLUMN requester_name text,
  ADD COLUMN requester_relationship text;

UPDATE public.invitations i
SET requires_teacher_approval = true
FROM public.child_profiles cp
WHERE i.child_id = cp.id AND i.role = 'parent' AND cp.organization_id IS NOT NULL;

CREATE FUNCTION public.is_student_classroom_teacher(p_child_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM classroom_students cs
    JOIN classrooms c ON c.id = cs.classroom_id
    JOIN classroom_teachers ct ON ct.classroom_id = c.id
    JOIN child_profiles cp ON cp.id = cs.child_id AND cp.organization_id = c.organization_id
    WHERE cs.child_id = p_child_id
      AND cp.archived_at IS NULL
      AND ct.teacher_user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_student_classroom_teacher(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_student_classroom_teacher(uuid) TO authenticated;

CREATE POLICY "invitations: assigned teacher select"
  ON public.invitations FOR SELECT TO authenticated
  USING (requires_teacher_approval AND is_student_classroom_teacher(child_id));

DROP POLICY "invitations: invitee select" ON public.invitations;
CREATE POLICY "invitations: invitee select"
  ON public.invitations FOR SELECT TO authenticated
  USING (
    NOT requires_teacher_approval AND email <> ''
    AND lower(email) = lower(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "invitations: invitee accept" ON public.invitations;

-- Table clients can create pending invites and cancel their own invites.
-- Only privileged database routines may change approval state or identity.
CREATE FUNCTION public.protect_guardian_invitation()
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

CREATE TRIGGER protect_guardian_invitation
  BEFORE INSERT OR UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.protect_guardian_invitation();

-- Keep the anonymous landing page, but redact school/student/request data
-- unless the viewer is the applicant, intended recipient, or inviter.
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS SETOF public.invitations LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  invitation public.invitations%ROWTYPE;
BEGIN
  SELECT * INTO invitation FROM invitations WHERE token = p_token;
  IF NOT FOUND THEN RETURN; END IF;

  IF invitation.requires_teacher_approval THEN
    IF invitation.status <> 'accepted'
      OR auth.uid() IS DISTINCT FROM invitation.accepted_by
      OR NOT is_child_grantee(invitation.child_id) THEN
      invitation.child_id := NULL;
    END IF;
    invitation.inviter_email := NULL;
    invitation.requester_name := NULL;
    invitation.requester_relationship := NULL;

    IF auth.uid() IS NULL OR (
      auth.uid() IS DISTINCT FROM invitation.requested_by
      AND auth.uid() IS DISTINCT FROM invitation.invited_by
      AND auth.uid() IS DISTINCT FROM invitation.accepted_by
      AND (invitation.requested_by IS NOT NULL
        OR lower(invitation.email) IS DISTINCT FROM lower(auth.jwt() ->> 'email'))
    ) THEN
      invitation.email := '';
      invitation.requested_at := NULL;
      invitation.accepted_at := NULL;
      IF invitation.status = 'accepted' THEN invitation.status := 'pending'; END IF;
    END IF;
    invitation.accepted_by := NULL;
    invitation.requested_by := NULL;
  END IF;

  IF invitation.status = 'pending' AND invitation.requested_at IS NULL
     AND invitation.expires_at <= now() THEN
    invitation.status := 'expired';
  END IF;
  RETURN NEXT invitation;
END;
$$;

CREATE FUNCTION public.list_received_guardian_invites()
RETURNS SETOF public.invitations LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT redacted.*
  FROM invitations i
  CROSS JOIN LATERAL get_invitation_by_token(i.token) redacted
  WHERE i.requires_teacher_approval AND auth.uid() IS NOT NULL
    AND (i.requested_by = auth.uid() OR (
      i.requested_by IS NULL AND lower(i.email) = lower(auth.jwt() ->> 'email')
    ))
  ORDER BY i.created_at DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.list_received_guardian_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_received_guardian_invites() TO authenticated;

CREATE POLICY "child_access: assigned teacher guardian select"
  ON public.child_access FOR SELECT TO authenticated
  USING (role = 'guardian' AND is_student_classroom_teacher(child_id));

-- Even profile owners must use the review function to create or reactivate
-- an active school guardian grant. Existing access and revocation still work.
CREATE FUNCTION public.protect_school_guardian_grant()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NEW.role = 'guardian' AND NEW.revoked_at IS NULL
    AND EXISTS (SELECT 1 FROM child_profiles WHERE id = NEW.child_id AND organization_id IS NOT NULL)
    AND (TG_OP = 'INSERT' OR OLD.revoked_at IS NOT NULL OR OLD.role <> 'guardian'
      OR OLD.child_id <> NEW.child_id OR OLD.user_id <> NEW.user_id) THEN
    RAISE EXCEPTION 'ให้สิทธิ์ผู้ปกครองโรงเรียนผ่านการอนุมัติคำขอเท่านั้น';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_school_guardian_grant BEFORE INSERT OR UPDATE ON public.child_access
  FOR EACH ROW EXECUTE FUNCTION public.protect_school_guardian_grant();

CREATE OR REPLACE FUNCTION public.expire_stale_invitations()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  UPDATE invitations SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND requested_at IS NULL AND expires_at <= now();
$$;

CREATE FUNCTION public.create_teacher_student(
  p_classroom_id uuid, p_name text, p_student_code text, p_age integer, p_nickname text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  room classrooms%ROWTYPE;
  student_id uuid;
BEGIN
  SELECT * INTO room FROM classrooms WHERE id = p_classroom_id;
  IF NOT FOUND OR NOT is_classroom_teacher(p_classroom_id) THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์เพิ่มนักเรียนในห้องนี้';
  END IF;
  IF p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 1 AND 120
    OR p_student_code IS NULL OR char_length(btrim(p_student_code)) NOT BETWEEN 1 AND 40
    OR char_length(coalesce(p_nickname, '')) > 60
    OR p_age IS NULL OR p_age NOT BETWEEN 1 AND 18 THEN
    RAISE EXCEPTION 'กรุณาตรวจชื่อ รหัสนักเรียน และอายุ';
  END IF;

  INSERT INTO child_profiles (
    user_id, name, student_code, nickname, age, organization_id, grade_level,
    target_sound, selected_sound_id, training_goal, avatar_emoji
  ) VALUES (
    (SELECT created_by FROM organizations WHERE id = room.organization_id),
    btrim(p_name), btrim(p_student_code), nullif(btrim(p_nickname), ''),
    p_age, room.organization_id, room.grade_level, 'ก', 'ก', '', '🧒'
  ) RETURNING id INTO student_id;

  INSERT INTO classroom_students (classroom_id, child_id) VALUES (room.id, student_id);
  RETURN student_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'รหัสนักเรียนนี้มีอยู่แล้วในโรงเรียน';
END;
$$;

CREATE FUNCTION public.create_first_guardian_invite(p_child_id uuid, p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  invite_email text := lower(btrim(coalesce(p_email, '')));
BEGIN
  PERFORM 1 FROM child_profiles WHERE id = p_child_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT is_student_classroom_teacher(p_child_id) THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์เชิญผู้ปกครองของนักเรียนคนนี้';
  END IF;
  IF invite_email <> '' AND (char_length(invite_email) > 254 OR invite_email !~ '^[^[:space:]@]+@[^[:space:]@]+$') THEN
    RAISE EXCEPTION 'กรุณาตรวจอีเมลผู้ปกครอง';
  END IF;
  IF EXISTS (SELECT 1 FROM child_access WHERE child_id = p_child_id AND role = 'guardian' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'นักเรียนคนนี้มีผู้ปกครองที่เชื่อมแล้ว';
  END IF;

  UPDATE invitations SET status = 'expired', updated_at = now()
  WHERE child_id = p_child_id AND status = 'pending' AND requested_at IS NULL AND expires_at <= now();

  IF EXISTS (
    SELECT 1 FROM invitations
    WHERE child_id = p_child_id AND lower(email) = invite_email AND role = 'parent' AND status = 'pending'
  ) THEN RETURN; END IF;

  INSERT INTO invitations (child_id, email, invited_by, inviter_email, role, token, expires_at)
  VALUES (p_child_id, invite_email, auth.uid(), auth.jwt() ->> 'email', 'parent',
    gen_random_uuid()::text, now() + interval '7 days');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_first_guardian_invite(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_first_guardian_invite(uuid, text) TO authenticated;

CREATE FUNCTION public.submit_first_guardian_request(
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
  IF EXISTS (SELECT 1 FROM child_access WHERE child_id = student_id AND role = 'guardian' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'นักเรียนคนนี้มีผู้ปกครองที่เชื่อมแล้ว';
  END IF;

  UPDATE invitations SET email = account_email, requested_by = auth.uid(),
    requester_name = btrim(p_name), requester_relationship = btrim(p_relationship),
    requested_at = now(), updated_at = now()
  WHERE id = invitation.id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'มีคำเชิญสำหรับบัญชีนี้แล้ว กรุณาใช้ลิงก์ที่ระบุอีเมลของคุณ';
END;
$$;

CREATE FUNCTION public.review_first_guardian_request(p_invitation_id uuid, p_approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  invitation invitations%ROWTYPE;
  student_id uuid;
BEGIN
  SELECT child_id INTO student_id FROM invitations
  WHERE id = p_invitation_id AND requires_teacher_approval;
  IF p_approve IS NULL OR NOT is_student_classroom_teacher(student_id) THEN
    RAISE EXCEPTION 'เฉพาะครูประจำห้องเท่านั้นที่ตรวจคำขอนี้ได้';
  END IF;
  PERFORM 1 FROM child_profiles WHERE id = student_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบนักเรียนที่ใช้งานอยู่'; END IF;

  SELECT * INTO invitation FROM invitations WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND OR invitation.requested_by IS NULL THEN
    RAISE EXCEPTION 'ไม่พบคำขอ';
  END IF;
  IF (p_approve AND invitation.status = 'accepted')
    OR (NOT p_approve AND invitation.status = 'revoked' AND invitation.accepted_at IS NULL) THEN
    RETURN;
  END IF;
  IF invitation.status <> 'pending' THEN RAISE EXCEPTION 'คำขอนี้ถูกดำเนินการแล้ว'; END IF;

  IF p_approve THEN
    IF EXISTS (SELECT 1 FROM child_access WHERE child_id = student_id AND role = 'guardian' AND revoked_at IS NULL) THEN
      RAISE EXCEPTION 'นักเรียนคนนี้มีผู้ปกครองที่เชื่อมแล้ว';
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

REVOKE EXECUTE ON FUNCTION public.create_teacher_student(uuid, text, text, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_first_guardian_request(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.review_first_guardian_request(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_teacher_student(uuid, text, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_first_guardian_request(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_first_guardian_request(uuid, boolean) TO authenticated;

-- Preserve the older status-only endpoint for personal invitations.
CREATE OR REPLACE FUNCTION public.accept_invitation_by_token(p_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE invitations SET status = 'accepted', accepted_at = now(),
    accepted_by = auth.uid(), updated_at = now()
  WHERE token = p_token AND auth.uid() IS NOT NULL AND status = 'pending'
    AND expires_at > now() AND NOT requires_teacher_approval
    AND lower(email) = lower(auth.jwt() ->> 'email');
  IF NOT FOUND THEN RAISE EXCEPTION 'คำเชิญนี้ไม่สามารถตอบรับโดยตรงได้'; END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.accept_invitation_by_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation_by_token(text) TO authenticated;

CREATE OR REPLACE FUNCTION accept_invitation_with_access(
  p_token   text,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inv  invitations%ROWTYPE;
  v_role access_role;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'กรุณาเข้าสู่ระบบด้วยบัญชีผู้รับคำเชิญ';
  END IF;

  -- Fetch and lock pending invitation by token
  SELECT * INTO v_inv
  FROM   invitations
  WHERE  token      = p_token
    AND  status     = 'pending'
    AND  expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation not found, already used, or expired';
  END IF;

  IF lower(v_inv.email) IS DISTINCT FROM lower(auth.jwt() ->> 'email') THEN
    RAISE EXCEPTION 'กรุณาใช้บัญชีที่ตรงกับอีเมลคำเชิญ';
  END IF;

  IF v_inv.requires_teacher_approval OR (
    v_inv.role IN ('parent', 'school_admin') AND EXISTS (
      SELECT 1 FROM child_profiles WHERE id = v_inv.child_id AND organization_id IS NOT NULL
    )
  ) OR (
    v_inv.child_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM child_profiles
      WHERE id = v_inv.child_id AND user_id = v_inv.invited_by AND archived_at IS NULL
    )
  ) THEN
    RAISE EXCEPTION 'คำเชิญนี้ไม่สามารถให้สิทธิ์โดยตรงได้';
  END IF;

  -- Mark invitation accepted
  UPDATE invitations
  SET  status      = 'accepted',
       accepted_at = now(),
       accepted_by = p_user_id,
       updated_at  = now()
  WHERE id = v_inv.id;

  -- Skip child_access creation when no child is attached
  IF v_inv.child_id IS NULL THEN
    RETURN;
  END IF;

  -- Map invitation role → access role
  v_role := CASE v_inv.role
    WHEN 'parent'       THEN 'guardian'::access_role
    WHEN 'teacher'      THEN 'teacher'::access_role
    WHEN 'therapist'    THEN 'therapist'::access_role
    WHEN 'school_admin' THEN 'guardian'::access_role
    WHEN 'viewer'       THEN 'viewer'::access_role
    ELSE                     'viewer'::access_role
  END;

  -- Upsert child_access — idempotent; re-accepting the same invite re-activates
  INSERT INTO child_access (
    child_id, user_id, role, granted_by,
    can_view_progress, can_view_audio, can_assign_practice,
    can_edit_child,    can_export_report
  )
  VALUES (
    v_inv.child_id, p_user_id, v_role, v_inv.invited_by,
    true,
    (v_role IN ('guardian', 'therapist')),
    (v_role =  'teacher'),
    (v_role =  'guardian'),
    (v_role <> 'viewer')
  )
  ON CONFLICT (child_id, user_id) DO UPDATE
    SET role                = EXCLUDED.role,
        granted_by          = EXCLUDED.granted_by,
        revoked_at          = NULL,
        can_view_progress   = EXCLUDED.can_view_progress,
        can_view_audio      = EXCLUDED.can_view_audio,
        can_assign_practice = EXCLUDED.can_assign_practice,
        can_edit_child      = EXCLUDED.can_edit_child,
        can_export_report   = EXCLUDED.can_export_report;
END;
$$;

REVOKE EXECUTE ON FUNCTION accept_invitation_with_access(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION accept_invitation_with_access(text, uuid) TO authenticated;
