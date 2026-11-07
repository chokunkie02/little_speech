import { STORAGE_KEYS } from "@/lib/storage/storageKeys";
import { localRead, localWrite } from "@/lib/storage/local/localStorageClient";
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
  StudentParentLinkInfo,
} from "@/types/school";
import type { ValidatedImportRow, ImportResult, ImportRowResult } from "@/types/schoolImport";

// ── Stored shape ───────────────────────────────────────────────────────────────

interface SchoolStore {
  organizations: Organization[];
  members: OrganizationMember[];
  classrooms: Classroom[];
  classroomStudents: ClassroomStudent[];
  classroomTeachers: ClassroomTeacher[];
}

const EMPTY_STORE: SchoolStore = {
  organizations: [],
  members: [],
  classrooms: [],
  classroomStudents: [],
  classroomTeachers: [],
};

const SERVER_ORGS: Organization[] = [];

// ── Module-level state (shared key — org data visible to all users on device) ──

let _store: SchoolStore = EMPTY_STORE;
let _userId: string | null = null;
let _initialized = false;
const _listeners = new Set<() => void>();

function _isBrowser(): boolean {
  return typeof window !== "undefined";
}

function _read(): SchoolStore {
  try {
    const raw = localRead(STORAGE_KEYS.SCHOOL);
    if (!raw) return EMPTY_STORE;
    const parsed = JSON.parse(raw) as Partial<SchoolStore>;
    return {
      organizations: parsed.organizations ?? [],
      members: parsed.members ?? [],
      classrooms: parsed.classrooms ?? [],
      classroomStudents: parsed.classroomStudents ?? [],
      classroomTeachers: parsed.classroomTeachers ?? [],
    };
  } catch {
    return EMPTY_STORE;
  }
}

function _write(): void {
  localWrite(STORAGE_KEYS.SCHOOL, JSON.stringify(_store));
}

function _init(): void {
  if (!_isBrowser() || _initialized) return;
  _initialized = true;
  _store = _read();
}

function _notify(): void {
  _listeners.forEach((fn) => fn());
}

