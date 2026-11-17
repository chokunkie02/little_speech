-- Join codes + unified inbox (plan D1/D2).
--
-- Nobody types another person's email any more. The level above hands out a short code / QR:
--   guardian            per-student slip      → parent links immediately, classroom teachers are notified
--   classroom_guardian  classroom QR          → parent picks their child, a classroom teacher approves
--   teacher             school join code      → teacher asks to join, a school admin approves (+ picks a room)
--   school_admin        one-time admin code   → issued by a platform admin, joins immediately
-- Approvals and results arrive in the in-app inbox (join_requests + notifications).

BEGIN;

CREATE TYPE public.join_code_kind AS ENUM ('guardian', 'classroom_guardian', 'teacher', 'school_admin');

CREATE TABLE public.join_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-HJ-KM-NP-Z2-9]{8}$'),
  kind public.join_code_kind NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
  child_id uuid REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_uses integer NOT NULL CHECK (max_uses > 0),
  uses integer NOT NULL DEFAULT 0 CHECK (uses >= 0),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'guardian') = (child_id IS NOT NULL)),
  CHECK (kind <> 'classroom_guardian' OR classroom_id IS NOT NULL)
);
CREATE INDEX join_codes_lookup ON public.join_codes (kind, organization_id, classroom_id, child_id, created_by)
  WHERE revoked_at IS NULL;

CREATE TABLE public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid REFERENCES public.join_codes(id) ON DELETE SET NULL,
  kind public.join_code_kind NOT NULL CHECK (kind IN ('classroom_guardian', 'teacher')),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  child_id uuid REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name text NOT NULL CHECK (char_length(requester_name) BETWEEN 1 AND 120),
  relationship text CHECK (relationship IS NULL OR char_length(relationship) BETWEEN 1 AND 60),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- One open request per person per target.
