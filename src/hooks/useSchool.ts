"use client";

import { useSyncExternalStore } from "react";
import { useRepositories } from "@/lib/providers/RepositoryProvider";
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

// Module-level stable refs required by useSyncExternalStore
const _noopSub = () => () => {};
const _serverOrgs: Organization[] = [];

function _serverSnapshot(): Organization[] {
  return _serverOrgs;
}

/**
 * React hook for school/classroom data.
 *
 * Reads from ISchoolRepository (local or Supabase depending on env).
 * All writes are async and update the cache via the repository's subscribe/notify
 * mechanism — callers do not need to manually refresh.
 */
export function useSchool() {
  const { school } = useRepositories();

  const organizations = useSyncExternalStore(
    school?.subscribe.bind(school) ?? _noopSub,
    school?.listMyOrganizations.bind(school) ?? (() => _serverOrgs),
    school?.getServerOrganizations.bind(school) ?? _serverSnapshot,
  );

  function listClassrooms(organizationId: string): Classroom[] {
    return school?.listClassrooms(organizationId) ?? [];
  }

  function listChildrenForClassroom(classroomId: string): ClassroomStudent[] {
    return school?.listChildrenForClassroom(classroomId) ?? [];
  }

  function listClassroomsForTeacher(userId: string): Classroom[] {
    return school?.listClassroomsForTeacher(userId) ?? [];
  }

  function listTeachersForClassroom(classroomId: string): ClassroomTeacher[] {
    return school?.listTeachersForClassroom(classroomId) ?? [];
  }

  async function createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    if (!school) throw new Error("School repository not available");
    return school.createSchoolOrganization(input);
  }

  async function createClassroom(input: CreateClassroomInput): Promise<Classroom> {
    if (!school) throw new Error("School repository not available");
    return school.createClassroom(input);
  }

  async function assignTeacher(classroomId: string, teacherUserId: string): Promise<ClassroomTeacher> {
    if (!school) throw new Error("School repository not available");
    return school.assignTeacherToClassroom(classroomId, teacherUserId);
  }

  async function removeTeacher(classroomId: string, teacherUserId: string): Promise<void> {
    if (!school) throw new Error("School repository not available");
    return school.removeTeacherFromClassroom(classroomId, teacherUserId);
  }

  async function addChild(classroomId: string, childId: string): Promise<ClassroomStudent> {
    if (!school) throw new Error("School repository not available");
    return school.addChildToClassroom(classroomId, childId);
  }

  async function removeChild(classroomId: string, childId: string): Promise<void> {
    if (!school) throw new Error("School repository not available");
    return school.removeChildFromClassroom(classroomId, childId);
  }

  async function findTeacherByEmail(email: string): Promise<UserDisplayInfo | null> {
    if (!school) return null;
    return school.findTeacherByEmail(email);
  }

  async function resolveUserDisplays(userIds: string[]): Promise<Map<string, UserDisplayInfo>> {
    if (!school) return new Map();
    return school.resolveUserDisplays(userIds);
  }

  async function resolveStudentProfiles(
    childIds: string[],
  ): Promise<Map<string, { name: string; nickname: string | null }>> {
    if (!school) return new Map();
    return school.resolveStudentProfiles(childIds);
  }

  async function archiveStudent(childId: string): Promise<void> {
    if (!school) throw new Error("School repository not available");
    return school.archiveStudent(childId);
  }

  async function listStudentParentLinks(
    classroomId: string,
    organizationId: string,
  ): Promise<StudentParentLinkInfo[]> {
    if (!school) return [];
    return school.listStudentParentLinks(classroomId, organizationId);
  }

  async function ensureParentInvitationForChild(
    childId: string,
    parentEmail: string,
    invitedBy: string,
    inviterEmail?: string,
  ): Promise<{ id: string; token: string }> {
    if (!school) throw new Error("School repository not available");
    return school.ensureParentInvitationForChild(childId, parentEmail, invitedBy, inviterEmail);
  }

  return {
    organizations,
    listClassrooms,
    listChildrenForClassroom,
    listClassroomsForTeacher,
    listTeachersForClassroom,
    createOrganization,
    createClassroom,
    assignTeacher,
    removeTeacher,
    addChild,
    removeChild,
    findTeacherByEmail,
    resolveUserDisplays,
    resolveStudentProfiles,
    archiveStudent,
    listStudentParentLinks,
    ensureParentInvitationForChild,
  };
}
