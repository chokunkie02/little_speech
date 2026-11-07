-- Shared school progress is read through a restricted projection. Existing
-- owner policies continue to govern direct reads and all practice writes.
CREATE FUNCTION public.get_school_child_progress(p_child_id uuid)
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
        'feedback', a.feedback, 'recommendation', a.recommendation
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

REVOKE EXECUTE ON FUNCTION public.get_school_child_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_school_child_progress(uuid) TO authenticated;

-- The original aggregate views must honor the caller's table policies.
ALTER VIEW public.child_stage_status SET (security_invoker = true);
ALTER VIEW public.child_session_summary SET (security_invoker = true);
