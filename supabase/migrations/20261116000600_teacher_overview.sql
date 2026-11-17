-- Teacher home (plan D5): the signed-in teacher's classrooms with roster and parent-link counts.

BEGIN;

CREATE FUNCTION public.get_teacher_overview() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH rooms AS (
    SELECT c.*, ct.is_primary, o.name AS school_name
    FROM classroom_teachers ct JOIN classrooms c ON c.id = ct.classroom_id
    JOIN organizations o ON o.id = c.organization_id
    WHERE ct.teacher_user_id = auth.uid() AND c.archived_at IS NULL
  ), students AS (
    SELECT cs.classroom_id, cp.id,
      EXISTS (SELECT 1 FROM child_access ca WHERE ca.child_id = cp.id AND ca.role = 'guardian' AND ca.revoked_at IS NULL) AS linked,
      EXISTS (SELECT 1 FROM practice_sessions ps WHERE ps.child_id = cp.id AND ps.started_at > now() - interval '7 days') AS practiced
    FROM classroom_students cs JOIN child_profiles cp ON cp.id = cs.child_id
    WHERE cs.classroom_id IN (SELECT id FROM rooms) AND cp.archived_at IS NULL AND cp.enrollment_status = 'active'
  )
  SELECT jsonb_build_object(
    'classrooms', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'name', r.name, 'grade_level', r.grade_level, 'academic_year', r.academic_year,
        'organization_id', r.organization_id, 'school_name', r.school_name, 'is_primary', r.is_primary,
        'student_count', (SELECT count(*) FROM students s WHERE s.classroom_id = r.id),
        'linked_count', (SELECT count(*) FROM students s WHERE s.classroom_id = r.id AND s.linked),
        'practiced_7d', (SELECT count(*) FROM students s WHERE s.classroom_id = r.id AND s.practiced),
        'pending_requests', (SELECT count(*) FROM join_requests jr WHERE jr.classroom_id = r.id
          AND jr.kind = 'classroom_guardian' AND jr.status = 'pending'),
        'co_teachers', coalesce((SELECT jsonb_agg(account_display_name(ct.teacher_user_id))
          FROM classroom_teachers ct WHERE ct.classroom_id = r.id AND ct.teacher_user_id <> auth.uid()), '[]'::jsonb))
      ORDER BY r.name) FROM rooms r), '[]'::jsonb),
    'totals', jsonb_build_object(
      'students', (SELECT count(*) FROM students),
      'linked', (SELECT count(*) FROM students WHERE linked),
      'practiced_7d', (SELECT count(*) FROM students WHERE practiced))
  );
$$;

REVOKE EXECUTE ON FUNCTION public.get_teacher_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_overview() TO authenticated;

COMMIT;
