// School admin calls (migration 20261116000400_school_management.sql). Errors carry Thai messages from the DB.
import { getSupabaseClient } from "@/lib/supabase/client";

export type OverviewClassroom = {
  id: string;
  name: string;
  grade_level: string | null;
  academic_year: string | null;
  archived_at: string | null;
  student_count: number;
  linked_count: number;
  practiced_7d: number;
  teachers: { user_id: string; name: string; is_primary: boolean }[];
};

export type OverviewTeacher = {
  user_id: string;
  name: string;
  email: string;
  classrooms: { id: string; name: string; is_primary: boolean }[];
};

export type SchoolOverview = {
  school: { id: string; name: string; academic_year: string | null };
  totals: {
    classrooms: number; teachers: number; students: number; unassigned_students: number;
    linked_students: number; practiced_7d: number; pending_teachers: number;
  };
  classrooms: OverviewClassroom[];
  teachers: OverviewTeacher[];
};

export type RosterStudent = {
  child_id: string;
  name: string;
  nickname: string | null;
  student_code: string | null;
  student_number: number | null;
  birth_date: string | null;
  age: number;
  guardians: number;
  last_practice_at: string | null;
};

export type NewStudentRow = {
  name: string;
  nickname?: string;
  student_code?: string;
  birth_date?: string;
  student_number?: number;
};

export type AddStudentsResult = { added: number; skipped: { row: number; name: string; reason: string }[] };

// The generated Database type does not list these functions; keep the loose call in one place.
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const client = getSupabaseClient();
  if (!client) throw new Error("ยังไม่ได้เชื่อมต่อระบบ กรุณาลองใหม่ภายหลัง");
  const { data, error } = await (client.rpc as unknown as (fn: string, params: Record<string, unknown>) =>
    PromiseLike<{ data: unknown; error: { message: string } | null }>)(name, args);
  if (error) throw new Error(error.message || "ทำรายการไม่สำเร็จ");
  return data as T;
}

export const getSchoolOverview = (organizationId: string) =>
  rpc<SchoolOverview>("get_school_overview", { p_organization_id: organizationId });
export const setAcademicYear = (organizationId: string, year: string) =>
  rpc<void>("set_school_academic_year", { p_organization_id: organizationId, p_year: year });
export const createClassrooms = (organizationId: string, grade: string, names: string[]) =>
  rpc<{ created: { id: string; name: string }[]; skipped: { name: string; reason: string }[] }>(
    "create_classrooms", { p_organization_id: organizationId, p_grade: grade, p_names: names });
export const updateClassroom = (classroomId: string, name: string, grade: string) =>
  rpc<void>("update_classroom", { p_classroom_id: classroomId, p_name: name, p_grade: grade });
export const setClassroomArchived = (classroomId: string, archived: boolean) =>
  rpc<void>("set_classroom_archived", { p_classroom_id: classroomId, p_archived: archived });
export const deleteClassroom = (classroomId: string) => rpc<void>("delete_classroom", { p_classroom_id: classroomId });

export const listClassroomStudents = (classroomId: string) =>
  rpc<RosterStudent[]>("list_classroom_students", { p_classroom_id: classroomId });
export const addClassroomStudents = (classroomId: string, rows: NewStudentRow[]) =>
  rpc<AddStudentsResult>("add_classroom_students", { p_classroom_id: classroomId, p_rows: rows });
export const updateStudent = (childId: string, input: { name: string; nickname: string; studentCode: string; birthDate: string | null }) =>
  rpc<void>("update_student", {
    p_child_id: childId, p_name: input.name, p_nickname: input.nickname, p_student_code: input.studentCode, p_birth_date: input.birthDate,
  });
export const setStudentNumber = (classroomId: string, childId: string, number: number | null) =>
  rpc<void>("set_student_number", { p_classroom_id: classroomId, p_child_id: childId, p_number: number });
