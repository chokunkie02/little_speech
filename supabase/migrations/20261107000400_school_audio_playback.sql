-- School audio stays in the private practice-audio bucket. A recording
-- must belong to the student encoded in its path and be linked to an attempt.
CREATE INDEX practice_attempts_audio_path_idx ON public.practice_attempts (audio_path)
  WHERE audio_path IS NOT NULL;

CREATE FUNCTION public.school_practice_audio_child(p_path text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT cp.id
  FROM child_profiles cp
  WHERE cp.organization_id IS NOT NULL
    AND cp.id = ((regexp_match(p_path,
      '^users/[0-9a-f-]{36}/children/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/attempts/[A-Za-z0-9_-]+[.](webm|mp4|ogg|wav|mpeg)$'
    ))[1])::uuid;
$$;

CREATE FUNCTION public.can_play_school_practice_audio(p_child_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM child_profiles cp
    WHERE auth.uid() IS NOT NULL AND cp.id = p_child_id
      AND cp.organization_id IS NOT NULL AND cp.archived_at IS NULL
      AND NOT is_org_admin(cp.organization_id)
      AND (
        is_student_classroom_teacher(cp.id) OR EXISTS (
          SELECT 1 FROM child_access ca
          WHERE ca.child_id = cp.id AND ca.user_id = auth.uid() AND ca.role = 'guardian'
            AND ca.revoked_at IS NULL AND ca.can_view_audio AND ca.can_view_progress
        )
      )
  );
$$;

CREATE FUNCTION public.can_read_practice_audio_object(p_path text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  child_id_in_path uuid := school_practice_audio_child(p_path);
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF child_id_in_path IS NULL THEN
    RETURN split_part(p_path, '/', 2) = auth.uid()::text;
  END IF;

  -- Only authenticated object downloads may read school recordings. The
  -- Storage API sets this transaction value for each operation.
  RETURN coalesce(current_setting('storage.operation', true) IN (
    'storage.object.get_authenticated', 'object.get_authenticated'
  ), false)
    AND can_play_school_practice_audio(child_id_in_path)
    AND EXISTS (
      SELECT 1 FROM practice_attempts
      WHERE child_id = child_id_in_path AND audio_path = p_path
    );
END;
$$;

CREATE FUNCTION public.get_school_attempt_audio(p_attempt_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT a.audio_path FROM practice_attempts a
  WHERE a.id = p_attempt_id AND school_practice_audio_child(a.audio_path) = a.child_id
    AND can_play_school_practice_audio(a.child_id);
$$;

REVOKE EXECUTE ON FUNCTION public.school_practice_audio_child(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_play_school_practice_audio(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_read_practice_audio_object(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_school_attempt_audio(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_practice_audio_object(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_school_attempt_audio(uuid) TO authenticated;

DROP POLICY "practice_audio: owner download" ON storage.objects;
CREATE POLICY "practice_audio: authorized download" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'practice-audio' AND public.can_read_practice_audio_object(name));

CREATE OR REPLACE FUNCTION public.get_school_child_progress(p_child_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'child', jsonb_build_object(
      'id', cp.id, 'name', cp.name, 'nickname', cp.nickname
    ),
    'sessions', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'started_at', s.started_at, 'target_sound', s.target_sound,
        'completed_missions', s.completed_missions, 'total_missions', s.total_missions,
        'average_score', s.average_score, 'status', s.status
      ) ORDER BY s.started_at DESC, s.id)
      FROM practice_sessions s WHERE s.child_id = cp.id AND s.status <> 'active'
    ), '[]'::jsonb),
    'attempts', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id, 'created_at', a.created_at, 'target_sound', a.target_sound,
        'prompt_text', a.prompt_text, 'score', a.score,
        'feedback', a.feedback, 'recommendation', a.recommendation,
        'has_audio', can_play_school_practice_audio(cp.id)
          AND coalesce(school_practice_audio_child(a.audio_path) = cp.id, false)
      ) ORDER BY a.created_at DESC, a.id)
      FROM practice_attempts a WHERE a.child_id = cp.id
    ), '[]'::jsonb)
  )
  FROM child_profiles cp
  WHERE auth.uid() IS NOT NULL AND cp.id = p_child_id
    AND cp.organization_id IS NOT NULL AND cp.archived_at IS NULL
    AND (
      is_student_classroom_teacher(cp.id) OR EXISTS (
        SELECT 1 FROM child_access ca
        WHERE ca.child_id = cp.id AND ca.user_id = auth.uid()
          AND ca.role = 'guardian' AND ca.revoked_at IS NULL AND ca.can_view_progress
      )
    );
$$;
