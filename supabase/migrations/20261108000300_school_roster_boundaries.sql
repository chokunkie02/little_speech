-- Keep the oldest valid placement when a school student was enrolled twice.
-- Remove invalid roster links only. Profiles, practice and guardian grants are retained.
ALTER TABLE public.classroom_students
  ADD COLUMN school_enrollment boolean NOT NULL DEFAULT false;

DELETE FROM public.classroom_students cs
USING public.classrooms c, public.organizations o, public.child_profiles cp
WHERE c.id = cs.classroom_id AND o.id = c.organization_id AND cp.id = cs.child_id
  AND (o.type = 'school' OR cp.organization_id IS NOT NULL)
  AND cp.organization_id IS DISTINCT FROM c.organization_id;

WITH placements AS (
  SELECT cs.classroom_id, cs.child_id,
    row_number() OVER (PARTITION BY cs.child_id ORDER BY cs.created_at, cs.classroom_id) AS placement
  FROM public.classroom_students cs
  JOIN public.classrooms c ON c.id = cs.classroom_id
  JOIN public.organizations o ON o.id = c.organization_id
  WHERE o.type = 'school'
)
DELETE FROM public.classroom_students cs USING placements p
WHERE cs.classroom_id = p.classroom_id AND cs.child_id = p.child_id AND p.placement > 1;

UPDATE public.classroom_students cs
SET school_enrollment = true
FROM public.classrooms c JOIN public.organizations o ON o.id = c.organization_id
WHERE c.id = cs.classroom_id AND o.type = 'school';

CREATE UNIQUE INDEX classroom_students_one_school_classroom
  ON public.classroom_students (child_id) WHERE school_enrollment;

CREATE FUNCTION public.check_classroom_student_organization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  classroom_organization uuid;
  child_organization uuid;
BEGIN
  SELECT c.organization_id, o.type = 'school' INTO classroom_organization, NEW.school_enrollment
  FROM classrooms c JOIN organizations o ON o.id = c.organization_id
  WHERE c.id = NEW.classroom_id;

  SELECT organization_id INTO child_organization FROM child_profiles
  WHERE id = NEW.child_id FOR UPDATE;

  IF (NEW.school_enrollment OR child_organization IS NOT NULL)
    AND child_organization IS DISTINCT FROM classroom_organization THEN
    RAISE EXCEPTION 'นักเรียนต้องอยู่ในองค์กรเดียวกับห้องเรียน' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_classroom_student_organization() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER check_classroom_student_organization
  BEFORE INSERT OR UPDATE ON public.classroom_students
  FOR EACH ROW EXECUTE FUNCTION public.check_classroom_student_organization();

-- Prevent changing the parent organization to bypass enrollment validation.
CREATE FUNCTION public.keep_classroom_organization()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'ไม่สามารถเปลี่ยนองค์กรของห้องเรียนได้' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER keep_classroom_organization
  BEFORE UPDATE OF organization_id ON public.classrooms
  FOR EACH ROW EXECUTE FUNCTION public.keep_classroom_organization();

CREATE FUNCTION public.keep_enrolled_student_organization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
    AND EXISTS (SELECT 1 FROM classroom_students WHERE child_id = OLD.id) THEN
    RAISE EXCEPTION 'ไม่สามารถเปลี่ยนองค์กรของนักเรียนที่อยู่ในห้องเรียนได้' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.keep_enrolled_student_organization() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER keep_enrolled_student_organization
  BEFORE UPDATE OF organization_id ON public.child_profiles
  FOR EACH ROW EXECUTE FUNCTION public.keep_enrolled_student_organization();

ALTER POLICY "child_profiles: classroom teacher select" ON public.child_profiles TO authenticated
USING (
  (organization_id IS NOT NULL AND is_student_classroom_teacher(id))
  OR (organization_id IS NULL AND EXISTS (
    SELECT 1 FROM classroom_students cs JOIN classrooms c ON c.id = cs.classroom_id
    WHERE cs.child_id = child_profiles.id AND NOT is_school_organization(c.organization_id)
      AND is_classroom_teacher(c.id)
  ))
);
