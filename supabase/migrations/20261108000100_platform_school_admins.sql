-- Platform privileges come from service-managed Auth app metadata.
CREATE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_app_meta_data -> 'platform_admin' = 'true'::jsonb
  );
$$;

CREATE FUNCTION public.is_school_organization(p_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id AND type = 'school');
$$;

-- The existing creation RPC still creates the first owner atomically.
CREATE OR REPLACE FUNCTION public.create_school_organization(p_name text, p_type organization_type)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  school_id uuid;
BEGIN
  IF auth.uid() IS NULL OR is_platform_admin() THEN
    RAISE EXCEPTION 'บัญชีนี้ไม่สามารถสมัครโรงเรียนได้' USING ERRCODE = '42501';
  END IF;

  INSERT INTO organizations (name, type, created_by)
  VALUES (p_name, p_type, auth.uid()) RETURNING id INTO school_id;
  INSERT INTO organization_members (organization_id, user_id, role, status)
  VALUES (school_id, auth.uid(), 'owner', 'active');
  RETURN school_id;
END;
$$;

ALTER POLICY "organizations: creator insert" ON public.organizations
WITH CHECK (created_by = auth.uid() AND NOT is_platform_admin());

-- Organization types cannot be changed through the member API to bypass school policies.
ALTER POLICY "organizations: admin update" ON public.organizations
WITH CHECK (is_org_admin(id) AND (type = 'school') = is_school_organization(id));

ALTER POLICY "org_members: admin or creator insert" ON public.organization_members
WITH CHECK (
  NOT is_platform_admin()
  AND (
    (NOT is_school_organization(organization_id) AND (
      is_org_admin(organization_id) OR (user_id = auth.uid() AND is_org_creator(organization_id))
    ))
    OR (is_org_admin(organization_id) AND role NOT IN ('owner', 'admin'))
  )
);

ALTER POLICY "org_members: admin update" ON public.organization_members
USING (is_org_admin(organization_id) AND (
  NOT is_school_organization(organization_id) OR role NOT IN ('owner', 'admin')
))
WITH CHECK (is_org_admin(organization_id) AND (
  NOT is_school_organization(organization_id) OR role NOT IN ('owner', 'admin')
));

ALTER POLICY "org_members: admin delete" ON public.organization_members
USING (is_org_admin(organization_id) AND (
  NOT is_school_organization(organization_id) OR role NOT IN ('owner', 'admin')
));

-- Service-provisioned platform accounts must stay separate from school and family accounts.
CREATE FUNCTION public.reject_platform_user_data_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auth.users WHERE id = NEW.user_id
      AND raw_app_meta_data -> 'platform_admin' = 'true'::jsonb
  ) THEN
    RAISE EXCEPTION 'บัญชีแอดมินระบบใช้สำหรับดูแลระบบเท่านั้น' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reject_platform_user_data_link() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reject_platform_member BEFORE INSERT OR UPDATE OF user_id
  ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.reject_platform_user_data_link();
CREATE TRIGGER reject_platform_child_grant BEFORE INSERT OR UPDATE OF user_id
  ON public.child_access FOR EACH ROW EXECUTE FUNCTION public.reject_platform_user_data_link();
CREATE TRIGGER reject_platform_child_owner BEFORE INSERT OR UPDATE OF user_id
  ON public.child_profiles FOR EACH ROW EXECUTE FUNCTION public.reject_platform_user_data_link();

-- School removal is outside the approved workflow for both school-admin roles.
ALTER POLICY "organizations: owner delete" ON public.organizations
USING (created_by = auth.uid() AND type <> 'school');

CREATE TABLE public.school_admin_invitations (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (organization_id, email)
);

ALTER TABLE public.school_admin_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.school_admin_invitations FROM anon, authenticated;

CREATE FUNCTION public.list_platform_schools()
RETURNS TABLE (
  id uuid, name text, created_at timestamptz, admin_count bigint, teacher_count bigint,
  classroom_count bigint, student_count bigint, recent_sessions bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'บัญชีนี้ไม่มีสิทธิ์แอดมินระบบ' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT o.id, o.name, o.created_at,
    (SELECT count(*) FROM organization_members m WHERE m.organization_id = o.id
      AND m.role IN ('owner', 'admin') AND m.status = 'active'),
    (SELECT count(DISTINCT ct.teacher_user_id)
      FROM classrooms c JOIN classroom_teachers ct ON ct.classroom_id = c.id WHERE c.organization_id = o.id),
    (SELECT count(*) FROM classrooms c WHERE c.organization_id = o.id),
    (SELECT count(*) FROM child_profiles cp WHERE cp.organization_id = o.id AND cp.archived_at IS NULL),
    (SELECT count(*) FROM child_profiles cp JOIN practice_sessions ps ON ps.child_id = cp.id
      WHERE cp.organization_id = o.id AND ps.status = 'completed' AND ps.started_at >= now() - interval '7 days')
  FROM organizations o WHERE o.type = 'school'
  ORDER BY o.name, o.id;
END;
$$;

CREATE FUNCTION public.rename_platform_school(p_organization_id uuid, p_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  school_name text := btrim(p_name);
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'บัญชีนี้ไม่มีสิทธิ์แอดมินระบบ' USING ERRCODE = '42501';
  END IF;
  IF school_name IS NULL OR char_length(school_name) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'กรุณากรอกชื่อโรงเรียนไม่เกิน 120 ตัวอักษร' USING ERRCODE = '22023';
  END IF;

  UPDATE organizations SET name = school_name WHERE id = p_organization_id AND type = 'school';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบโรงเรียนนี้' USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE FUNCTION public.get_platform_school_admins(p_organization_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'บัญชีนี้ไม่มีสิทธิ์แอดมินระบบ' USING ERRCODE = '42501';
  END IF;
  IF NOT is_school_organization(p_organization_id) THEN
    RAISE EXCEPTION 'ไม่พบโรงเรียนนี้' USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object(
    'admins', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('email', u.email) ORDER BY u.email)
      FROM organization_members m JOIN auth.users u ON u.id = m.user_id
      WHERE m.organization_id = p_organization_id AND m.status = 'active' AND m.role IN ('owner', 'admin')
    ), '[]'::jsonb),
    'invitations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'email', i.email,
        'token', CASE WHEN i.accepted_by IS NULL AND i.expires_at > now() THEN i.token END,
        'status', CASE WHEN i.accepted_by IS NOT NULL THEN 'accepted'
          WHEN i.expires_at <= now() THEN 'expired' ELSE 'pending' END
      ) ORDER BY i.email)
      FROM school_admin_invitations i WHERE i.organization_id = p_organization_id
    ), '[]'::jsonb)
  );
