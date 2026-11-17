-- School-level assessment criteria inside the central frame (plan section I, phase 1).
-- Each save is a new revision; the highest revision is the one in use. Writes go through the
-- /api/assessment/school server route (service role), which checks is_org_admin and the frame.
CREATE TABLE public.school_assessment_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision > 0),
  settings jsonb NOT NULL CHECK (jsonb_typeof(settings) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (organization_id, revision)
);
CREATE INDEX school_assessment_versions_latest ON public.school_assessment_versions(organization_id, revision DESC);

ALTER TABLE public.school_assessment_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.school_assessment_versions FROM anon, authenticated;
GRANT SELECT ON public.school_assessment_versions TO authenticated;
CREATE POLICY "school assessment: school admins and platform admins read" ON public.school_assessment_versions
  FOR SELECT TO authenticated
  USING (public.is_org_admin(organization_id) OR public.is_platform_admin());

-- Which school criteria judged each result (NULL = central policy only).
ALTER TABLE public.assessment_results
  ADD COLUMN school_version_id uuid REFERENCES public.school_assessment_versions(id) ON DELETE SET NULL;