export const renumberClassroom = (classroomId: string) => rpc<void>("renumber_classroom", { p_classroom_id: classroomId });
export const moveStudents = (childIds: string[], targetClassroomId: string) =>
  rpc<number>("move_students", { p_child_ids: childIds, p_target_classroom_id: targetClassroomId });
export const setStudentsStatus = (childIds: string[], status: "active" | "moved_out" | "graduated") =>
  rpc<number>("set_students_status", { p_child_ids: childIds, p_status: status });

export const assignTeacher = (classroomId: string, teacherId: string) =>
  rpc<unknown>("assign_school_teacher", { p_classroom_id: classroomId, p_teacher_user_id: teacherId });
export const unassignTeacher = (classroomId: string, teacherId: string) =>
  rpc<void>("unassign_school_teacher", { p_classroom_id: classroomId, p_teacher_user_id: teacherId });
export const setPrimaryTeacher = (classroomId: string, teacherId: string) =>
  rpc<void>("set_primary_teacher", { p_classroom_id: classroomId, p_teacher_user_id: teacherId });
export const removeSchoolTeacher = (organizationId: string, teacherId: string) =>
  rpc<void>("remove_school_teacher", { p_organization_id: organizationId, p_teacher_user_id: teacherId });

// ── helpers ─────────────────────────────────────────────────────────────────

export const GRADES = ["อ.1", "อ.2", "อ.3", "ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"];

const collator = new Intl.Collator("th", { numeric: true, sensitivity: "base" });

/** ป.1/2 before ป.1/10; grades in school order (อ. → ป. → ม.). */
export function compareClassrooms(a: { name: string; grade_level: string | null }, b: { name: string; grade_level: string | null }) {
  const rank = (grade: string | null) => (grade ? GRADES.indexOf(grade) : -1);
  return (rank(a.grade_level) === -1 ? 99 : rank(a.grade_level)) - (rank(b.grade_level) === -1 ? 99 : rank(b.grade_level))
    || collator.compare(a.name, b.name);
}

export const compareThai = (a: string, b: string) => collator.compare(a, b);

/** "ป.1" + 3 → ["ป.1/1", "ป.1/2", "ป.1/3"], continuing after rooms that already exist. */
export function nextRoomNames(grade: string, count: number, existing: string[]) {
  const used = new Set(existing.map((name) => name.trim()));
  const names: string[] = [];
  for (let n = 1; names.length < count && n < 100; n += 1) {
    const name = `${grade}/${n}`;
    if (!used.has(name)) names.push(name);
  }
  return names;
}

/**
 * Parses rows pasted from Excel/Google Sheets (tab separated) or a CSV file.
 * Recognised columns by header: เลขที่, รหัส, ชื่อ / ชื่อ-นามสกุล, (นามสกุล), ชื่อเล่น, วันเกิด.
 * Without a header the columns are assumed to be: ชื่อ-นามสกุล, ชื่อเล่น.
 */
export function parseStudentTable(text: string): NewStudentRow[] {
  const lines = text.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const separator = lines[0].includes("\t") ? "\t" : ",";
  const split = (line: string) => line.split(separator).map((cell) => cell.trim().replace(/^"|"$/g, ""));
  const header = split(lines[0]).map((cell) => cell.replace(/\s/g, ""));
  const find = (...names: string[]) => header.findIndex((cell) => names.some((name) => cell.includes(name)));
  const hasHeader = find("ชื่อ", "name") !== -1;
  const col = hasHeader ? {
    number: find("เลขที่", "no"),
    code: find("รหัส", "code", "เลขประจำตัว"),
    first: header.findIndex((cell) => /^(ชื่อ|ชื่อ-นามสกุล|ชื่อนามสกุล|ชื่อ-สกุล|name)$/i.test(cell)),
    last: find("นามสกุล", "สกุล", "surname"),
    nickname: find("ชื่อเล่น", "nickname"),
    birth: find("วันเกิด", "birth"),
  } : { number: -1, code: -1, first: 0, last: -1, nickname: 1, birth: -1 };
  const firstCol = col.first === -1 ? find("ชื่อ") : col.first;

  return (hasHeader ? lines.slice(1) : lines).map((line) => {
    const cells = split(line);
    const at = (index: number) => (index >= 0 ? cells[index] ?? "" : "");
    const lastName = col.last !== -1 && col.last !== firstCol ? at(col.last) : "";
    const row: NewStudentRow = { name: [at(firstCol), lastName].filter(Boolean).join(" ") };
    if (at(col.nickname)) row.nickname = at(col.nickname);
    if (at(col.code)) row.student_code = at(col.code);
    const number = Number.parseInt(at(col.number), 10);
    if (Number.isFinite(number)) row.student_number = number;
    const birth = parseThaiDate(at(col.birth));
    if (birth) row.birth_date = birth;
    return row;
  }).filter((row) => row.name);
}