END;
$$;

CREATE FUNCTION public.create_school_admin_invitation(p_organization_id uuid, p_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  address text := lower(btrim(p_email));
  invitation_token uuid;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'บัญชีนี้ไม่มีสิทธิ์เชิญแอดมินโรงเรียน' USING ERRCODE = '42501';
  END IF;
  IF NOT is_school_organization(p_organization_id) THEN
    RAISE EXCEPTION 'ไม่พบโรงเรียนนี้' USING ERRCODE = '22023';
  END IF;
  IF address IS NULL OR char_length(address) > 254 OR address !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
    RAISE EXCEPTION 'กรุณากรอกอีเมลให้ถูกต้อง' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM auth.users u
    LEFT JOIN organization_members m ON m.user_id = u.id AND m.organization_id = p_organization_id
    WHERE lower(u.email) = address AND (
      u.raw_app_meta_data -> 'platform_admin' = 'true'::jsonb
      OR (m.role IN ('owner', 'admin') AND m.status = 'active')
    )
  ) THEN
    RAISE EXCEPTION 'บัญชีนี้เป็นแอดมินอยู่แล้ว' USING ERRCODE = '22023';
  END IF;

  INSERT INTO school_admin_invitations AS i (organization_id, email) VALUES (p_organization_id, address)
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

CREATE FUNCTION public.get_school_admin_invitation(p_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object('school_name', o.name, 'status',
    CASE WHEN i.accepted_by IS NOT NULL THEN 'accepted'
         WHEN i.expires_at <= now() THEN 'expired' ELSE 'pending' END)
  FROM school_admin_invitations i JOIN organizations o ON o.id = i.organization_id
  WHERE i.token = p_token;
$$;

CREATE FUNCTION public.accept_school_admin_invitation(p_token uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  invitation school_admin_invitations%ROWTYPE;
BEGIN
  SELECT * INTO invitation FROM school_admin_invitations WHERE token = p_token FOR UPDATE;
  IF NOT FOUND OR is_platform_admin() OR NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() AND lower(u.email) = invitation.email
      AND u.email_confirmed_at IS NOT NULL AND u.raw_user_meta_data ->> 'role' = 'school_admin'
  ) THEN
    RAISE EXCEPTION 'กรุณาใช้บัญชีแอดมินโรงเรียนที่ยืนยันอีเมลตรงกับคำเชิญ' USING ERRCODE = '42501';
  END IF;
  IF invitation.accepted_by = auth.uid() THEN RETURN; END IF;
  IF invitation.accepted_by IS NOT NULL OR invitation.expires_at <= now() THEN
    RAISE EXCEPTION 'คำเชิญนี้ถูกใช้แล้วหรือหมดอายุ' USING ERRCODE = '22023';
  END IF;

  INSERT INTO organization_members AS m (organization_id, user_id, role, status)
  VALUES (invitation.organization_id, auth.uid(), 'admin', 'active')
  ON CONFLICT (organization_id, user_id) DO UPDATE SET status = 'active'
  WHERE m.role IN ('owner', 'admin') AND m.status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'บัญชีนี้มีสถานะสมาชิกโรงเรียนที่ไม่สามารถใช้คำเชิญนี้ได้' USING ERRCODE = '42501';
  END IF;

  UPDATE school_admin_invitations SET accepted_by = auth.uid() WHERE token = p_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_platform_admin(), public.is_school_organization(uuid),
  public.list_platform_schools(), public.rename_platform_school(uuid, text),
  public.get_platform_school_admins(uuid), public.create_school_admin_invitation(uuid, text),
  public.accept_school_admin_invitation(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_school_admin_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(), public.is_school_organization(uuid),
  public.list_platform_schools(), public.rename_platform_school(uuid, text),
  public.get_platform_school_admins(uuid), public.create_school_admin_invitation(uuid, text),
  public.accept_school_admin_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_school_admin_invitation(uuid) TO anon, authenticated;
