import type {
  Organization,
  Classroom,
  ClassroomStudent,
  ClassroomTeacher,
  CreateOrganizationInput,
  CreateClassroomInput,
  UserDisplayInfo,
  StudentParentLinkInfo,
} from "@/types/school";
import type { ValidatedImportRow, ImportResult } from "@/types/schoolImport";

/**
 * Contract for school / classroom data.
 *
 * Follows the same useSyncExternalStore-compatible subscribe/snapshot pattern
 * as other Speech Adventure repositories.
 *
 * Scope is set via setScope(userId) — data is filtered by the calling user's
 * membership when possible.
 */
export interface ISchoolRepository {
  rehydrate?(): void;
  subscribe(callback: () => void): () => void;

  // ── Organizations ─────────────────────────────────────────────────────────────
  /** Organizations the current user is an active member of. */
  listMyOrganizations(): Organization[];
  getServerOrganizations(): Organization[];
  createSchoolOrganization(input: CreateOrganizationInput): Promise<Organization>;

  // ── Classrooms ────────────────────────────────────────────────────────────────
  listClassrooms(organizationId: string): Classroom[];
  createClassroom(input: CreateClassroomInput): Promise<Classroom>;

  // ── Classroom assignments ─────────────────────────────────────────────────────
  assignTeacherToClassroom(classroomId: string, teacherUserId: string): Promise<ClassroomTeacher>;
  removeTeacherFromClassroom(classroomId: string, teacherUserId: string): Promise<void>;
  addChildToClassroom(classroomId: string, childId: string): Promise<ClassroomStudent>;
  removeChildFromClassroom(classroomId: string, childId: string): Promise<void>;
  listChildrenForClassroom(classroomId: string): ClassroomStudent[];
  listClassroomsForTeacher(userId: string): Classroom[];
  listTeachersForClassroom(classroomId: string): ClassroomTeacher[];

  // ── User display (for teacher search / list display) ─────────────────────────
  /** Find a user by exact email match — returns null if not found. */
  findTeacherByEmail(email: string): Promise<UserDisplayInfo | null>;
  /** Resolve display info for a batch of user IDs (best-effort; missing IDs are omitted). */
  resolveUserDisplays(userIds: string[]): Promise<Map<string, UserDisplayInfo>>;

  // ── Student profile resolution ───────────────────────────────────────────────
  /**
   * Fetch display data (name + nickname) for a batch of child IDs.
   * Used to show human-readable names for imported students whose profiles
   * may not be in the profile repository's in-memory cache yet.
   * Missing IDs are silently omitted from the result map.
   */
  resolveStudentProfiles(
    childIds: string[],
  ): Promise<Map<string, { name: string; nickname: string | null }>>;

  // ── Student import ────────────────────────────────────────────────────────────
  /** Returns existing student_codes for duplicate detection before import. */
  listStudentCodes(organizationId: string): Promise<string[]>;
  /**
   * Bulk-create child_profiles + classroom_students for validated import rows.
   * Rows with status "error" or isExistingInDb are skipped automatically.
   * creatorUserId becomes the user_id on each created child_profile.
   */
  importStudents(
    rows: ValidatedImportRow[],
    classrooms: Classroom[],
    organizationId: string,
    creatorUserId: string,
  ): Promise<ImportResult>;

  /**
   * Soft-delete a student from the organisation: marks the profile archived,
   * removes classroom membership, and revokes parent access/invitations.
   * Practice data is NOT deleted.
   */
  archiveStudent(childId: string): Promise<void>;

  // ── Parent linking (Phase 15) ─────────────────────────────────────────────────

  /**
   * Returns parent-link status for every student in a classroom.
   * Combines child_profiles.parent_email_pending with the latest parent invitation per child.
   */
  listStudentParentLinks(classroomId: string, organizationId: string): Promise<StudentParentLinkInfo[]>;

  /**
   * Creates a pending parent invitation for the child if one does not already exist.
   * Idempotent: re-importing the same parent email will not create a duplicate pending invite.
   * Returns the invitation id and token.
   */
  ensureParentInvitationForChild(
    childId: string,
    parentEmail: string,
    invitedBy: string,
    inviterEmail?: string,
  ): Promise<{ id: string; token: string }>;

  /**
   * Revokes all active parent invitations and guardian child_access for a student.
   * Calls the revoke_parent_link_for_child SECURITY DEFINER RPC.
   * Practice data is NOT deleted.
   */
  revokeParentLink(childId: string): Promise<void>;

  // ── Scope ─────────────────────────────────────────────────────────────────────
  setScope(userId: string | null): void;
}
