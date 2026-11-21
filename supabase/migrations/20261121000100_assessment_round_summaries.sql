-- End-of-round summaries written by Claude for adults (text only).
--
-- One row per (child, round, results): asking again for the same results returns the stored
-- summary instead of calling Claude again; after an adult changes a review, the results hash
-- changes and a new summary may be written. Claude never receives audio or the child's name;
-- `summary` holds only the generated text, `model` records which model wrote it.
-- Written only by the server (service role) after it has checked the caller's access to the child.

CREATE TABLE public.assessment_round_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 100),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_hash text NOT NULL CHECK (length(input_hash) = 64),
  summary jsonb NOT NULL CHECK (jsonb_typeof(summary) = 'object'),
  model text NOT NULL CHECK (length(model) BETWEEN 1 AND 100),
  policy_id uuid NOT NULL REFERENCES public.assessment_policy_versions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, session_id, input_hash)
);
CREATE INDEX assessment_round_summaries_actor_date ON public.assessment_round_summaries(requested_by, created_at DESC);

ALTER TABLE public.assessment_round_summaries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assessment_round_summaries FROM anon, authenticated;
GRANT SELECT ON public.assessment_round_summaries TO authenticated;
CREATE POLICY "round summaries: child permissions" ON public.assessment_round_summaries FOR SELECT TO authenticated
  USING (public.can_access_learning_results(child_id, false));
