ALTER TABLE public.observation_notes
  ADD COLUMN teacher_visibility text CHECK (teacher_visibility IN ('private', 'shared'));

-- NULL identifies the existing owner-managed notes.
ALTER POLICY "observation_notes: owner select" ON public.observation_notes
  USING (teacher_visibility IS NULL AND is_own_child(child_id));
ALTER POLICY "observation_notes: owner insert" ON public.observation_notes
  WITH CHECK (teacher_visibility IS NULL AND is_own_child(child_id) AND author_id = auth.uid());
ALTER POLICY "observation_notes: owner update" ON public.observation_notes
  USING (teacher_visibility IS NULL AND is_own_child(child_id) AND author_id = auth.uid())
  WITH CHECK (teacher_visibility IS NULL AND is_own_child(child_id) AND author_id = auth.uid());
ALTER POLICY "observation_notes: owner delete" ON public.observation_notes
  USING (teacher_visibility IS NULL AND is_own_child(child_id) AND author_id = auth.uid());

CREATE FUNCTION public.can_review_school_observations(p_child_id uuid, p_teacher boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM child_profiles cp
    WHERE cp.id = p_child_id AND cp.organization_id IS NOT NULL AND cp.archived_at IS NULL
      AND auth.uid() IS NOT NULL AND NOT is_org_admin(cp.organization_id)
      AND CASE WHEN p_teacher THEN is_student_classroom_teacher(cp.id)
               ELSE is_active_school_guardian(cp.id) END
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_review_school_observations(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_review_school_observations(uuid, boolean) TO authenticated;

CREATE POLICY "observation_notes: school teacher and guardian read"
  ON public.observation_notes FOR SELECT TO authenticated
  USING (
    teacher_visibility IS NOT NULL AND (
      (can_review_school_observations(child_id, true)
        AND (author_id = auth.uid() OR teacher_visibility = 'shared'))
      OR (teacher_visibility = 'shared' AND can_review_school_observations(child_id, false))
    )
  );

CREATE FUNCTION public.create_school_observation(
  p_child_id uuid, p_category observation_category, p_title text, p_content text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  note_id uuid;
BEGIN
  IF NOT can_review_school_observations(p_child_id, true) THEN
    RAISE EXCEPTION 'เฉพาะครูประจำห้องที่เพิ่มข้อสังเกตได้' USING ERRCODE = '42501';
  END IF;
  IF p_category IS NULL OR p_title IS NULL OR p_content IS NULL
    OR char_length(btrim(p_title)) NOT BETWEEN 1 AND 80
    OR char_length(btrim(p_content)) NOT BETWEEN 5 AND 4000 THEN
    RAISE EXCEPTION 'กรุณาตรวจหัวข้อและเนื้อหาของบันทึก' USING ERRCODE = '22023';
  END IF;

  INSERT INTO observation_notes (child_id, author_id, category, title, content, teacher_visibility)
  VALUES (p_child_id, auth.uid(), p_category, btrim(p_title), btrim(p_content), 'private')
  RETURNING id INTO note_id;
  RETURN note_id;
END;
$$;

CREATE FUNCTION public.set_school_observation_sharing(p_note_id uuid, p_shared boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE observation_notes
  SET teacher_visibility = CASE WHEN p_shared THEN 'shared' ELSE 'private' END
  WHERE id = p_note_id AND teacher_visibility IS NOT NULL
    AND p_shared IS NOT NULL AND author_id = auth.uid()
    AND can_review_school_observations(child_id, true);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์เปลี่ยนการแชร์บันทึกนี้' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_school_observation(uuid, observation_category, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_school_observation_sharing(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_school_observation(uuid, observation_category, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_school_observation_sharing(uuid, boolean) TO authenticated;
