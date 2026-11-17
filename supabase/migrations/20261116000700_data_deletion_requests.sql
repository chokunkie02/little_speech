-- PDPA: a signed-in user can ask for their account and data to be deleted (plan D6).
-- The request lands in every platform admin's inbox; deletion itself stays a deliberate admin action.

BEGIN;

CREATE TABLE public.data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  reason text CHECK (reason IS NULL OR char_length(reason) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  handled_at timestamptz
);
CREATE UNIQUE INDEX data_deletion_requests_open ON public.data_deletion_requests (user_id) WHERE handled_at IS NULL;
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.data_deletion_requests FROM anon, authenticated;

CREATE FUNCTION public.request_data_deletion(p_reason text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  me uuid := auth.uid();
  address text;
  admin_id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'กรุณาเข้าสู่ระบบ' USING ERRCODE = '42501'; END IF;
  SELECT email INTO address FROM auth.users WHERE id = me;
  IF EXISTS (SELECT 1 FROM data_deletion_requests WHERE user_id = me AND handled_at IS NULL) THEN
    RAISE EXCEPTION 'ส่งคำขอไว้แล้ว ทีมงานจะติดต่อกลับทางอีเมล %', address;
  END IF;
  INSERT INTO data_deletion_requests (user_id, email, reason) VALUES (me, address, nullif(btrim(coalesce(p_reason, '')), ''));
  FOR admin_id IN SELECT id FROM auth.users WHERE raw_app_meta_data -> 'platform_admin' = 'true'::jsonb LOOP
    PERFORM notify_user(admin_id, 'data_deletion', 'มีคำขอลบบัญชีและข้อมูล',
      address || coalesce(' · ' || nullif(btrim(coalesce(p_reason, '')), ''), ''), NULL);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_data_deletion(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_data_deletion(text) TO authenticated;

COMMIT;