CREATE UNIQUE INDEX join_requests_one_pending ON public.join_requests
  (requester_id, kind, organization_id, coalesce(child_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status = 'pending';

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text CHECK (link IS NULL OR link ~ '^/'),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX notifications_user_recent ON public.notifications (user_id, created_at DESC);

-- Codes and requests are reached through the functions below only.
ALTER TABLE public.join_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.join_codes, public.join_requests FROM anon, authenticated;
REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT, UPDATE (read_at) ON public.notifications TO authenticated;
CREATE POLICY "notifications: own select" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications: own mark read" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── helpers ─────────────────────────────────────────────────────────────────

CREATE FUNCTION public.normalize_join_code(p_code text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

CREATE FUNCTION public.new_join_code() RETURNS text
LANGUAGE plpgsql VOLATILE SET search_path = public, pg_temp AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
BEGIN
  LOOP
    SELECT string_agg(substr(alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(alphabet)), 1), '')
      INTO candidate FROM generate_series(1, 8);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM join_codes WHERE code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- "ก้อง ใจดี" (ชื่อเล่น ก้อง) → "ก้อง ใ. (ก้อง)" so a code preview never shows a full name.
CREATE FUNCTION public.masked_child_name(p_name text, p_nickname text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT split_part(btrim(p_name), ' ', 1)
    || CASE WHEN position(' ' IN btrim(p_name)) > 0
         THEN ' ' || left(regexp_replace(btrim(p_name), '^\S+\s+', ''), 1) || '.' ELSE '' END
    || CASE WHEN nullif(btrim(p_nickname), '') IS NOT NULL THEN ' (' || btrim(p_nickname) || ')' ELSE '' END;
$$;

CREATE FUNCTION public.account_display_name(p_user_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT coalesce(nullif(btrim(raw_user_meta_data ->> 'full_name'), ''), split_part(email, '@', 1))
  FROM auth.users WHERE id = p_user_id;
$$;

CREATE FUNCTION public.notify_user(p_user_id uuid, p_kind text, p_title text, p_body text, p_link text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  INSERT INTO notifications (user_id, kind, title, body, link) VALUES (p_user_id, p_kind, p_title, p_body, p_link);
$$;

CREATE FUNCTION public.child_classroom(p_child_id uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT cs.classroom_id FROM classroom_students cs JOIN classrooms c ON c.id = cs.classroom_id
  JOIN child_profiles cp ON cp.id = cs.child_id AND cp.organization_id = c.organization_id
  WHERE cs.child_id = p_child_id ORDER BY cs.classroom_id LIMIT 1;
$$;

-- An account may change role through a code only while it holds no data of another role.
CREATE FUNCTION public.can_take_role(p_user_id uuid, p_role text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE
    WHEN coalesce(u.raw_app_meta_data -> 'platform_admin', 'false'::jsonb) = 'true'::jsonb THEN false
    WHEN coalesce(u.raw_user_meta_data ->> 'role', 'parent') = p_role THEN true
    ELSE NOT EXISTS (SELECT 1 FROM child_access ca WHERE ca.user_id = u.id AND ca.revoked_at IS NULL)
      AND NOT EXISTS (SELECT 1 FROM child_profiles cp WHERE cp.user_id = u.id AND cp.organization_id IS NULL)
      AND NOT EXISTS (SELECT 1 FROM organization_members m WHERE m.user_id = u.id AND m.status = 'active')
  END
  FROM auth.users u WHERE u.id = p_user_id;
$$;

CREATE FUNCTION public.set_account_role(p_user_id uuid, p_role text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  UPDATE auth.users SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', p_role)
  WHERE id = p_user_id AND coalesce(raw_user_meta_data ->> 'role', 'parent') <> p_role;
$$;

CREATE FUNCTION public.can_manage_join_code(p_kind public.join_code_kind, p_org uuid, p_classroom uuid, p_child uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE p_kind
    WHEN 'guardian' THEN is_student_classroom_teacher(p_child) OR is_org_admin(p_org) OR is_active_school_guardian(p_child)
    WHEN 'classroom_guardian' THEN is_classroom_teacher(p_classroom) OR is_org_admin(p_org)
    WHEN 'teacher' THEN is_org_admin(p_org)
    WHEN 'school_admin' THEN is_platform_admin()
  END;
$$;

-- ── issuing codes ───────────────────────────────────────────────────────────

-- Returns the caller's active code for a target, creating one when missing or when p_rotate
-- (rotating revokes the old code, e.g. after a slip was lost).
CREATE FUNCTION public.issue_join_code(
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
    SELECT organization_id INTO org FROM child_profiles WHERE id = p_child_id AND archived_at IS NULL;
    room := child_classroom(p_child_id);
  ELSIF p_kind = 'classroom_guardian' THEN
    SELECT organization_id INTO org FROM classrooms WHERE id = p_classroom_id;
  END IF;
  IF org IS NULL OR NOT is_school_organization(org) OR NOT can_manage_join_code(p_kind, org, room, p_child_id) THEN
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
    WHERE kind = p_kind AND organization_id = org AND created_by = auth.uid()
      AND classroom_id IS NOT DISTINCT FROM (CASE WHEN p_kind = 'guardian' THEN classroom_id ELSE room END)
      AND child_id IS NOT DISTINCT FROM p_child_id
      AND revoked_at IS NULL AND expires_at > now() AND uses < max_uses
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF FOUND AND NOT p_rotate THEN
    RETURN to_jsonb(jc) - 'created_by';
  END IF;
  IF FOUND THEN
    UPDATE join_codes SET revoked_at = now() WHERE id = jc.id;
  END IF;

  INSERT INTO join_codes (code, kind, organization_id, classroom_id, child_id, created_by, max_uses, expires_at)
  VALUES (new_join_code(), p_kind, org, room, p_child_id, auth.uid(), cap, now() + lifetime)
  RETURNING * INTO jc;
  RETURN to_jsonb(jc) - 'created_by';
END;
$$;

CREATE FUNCTION public.revoke_join_code(p_code_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE jc join_codes%ROWTYPE;
BEGIN
  SELECT * INTO jc FROM join_codes WHERE id = p_code_id FOR UPDATE;
  IF NOT FOUND OR NOT (jc.created_by = auth.uid()
    OR can_manage_join_code(jc.kind, jc.organization_id, jc.classroom_id, jc.child_id)) THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์ยกเลิกรหัสนี้' USING ERRCODE = '42501';
  END IF;
  UPDATE join_codes SET revoked_at = coalesce(revoked_at, now()) WHERE id = p_code_id;
END;
$$;

-- ── using codes ─────────────────────────────────────────────────────────────

-- Safe to call before signing in: shows only what the holder of the slip already knows.
CREATE FUNCTION public.preview_join_code(p_code text) RETURNS jsonb
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
    -- Masked names so a parent can pick their child from the class list.
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
    'school_name', (SELECT name FROM organizations WHERE id = jc.organization_id),
    'classroom_name', (SELECT name FROM classrooms WHERE id = coalesce(jc.classroom_id, child_classroom(jc.child_id))),
    'child_name', CASE WHEN jc.kind = 'guardian' AND child.archived_at IS NULL THEN masked_child_name(child.name, child.nickname) END,
    'students', students,
    'expires_at', jc.expires_at
  );
END;
$$;

-- Redeems a code for the signed-in account. Returns {result: linked|requested|joined, ...}.
CREATE FUNCTION public.redeem_join_code(
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
      SELECT 1 FROM child_profiles cp WHERE cp.id = target AND cp.archived_at IS NULL AND cp.organization_id = jc.organization_id
        AND (jc.kind = 'guardian' OR EXISTS (SELECT 1 FROM classroom_students cs WHERE cs.child_id = cp.id AND cs.classroom_id = jc.classroom_id))
    ) THEN RAISE EXCEPTION 'กรุณาเลือกชื่อนักเรียนจากรายชื่อห้อง'; END IF;
    IF EXISTS (SELECT 1 FROM child_access WHERE child_id = target AND user_id = me AND role = 'guardian' AND revoked_at IS NULL) THEN
      RETURN jsonb_build_object('result', 'linked', 'child_id', target, 'already', true);
    END IF;
    IF (SELECT count(*) FROM child_access WHERE child_id = target AND role = 'guardian' AND revoked_at IS NULL) >= 4 THEN
      RAISE EXCEPTION 'นักเรียนคนนี้มีผู้ปกครองครบ 4 บัญชีแล้ว กรุณาติดต่อครูประจำห้อง';
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
    VALUES (target, me, 'guardian', jc.created_by, true, true, false, false, true)
    ON CONFLICT (child_id, user_id) DO UPDATE SET role = 'guardian', granted_by = EXCLUDED.granted_by, revoked_at = NULL,
      can_view_progress = true, can_view_audio = true, can_assign_practice = false, can_edit_child = false, can_export_report = true;
    UPDATE join_codes SET uses = uses + 1 WHERE id = jc.id;
    FOR recipient IN SELECT ct.teacher_user_id FROM classroom_teachers ct WHERE ct.classroom_id = child_classroom(target) LOOP
      PERFORM notify_user(recipient, 'guardian_linked', 'ผู้ปกครองเชื่อมบัญชีแล้ว',
        who || ' (' || relation || ') เชื่อมกับ ' || (SELECT name FROM child_profiles WHERE id = target) || ' ด้วยใบเชิญ', '/teacher');
    END LOOP;
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
  -- Hand a platform-created school to its first admin (students are owned by organizations.created_by).
  UPDATE organizations AS o SET created_by = me FROM auth.users AS creator
    WHERE o.id = jc.organization_id AND o.created_by = creator.id
      AND creator.raw_app_meta_data -> 'platform_admin' = 'true'::jsonb;
  PERFORM notify_user(jc.created_by, 'school_admin_joined', 'ผู้ดูแลโรงเรียนเข้าร่วมแล้ว', who || ' เป็นผู้ดูแล ' || school, '/platform');
  RETURN jsonb_build_object('result', 'joined', 'organization_id', jc.organization_id);
END;
$$;

-- ── approvals ───────────────────────────────────────────────────────────────

CREATE FUNCTION public.review_join_request(p_request_id uuid, p_approve boolean, p_classroom_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  req join_requests%ROWTYPE;
  school text;
  child_name text;
  room uuid;
BEGIN
  SELECT * INTO req FROM join_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR NOT (
    (req.kind = 'classroom_guardian' AND (is_student_classroom_teacher(req.child_id) OR is_org_admin(req.organization_id)))
    OR (req.kind = 'teacher' AND is_org_admin(req.organization_id))
  ) THEN RAISE EXCEPTION 'คุณไม่มีสิทธิ์พิจารณาคำขอนี้' USING ERRCODE = '42501'; END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'คำขอนี้ได้รับการพิจารณาแล้ว'; END IF;
  SELECT name INTO school FROM organizations WHERE id = req.organization_id;

  IF p_approve AND req.kind = 'classroom_guardian' THEN
    IF (SELECT count(*) FROM child_access WHERE child_id = req.child_id AND role = 'guardian' AND revoked_at IS NULL) >= 4 THEN
      RAISE EXCEPTION 'นักเรียนคนนี้มีผู้ปกครองครบ 4 บัญชีแล้ว';
    END IF;
    INSERT INTO child_access (child_id, user_id, role, granted_by, can_view_progress, can_view_audio,
      can_assign_practice, can_edit_child, can_export_report)
    VALUES (req.child_id, req.requester_id, 'guardian', auth.uid(), true, true, false, false, true)
    ON CONFLICT (child_id, user_id) DO UPDATE SET role = 'guardian', granted_by = EXCLUDED.granted_by, revoked_at = NULL,
      can_view_progress = true, can_view_audio = true, can_assign_practice = false, can_edit_child = false, can_export_report = true;
  ELSIF p_approve AND req.kind = 'teacher' THEN
    room := coalesce(p_classroom_id, req.classroom_id);
    IF room IS NOT NULL AND NOT EXISTS (SELECT 1 FROM classrooms WHERE id = room AND organization_id = req.organization_id) THEN
      RAISE EXCEPTION 'ไม่พบห้องเรียนนี้ในโรงเรียน';
    END IF;
    IF NOT can_take_role(req.requester_id, 'teacher') THEN
      RAISE EXCEPTION 'บัญชีนี้เปลี่ยนเป็นบัญชีครูไม่ได้แล้ว';
    END IF;
    PERFORM set_account_role(req.requester_id, 'teacher');
    INSERT INTO organization_members AS m (organization_id, user_id, role, status)
    VALUES (req.organization_id, req.requester_id, 'teacher', 'active')
    ON CONFLICT (organization_id, user_id) DO UPDATE SET status = 'active' WHERE m.role = 'teacher';
    IF room IS NOT NULL THEN
      INSERT INTO classroom_teachers (classroom_id, teacher_user_id) VALUES (room, req.requester_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  UPDATE join_requests SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    reviewed_by = auth.uid(), reviewed_at = now(), classroom_id = coalesce(room, classroom_id)
  WHERE id = req.id;

  child_name := (SELECT name FROM child_profiles WHERE id = req.child_id);
  PERFORM notify_user(req.requester_id, CASE WHEN p_approve THEN 'request_approved' ELSE 'request_rejected' END,
    CASE WHEN p_approve THEN 'คำขอได้รับการอนุมัติแล้ว' ELSE 'คำขอไม่ได้รับการอนุมัติ' END,
    CASE WHEN req.kind = 'teacher' THEN school ELSE child_name || ' · ' || school END,
    CASE WHEN NOT p_approve THEN '/inbox' WHEN req.kind = 'teacher' THEN '/teacher' ELSE '/dashboard' END);
END;
$$;

CREATE FUNCTION public.cancel_join_request(p_request_id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  UPDATE join_requests SET status = 'cancelled', reviewed_at = now()
  WHERE id = p_request_id AND requester_id = auth.uid() AND status = 'pending';
$$;

-- ── inbox ───────────────────────────────────────────────────────────────────

-- Everything the signed-in account should see in /inbox, in one round trip.
CREATE FUNCTION public.list_my_inbox() RETURNS jsonb
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
    ), '[]'::jsonb),
    'my_requests', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'kind', r.kind, 'status', r.status, 'school_name', o.name, 'child_name', cp.name,
        'classroom_name', c.name, 'created_at', r.created_at, 'reviewed_at', r.reviewed_at) ORDER BY r.created_at DESC)
      FROM join_requests r JOIN organizations o ON o.id = r.organization_id
      LEFT JOIN classrooms c ON c.id = r.classroom_id
      LEFT JOIN child_profiles cp ON cp.id = r.child_id
      WHERE r.requester_id = auth.uid() AND (r.status = 'pending' OR r.reviewed_at > now() - interval '30 days')
    ), '[]'::jsonb),
    'notifications', coalesce((
      SELECT jsonb_agg(to_jsonb(n) - 'user_id' ORDER BY n.created_at DESC)
      FROM (SELECT * FROM notifications WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 50) n
    ), '[]'::jsonb),
    'unread', (SELECT count(*) FROM notifications WHERE user_id = auth.uid() AND read_at IS NULL)
  );
$$;

CREATE FUNCTION public.mark_notifications_read(p_ids uuid[] DEFAULT NULL) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  UPDATE notifications SET read_at = now()
  WHERE user_id = auth.uid() AND read_at IS NULL AND (p_ids IS NULL OR id = ANY (p_ids));
$$;

-- Platform admins create a school by name only, then hand its admin a one-time code.
CREATE FUNCTION public.create_school_by_platform(p_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE school_name text := btrim(p_name); school_id uuid;
BEGIN
  IF NOT is_platform_admin() THEN RAISE EXCEPTION 'บัญชีนี้ไม่มีสิทธิ์สร้างโรงเรียน' USING ERRCODE = '42501'; END IF;
  IF school_name IS NULL OR char_length(school_name) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'กรุณากรอกชื่อโรงเรียนไม่เกิน 120 ตัวอักษร';
  END IF;
  INSERT INTO organizations (name, type, created_by) VALUES (school_name, 'school', auth.uid()) RETURNING id INTO school_id;
  RETURN school_id;
END;
$$;

-- ── grants ──────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.new_join_code(), public.account_display_name(uuid),
  public.notify_user(uuid, text, text, text, text), public.child_classroom(uuid), public.can_take_role(uuid, text),
  public.set_account_role(uuid, text), public.can_manage_join_code(public.join_code_kind, uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION
  public.issue_join_code(public.join_code_kind, uuid, uuid, uuid, boolean), public.revoke_join_code(uuid),
  public.redeem_join_code(text, text, boolean, uuid, text), public.review_join_request(uuid, boolean, uuid),
  public.cancel_join_request(uuid), public.list_my_inbox(), public.mark_notifications_read(uuid[]),
  public.create_school_by_platform(text), public.preview_join_code(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.issue_join_code(public.join_code_kind, uuid, uuid, uuid, boolean), public.revoke_join_code(uuid),
  public.redeem_join_code(text, text, boolean, uuid, text), public.review_join_request(uuid, boolean, uuid),
  public.cancel_join_request(uuid), public.list_my_inbox(), public.mark_notifications_read(uuid[]),
  public.create_school_by_platform(text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_join_code(text) TO anon, authenticated;

COMMIT;
