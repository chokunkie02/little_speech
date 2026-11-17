-- Practice activity for staff views now counts Learning Studio rounds (learning_session_results),
-- not only the old practice screens (practice_sessions), which no longer get new rows. Found in the
-- full-flow test: a student who had just practised still showed "ยังไม่เคยฝึก" and 0 practised this week.

BEGIN;

CREATE FUNCTION public.child_last_practice(p_child_id uuid) RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT nullif(greatest(
    coalesce((SELECT max(r.completed_at) FROM learning_session_results r WHERE r.child_id = p_child_id), '-infinity'),
    coalesce((SELECT max(ps.started_at) FROM practice_sessions ps WHERE ps.child_id = p_child_id), '-infinity')
  ), '-infinity');
$$;
REVOKE EXECUTE ON FUNCTION public.child_last_practice(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_school_overview(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE result jsonb;
BEGIN
  PERFORM require_school_admin(p_organization_id);
  WITH rooms AS (
    SELECT c.* FROM classrooms c WHERE c.organization_id = p_organization_id
  ), students AS (
    SELECT cp.id, cs.classroom_id,
      EXISTS (SELECT 1 FROM child_access ca WHERE ca.child_id = cp.id AND ca.role = 'guardian' AND ca.revoked_at IS NULL) AS linked,
      coalesce(child_last_practice(cp.id) > now() - interval '7 days', false) AS practiced
    FROM child_profiles cp LEFT JOIN classroom_students cs ON cs.child_id = cp.id AND cs.school_enrollment
    WHERE cp.organization_id = p_organization_id AND cp.archived_at IS NULL AND cp.enrollment_status = 'active'
  ), teachers AS (
    SELECT m.user_id, account_display_name(m.user_id) AS name, u.email
    FROM organization_members m JOIN auth.users u ON u.id = m.user_id
    WHERE m.organization_id = p_organization_id AND m.status = 'active' AND m.role = 'teacher'
  )
  SELECT jsonb_build_object(
    'school', (SELECT jsonb_build_object('id', o.id, 'name', o.name, 'academic_year', o.academic_year)
      FROM organizations o WHERE o.id = p_organization_id),
    'totals', jsonb_build_object(
      'classrooms', (SELECT count(*) FROM rooms WHERE archived_at IS NULL),
      'teachers', (SELECT count(*) FROM teachers),
      'students', (SELECT count(*) FROM students),
      'unassigned_students', (SELECT count(*) FROM students WHERE classroom_id IS NULL),
      'linked_students', (SELECT count(*) FROM students WHERE linked),
      'practiced_7d', (SELECT count(*) FROM students WHERE practiced),
      'pending_teachers', (SELECT count(*) FROM join_requests r WHERE r.organization_id = p_organization_id
        AND r.kind = 'teacher' AND r.status = 'pending')),
    'classrooms', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'name', r.name, 'grade_level', r.grade_level, 'academic_year', r.academic_year,
        'archived_at', r.archived_at,
        'student_count', (SELECT count(*) FROM students s WHERE s.classroom_id = r.id),
        'linked_count', (SELECT count(*) FROM students s WHERE s.classroom_id = r.id AND s.linked),
        'practiced_7d', (SELECT count(*) FROM students s WHERE s.classroom_id = r.id AND s.practiced),
        'teachers', coalesce((SELECT jsonb_agg(jsonb_build_object('user_id', ct.teacher_user_id,
            'name', account_display_name(ct.teacher_user_id), 'is_primary', ct.is_primary)
            ORDER BY ct.is_primary DESC, ct.created_at)
          FROM classroom_teachers ct WHERE ct.classroom_id = r.id), '[]'::jsonb))
      ORDER BY r.name) FROM rooms r), '[]'::jsonb),
    'teachers', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'user_id', t.user_id, 'name', t.name, 'email', t.email,
        'classrooms', coalesce((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'is_primary', ct.is_primary) ORDER BY c.name)
          FROM classroom_teachers ct JOIN rooms c ON c.id = ct.classroom_id
          WHERE ct.teacher_user_id = t.user_id AND c.archived_at IS NULL), '[]'::jsonb))
      ORDER BY t.name) FROM teachers t), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_teacher_overview()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH rooms AS (
    SELECT c.*, ct.is_primary, o.name AS school_name
    FROM classroom_teachers ct JOIN classrooms c ON c.id = ct.classroom_id
    JOIN organizations o ON o.id = c.organization_id
    WHERE ct.teacher_user_id = auth.uid() AND c.archived_at IS NULL
  ), students AS (
    SELECT cs.classroom_id, cp.id,
      EXISTS (SELECT 1 FROM child_access ca WHERE ca.child_id = cp.id AND ca.role = 'guardian' AND ca.revoked_at IS NULL) AS linked,
      coalesce(child_last_practice(cp.id) > now() - interval '7 days', false) AS practiced
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
$function$;

CREATE OR REPLACE FUNCTION public.list_classroom_students(p_classroom_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT can_manage_classroom_roster(p_classroom_id) THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์ดูรายชื่อห้องนี้' USING ERRCODE = '42501';
  END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
      'child_id', cp.id, 'name', cp.name, 'nickname', cp.nickname, 'student_code', cp.student_code,
      'student_number', cs.student_number, 'birth_date', cp.birth_date, 'age', cp.age,
      'guardians', (SELECT count(*) FROM child_access ca WHERE ca.child_id = cp.id AND ca.role = 'guardian' AND ca.revoked_at IS NULL),
      'last_practice_at', child_last_practice(cp.id))
    ORDER BY cs.student_number NULLS LAST, cp.name COLLATE "th-TH-x-icu")
    FROM classroom_students cs JOIN child_profiles cp ON cp.id = cs.child_id
    WHERE cs.classroom_id = p_classroom_id AND cp.archived_at IS NULL AND cp.enrollment_status = 'active'), '[]'::jsonb);
END;
$function$;

COMMIT;
