-- Plan E3: user_display_profiles (email + name of every account) was readable by every signed-in
-- user ("auth select" USING true), so anyone could list all emails. Now a row is readable only by:
--   • the account itself and platform admins,
--   • members of the same organization (school staff, family org),
--   • people who share a child (owner ↔ guardian/co-guardian, or two people with access to the same child).
-- Lists that staff see (teachers, guardians, inbox) come from SECURITY DEFINER RPCs and are unaffected.

BEGIN;

CREATE FUNCTION public.can_see_account(p_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND (
    p_user_id = auth.uid()
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM organization_members mine
      JOIN organization_members theirs ON theirs.organization_id = mine.organization_id
      WHERE mine.user_id = auth.uid() AND theirs.user_id = p_user_id
    )
    OR EXISTS (
      -- people connected to the same child (owner or active grant on either side)
      SELECT 1 FROM child_profiles cp
      WHERE (cp.user_id = auth.uid() OR EXISTS (
              SELECT 1 FROM child_access a WHERE a.child_id = cp.id AND a.user_id = auth.uid() AND a.revoked_at IS NULL))
        AND (cp.user_id = p_user_id OR EXISTS (
              SELECT 1 FROM child_access b WHERE b.child_id = cp.id AND b.user_id = p_user_id AND b.revoked_at IS NULL))
    )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.can_see_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_see_account(uuid) TO authenticated;

DROP POLICY "user_display_profiles: auth select" ON public.user_display_profiles;
CREATE POLICY "display profile: people you work with" ON public.user_display_profiles
  FOR SELECT TO authenticated USING (can_see_account(user_id));

COMMIT;
