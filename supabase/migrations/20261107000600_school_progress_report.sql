CREATE FUNCTION public.get_school_progress_report(p_child_id uuid, p_from date, p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  starts_at timestamptz;
  ends_before timestamptz;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_from > p_to
    OR p_from < DATE '0001-01-01' OR p_to > DATE '9999-12-31' THEN
    RAISE EXCEPTION 'กรุณาเลือกช่วงวันที่ให้ถูกต้อง' USING ERRCODE = '22023';
  END IF;

  -- The date fields refer to whole calendar days in Thailand.
  starts_at := p_from::timestamp AT TIME ZONE 'Asia/Bangkok';
  ends_before := (p_to + 1)::timestamp AT TIME ZONE 'Asia/Bangkok';

  RETURN (
    WITH student AS (
      SELECT cp.id, cp.name, cp.nickname, is_org_admin(cp.organization_id) AS school_admin
      FROM child_profiles cp
      WHERE auth.uid() IS NOT NULL AND cp.id = p_child_id
        AND cp.organization_id IS NOT NULL AND cp.archived_at IS NULL
        AND (
          is_org_admin(cp.organization_id) OR is_student_classroom_teacher(cp.id)
          OR EXISTS (
            SELECT 1 FROM child_access ca
            WHERE ca.child_id = cp.id AND ca.user_id = auth.uid()
              AND ca.role = 'guardian' AND ca.revoked_at IS NULL
              AND ca.can_view_progress AND ca.can_export_report
          )
        )
    ),
    attempts AS (
      SELECT a.target_sound, a.score
      FROM practice_attempts a JOIN student ON student.id = a.child_id
      WHERE a.created_at >= starts_at AND a.created_at < ends_before
    ),
    sounds AS (
      SELECT target_sound, count(*) AS attempts, round(avg(score)) AS average_score
      FROM attempts GROUP BY target_sound
    )
    SELECT jsonb_build_object(
      'child', jsonb_build_object('name', student.name, 'nickname', student.nickname),
      'attempt_count', (SELECT count(*) FROM attempts),
      'average_score', (SELECT round(avg(score)) FROM attempts),
      'completed_sessions', (
        SELECT count(*) FROM practice_sessions s
        WHERE s.child_id = student.id AND s.status = 'completed'
          AND s.started_at >= starts_at AND s.started_at < ends_before
      ),
      'sounds', coalesce((SELECT jsonb_agg(to_jsonb(sounds) ORDER BY sounds.target_sound) FROM sounds), '[]'::jsonb),
      'shared_notes', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'id', n.id, 'title', n.title, 'content', n.content, 'created_at', n.created_at
        ) ORDER BY n.created_at DESC, n.id)
        FROM observation_notes n
        WHERE NOT student.school_admin AND n.child_id = student.id AND n.teacher_visibility = 'shared'
          AND n.created_at >= starts_at AND n.created_at < ends_before
      ), '[]'::jsonb)
    )
    FROM student
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_school_progress_report(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_school_progress_report(uuid, date, date) TO authenticated;