/** "2/5/2562" (พ.ศ.) or "2019-05-02" → "2019-05-02". */
export function parseThaiDate(value: string): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!match) return undefined;
  let year = Number(match[3]);
  if (year > 2400) year -= 543;
  return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

// ── end-of-year promotion (migration 20261116000500_school_promotion.sql) ──────

export type PromotionAction = "promote" | "graduate" | "skip";
export type PromotionStep = { classroom_id: string; action: PromotionAction; target_name?: string; target_grade?: string };
export type PromotionResult = { promotion_id: string; from_year: string; to_year: string; promoted: number; graduated: number; created_classrooms: number };
export type LatestPromotion = { id: string; from_year: string; to_year: string; created_at: string; students: number; graduated: number } | null;

export const promoteSchoolYear = (organizationId: string, plan: PromotionStep[], keepTeachers: boolean) =>
  rpc<PromotionResult>("promote_school_year", { p_organization_id: organizationId, p_plan: plan, p_keep_teachers: keepTeachers });
export const latestSchoolPromotion = (organizationId: string) =>
  rpc<LatestPromotion>("latest_school_promotion", { p_organization_id: organizationId });
export const undoSchoolPromotion = (promotionId: string) => rpc<number>("undo_school_promotion", { p_promotion_id: promotionId });

/**
 * Suggested destination for a room: the next grade with the same section (ป.1/2 → ป.2/2).
 * The last grade the school teaches graduates (อ.3 → ป.1 only if the school has ป. rooms, etc.).
 */
export function suggestPromotion(room: { name: string; grade_level: string | null }, schoolGrades: Set<string>): Omit<PromotionStep, "classroom_id"> {
  const index = room.grade_level ? GRADES.indexOf(room.grade_level) : -1;
  if (index === -1) return { action: "skip" };
  const next = GRADES[index + 1];
  const level = (grade: string) => grade.slice(0, 2);
  const continues = next && (level(next) === level(room.grade_level!) || [...schoolGrades].some((grade) => level(grade) === level(next)));
  if (!continues || room.grade_level === "ม.3" && ![...schoolGrades].some((grade) => ["ม.4", "ม.5", "ม.6"].includes(grade))) {
    return { action: "graduate" };
  }
  const target = room.name.includes(room.grade_level!) ? room.name.replace(room.grade_level!, next) : `${next} ${room.name}`;
  return { action: "promote", target_name: target, target_grade: next };
}

// ── teacher home (migration 20261116000600_teacher_overview.sql) ───────────────

export type TeacherClassroom = {
  id: string; name: string; grade_level: string | null; academic_year: string | null;
  organization_id: string; school_name: string; is_primary: boolean;
  student_count: number; linked_count: number; practiced_7d: number; pending_requests: number; co_teachers: string[];
};
export type TeacherOverview = { classrooms: TeacherClassroom[]; totals: { students: number; linked: number; practiced_7d: number } };

export const getTeacherOverview = () => rpc<TeacherOverview>("get_teacher_overview", {});
