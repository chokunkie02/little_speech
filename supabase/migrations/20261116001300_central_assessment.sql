-- Central POC rubric. Secrets stay in server environment variables.
CREATE TABLE public.assessment_policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL UNIQUE CHECK (version > 0),
  config jsonb NOT NULL CHECK (jsonb_typeof(config) = 'object'),
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid REFERENCES auth.users(id)
);
CREATE TABLE public.assessment_policy_state (
  id text PRIMARY KEY CHECK (id = 'global'),
  draft jsonb NOT NULL,
  draft_revision integer NOT NULL DEFAULT 1 CHECK (draft_revision > 0),
  published_id uuid NOT NULL REFERENCES public.assessment_policy_versions(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

WITH defaults AS (
  SELECT jsonb_build_object(
    'name', 'เกณฑ์ทดลองสำหรับการนำเสนอ', 'enabled', false,
    'minConfidence', 0.6, 'minDurationMs', 350, 'maxDurationMs', 30000,
    'rules', jsonb_agg(jsonb_build_object(
      'stageId', stage, 'mode', mode, 'passScore', 75, 'practiceScore', 55, 'minCompleteness', 70
    ) ORDER BY position)
  ) AS config FROM (VALUES
    (1, 'listen', 'adult'), (2, 'imitate', 'azure'), (3, 'syllables', 'azure'),
    (4, 'words', 'azure'), (5, 'sentences', 'azure'), (6, 'transfer', 'adult'),
    (7, 'understand', 'adult'), (8, 'request', 'adult'), (9, 'story', 'adult'),
    (10, 'letter', 'adult'), (11, 'blend', 'azure'), (12, 'read', 'azure')
  ) AS stages(position, stage, mode)
), seed AS (
  INSERT INTO public.assessment_policy_versions(version, config) SELECT 1, config FROM defaults RETURNING id, config
)
INSERT INTO public.assessment_policy_state(id, draft, published_id) SELECT 'global', config, id FROM seed;

CREATE TABLE public.assessment_results (
  id uuid PRIMARY KEY,
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  recorded_by uuid NOT NULL REFERENCES auth.users(id),
  session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 100),
  item_id text NOT NULL CHECK (length(item_id) BETWEEN 1 AND 150),
  stage_id text NOT NULL,
  track text NOT NULL CHECK (track IN ('speech', 'phonics', 'communication')),
  level text NOT NULL,
  reference_text text NOT NULL CHECK (length(reference_text) BETWEEN 1 AND 1500),
  input_hash text NOT NULL CHECK (length(input_hash) = 64),
  policy_id uuid NOT NULL REFERENCES public.assessment_policy_versions(id),
  state text NOT NULL DEFAULT 'processing' CHECK (state IN ('processing', 'completed')),
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((state = 'processing' AND result IS NULL) OR (state = 'completed' AND jsonb_typeof(result) = 'object'))
);
CREATE INDEX assessment_results_child_date ON public.assessment_results(child_id, created_at DESC);
CREATE INDEX assessment_results_actor_date ON public.assessment_results(recorded_by, created_at DESC);

ALTER TABLE public.assessment_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_policy_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assessment_policy_versions, public.assessment_policy_state, public.assessment_results FROM anon, authenticated;
GRANT SELECT ON public.assessment_results TO authenticated;
CREATE POLICY "assessment results: child permissions" ON public.assessment_results FOR SELECT TO authenticated
  USING (public.can_access_learning_results(child_id, false));

-- All rubric mutations go through the verified platform-admin server endpoint.
CREATE FUNCTION public.publish_assessment_policy(p_expected_revision integer, p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE current_state public.assessment_policy_state; new_id uuid; new_version integer;
BEGIN
  SELECT * INTO current_state FROM assessment_policy_state WHERE id = 'global' FOR UPDATE;
  IF current_state.draft_revision IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'draft changed' USING ERRCODE = '40001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_actor AND raw_app_meta_data->>'platform_admin' = 'true') THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(MAX(version), 0) + 1 INTO new_version FROM assessment_policy_versions;
  INSERT INTO assessment_policy_versions(version, config, published_by)
    VALUES (new_version, current_state.draft, p_actor) RETURNING id INTO new_id;
  UPDATE assessment_policy_state SET published_id = new_id, draft_revision = draft_revision + 1,
    updated_at = now(), updated_by = p_actor WHERE id = 'global';
  RETURN jsonb_build_object('version', new_version, 'draft_revision', p_expected_revision + 1);
END;
$$;
REVOKE ALL ON FUNCTION public.publish_assessment_policy(integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_assessment_policy(integer, uuid) TO service_role;

-- Serialize claims per user to prevent parallel retries from paying Azure twice.
CREATE FUNCTION public.claim_assessment(p_row jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE existing public.assessment_results; actor uuid := (p_row->>'recorded_by')::uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text, 1601));
  SELECT * INTO existing FROM assessment_results WHERE id = (p_row->>'id')::uuid;
  IF FOUND THEN
    IF existing.recorded_by <> actor OR existing.input_hash <> p_row->>'input_hash' THEN
      RAISE EXCEPTION 'request id reused' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object('claimed', false, 'row', to_jsonb(existing));
  END IF;
  IF (SELECT COUNT(*) FROM assessment_results WHERE recorded_by = actor AND created_at > now() - interval '1 minute') >= 12
    OR EXISTS (SELECT 1 FROM assessment_results WHERE recorded_by = actor AND state = 'processing' AND created_at > now() - interval '35 seconds') THEN
    RAISE EXCEPTION 'assessment rate limit' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO assessment_results(id, child_id, recorded_by, session_id, item_id, stage_id, track, level, reference_text, input_hash, policy_id)
  VALUES ((p_row->>'id')::uuid, (p_row->>'child_id')::uuid, actor, p_row->>'session_id', p_row->>'item_id',
    p_row->>'stage_id', p_row->>'track', p_row->>'level', p_row->>'reference_text', p_row->>'input_hash', (p_row->>'policy_id')::uuid);
  RETURN jsonb_build_object('claimed', true);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_assessment(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_assessment(jsonb) TO service_role;
