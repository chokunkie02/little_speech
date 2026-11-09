// School / classroom domain types for Speech Adventure.
// Phase 13 foundation — full school admin and CSV import are later phases.

export type OrganizationType = "family" | "school" | "clinic";
export type OrgMemberRole = "owner" | "admin" | "teacher" | "therapist" | "parent" | "viewer";
export type OrgMemberStatus = "active" | "invited" | "removed";

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgMemberRole;
  status: OrgMemberStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Classroom {
  id: string;
  organizationId: string;
  name: string;
  gradeLevel: string | null;
  academicYear: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClassroomStudent {
  classroomId: string;
  childId: string;
  createdAt: string;
}

export interface ClassroomTeacher {
  classroomId: string;
  teacherUserId: string;
  createdAt: string;
}

export interface CreateOrganizationInput {
  name: string;
  type: OrganizationType;
  createdBy: string;
}

export interface CreateClassroomInput {
  organizationId: string;
  name: string;
  gradeLevel?: string;
  academicYear?: string;
}

export interface UserDisplayInfo {
  userId: string;
  email: string;
  role: string | null;
}

export const ORG_TYPE_LABELS: Record<OrganizationType, string> = {
  family: "ครอบครัว",
  school: "โรงเรียน",
  clinic: "คลินิก",
};

// ── Parent linking (Phase 15) ─────────────────────────────────────────────────

export type ParentLinkStatus =
  | "no_parent_email"
  | "pending"
  | "accepted"
  | "revoked"
  | "missing_invite";

export interface StudentParentLinkInfo {
  childId: string;
  name: string;
  nickname: string | null;
  studentCode: string | null;
  parentEmail: string | null;
  parentLinkStatus: ParentLinkStatus;
  invitationId: string | null;
  invitationToken: string | null;
}

export const PARENT_LINK_STATUS_LABELS: Record<ParentLinkStatus, string> = {
  no_parent_email: "ยังไม่มีอีเมลผู้ปกครอง",
  pending:         "รอตอบรับ",
  accepted:        "ตอบรับแล้ว",
  revoked:         "ยกเลิกแล้ว",
  missing_invite:  "ยังไม่ได้สร้างคำเชิญ",
};

export const ORG_MEMBER_ROLE_LABELS: Record<OrgMemberRole, string> = {
  owner: "เจ้าของ",
  admin: "ผู้ดูแลระบบ",
  teacher: "ครู",
  therapist: "นักบำบัด",
  parent: "ผู้ปกครอง",
  viewer: "ผู้ชม",
};


export type SchoolTeacherInvitationStatus = "pending" | "accepted" | "expired";

export interface SchoolTeacherInvitation {
  email: string;
  token: string | null;
  status: SchoolTeacherInvitationStatus;
  teacher_user_id: string | null;
  assigned: boolean;
}

export type SchoolPersonMatch = {
  kind: "student" | "teacher" | "guardian";
  name: string;
  detail: string;
  child_id: string | null;
  classroom_id: string | null;
};

export type PlatformSchool = {
  id: string;
  name: string;
  created_at: string;
  admin_count: number;
  teacher_count: number;
  classroom_count: number;
  student_count: number;
  recent_sessions: number;
};

export type PlatformSchoolAdmins = {
  admins: { email: string }[];
  invitations: { email: string; token: string | null; status: SchoolTeacherInvitationStatus }[];
};
