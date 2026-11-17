-- Retire every email-based invitation (plan D1).
--
-- Email invitations trust "whoever owns this email". Once sign-up no longer requires email
-- confirmation that is no longer true, so joining is done with join codes only:
--   * pending email invitations are expired,
--   * the old create/accept functions refuse with a message pointing to join codes,
--   * family (non-school) children can now be shared with a guardian join code as well.
-- Read functions stay so history still shows in the UI.

BEGIN;

-- ── 1. join codes also cover family children ───────────────────────────────

ALTER TABLE public.join_codes ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.join_codes ADD CONSTRAINT join_codes_org_required
  CHECK (organization_id IS NOT NULL OR kind = 'guardian');

CREATE OR REPLACE FUNCTION public.can_manage_join_code(p_kind public.join_code_kind, p_org uuid, p_classroom uuid, p_child uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE p_kind
    WHEN 'guardian' THEN CASE
      WHEN p_org IS NULL THEN EXISTS (
        SELECT 1 FROM child_profiles WHERE id = p_child AND organization_id IS NULL AND user_id = auth.uid() AND archived_at IS NULL)
      ELSE is_student_classroom_teacher(p_child) OR is_org_admin(p_org) OR is_active_school_guardian(p_child) END
    WHEN 'classroom_guardian' THEN is_classroom_teacher(p_classroom) OR is_org_admin(p_org)
    WHEN 'teacher' THEN is_org_admin(p_org)
    WHEN 'school_admin' THEN is_platform_admin()
  END;
$$;

CREATE OR REPLACE FUNCTION public.issue_join_code(
  p_kind public.join_code_kind, p_organization_id uuid DEFAULT NULL, p_classroom_id uuid DEFAULT NULL,
  p_child_id uuid DEFAULT NULL, p_rotate boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  org uuid := p_organization_id;
  room uuid := p_classroom_id;
  jc join_codes%ROWTYPE;
  lifetime interval;
  cap integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'กรุณาเข้าสู่ระบบ' USING ERRCODE = '42501'; END IF;
  IF p_kind = 'guardian' THEN
    IF NOT EXISTS (SELECT 1 FROM child_profiles WHERE id = p_child_id AND archived_at IS NULL) THEN
      RAISE EXCEPTION 'ไม่พบนักเรียนคนนี้';
    END IF;
    SELECT organization_id INTO org FROM child_profiles WHERE id = p_child_id;
    room := CASE WHEN org IS NULL THEN NULL ELSE child_classroom(p_child_id) END;
  ELSIF p_kind = 'classroom_guardian' THEN
    SELECT organization_id INTO org FROM classrooms WHERE id = p_classroom_id;
  END IF;
  IF (org IS NULL AND p_kind <> 'guardian') OR (org IS NOT NULL AND NOT is_school_organization(org))
    OR NOT can_manage_join_code(p_kind, org, room, p_child_id) THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์ออกรหัสนี้' USING ERRCODE = '42501';
  END IF;
  IF p_kind <> 'guardian' THEN p_child_id := NULL; END IF;
  IF p_kind IN ('teacher', 'school_admin') AND p_classroom_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM classrooms WHERE id = p_classroom_id AND organization_id = org) THEN
    RAISE EXCEPTION 'ไม่พบห้องเรียนนี้ในโรงเรียน';
  END IF;

  lifetime := CASE p_kind WHEN 'guardian' THEN interval '30 days' WHEN 'classroom_guardian' THEN interval '7 days'
    WHEN 'teacher' THEN interval '14 days' ELSE interval '7 days' END;
  cap := CASE p_kind WHEN 'guardian' THEN 4 WHEN 'classroom_guardian' THEN 200 WHEN 'teacher' THEN 50 ELSE 1 END;

  SELECT * INTO jc FROM join_codes
    WHERE kind = p_kind AND organization_id IS NOT DISTINCT FROM org AND created_by = auth.uid()
      AND classroom_id IS NOT DISTINCT FROM (CASE WHEN p_kind = 'guardian' THEN classroom_id ELSE room END)
      AND child_id IS NOT DISTINCT FROM p_child_id
      AND revoked_at IS NULL AND expires_at > now() AND uses < max_uses
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF FOUND AND NOT p_rotate THEN RETURN to_jsonb(jc) - 'created_by'; END IF;
  IF FOUND THEN UPDATE join_codes SET revoked_at = now() WHERE id = jc.id; END IF;

  INSERT INTO join_codes (code, kind, organization_id, classroom_id, child_id, created_by, max_uses, expires_at)
  VALUES (new_join_code(), p_kind, org, room, p_child_id, auth.uid(), cap, now() + lifetime)
  RETURNING * INTO jc;
  RETURN to_jsonb(jc) - 'created_by';
END;
$$;

-- Family codes have no school, so the slip shows "ครอบครัว" instead of a school name.
CREATE OR REPLACE FUNCTION public.preview_join_code(p_code text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  jc join_codes%ROWTYPE;
  child child_profiles%ROWTYPE;
  students jsonb;
BEGIN
  SELECT * INTO jc FROM join_codes WHERE code = normalize_join_code(p_code);
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF jc.kind = 'guardian' THEN SELECT * INTO child FROM child_profiles WHERE id = jc.child_id; END IF;
  IF jc.kind = 'classroom_guardian' AND jc.revoked_at IS NULL AND jc.expires_at > now() THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('id', cp.id, 'name', masked_child_name(cp.name, cp.nickname))
      ORDER BY cp.name), '[]'::jsonb) INTO students
    FROM classroom_students cs JOIN child_profiles cp ON cp.id = cs.child_id
    WHERE cs.classroom_id = jc.classroom_id AND cp.archived_at IS NULL;
  END IF;
  RETURN jsonb_build_object(
    'status', CASE WHEN jc.revoked_at IS NOT NULL THEN 'revoked' WHEN jc.expires_at <= now() THEN 'expired'
      WHEN jc.uses >= jc.max_uses THEN 'used_up' ELSE 'valid' END,
    'kind', jc.kind,
    'code', jc.code,
    'family', jc.organization_id IS NULL,
    'school_name', (SELECT name FROM organizations WHERE id = jc.organization_id),
    'classroom_name', (SELECT name FROM classrooms WHERE id = coalesce(jc.classroom_id, child_classroom(jc.child_id))),
    'child_name', CASE WHEN jc.kind = 'guardian' AND child.archived_at IS NULL THEN masked_child_name(child.name, child.nickname) END,
    'students', students,
    'expires_at', jc.expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_join_code(
  p_code text, p_relationship text DEFAULT NULL, p_consent boolean DEFAULT false,
  p_child_id uuid DEFAULT NULL, p_display_name text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  me uuid := auth.uid();
  jc join_codes%ROWTYPE;
  target uuid;
  who text;
  relation text := nullif(btrim(coalesce(p_relationship, '')), '');
  school text;
  request_id uuid;
  recipient uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'กรุณาเข้าสู่ระบบก่อนใช้รหัส' USING ERRCODE = '42501'; END IF;
  SELECT * INTO jc FROM join_codes WHERE code = normalize_join_code(p_code) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบรหัสนี้ กรุณาตรวจตัวอักษรอีกครั้ง'; END IF;
  IF jc.revoked_at IS NOT NULL OR jc.expires_at <= now() OR jc.uses >= jc.max_uses THEN
    RAISE EXCEPTION 'รหัสนี้หมดอายุหรือถูกใช้ครบแล้ว กรุณาขอรหัสใหม่';
  END IF;
  SELECT o.name INTO school FROM organizations o WHERE o.id = jc.organization_id;
  who := left(coalesce(nullif(btrim(p_display_name), ''), account_display_name(me)), 120);

  IF jc.kind IN ('guardian', 'classroom_guardian') THEN
    IF NOT can_take_role(me, 'parent') THEN
      RAISE EXCEPTION 'บัญชีนี้เป็นบัญชีครูหรือผู้ดูแล กรุณาใช้บัญชีผู้ปกครองแยก' USING ERRCODE = '42501';
    END IF;
    IF NOT p_consent THEN RAISE EXCEPTION 'กรุณายินยอมการเก็บข้อมูลการฝึกของบุตรหลานก่อน'; END IF;
    IF relation IS NULL OR char_length(relation) > 60 THEN RAISE EXCEPTION 'กรุณาระบุความสัมพันธ์กับนักเรียน'; END IF;
    target := CASE WHEN jc.kind = 'guardian' THEN jc.child_id ELSE p_child_id END;
    IF target IS NULL OR NOT EXISTS (
      SELECT 1 FROM child_profiles cp WHERE cp.id = target AND cp.archived_at IS NULL
        AND cp.organization_id IS NOT DISTINCT FROM jc.organization_id
        AND (jc.kind = 'guardian' OR EXISTS (SELECT 1 FROM classroom_students cs WHERE cs.child_id = cp.id AND cs.classroom_id = jc.classroom_id))
    ) THEN RAISE EXCEPTION 'กรุณาเลือกชื่อนักเรียนจากรายชื่อห้อง'; END IF;
    IF EXISTS (SELECT 1 FROM child_profiles WHERE id = target AND user_id = me) THEN
      RETURN jsonb_build_object('result', 'linked', 'child_id', target, 'already', true);
    END IF;
    IF EXISTS (SELECT 1 FROM child_access WHERE child_id = target AND user_id = me AND role = 'guardian' AND revoked_at IS NULL) THEN
      RETURN jsonb_build_object('result', 'linked', 'child_id', target, 'already', true);
    END IF;
    IF (SELECT count(*) FROM child_access WHERE child_id = target AND role = 'guardian' AND revoked_at IS NULL) >= 4 THEN
      RAISE EXCEPTION 'นักเรียนคนนี้มีผู้ปกครองครบ 4 บัญชีแล้ว กรุณาติดต่อผู้ที่ให้รหัส';
    END IF;
    PERFORM set_account_role(me, 'parent');

    IF jc.kind = 'classroom_guardian' THEN
      INSERT INTO join_requests (code_id, kind, organization_id, classroom_id, child_id, requester_id, requester_name, relationship)
      VALUES (jc.id, jc.kind, jc.organization_id, jc.classroom_id, target, me, who, relation)
      ON CONFLICT DO NOTHING RETURNING id INTO request_id;
      IF request_id IS NULL THEN RETURN jsonb_build_object('result', 'requested', 'already', true); END IF;
      UPDATE join_codes SET uses = uses + 1 WHERE id = jc.id;
      FOR recipient IN SELECT teacher_user_id FROM classroom_teachers WHERE classroom_id = jc.classroom_id LOOP
        PERFORM notify_user(recipient, 'join_request', 'มีผู้ปกครองขอเชื่อมกับนักเรียน',
          who || ' (' || relation || ') ขอเชื่อมกับ ' || (SELECT name FROM child_profiles WHERE id = target), '/inbox');
      END LOOP;
      RETURN jsonb_build_object('result', 'requested', 'request_id', request_id);
    END IF;

    INSERT INTO child_access (child_id, user_id, role, granted_by, can_view_progress, can_view_audio,
      can_assign_practice, can_edit_child, can_export_report)
    VALUES (target, me, 'guardian', jc.created_by, true, true, jc.organization_id IS NULL, false, true)
    ON CONFLICT (child_id, user_id) DO UPDATE SET role = 'guardian', granted_by = EXCLUDED.granted_by, revoked_at = NULL,
      can_view_progress = true, can_view_audio = true, can_assign_practice = EXCLUDED.can_assign_practice,
      can_edit_child = false, can_export_report = true;
    UPDATE join_codes SET uses = uses + 1 WHERE id = jc.id;
    IF jc.organization_id IS NULL THEN
      PERFORM notify_user(jc.created_by, 'guardian_linked', 'ผู้ปกครองร่วมเชื่อมบัญชีแล้ว',
        who || ' (' || relation || ') ดูผลของ ' || (SELECT name FROM child_profiles WHERE id = target) || ' ได้แล้ว', '/profile');
    ELSE
      FOR recipient IN SELECT ct.teacher_user_id FROM classroom_teachers ct WHERE ct.classroom_id = child_classroom(target) LOOP
        PERFORM notify_user(recipient, 'guardian_linked', 'ผู้ปกครองเชื่อมบัญชีแล้ว',
          who || ' (' || relation || ') เชื่อมกับ ' || (SELECT name FROM child_profiles WHERE id = target) || ' ด้วยใบเชิญ', '/teacher');
      END LOOP;
    END IF;
    RETURN jsonb_build_object('result', 'linked', 'child_id', target);
  END IF;

  IF jc.kind = 'teacher' THEN
    IF NOT can_take_role(me, 'teacher') THEN
      RAISE EXCEPTION 'บัญชีนี้มีข้อมูลบทบาทอื่นอยู่แล้ว กรุณาใช้บัญชีครูแยก' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (SELECT 1 FROM organization_members WHERE organization_id = jc.organization_id AND user_id = me AND status = 'active') THEN
      RETURN jsonb_build_object('result', 'joined', 'organization_id', jc.organization_id, 'already', true);
    END IF;
    PERFORM set_account_role(me, 'teacher');
    INSERT INTO join_requests (code_id, kind, organization_id, classroom_id, requester_id, requester_name)
    VALUES (jc.id, jc.kind, jc.organization_id, jc.classroom_id, me, who)
    ON CONFLICT DO NOTHING RETURNING id INTO request_id;
    IF request_id IS NULL THEN RETURN jsonb_build_object('result', 'requested', 'already', true); END IF;
    UPDATE join_codes SET uses = uses + 1 WHERE id = jc.id;
    FOR recipient IN SELECT user_id FROM organization_members
      WHERE organization_id = jc.organization_id AND role IN ('owner', 'admin') AND status = 'active' LOOP
      PERFORM notify_user(recipient, 'join_request', 'มีครูขอเข้าร่วมโรงเรียน', who || ' ขอเข้าร่วม ' || school, '/inbox');
    END LOOP;
    RETURN jsonb_build_object('result', 'requested', 'request_id', request_id);
  END IF;

  -- school_admin
  IF NOT can_take_role(me, 'school_admin') THEN
    RAISE EXCEPTION 'บัญชีนี้มีข้อมูลบทบาทอื่นอยู่แล้ว กรุณาใช้บัญชีแยกสำหรับผู้ดูแลโรงเรียน' USING ERRCODE = '42501';
  END IF;
  PERFORM set_account_role(me, 'school_admin');
  INSERT INTO organization_members AS m (organization_id, user_id, role, status)
  VALUES (jc.organization_id, me, 'admin', 'active')
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'admin', status = 'active';
  UPDATE join_codes SET uses = uses + 1 WHERE id = jc.id;
  UPDATE organizations AS o SET created_by = me FROM auth.users AS creator
    WHERE o.id = jc.organization_id AND o.created_by = creator.id
      AND creator.raw_app_meta_data -> 'platform_admin' = 'true'::jsonb;
  PERFORM notify_user(jc.created_by, 'school_admin_joined', 'ผู้ดูแลโรงเรียนเข้าร่วมแล้ว', who || ' เป็นผู้ดูแล ' || school, '/platform');
  RETURN jsonb_build_object('result', 'joined', 'organization_id', jc.organization_id);
END;
$$;

-- ── 2. expire what is still waiting ────────────────────────────────────────

UPDATE public.invitations SET status = 'expired', updated_at = now() WHERE status = 'pending';
UPDATE public.school_teacher_invitations SET expires_at = least(expires_at, now()) WHERE accepted_by IS NULL;
UPDATE public.school_admin_invitations SET expires_at = least(expires_at, now()) WHERE accepted_by IS NULL;

-- No new rows from the API either.
CREATE POLICY "invitations: retired" ON public.invitations AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);

-- ── 3. old entry points now explain what to do instead ─────────────────────

CREATE OR REPLACE FUNCTION public.retired_email_invitation() RETURNS void
LANGUAGE plpgsql VOLATILE AS $$
BEGIN
  RAISE EXCEPTION 'คำเชิญทางอีเมลเลิกใช้แล้ว กรุณาขอใบเชิญหรือรหัสเข้าร่วมใหม่ แล้วใช้ที่หน้า “ใช้รหัสเข้าร่วม”'
    USING ERRCODE = '0A000';
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_guardian_inbox_invite(p_invitation_id uuid, p_relationship text) RETURNS uuid
LANGUAGE plpgsql AS $$ BEGIN PERFORM retired_email_invitation(); RETURN NULL; END; $$;
CREATE OR REPLACE FUNCTION public.accept_invitation_by_token(p_token text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN PERFORM retired_email_invitation(); END; $$;
CREATE OR REPLACE FUNCTION public.accept_invitation_with_access(p_token text, p_user_id uuid) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN PERFORM retired_email_invitation(); END; $$;
CREATE OR REPLACE FUNCTION public.accept_school_admin_invitation(p_token uuid) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN PERFORM retired_email_invitation(); END; $$;
CREATE OR REPLACE FUNCTION public.accept_school_teacher_invitation(p_token uuid) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN PERFORM retired_email_invitation(); END; $$;
CREATE OR REPLACE FUNCTION public.create_first_guardian_invite(p_child_id uuid, p_email text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN PERFORM retired_email_invitation(); END; $$;
CREATE OR REPLACE FUNCTION public.create_guardian_invite(p_child_id uuid, p_email text) RETURNS jsonb
LANGUAGE plpgsql AS $$ BEGIN PERFORM retired_email_invitation(); RETURN NULL; END; $$;
CREATE OR REPLACE FUNCTION public.create_platform_school(p_name text, p_admin_email text) RETURNS uuid
LANGUAGE plpgsql AS $$ BEGIN PERFORM retired_email_invitation(); RETURN NULL; END; $$;
CREATE OR REPLACE FUNCTION public.create_school_admin_invitation(p_organization_id uuid, p_email text) RETURNS uuid
LANGUAGE plpgsql AS $$ BEGIN PERFORM retired_email_invitation(); RETURN NULL; END; $$;
CREATE OR REPLACE FUNCTION public.create_school_teacher_invitation(p_organization_id uuid, p_email text) RETURNS uuid
LANGUAGE plpgsql AS $$ BEGIN PERFORM retired_email_invitation(); RETURN NULL; END; $$;
CREATE OR REPLACE FUNCTION public.send_guardian_inbox_invite(p_child_id uuid, p_email text) RETURNS uuid
LANGUAGE plpgsql AS $$ BEGIN PERFORM retired_email_invitation(); RETURN NULL; END; $$;
CREATE OR REPLACE FUNCTION public.submit_first_guardian_request(p_token text, p_name text, p_relationship text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN PERFORM retired_email_invitation(); END; $$;
-- Parent activation codes (school-prepared accounts) are replaced by guardian join codes.
CREATE OR REPLACE FUNCTION public.lookup_parent_setup(p_organization_id uuid, p_email text) RETURNS jsonb
LANGUAGE plpgsql AS $$ BEGIN PERFORM retired_email_invitation(); RETURN NULL; END; $$;
CREATE OR REPLACE FUNCTION public.matches_parent_activation(p_email text, p_code text) RETURNS boolean
LANGUAGE sql AS $$ SELECT false; $$;

COMMIT;
