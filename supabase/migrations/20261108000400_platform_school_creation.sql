CREATE FUNCTION public.create_platform_school(p_name text, p_admin_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  school_name text := btrim(p_name);
  school_id uuid;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'บัญชีนี้ไม่มีสิทธิ์สร้างโรงเรียนจากหน้าแอดมินระบบ' USING ERRCODE = '42501';
  END IF;
  IF school_name IS NULL OR char_length(school_name) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'กรุณากรอกชื่อโรงเรียนไม่เกิน 120 ตัวอักษร' USING ERRCODE = '22023';
  END IF;

  INSERT INTO organizations (name, type, created_by)
  VALUES (school_name, 'school', auth.uid()) RETURNING id INTO school_id;

  PERFORM create_school_admin_invitation(school_id, p_admin_email);
  RETURN school_id;
END;
$$;

-- School student creation uses organizations.created_by for the initial
-- child owner. Hand off the school to its first accepting administrator.
CREATE FUNCTION public.handoff_platform_school_to_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE organizations AS school
  SET created_by = NEW.accepted_by
  FROM auth.users AS creator
  WHERE school.id = NEW.organization_id AND school.created_by = creator.id
    AND creator.raw_app_meta_data -> 'platform_admin' = 'true'::jsonb;
  RETURN NEW;
END;
$$;

CREATE TRIGGER handoff_platform_school_to_admin
AFTER UPDATE OF accepted_by ON public.school_admin_invitations
FOR EACH ROW
WHEN (OLD.accepted_by IS NULL AND NEW.accepted_by IS NOT NULL)
EXECUTE FUNCTION public.handoff_platform_school_to_admin();

REVOKE EXECUTE ON FUNCTION public.handoff_platform_school_to_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_platform_school(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_platform_school(text, text) TO authenticated;
