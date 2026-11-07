import type { ISchoolRepository } from "@/lib/repositories/ISchoolRepository";
import type {
  Organization,
  OrganizationMember,
  Classroom,
  ClassroomStudent,
  ClassroomTeacher,
  CreateOrganizationInput,
  CreateClassroomInput,
  UserDisplayInfo,
  ParentLinkStatus,
  StudentParentLinkInfo,
} from "@/types/school";
import type { ValidatedImportRow, ImportResult, ImportRowResult } from "@/types/schoolImport";
import { INVITATION_EXPIRY_DAYS } from "@/types/invitations";
import type { SupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import { QueryError, warnRepo } from "./errors";

type DbOrg     = Database["public"]["Tables"]["organizations"]["Row"];
type DbMember  = Database["public"]["Tables"]["organization_members"]["Row"];
type DbRoom    = Database["public"]["Tables"]["classrooms"]["Row"];
type DbStudent = Database["public"]["Tables"]["classroom_students"]["Row"];
type DbTeacher = Database["public"]["Tables"]["classroom_teachers"]["Row"];
type DbDisplay = Database["public"]["Tables"]["user_display_profiles"]["Row"];

function mapOrg(row: DbOrg): Organization {
  return {
    id:         row.id,
    name:       row.name,
    type:       row.type,
    createdBy:  row.created_by,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
  };
}

function mapMember(row: DbMember): OrganizationMember {
  return {
    id:             row.id,
    organizationId: row.organization_id,
    userId:         row.user_id,
    role:           row.role,
    status:         row.status,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

function mapClassroom(row: DbRoom): Classroom {
  return {
    id:             row.id,
    organizationId: row.organization_id,
    name:           row.name,
    gradeLevel:     row.grade_level,
    academicYear:   row.academic_year,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

function mapStudent(row: DbStudent): ClassroomStudent {
  return {
    classroomId: row.classroom_id,
    childId:     row.child_id,
    createdAt:   row.created_at,
  };
}

function mapTeacher(row: DbTeacher): ClassroomTeacher {
  return {
    classroomId:    row.classroom_id,
    teacherUserId:  row.teacher_user_id,
    createdAt:      row.created_at,
  };
}

function mapDisplay(row: DbDisplay): UserDisplayInfo {
  return { userId: row.user_id, email: row.email, role: row.role };
}

const SERVER_ORGS: Organization[] = [];

/**
 * Supabase-backed school/classroom repository.
 *
 * Caches hydrated data in memory and re-notifies subscribers on changes.
 * RLS policies restrict each query to the current authenticated user's scope.
 */
export class SupabaseSchoolRepository implements ISchoolRepository {
  private _orgs: Organization[] = SERVER_ORGS;
  private _members: OrganizationMember[] = [];
  private _classrooms: Classroom[] = [];
  private _classroomStudents: ClassroomStudent[] = [];
  private _classroomTeachers: ClassroomTeacher[] = [];
  private readonly _listeners = new Set<() => void>();
  private _hydratePromise: Promise<void> | null = null;
  private _hydrateGen = 0;

  constructor(private readonly client: SupabaseClient<Database>) {}

  // ── useSyncExternalStore ──────────────────────────────────────────────────────

  subscribe(callback: () => void): () => void {
    this._listeners.add(callback);
    this._triggerHydrate();
    return () => { this._listeners.delete(callback); };
  }

  // ── Organizations ─────────────────────────────────────────────────────────────

  listMyOrganizations(): Organization[] {
    return this._orgs;
  }

  getServerOrganizations(): Organization[] {
    return SERVER_ORGS;
  }

  async createSchoolOrganization(input: CreateOrganizationInput): Promise<Organization> {
    // Use SECURITY DEFINER RPC to atomically insert org + owner membership.
    // Direct INSERT on organizations would hit the RLS chicken-and-egg problem:
    // the org_members INSERT policy (is_org_admin) fails before any member exists.
    const { data: orgId, error: rpcErr } = await this.client.rpc(
      "create_school_organization",
      { p_name: input.name, p_type: input.type },
    );

    if (rpcErr || !orgId) {
      warnRepo("SupabaseSchoolRepository.createSchoolOrganization",
        new QueryError("organizations", "rpc:create_school_organization", rpcErr ?? new Error("no org id returned")));
      throw new Error(rpcErr?.message ?? "Failed to create organization");
    }

    // Fetch the full org row — now readable because the owner member row exists.
    const { data, error: fetchErr } = await this.client
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();

    if (fetchErr || !data) {
      warnRepo("SupabaseSchoolRepository.createSchoolOrganization:fetch",
        new QueryError("organizations", "select", fetchErr ?? new Error("no data")));
      throw new Error(fetchErr?.message ?? "Organization created but could not be fetched");
    }

    const org = mapOrg(data);
    this._orgs = [...this._orgs, org];
    this._notify();
    this.rehydrate();
    return org;
  }

  // ── Classrooms ────────────────────────────────────────────────────────────────

  listClassrooms(organizationId: string): Classroom[] {
    return this._classrooms.filter((c) => c.organizationId === organizationId);
  }

  async createClassroom(input: CreateClassroomInput): Promise<Classroom> {
    const { data, error } = await this.client
      .from("classrooms")
      .insert({
        organization_id: input.organizationId,
        name:            input.name,
        grade_level:     input.gradeLevel ?? null,
        academic_year:   input.academicYear ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      warnRepo("SupabaseSchoolRepository.createClassroom",
        new QueryError("classrooms", "insert", error ?? new Error("no data")));
      throw new Error(error?.message ?? "Failed to create classroom");
    }

    const classroom = mapClassroom(data);
    this._classrooms = [...this._classrooms, classroom];
    this._notify();
    return classroom;
  }

  // ── Classroom assignments ─────────────────────────────────────────────────────

  async assignTeacherToClassroom(classroomId: string, teacherUserId: string): Promise<ClassroomTeacher> {
    const existing = this._classroomTeachers.find(
      (t) => t.classroomId === classroomId && t.teacherUserId === teacherUserId,
    );
    if (existing) return existing;

    const { data, error } = await this.client
      .rpc("assign_school_teacher", { p_classroom_id: classroomId, p_teacher_user_id: teacherUserId });

    if (error || !data) {
      warnRepo("SupabaseSchoolRepository.assignTeacherToClassroom",
        new QueryError("classroom_teachers", "insert", error ?? new Error("no data")));
      throw new Error(error?.message ?? "Failed to assign teacher");
    }

    const entry = mapTeacher(data);
    this._classroomTeachers = [...this._classroomTeachers, entry];
    this._notify();
    return entry;
  }

  async removeTeacherFromClassroom(classroomId: string, teacherUserId: string): Promise<void> {
    const prev = this._classroomTeachers;
    this._classroomTeachers = this._classroomTeachers.filter(
      (t) => !(t.classroomId === classroomId && t.teacherUserId === teacherUserId),
    );
    this._notify();

    const { error } = await this.client
      .from("classroom_teachers")
      .delete()
      .eq("classroom_id", classroomId)
      .eq("teacher_user_id", teacherUserId);

    if (error) {
      this._classroomTeachers = prev;
      this._notify();
      warnRepo("SupabaseSchoolRepository.removeTeacherFromClassroom",
        new QueryError("classroom_teachers", "delete", error));
      throw new Error(error.message);
    }
  }

  async addChildToClassroom(classroomId: string, childId: string): Promise<ClassroomStudent> {
    const existing = this._classroomStudents.find(
      (s) => s.classroomId === classroomId && s.childId === childId,
    );
    if (existing) return existing;

    const { data, error } = await this.client
      .from("classroom_students")
      .insert({ classroom_id: classroomId, child_id: childId })
      .select()
      .single();

    if (error || !data) {
      warnRepo("SupabaseSchoolRepository.addChildToClassroom",
        new QueryError("classroom_students", "insert", error ?? new Error("no data")));
      throw new Error(error?.message ?? "Failed to add child to classroom");
    }

    const entry = mapStudent(data);
    this._classroomStudents = [...this._classroomStudents, entry];
    this._notify();
    return entry;
  }

  async removeChildFromClassroom(classroomId: string, childId: string): Promise<void> {
    const prev = this._classroomStudents;
    this._classroomStudents = this._classroomStudents.filter(
      (s) => !(s.classroomId === classroomId && s.childId === childId),
    );
    this._notify();

    const { error } = await this.client
      .from("classroom_students")
      .delete()
      .eq("classroom_id", classroomId)
      .eq("child_id", childId);

    if (error) {
      this._classroomStudents = prev;
      this._notify();
      warnRepo("SupabaseSchoolRepository.removeChildFromClassroom",
        new QueryError("classroom_students", "delete", error));
      throw new Error(error.message);
    }
  }

  listChildrenForClassroom(classroomId: string): ClassroomStudent[] {
    return this._classroomStudents.filter((s) => s.classroomId === classroomId);
  }

  listClassroomsForTeacher(userId: string): Classroom[] {
    const assignedIds = new Set(
      this._classroomTeachers
        .filter((t) => t.teacherUserId === userId)
        .map((t) => t.classroomId),
    );
    return this._classrooms.filter((c) => assignedIds.has(c.id));
  }

  listTeachersForClassroom(classroomId: string): ClassroomTeacher[] {
    return this._classroomTeachers.filter((t) => t.classroomId === classroomId);
  }

  // ── Session boundary ─────────────────────────────────────────────────────────

  public reset(): void {
    this._hydrateGen++;
    this._hydratePromise = null;
    this._orgs = SERVER_ORGS;
    this._members = [];
    this._classrooms = [];
    this._classroomStudents = [];
    this._classroomTeachers = [];
    this._notify();
  }

  public rehydrate(): void {
    this._hydratePromise = null;
    this._hydrateGen++;
    this._triggerHydrate();
  }

  // ── User display ──────────────────────────────────────────────────────────────

  async findTeacherByEmail(email: string): Promise<UserDisplayInfo | null> {
    const { data, error } = await this.client
      .from("user_display_profiles")
      .select("*")
      .ilike("email", email.trim())
      .maybeSingle();

    if (error) {
      warnRepo("SupabaseSchoolRepository.findTeacherByEmail",
        new QueryError("user_display_profiles", "select", error));
      return null;
    }
    return data ? mapDisplay(data) : null;
  }

  async resolveUserDisplays(userIds: string[]): Promise<Map<string, UserDisplayInfo>> {
    if (userIds.length === 0) return new Map();
    const { data, error } = await this.client
      .from("user_display_profiles")
      .select("*")
      .in("user_id", userIds);

    if (error) {
      warnRepo("SupabaseSchoolRepository.resolveUserDisplays",
        new QueryError("user_display_profiles", "select", error));
      return new Map();
    }
    const result = new Map<string, UserDisplayInfo>();
    for (const row of (data ?? [])) {
      result.set(row.user_id, mapDisplay(row));
    }
    return result;
  }

  // ── Student import ────────────────────────────────────────────────────────────

  async listStudentCodes(organizationId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from("child_profiles")
      .select("student_code")
      .eq("organization_id", organizationId)
      .not("student_code", "is", null)
      .is("archived_at", null);

    if (error) {
      warnRepo("SupabaseSchoolRepository.listStudentCodes",
        new QueryError("child_profiles", "select", error));
      return [];
    }
    return (data ?? [])
      .map((r) => (r as { student_code: string | null }).student_code ?? "")
      .filter(Boolean);
  }

  async importStudents(
    rows: ValidatedImportRow[],
    classrooms: Classroom[],
    organizationId: string,
    creatorUserId: string,
  ): Promise<ImportResult> {
    const classroomMap = new Map(classrooms.map((c) => [c.name, c]));
    const results: ImportRowResult[] = [];

    const { data: { user: currentUser } } = await this.client.auth.getUser();
    const inviterEmail = currentUser?.email ?? undefined;

    for (const row of rows) {
      // Skip rows that cannot be imported
      if (row.status === "error") {
        results.push({ rowNumber: row.rowNumber, status: "failed", message: row.errors.join("; ") });
        continue;
      }
      if (row.isExistingInDb) {
        results.push({ rowNumber: row.rowNumber, status: "skipped", message: row.warnings.find((w) => w.includes("ข้าม")) ?? "ซ้ำ" });
        continue;
      }

      try {
        const { data: profile, error: profileErr } = await this.client
          .from("child_profiles")
          .insert({
            user_id:              creatorUserId,
            name:                 row.name || row.nickname || `Student ${row.studentCode}`,
            age:                  row.age ?? 6,
            target_sound:         row.targetSounds[0] ?? "ก",
            training_goal:        "",
            training_mode:        "speech_clarity",
            selected_sound_id:    row.targetSounds[0] ?? "ก",
            avatar_emoji:         "🧒",
            organization_id:      organizationId,
            student_code:         row.studentCode || null,
            nickname:             row.nickname || null,
            grade_level:          row.gradeLevel || null,
            parent_email_pending: row.parentEmail || null,
          })
          .select()
          .single();

        if (profileErr || !profile) {
          results.push({
            rowNumber: row.rowNumber,
            status:    "failed",
            message:   profileErr?.message ?? "สร้างโปรไฟล์ไม่สำเร็จ",
          });
          continue;
        }

        const classroom = classroomMap.get(row.classroom);
        if (classroom) {
          const { error: csErr } = await this.client
            .from("classroom_students")
            .insert({ classroom_id: classroom.id, child_id: profile.id });

          if (!csErr) {
            const entry: ClassroomStudent = {
              classroomId: classroom.id,
              childId:     profile.id,
              createdAt:   new Date().toISOString(),
            };
            this._classroomStudents = [...this._classroomStudents, entry];
          }
        }

        // Create parent invitation if parent_email provided
        if (row.parentEmail) {
          try {
            await this.ensureParentInvitationForChild(
              profile.id,
              row.parentEmail,
              creatorUserId,
              inviterEmail,
            );
          } catch (invErr) {
            warnRepo("SupabaseSchoolRepository.importStudents:parentInvite",
              invErr instanceof Error ? invErr : new Error(String(invErr)));
          }
        }

        results.push({ rowNumber: row.rowNumber, status: "created" });
      } catch (e) {
        results.push({
          rowNumber: row.rowNumber,
          status:    "failed",
          message:   e instanceof Error ? e.message : "เกิดข้อผิดพลาด",
        });
      }
    }

    this._notify();
    this.rehydrate();

    return {
      results,
      createdCount: results.filter((r) => r.status === "created").length,
      skippedCount: results.filter((r) => r.status === "skipped").length,
      failedCount:  results.filter((r) => r.status === "failed").length,
    };
  }

  async resolveStudentProfiles(
    childIds: string[],
  ): Promise<Map<string, { name: string; nickname: string | null }>> {
    if (childIds.length === 0) return new Map();

    const { data, error } = await this.client
      .from("child_profiles")
      .select("id, name, nickname")
      .in("id", childIds);

    if (error) {
      warnRepo("SupabaseSchoolRepository.resolveStudentProfiles",
        new QueryError("child_profiles", "select", error));
      return new Map();
    }

    const result = new Map<string, { name: string; nickname: string | null }>();
    for (const row of (data ?? [])) {
      result.set(row.id, {
        name:     row.name,
        nickname: (row as { nickname?: string | null }).nickname ?? null,
      });
    }
    return result;
  }

  async archiveStudent(childId: string): Promise<void> {
    const { error } = await this.client.rpc("archive_student", { p_child_id: childId });
    if (error) throw new Error(error.message);
    // Remove from local cache so UI updates immediately
    this._classroomStudents = this._classroomStudents.filter((s) => s.childId !== childId);
    this._notify();
  }

  // ── Parent linking (Phase 15) ─────────────────────────────────────────────────

  async listStudentParentLinks(classroomId: string, organizationId: string): Promise<StudentParentLinkInfo[]> {
    const classroomStudents = this._classroomStudents.filter((s) => s.classroomId === classroomId);
    const childIds = classroomStudents.map((s) => s.childId);
    if (childIds.length === 0) return [];

    const [profilesRes, invitationsRes] = await Promise.all([
      this.client
        .from("child_profiles")
        .select("id, name, nickname, student_code, parent_email_pending")
        .in("id", childIds)
        .eq("organization_id", organizationId),
      this.client
        .from("invitations")
        .select("id, child_id, status, token, requested_at")
        .in("child_id", childIds)
        .eq("role", "parent")
        .order("created_at", { ascending: false }),
    ]);

    if (profilesRes.error) {
      warnRepo("SupabaseSchoolRepository.listStudentParentLinks:profiles",
        new QueryError("child_profiles", "select", profilesRes.error));
      return [];
    }

    // An existing approved guardian takes priority over an invitation in progress.
    const priority = (s: string) => (s === "accepted" ? 3 : s === "pending" ? 2 : 1);
    const invMap = new Map<string, { id: string; token: string | null; status: string }>();
    for (const inv of (invitationsRes.data ?? [])) {
      if (!inv.child_id) continue;
      const existing = invMap.get(inv.child_id);
      if (!existing || priority(inv.status) > priority(existing.status)) {
        invMap.set(inv.child_id, { id: inv.id, token: inv.status === "pending" && !inv.requested_at ? inv.token : null, status: inv.status });
      }
    }

    return (profilesRes.data ?? []).map((p) => {
      const inv = invMap.get(p.id);
      const parentEmail = (p as { parent_email_pending?: string | null }).parent_email_pending ?? null;

      let parentLinkStatus: ParentLinkStatus;
      if (inv) {
        parentLinkStatus = inv.status as ParentLinkStatus;
      } else {
        parentLinkStatus = parentEmail ? "missing_invite" : "no_parent_email";
      }

      return {
        childId:         p.id,
        name:            (p as { name: string }).name,
        nickname:        (p as { nickname?: string | null }).nickname ?? null,
        studentCode:     (p as { student_code?: string | null }).student_code ?? null,
        parentEmail,
        parentLinkStatus,
        invitationId:    inv?.id ?? null,
        invitationToken: inv?.token ?? null,
      };
    });
  }

  async ensureParentInvitationForChild(
    childId: string,
    parentEmail: string,
    invitedBy: string,
    inviterEmail?: string,
  ): Promise<{ id: string; token: string }> {
    const email = parentEmail.trim().toLowerCase();

    // Check for existing pending invitation
    const { data: existing } = await this.client
      .from("invitations")
      .select("id, token")
      .eq("child_id", childId)
      .eq("email", email)
      .eq("role", "parent")
      .eq("status", "pending")
      .maybeSingle();

    if (existing) return { id: existing.id, token: existing.token };

    const id = crypto.randomUUID();
    const token = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { error } = await this.client.from("invitations").insert({
      id,
      email,
      role: "parent",
      child_id:      childId,
      invited_by:    invitedBy,
      inviter_email: inviterEmail ?? null,
      token,
      status:        "pending",
      expires_at:    expiresAt,
    });

    if (error) {
      // Race condition: another insert beat us — fetch the winner
      const { data: raceWinner } = await this.client
        .from("invitations")
        .select("id, token")
        .eq("child_id", childId)
        .eq("email", email)
        .eq("role", "parent")
        .eq("status", "pending")
        .maybeSingle();
      if (raceWinner) return { id: raceWinner.id, token: raceWinner.token };
      warnRepo("SupabaseSchoolRepository.ensureParentInvitationForChild",
        new QueryError("invitations", "insert", error));
      throw new Error(error.message);
    }

    return { id, token };
  }

  public setScope(_userId: string | null): void {
    // Scope handled via Supabase RLS
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _notify(): void {
    // useSchool subscribes to this snapshot for classroom and roster changes too.
    this._orgs = [...this._orgs];
    this._listeners.forEach((cb) => cb());
  }

  private _triggerHydrate(): void {
    if (this._hydratePromise) return;
    this._hydratePromise = this._hydrate().catch((err) => {
      warnRepo("SupabaseSchoolRepository._hydrate", err);
    });
  }

  private async _hydrate(): Promise<void> {
    const myGen = this._hydrateGen;

    const { data: { user } } = await this.client.auth.getUser();
    if (!user || this._hydrateGen !== myGen) return;

    const [orgsRes, membersRes, roomsRes, studentsRes, teachersRes] = await Promise.all([
      this.client.from("organizations").select("*"),
      this.client.from("organization_members").select("*").eq("user_id", user.id),
      this.client.from("classrooms").select("*"),
      this.client.from("classroom_students").select("*"),
      // No user filter here — RLS handles scoping:
      //   org members see all teachers in their org's classrooms
      //   teachers (non-org-members) see only their own assignments
      this.client.from("classroom_teachers").select("*"),
    ]);

    if (this._hydrateGen !== myGen) return;

    if (orgsRes.error)     warnRepo("SupabaseSchoolRepository._hydrate:orgs",     new QueryError("organizations", "select", orgsRes.error));
    if (membersRes.error)  warnRepo("SupabaseSchoolRepository._hydrate:members",  new QueryError("organization_members", "select", membersRes.error));
    if (roomsRes.error)    warnRepo("SupabaseSchoolRepository._hydrate:classrooms", new QueryError("classrooms", "select", roomsRes.error));
    if (studentsRes.error) warnRepo("SupabaseSchoolRepository._hydrate:students", new QueryError("classroom_students", "select", studentsRes.error));
    if (teachersRes.error) warnRepo("SupabaseSchoolRepository._hydrate:teachers", new QueryError("classroom_teachers", "select", teachersRes.error));

    this._orgs             = (orgsRes.data     ?? []).map(mapOrg);
    this._members          = (membersRes.data  ?? []).map(mapMember);
    this._classrooms       = (roomsRes.data    ?? []).map(mapClassroom);
    this._classroomStudents = (studentsRes.data ?? []).map(mapStudent);
    this._classroomTeachers = (teachersRes.data ?? []).map(mapTeacher);
    this._notify();
  }
}
