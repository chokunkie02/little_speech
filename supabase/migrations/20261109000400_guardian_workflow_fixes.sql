CREATE OR REPLACE FUNCTION public.lookup_parent_setup(p_organization_id uuid, p_email text)
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
  IF coalesce(account.raw_user_meta_data ->> 'role', 'parent') <> 'parent'
    OR account.raw_app_meta_data ->> 'platform_admin' = 'true' THEN
    RETURN jsonb_build_object('exists', true, 'incompatible', true);
  END IF;
  IF account.raw_app_meta_data ->> 'parent_activation_school' = p_organization_id::text
    AND account.raw_app_meta_data ->> 'parent_activation_pending' = 'true' THEN
    RETURN jsonb_build_object('exists', true, 'pending_id', account.id);
  END IF;
  IF account.raw_app_meta_data ->> 'parent_activation_pending' = 'true' THEN
    RETURN jsonb_build_object('exists', true, 'pending_elsewhere', true);
  END IF;
  RETURN jsonb_build_object('exists', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.send_guardian_inbox_invite(p_child_id uuid, p_email text)
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
    SELECT 1 FROM auth.users u WHERE lower(u.email) = target_email
      AND (coalesce(u.raw_user_meta_data ->> 'role', 'parent') <> 'parent'
        OR u.raw_app_meta_data ->> 'platform_admin' = 'true')
  ) THEN
    RAISE EXCEPTION 'อีเมลนี้ใช้กับบัญชีบทบาทอื่น กรุณาตรวจอีเมลผู้ปกครอง';
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

DROP FUNCTION public.search_school_people(uuid, text);

CREATE FUNCTION public.search_school_people(p_organization_id uuid, p_query text)
RETURNS TABLE (kind text, name text, detail text, child_id uuid, classroom_id uuid)
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
  SELECT result.kind, result.name, result.detail, result.child_id, result.classroom_id FROM (
    SELECT 'student'::text AS kind, cp.name, concat_ws(' · ', cp.student_code, cp.nickname, c.name) AS detail, cp.id AS child_id, c.id AS classroom_id
      FROM child_profiles cp LEFT JOIN classroom_students cs ON cs.child_id = cp.id
      LEFT JOIN classrooms c ON c.id = cs.classroom_id AND c.organization_id = p_organization_id
      WHERE cp.organization_id = p_organization_id AND cp.archived_at IS NULL
        AND strpos(lower(concat_ws(' ', cp.name, cp.student_code, cp.nickname, c.name)), term) > 0
    UNION
    SELECT 'teacher', u.email::text, coalesce(c.name, 'ยังไม่ได้จัดห้อง'), NULL::uuid, c.id
      FROM organization_members m JOIN auth.users u ON u.id = m.user_id
      LEFT JOIN (classroom_teachers ct JOIN classrooms c ON c.id = ct.classroom_id)
        ON ct.teacher_user_id = m.user_id AND c.organization_id = p_organization_id
      WHERE m.organization_id = p_organization_id AND m.role = 'teacher' AND m.status = 'active'
        AND strpos(lower(u.email), term) > 0
    UNION
    SELECT 'guardian', u.email::text, cp.name, cp.id, c.id
      FROM child_access ca JOIN child_profiles cp ON cp.id = ca.child_id JOIN auth.users u ON u.id = ca.user_id
      LEFT JOIN classroom_students cs ON cs.child_id = cp.id
      LEFT JOIN classrooms c ON c.id = cs.classroom_id AND c.organization_id = p_organization_id
      WHERE cp.organization_id = p_organization_id AND cp.archived_at IS NULL
        AND ca.role = 'guardian' AND ca.revoked_at IS NULL AND strpos(lower(u.email), term) > 0
  ) result ORDER BY result.kind, result.name, result.detail LIMIT 30;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_school_people(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_school_people(uuid, text) TO authenticated;