function _id(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * localStorage-backed school repository.
 *
 * Uses a single unscoped key (all school data shared on same device) so that
 * school admin and teacher on the same device can both access the same data
 * in local/demo mode. setScope() keeps _userId for org membership filtering.
 */
export class LocalSchoolRepository implements ISchoolRepository {
  subscribe(callback: () => void): () => void {
    _listeners.add(callback);
    return () => { _listeners.delete(callback); };
  }

  // ── Organizations ─────────────────────────────────────────────────────────────

  listMyOrganizations(): Organization[] {
    _init();
    if (!_userId) return [];
    const memberOrgIds = new Set(
      _store.members
        .filter((m) => m.userId === _userId && m.status === "active")
        .map((m) => m.organizationId),
    );
    return _store.organizations.filter((o) => memberOrgIds.has(o.id));
  }

  getServerOrganizations(): Organization[] {
    return SERVER_ORGS;
  }

  async createSchoolOrganization(input: CreateOrganizationInput): Promise<Organization> {
    _init();
    const now = new Date().toISOString();
    const org: Organization = {
      id: _id(),
      name: input.name,
      type: input.type,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    // Auto-add creator as owner member
    const member: OrganizationMember = {
      id: _id(),
      organizationId: org.id,
      userId: input.createdBy,
      role: "owner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    _store = {
      ..._store,
      organizations: [..._store.organizations, org],
      members: [..._store.members, member],
    };
    _write();
    _notify();
    return org;
  }

  // ── Classrooms ────────────────────────────────────────────────────────────────

  listClassrooms(organizationId: string): Classroom[] {
    _init();
    return _store.classrooms.filter((c) => c.organizationId === organizationId);
  }

  async createClassroom(input: CreateClassroomInput): Promise<Classroom> {
    _init();
    const now = new Date().toISOString();
    const classroom: Classroom = {
      id: _id(),
      organizationId: input.organizationId,
      name: input.name,
      gradeLevel: input.gradeLevel ?? null,
      academicYear: input.academicYear ?? null,
      createdAt: now,
      updatedAt: now,
    };
    _store = { ..._store, classrooms: [..._store.classrooms, classroom] };
    _write();
    _notify();
    return classroom;
  }

  // ── Classroom assignments ─────────────────────────────────────────────────────

  async assignTeacherToClassroom(classroomId: string, teacherUserId: string): Promise<ClassroomTeacher> {
    _init();
    const existing = _store.classroomTeachers.find(
      (t) => t.classroomId === classroomId && t.teacherUserId === teacherUserId,
    );
    if (existing) return existing;
    const entry: ClassroomTeacher = {
      classroomId,
      teacherUserId,
      createdAt: new Date().toISOString(),
    };
    _store = { ..._store, classroomTeachers: [..._store.classroomTeachers, entry] };
    _write();
    _notify();
    return entry;
  }

  async removeTeacherFromClassroom(classroomId: string, teacherUserId: string): Promise<void> {
    _init();
    _store = {
      ..._store,
      classroomTeachers: _store.classroomTeachers.filter(
        (t) => !(t.classroomId === classroomId && t.teacherUserId === teacherUserId),
      ),
    };
    _write();
    _notify();
  }

  async addChildToClassroom(classroomId: string, childId: string): Promise<ClassroomStudent> {
    _init();
    const existing = _store.classroomStudents.find(
      (s) => s.classroomId === classroomId && s.childId === childId,
    );
    if (existing) return existing;
    const entry: ClassroomStudent = {
      classroomId,
      childId,
      createdAt: new Date().toISOString(),
    };
    _store = { ..._store, classroomStudents: [..._store.classroomStudents, entry] };
    _write();
    _notify();
    return entry;
  }

  async removeChildFromClassroom(classroomId: string, childId: string): Promise<void> {
    _init();
    _store = {
      ..._store,
      classroomStudents: _store.classroomStudents.filter(
        (s) => !(s.classroomId === classroomId && s.childId === childId),
      ),
    };
    _write();
    _notify();
  }

  listChildrenForClassroom(classroomId: string): ClassroomStudent[] {
    _init();
    return _store.classroomStudents.filter((s) => s.classroomId === classroomId);
  }

  listClassroomsForTeacher(userId: string): Classroom[] {
    _init();
    const classroomIds = new Set(
      _store.classroomTeachers
        .filter((t) => t.teacherUserId === userId)
        .map((t) => t.classroomId),
    );
    return _store.classrooms.filter((c) => classroomIds.has(c.id));
  }

  listTeachersForClassroom(classroomId: string): ClassroomTeacher[] {
    _init();
    return _store.classroomTeachers.filter((t) => t.classroomId === classroomId);
  }

  // ── User display ──────────────────────────────────────────────────────────────

  async findTeacherByEmail(_email: string): Promise<UserDisplayInfo | null> {
    return null; // not available in local/demo mode
  }

  async resolveUserDisplays(_userIds: string[]): Promise<Map<string, UserDisplayInfo>> {
    return new Map(); // not available in local/demo mode
  }

  // ── Student profile resolution ───────────────────────────────────────────────

  async resolveStudentProfiles(
    _childIds: string[],
  ): Promise<Map<string, { name: string; nickname: string | null }>> {
    return new Map(); // not available in local/demo mode
  }

  // ── Student import (local/demo mode — minimal mock) ──────────────────────────

  async listStudentCodes(_organizationId: string): Promise<string[]> {
    return []; // not tracked in local storage
  }

  async importStudents(
    rows: ValidatedImportRow[],
    classrooms: Classroom[],
    _organizationId: string,
    _creatorUserId: string,
  ): Promise<ImportResult> {
    _init();
    const classroomMap = new Map(classrooms.map((c) => [c.name, c]));
    const results: ImportRowResult[] = [];

    for (const row of rows) {
      if (row.status === "error") {
        results.push({ rowNumber: row.rowNumber, status: "failed", message: row.errors.join("; ") });
        continue;
      }
      if (row.isExistingInDb) {
        results.push({ rowNumber: row.rowNumber, status: "skipped" });
        continue;
      }

      const classroom = classroomMap.get(row.classroom);
      if (classroom) {
        const entry: ClassroomStudent = {
          classroomId: classroom.id,
          childId:     _id(),
          createdAt:   new Date().toISOString(),
        };
        _store = { ..._store, classroomStudents: [..._store.classroomStudents, entry] };
      }

      results.push({ rowNumber: row.rowNumber, status: "created" });
    }

    _write();
    _notify();

    return {
      results,
      createdCount: results.filter((r) => r.status === "created").length,
      skippedCount: results.filter((r) => r.status === "skipped").length,
      failedCount:  results.filter((r) => r.status === "failed").length,
    };
  }

  async archiveStudent(_childId: string): Promise<void> {
    // Not implemented in local/demo mode — no-op
  }

  // ── Parent linking (Phase 15) — not available in local/demo mode ──────────────

  async listStudentParentLinks(_classroomId: string, _organizationId: string): Promise<StudentParentLinkInfo[]> {
    return [];
  }

  async ensureParentInvitationForChild(
    _childId: string,
    _parentEmail: string,
    _invitedBy: string,
    _inviterEmail?: string,
  ): Promise<{ id: string; token: string }> {
    return { id: _id(), token: _id() };
  }

  // ── Scope ─────────────────────────────────────────────────────────────────────

  setScope(userId: string | null): void {
    _userId = userId;
    _init();
    _notify();
  }
}
