-- Real names for every account (plan F1). Until now sign-up stored only email + password, so
-- staff saw people as their email prefix. The private profile (phone, consent) is readable only
-- by its owner; the public display name is copied to user_display_profiles for lists.

BEGIN;

CREATE TABLE public.account_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  title text CHECK (title IS NULL OR title IN ('นาย', 'นาง', 'นางสาว', 'ครู', 'ดร.')),
  first_name text NOT NULL CHECK (char_length(btrim(first_name)) BETWEEN 1 AND 60),
  last_name text NOT NULL CHECK (char_length(btrim(last_name)) BETWEEN 1 AND 60),
  phone text CHECK (phone IS NULL OR phone ~ '^0[0-9]{8,9}$'),
  terms_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_profiles FROM anon, authenticated;
GRANT SELECT ON public.account_profiles TO authenticated;
CREATE POLICY "account profile: read own" ON public.account_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.user_display_profiles ADD COLUMN display_name text;

-- Name shown to others: "ชื่อ นามสกุล", then the old metadata name, then the email prefix.
CREATE OR REPLACE FUNCTION public.account_display_name(p_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT coalesce(
    (SELECT btrim(ap.first_name) || ' ' || btrim(ap.last_name) FROM account_profiles ap WHERE ap.user_id = p_user_id),
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    split_part(u.email, '@', 1))
  FROM auth.users u WHERE u.id = p_user_id;
$$;

CREATE FUNCTION public.normalize_thai_phone(p_phone text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '');
$$;

-- Writes the profile and keeps the public name copies in step. Used by the RPC and the sign-up trigger.
CREATE FUNCTION public.write_account_profile(p_user_id uuid, p_title text, p_first_name text, p_last_name text,
  p_phone text, p_accept_terms boolean) RETURNS public.account_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  first text := btrim(coalesce(p_first_name, ''));
  last text := btrim(coalesce(p_last_name, ''));
  phone text := normalize_thai_phone(p_phone);
  saved account_profiles;
BEGIN
  IF first = '' OR last = '' THEN RAISE EXCEPTION 'กรุณากรอกชื่อและนามสกุล'; END IF;
  IF char_length(first) > 60 OR char_length(last) > 60 THEN RAISE EXCEPTION 'ชื่อหรือนามสกุลยาวเกินไป'; END IF;
  IF phone IS NOT NULL AND phone !~ '^0[0-9]{8,9}$' THEN RAISE EXCEPTION 'เบอร์โทรไม่ถูกต้อง ใช้เบอร์ไทย 9–10 หลัก เช่น 0812345678'; END IF;
  INSERT INTO account_profiles AS ap (user_id, title, first_name, last_name, phone, terms_accepted_at)
  VALUES (p_user_id, nullif(btrim(coalesce(p_title, '')), ''), first, last, phone, CASE WHEN p_accept_terms THEN now() END)
  ON CONFLICT (user_id) DO UPDATE SET
    title = EXCLUDED.title, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, phone = EXCLUDED.phone,
    terms_accepted_at = coalesce(ap.terms_accepted_at, EXCLUDED.terms_accepted_at), updated_at = now()
  RETURNING * INTO saved;
  UPDATE user_display_profiles SET display_name = first || ' ' || last WHERE user_id = p_user_id;
  UPDATE auth.users SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', first || ' ' || last)
  WHERE id = p_user_id;
  RETURN saved;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.write_account_profile(uuid, text, text, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.write_account_profile(uuid, text, text, text, text, boolean) TO service_role; -- dev seed script

CREATE FUNCTION public.save_my_account_profile(p_title text, p_first_name text, p_last_name text,
  p_phone text DEFAULT NULL, p_accept_terms boolean DEFAULT false) RETURNS public.account_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'กรุณาเข้าสู่ระบบ' USING ERRCODE = '42501'; END IF;
  RETURN write_account_profile(auth.uid(), p_title, p_first_name, p_last_name, p_phone, p_accept_terms);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.save_my_account_profile(text, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_my_account_profile(text, text, text, text, boolean) TO authenticated;

-- Sign-up sends the name in user metadata; create the profile with the account.
-- A bad value never blocks sign-up: the app then asks for the name after the first sign-in.
CREATE FUNCTION public.create_account_profile_from_signup() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF coalesce(NEW.raw_user_meta_data ->> 'first_name', '') <> '' THEN
    BEGIN
      PERFORM write_account_profile(NEW.id, NEW.raw_user_meta_data ->> 'title', NEW.raw_user_meta_data ->> 'first_name',
        NEW.raw_user_meta_data ->> 'last_name', NEW.raw_user_meta_data ->> 'phone',
        coalesce((NEW.raw_user_meta_data ->> 'accepted_terms')::boolean, false));
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;
-- Runs after the display-profile sync trigger (trigger names fire in alphabetical order).
CREATE TRIGGER on_auth_user_profile_from_signup AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_account_profile_from_signup();

-- Reviewers (the same people who may approve) can see the requester's phone, one request at a time.
CREATE FUNCTION public.get_join_requester_phone(p_request_id uuid) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  req join_requests;
BEGIN
  SELECT * INTO req FROM join_requests WHERE id = p_request_id;
  IF NOT FOUND OR NOT (
    (req.kind = 'classroom_guardian' AND (is_student_classroom_teacher(req.child_id) OR is_org_admin(req.organization_id)))
    OR (req.kind = 'teacher' AND is_org_admin(req.organization_id))
  ) THEN RAISE EXCEPTION 'คุณไม่มีสิทธิ์ดูข้อมูลติดต่อนี้' USING ERRCODE = '42501'; END IF;
  RETURN (SELECT phone FROM account_profiles WHERE user_id = req.requester_id);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_join_requester_phone(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_join_requester_phone(uuid) TO authenticated;

-- Existing accounts keep the name they already had as their display name; they are asked to
-- fill in first + last name the next time they sign in.
UPDATE public.user_display_profiles d SET display_name = nullif(btrim(u.raw_user_meta_data ->> 'full_name'), '')
FROM auth.users u WHERE u.id = d.user_id;

COMMIT;
