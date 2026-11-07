-- School profiles are owned by the school. A linked guardian can record
-- practice without gaining edit or delete access to the child's history.
ALTER TABLE public.practice_sessions ADD COLUMN recorded_by uuid;
ALTER TABLE public.practice_attempts ADD COLUMN recorded_by uuid;
ALTER TABLE public.practice_sessions ALTER COLUMN recorded_by SET DEFAULT auth.uid();
ALTER TABLE public.practice_attempts ALTER COLUMN recorded_by SET DEFAULT auth.uid();

CREATE POLICY "practice_sessions: school guardian select"
  ON public.practice_sessions FOR SELECT TO authenticated
  USING (recorded_by = auth.uid() AND is_active_school_guardian(child_id));

CREATE POLICY "practice_sessions: school guardian insert"
  ON public.practice_sessions FOR INSERT TO authenticated
  WITH CHECK (recorded_by = auth.uid() AND is_active_school_guardian(child_id));

CREATE POLICY "practice_sessions: school guardian update"
  ON public.practice_sessions FOR UPDATE TO authenticated
  USING (recorded_by = auth.uid() AND is_active_school_guardian(child_id))
  WITH CHECK (recorded_by = auth.uid() AND is_active_school_guardian(child_id));

CREATE FUNCTION public.keep_practice_session_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN
  IF (NEW.id, NEW.child_id, NEW.recorded_by) IS DISTINCT FROM (OLD.id, OLD.child_id, OLD.recorded_by) THEN
    RAISE EXCEPTION 'ไม่สามารถเปลี่ยนเจ้าของเซสชันฝึกได้' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER keep_practice_session_identity
  BEFORE UPDATE OF id, child_id, recorded_by ON public.practice_sessions
  FOR EACH ROW EXECUTE FUNCTION public.keep_practice_session_identity();

CREATE POLICY "practice_attempts: school guardian select"
  ON public.practice_attempts FOR SELECT TO authenticated
  USING (recorded_by = auth.uid() AND is_active_school_guardian(child_id));

CREATE POLICY "practice_attempts: school guardian insert"
  ON public.practice_attempts FOR INSERT TO authenticated
  WITH CHECK (
    recorded_by = auth.uid() AND is_active_school_guardian(child_id)
    AND (
      session_id IS NULL OR EXISTS (
        SELECT 1 FROM public.practice_sessions s
        WHERE s.id = practice_attempts.session_id AND s.child_id = practice_attempts.child_id
          AND s.recorded_by = auth.uid()
      )
    )
    AND (
      audio_path IS NULL OR starts_with(audio_path, 'users/' || auth.uid()::text || '/children/' || child_id::text || '/attempts/')
    )
  );
