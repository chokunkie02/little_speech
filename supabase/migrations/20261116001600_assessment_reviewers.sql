-- Who may confirm (adult-review) a child's assessment results (plan section I, phase 2).
-- Family children: their owner and anyone with write access, as before.
-- School children: the classroom teacher; guardians too when the school's latest criteria say
-- reviewers = 'teacher_guardian' (default 'teacher').
CREATE FUNCTION public.can_review_assessment(p_child_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND NOT is_platform_admin() AND EXISTS (
    SELECT 1 FROM child_profiles cp
    WHERE cp.id = p_child_id AND cp.archived_at IS NULL AND (
      (cp.organization_id IS NULL AND (
        cp.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM child_access ca
          WHERE ca.child_id = cp.id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL
            AND ca.role IN ('guardian', 'teacher', 'therapist')
        )
      ))
      OR (cp.organization_id IS NOT NULL AND (
        is_student_classroom_teacher(cp.id)
        OR (
          coalesce((
            SELECT v.settings ->> 'reviewers' FROM school_assessment_versions v
            WHERE v.organization_id = cp.organization_id
            ORDER BY v.revision DESC LIMIT 1
          ), 'teacher') = 'teacher_guardian'
          AND is_active_school_guardian(cp.id)
        )
      ))
    )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.can_review_assessment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_review_assessment(uuid) TO authenticated;
