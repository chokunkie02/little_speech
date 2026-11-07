// Invitation domain types for Speech Adventure.
// Foundation for future multi-role collaboration (parent, teacher, therapist, etc.)
// Full organization/school system is Phase 10+.

import type { ChildProfileData } from "@/lib/child-profile/childProfileStorage";

export type InvitationRole =
  | "parent"
  | "teacher"
  | "therapist"
  | "school_admin"
  | "viewer";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export interface Invitation {
  id: string;
  email: string;
  role: InvitationRole;
  /** The child this invitation grants access to (optional — may be org-level in future). */
  childId?: string;
  /** User ID of the person who created this invitation. */
  invitedBy: string;
  status: InvitationStatus;
  /** Opaque token embedded in the accept link. */
  token: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
  /** auth.uid() of the user who accepted — used to correlate with child_access rows. */
  acceptedBy?: string;
  /** Email of the user who sent this invitation — stored at creation time for display on accept page. */
  inviterEmail?: string;
  /** Snapshot of the child profile at invite time — used to show child name and seed local access grants. */
  childSnapshot?: ChildProfileData;
  requiresTeacherApproval?: boolean;
  isAdditionalGuardian?: boolean;
  requestedAt?: string;
  requesterName?: string;
  requesterRelationship?: string;
}

export interface CreateInvitationInput {
  email: string;
  role: InvitationRole;
  childId?: string;
}

export const INVITATION_EXPIRY_DAYS = 7;

export const INVITATION_ROLE_LABELS: Record<InvitationRole, string> = {
  parent: "ผู้ปกครอง",
  teacher: "ครู",
  therapist: "นักบำบัด",
  school_admin: "ผู้ดูแลโรงเรียน",
  viewer: "ผู้ชม",
};

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: "รอตอบรับ",
  accepted: "ตอบรับแล้ว",
  expired: "หมดอายุ",
  revoked: "ยกเลิกแล้ว",
};
