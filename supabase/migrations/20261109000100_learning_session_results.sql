CREATE TABLE public.learning_session_results (
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  recorded_by uuid NOT NULL DEFAULT auth.uid(),
  session_id text NOT NULL CHECK (char_length(session_id) BETWEEN 1 AND 100),
  track text NOT NULL CHECK (track IN ('speech', 'phonics', 'communication')),
  stage_label text NOT NULL CHECK (char_length(stage_label) BETWEEN 1 AND 120),
  sound text NOT NULL CHECK (char_length(sound) BETWEEN 1 AND 30),
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL CHECK (completed_at >= started_at),
  activities integer NOT NULL CHECK (activities BETWEEN 1 AND 1000),
  choice_count integer NOT NULL CHECK (choice_count BETWEEN 0 AND activities),
  correct_choices integer NOT NULL CHECK (correct_choices BETWEEN 0 AND choice_count),
  PRIMARY KEY (child_id, recorded_by, session_id)
);

CREATE INDEX learning_session_results_child_completed_idx
  ON public.learning_session_results (child_id, completed_at DESC);

ALTER TABLE public.learning_session_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learning_session_results FROM anon, authenticated;
GRANT SELECT, INSERT ON public.learning_session_results TO authenticated;

CREATE FUNCTION public.can_access_learning_results(p_child_id uuid, p_write boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL AND NOT is_platform_admin() AND EXISTS (
    SELECT 1 FROM child_profiles cp
    WHERE cp.id = p_child_id AND cp.archived_at IS NULL AND (
      (cp.organization_id IS NULL AND cp.user_id = auth.uid())
      OR (NOT p_write AND cp.organization_id IS NOT NULL AND (
        is_org_admin(cp.organization_id) OR is_student_classroom_teacher(cp.id)
      ))
      OR EXISTS (
        SELECT 1 FROM child_access ca
        WHERE ca.child_id = cp.id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL
          AND (cp.organization_id IS NULL OR ca.role = 'guardian')
          AND CASE WHEN p_write THEN ca.role IN ('guardian', 'teacher', 'therapist') ELSE ca.can_view_progress END
      )
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_learning_results(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_learning_results(uuid, boolean) TO authenticated;

CREATE POLICY "learning results: read by child access"
  ON public.learning_session_results FOR SELECT TO authenticated
  USING (can_access_learning_results(child_id, false));

CREATE POLICY "learning results: record by child access"
  ON public.learning_session_results FOR INSERT TO authenticated
  WITH CHECK (recorded_by = auth.uid() AND can_access_learning_results(child_id, true));
