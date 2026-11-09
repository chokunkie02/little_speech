BEGIN;

ALTER TABLE public.invitations ADD COLUMN inbox_direct boolean NOT NULL DEFAULT false;

CREATE FUNCTION public.protect_inbox_invite() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.inbox_direct AND current_user IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'จัดการคำเชิญกล่องข้อความผ่านขั้นตอนที่กำหนด';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_inbox_invite BEFORE INSERT OR UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.protect_inbox_invite();

-- Existing profiles remain accessible. School creation uses the teacher RPC.
CREATE POLICY "child_profiles: create via school procedure" ON public.child_profiles
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);

CREATE FUNCTION public.lookup_parent_setup(p_organization_id uuid, p_email text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE account auth.users%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR is_platform_admin() OR NOT is_school_organization(p_organization_id)
    OR NOT is_org_admin(p_organization_id) THEN
    RAISE EXCEPTION 'บัญชีนี้ไม่มีสิทธิ์เตรียมบัญชีในโรงเรียนนี้' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO account FROM auth.users WHERE lower(email) = lower(btrim(p_email));
  IF NOT FOUND THEN RETURN jsonb_build_object('exists', false); END IF;
  IF account.raw_app_meta_data ->> 'parent_activation_school' = p_organization_id::text
    AND account.raw_app_meta_data ->> 'parent_activation_pending' = 'true' THEN
    RETURN jsonb_build_object('exists', true, 'pending_id', account.id);
  END IF;
  RETURN jsonb_build_object('exists', true);
END;
$$;

CREATE FUNCTION public.can_send_guardian_inbox_invite(p_child_id uuid, p_sender uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM classroom_students cs JOIN classroom_teachers ct USING (classroom_id)
    WHERE cs.child_id = p_child_id AND ct.teacher_user_id = p_sender
  ) OR EXISTS (
    SELECT 1 FROM child_access ca WHERE ca.child_id = p_child_id AND ca.user_id = p_sender
      AND ca.role = 'guardian' AND ca.revoked_at IS NULL
  );
$$;

CREATE FUNCTION public.send_guardian_inbox_invite(p_child_id uuid, p_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  target_email text := lower(btrim(coalesce(p_email, '')));
  invite_id uuid;
BEGIN
  PERFORM 1 FROM child_profiles WHERE id = p_child_id AND organization_id IS NOT NULL AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT can_send_guardian_inbox_invite(p_child_id, auth.uid()) THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์เชิญผู้ปกครองของนักเรียนคนนี้' USING ERRCODE = '42501';
  END IF;
  IF length(target_email) > 254 OR target_email !~ '^[^[:space:]@]+@[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'กรุณาตรวจอีเมลผู้ปกครอง';
  END IF;
  IF EXISTS (
    SELECT 1 FROM child_access ca JOIN auth.users u ON u.id = ca.user_id
    WHERE ca.child_id = p_child_id AND ca.role = 'guardian' AND ca.revoked_at IS NULL AND lower(u.email) = target_email
  ) THEN RAISE EXCEPTION 'บัญชีนี้เชื่อมกับนักเรียนอยู่แล้ว'; END IF;

  UPDATE invitations SET status = 'expired', updated_at = now()
    WHERE child_id = p_child_id AND role = 'parent' AND status = 'pending'
      AND requested_at IS NULL AND expires_at <= now();
  SELECT id INTO invite_id FROM invitations
    WHERE child_id = p_child_id AND lower(email) = target_email AND role = 'parent' AND status = 'pending'
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    IF EXISTS (SELECT 1 FROM invitations WHERE id = invite_id AND inbox_direct
      AND can_send_guardian_inbox_invite(child_id, invited_by)) THEN RETURN invite_id; END IF;
    UPDATE invitations SET status = 'revoked', updated_at = now() WHERE id = invite_id;
  END IF;

  INSERT INTO invitations (child_id, email, invited_by, inviter_email, role, token, expires_at, inbox_direct)
  VALUES (p_child_id, target_email, auth.uid(), auth.jwt() ->> 'email', 'parent',
    gen_random_uuid()::text, now() + interval '7 days', true)
  RETURNING id INTO invite_id;
  RETURN invite_id;
END;
$$;

CREATE FUNCTION public.revoke_guardian_inbox_invite(p_invitation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE invite invitations%ROWTYPE;
BEGIN
  SELECT * INTO invite FROM invitations WHERE id = p_invitation_id AND inbox_direct FOR UPDATE;
  IF NOT FOUND OR NOT (is_student_classroom_teacher(invite.child_id)
    OR (invite.invited_by = auth.uid() AND is_active_school_guardian(invite.child_id))) THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์ยกเลิกคำเชิญนี้' USING ERRCODE = '42501';
  END IF;
  IF invite.status = 'revoked' THEN RETURN; END IF;
  IF invite.status <> 'pending' OR invite.expires_at <= now() THEN
    RAISE EXCEPTION 'คำเชิญนี้ตอบรับแล้วหรือหมดอายุ';
  END IF;
  UPDATE invitations SET status = 'revoked', updated_at = now() WHERE id = invite.id;
END;
$$;

CREATE FUNCTION public.guardian_inbox_email() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT lower(u.email) FROM auth.users u
  WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
    AND coalesce(u.raw_app_meta_data ->> 'parent_activation_pending', 'false') <> 'true'
    AND coalesce(u.raw_user_meta_data ->> 'role', 'parent') = 'parent'
    AND NOT is_platform_admin();
$$;

CREATE FUNCTION public.list_guardian_inbox()
RETURNS TABLE (id uuid, child_name text, school_name text, classroom_name text, inviter_email text,
  status text, expires_at timestamptz, legacy_token text, sender_name text, linked_child_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT i.id, cp.name, o.name, (
      SELECT c.name FROM classroom_students cs JOIN classrooms c ON c.id = cs.classroom_id
      WHERE cs.child_id = cp.id AND c.organization_id = o.id ORDER BY c.id LIMIT 1
    ), i.inviter_email,
    CASE WHEN i.status = 'pending' AND i.requested_by IS NOT NULL AND NOT i.inbox_direct THEN 'review'
      WHEN i.status = 'pending' AND i.expires_at <= now() THEN 'expired'
      WHEN i.status = 'pending' AND i.inbox_direct AND NOT can_send_guardian_inbox_invite(i.child_id, i.invited_by) THEN 'revoked'
      ELSE i.status::text END,
    i.expires_at,
    CASE WHEN NOT i.inbox_direct THEN i.token END,
    coalesce(nullif(btrim(sender.raw_user_meta_data ->> 'full_name'), ''), nullif(btrim(sender.raw_user_meta_data ->> 'name'), '')),
    CASE WHEN i.status = 'accepted' AND i.accepted_by = auth.uid()
      AND is_active_school_guardian(i.child_id) THEN i.child_id END
  FROM invitations i JOIN child_profiles cp ON cp.id = i.child_id AND cp.archived_at IS NULL
  JOIN organizations o ON o.id = cp.organization_id
  LEFT JOIN auth.users sender ON sender.id = i.invited_by
  WHERE lower(i.email) = guardian_inbox_email() AND i.requires_teacher_approval
    AND (i.requested_by IS NULL OR i.requested_by = auth.uid())
  ORDER BY i.created_at DESC;
$$;

CREATE FUNCTION public.accept_guardian_inbox_invite(p_invitation_id uuid, p_relationship text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  invite invitations%ROWTYPE;
  student_id uuid;
  account_email text := guardian_inbox_email();
BEGIN
  SELECT child_id INTO student_id FROM invitations WHERE id = p_invitation_id AND inbox_direct;
  PERFORM 1 FROM child_profiles WHERE id = student_id AND organization_id IS NOT NULL AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND OR account_email IS NULL THEN RAISE EXCEPTION 'คำเชิญนี้ไม่พร้อมใช้งาน'; END IF;
  SELECT * INTO invite FROM invitations WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND OR lower(invite.email) <> account_email OR invite.invited_by = auth.uid() THEN
    RAISE EXCEPTION 'คำเชิญนี้ไม่พร้อมใช้งานสำหรับบัญชีนี้' USING ERRCODE = '42501';
  END IF;
  IF invite.status = 'accepted' AND invite.accepted_by = auth.uid() AND is_active_school_guardian(student_id) THEN
    RETURN student_id;
  END IF;
  IF invite.status <> 'pending' OR invite.expires_at <= now()
    OR NOT can_send_guardian_inbox_invite(student_id, invite.invited_by) THEN
    RAISE EXCEPTION 'คำเชิญหมดอายุหรือถูกยกเลิกแล้ว';
  END IF;
  IF p_relationship IS NULL OR length(btrim(p_relationship)) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'กรุณาระบุความสัมพันธ์กับนักเรียน';
  END IF;
  INSERT INTO child_access (child_id, user_id, role, granted_by, can_view_progress, can_view_audio,
    can_assign_practice, can_edit_child, can_export_report)
  VALUES (student_id, auth.uid(), 'guardian', invite.invited_by, true, true, false, false, true)
  ON CONFLICT (child_id, user_id) DO UPDATE SET role = 'guardian', granted_by = EXCLUDED.granted_by,
    revoked_at = NULL, can_view_progress = true, can_view_audio = true, can_assign_practice = false,
    can_edit_child = false, can_export_report = true;
  UPDATE invitations SET status = 'accepted', accepted_by = auth.uid(), requested_by = auth.uid(),
    requester_name = left(coalesce(nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''), account_email), 120),
    requester_relationship = btrim(p_relationship), requested_at = now(), accepted_at = now(), updated_at = now()
  WHERE id = invite.id;
  RETURN student_id;
END;
$$;

CREATE FUNCTION public.search_school_people(p_organization_id uuid, p_query text)
RETURNS TABLE (kind text, name text, detail text, child_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE term text := lower(btrim(coalesce(p_query, '')));
BEGIN
  IF auth.uid() IS NULL OR is_platform_admin() OR NOT is_org_admin(p_organization_id)
    OR NOT is_school_organization(p_organization_id) THEN
    RAISE EXCEPTION 'บัญชีนี้ไม่มีสิทธิ์ค้นหาในโรงเรียนนี้' USING ERRCODE = '42501';
  END IF;
  IF length(term) NOT BETWEEN 1 AND 254 THEN RETURN; END IF;
  RETURN QUERY
  SELECT result.kind, result.name, result.detail, result.child_id FROM (
    SELECT 'student'::text AS kind, cp.name, concat_ws(' · ', cp.student_code, cp.nickname, c.name) AS detail, cp.id AS child_id
      FROM child_profiles cp LEFT JOIN classroom_students cs ON cs.child_id = cp.id
      LEFT JOIN classrooms c ON c.id = cs.classroom_id AND c.organization_id = p_organization_id
      WHERE cp.organization_id = p_organization_id AND cp.archived_at IS NULL
        AND strpos(lower(concat_ws(' ', cp.name, cp.student_code, cp.nickname, c.name)), term) > 0
    UNION
    SELECT 'teacher', u.email::text, coalesce(c.name, 'ยังไม่ได้จัดห้อง'), NULL::uuid
      FROM organization_members m JOIN auth.users u ON u.id = m.user_id
      LEFT JOIN classroom_teachers ct ON ct.teacher_user_id = m.user_id
      LEFT JOIN classrooms c ON c.id = ct.classroom_id AND c.organization_id = p_organization_id
      WHERE m.organization_id = p_organization_id AND m.role = 'teacher' AND m.status = 'active'
        AND strpos(lower(u.email), term) > 0
    UNION
    SELECT 'guardian', u.email::text, cp.name, cp.id
      FROM child_access ca JOIN child_profiles cp ON cp.id = ca.child_id JOIN auth.users u ON u.id = ca.user_id
      WHERE cp.organization_id = p_organization_id AND cp.archived_at IS NULL
        AND ca.role = 'guardian' AND ca.revoked_at IS NULL AND strpos(lower(u.email), term) > 0
  ) result ORDER BY result.kind, result.name, result.detail LIMIT 30;
END;
$$;

CREATE FUNCTION public.search_platform_school_ids(p_query text)
RETURNS SETOF uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE term text := lower(btrim(coalesce(p_query, '')));
BEGIN
  IF NOT is_platform_admin() THEN RAISE EXCEPTION 'บัญชีนี้ไม่มีสิทธิ์แอดมินระบบ' USING ERRCODE = '42501'; END IF;
  IF length(term) NOT BETWEEN 1 AND 254 THEN RETURN; END IF;
  RETURN QUERY SELECT o.id FROM organizations o WHERE o.type = 'school' AND (
    strpos(lower(o.name), term) > 0 OR strpos(o.id::text, term) > 0 OR EXISTS (
      SELECT 1 FROM organization_members m JOIN auth.users u ON u.id = m.user_id
      WHERE m.organization_id = o.id AND m.role IN ('owner', 'admin') AND m.status = 'active'
        AND strpos(lower(u.email), term) > 0
    ) OR EXISTS (
      SELECT 1 FROM school_admin_invitations i WHERE i.organization_id = o.id AND i.accepted_by IS NULL
        AND i.expires_at > now() AND strpos(lower(i.email), term) > 0
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guardian_inbox_email(), public.can_send_guardian_inbox_invite(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lookup_parent_setup(uuid, text), public.send_guardian_inbox_invite(uuid, text),
  public.revoke_guardian_inbox_invite(uuid), public.list_guardian_inbox(),
  public.accept_guardian_inbox_invite(uuid, text), public.search_school_people(uuid, text),
  public.search_platform_school_ids(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_parent_setup(uuid, text), public.send_guardian_inbox_invite(uuid, text),
  public.revoke_guardian_inbox_invite(uuid), public.list_guardian_inbox(),
  public.accept_guardian_inbox_invite(uuid, text), public.search_school_people(uuid, text),
  public.search_platform_school_ids(text) TO authenticated;

CREATE FUNCTION public.matches_parent_activation(p_email text, p_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users
    WHERE lower(email) = lower(p_email) AND recovery_token = p_code
      AND raw_app_meta_data ->> 'parent_activation_pending' = 'true');
$$;
REVOKE EXECUTE ON FUNCTION public.matches_parent_activation(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.matches_parent_activation(text, text) TO service_role;

COMMIT;
