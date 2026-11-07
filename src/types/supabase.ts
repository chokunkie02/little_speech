/**
 * Supabase Database type placeholder for Speech Adventure.
 *
 * Mirrors the schema defined in docs/architecture/database-schema.md.
 * This file is a hand-written placeholder — replace it with the generated
 * version once a Supabase project is linked:
 *
 *   npx supabase gen types typescript --project-id <ref> > src/types/supabase.ts
 *
 * The Database type is consumed by createClient<Database>() in
 * src/lib/supabase/client.ts to provide end-to-end type safety for
 * Supabase queries (table names, column names, return shapes).
 */

import type {
  DbChildProfile,
  DbPracticeSession,
  DbPracticeAttempt,
  DbObservationNote,
  DbInvitation,
  DbChildAccess,
  DbSessionStatus,
  DbEvaluationStatus,
  DbObservationTargetType,
  DbObservationCategory,
  DbInvitationRole,
  DbInvitationStatus,
  DbAccessRole,
  DbOrganization,
  DbOrganizationMember,
  DbClassroom,
  DbClassroomStudent,
  DbClassroomTeacher,
  DbOrganizationType,
  DbOrgMemberRole,
  DbOrgMemberStatus,
  DbUserDisplayProfile,
} from "@/types/database";

// ── Insert types (server-generated fields become optional) ────────────────────

export type InsertChildProfile =
  Omit<DbChildProfile, "id" | "created_at" | "updated_at" | "organization_id" | "student_code" | "nickname" | "grade_level" | "parent_email_pending" | "archived_at">
  & {
    id?: string;
    organization_id?: string | null;
    student_code?: string | null;
    nickname?: string | null;
    grade_level?: string | null;
    parent_email_pending?: string | null;
    archived_at?: string | null;
  };
export type InsertPracticeSession = Omit<DbPracticeSession, "id" | "created_at">;
export type InsertPracticeAttempt = Omit<DbPracticeAttempt, "id" | "created_at">;
export type InsertObservationNote = Omit<DbObservationNote, "id" | "created_at" | "updated_at">;
export type InsertInvitation = Omit<DbInvitation, "id" | "created_at" | "updated_at" | "accepted_at" | "accepted_by" | "requires_teacher_approval" | "requested_by" | "requested_at" | "requester_name" | "requester_relationship"> & { id?: string };
export type InsertChildAccess = Omit<DbChildAccess, "id" | "created_at" | "revoked_at"> & { id?: string };
export type UpdateChildAccess = Partial<Omit<DbChildAccess, "id" | "created_at">>;
export type InsertOrganization = Omit<DbOrganization, "id" | "created_at" | "updated_at"> & { id?: string };
export type InsertOrganizationMember = Omit<DbOrganizationMember, "id" | "created_at" | "updated_at"> & { id?: string };
export type InsertClassroom = Omit<DbClassroom, "id" | "created_at" | "updated_at"> & { id?: string };
export type InsertClassroomStudent = Omit<DbClassroomStudent, "created_at">;
export type InsertClassroomTeacher = Omit<DbClassroomTeacher, "created_at">;

// ── Update types (all mutable fields optional, PK and created_at immutable) ───

export type UpdateChildProfile = Partial<Omit<DbChildProfile, "id" | "created_at">>;
export type UpdatePracticeSession = Partial<Omit<DbPracticeSession, "id" | "created_at">>;
export type UpdatePracticeAttempt = Partial<Omit<DbPracticeAttempt, "id" | "created_at">>;
export type UpdateObservationNote = Partial<Omit<DbObservationNote, "id" | "created_at">>;
export type UpdateInvitation = Partial<Omit<DbInvitation, "id" | "created_at">>;

// ── Database type (passed to createClient<Database>) ─────────────────────────
//
// Shape matches what `supabase gen types` produces:
// { public: { Tables, Views, Functions, Enums, CompositeTypes } }

export interface Database {
  public: {
    Tables: {
      child_profiles: {
        Row: DbChildProfile;
        Insert: InsertChildProfile;
        Update: UpdateChildProfile;
        Relationships: [];
      };
      practice_sessions: {
        Row: DbPracticeSession;
        Insert: InsertPracticeSession;
        Update: UpdatePracticeSession;
        Relationships: [];
      };
      practice_attempts: {
        Row: DbPracticeAttempt;
        Insert: InsertPracticeAttempt;
        Update: UpdatePracticeAttempt;
        Relationships: [];
      };
      observation_notes: {
        Row: DbObservationNote;
        Insert: InsertObservationNote;
        Update: UpdateObservationNote;
        Relationships: [];
      };
      invitations: {
        Row: DbInvitation;
        Insert: InsertInvitation;
        Update: UpdateInvitation;
        Relationships: [];
      };
      child_access: {
        Row: DbChildAccess;
        Insert: InsertChildAccess;
        Update: UpdateChildAccess;
        Relationships: [];
      };
      organizations: {
        Row: DbOrganization;
        Insert: InsertOrganization;
        Update: Partial<Omit<DbOrganization, "id" | "created_at">>;
        Relationships: [];
      };
      organization_members: {
        Row: DbOrganizationMember;
        Insert: InsertOrganizationMember;
        Update: Partial<Omit<DbOrganizationMember, "id" | "created_at">>;
        Relationships: [];
      };
      classrooms: {
        Row: DbClassroom;
        Insert: InsertClassroom;
        Update: Partial<Omit<DbClassroom, "id" | "created_at">>;
        Relationships: [];
      };
      classroom_students: {
        Row: DbClassroomStudent;
        Insert: InsertClassroomStudent;
        Update: Partial<DbClassroomStudent>;
        Relationships: [];
      };
      classroom_teachers: {
        Row: DbClassroomTeacher;
        Insert: InsertClassroomTeacher;
        Update: Partial<DbClassroomTeacher>;
        Relationships: [];
      };
      user_display_profiles: {
        Row: DbUserDisplayProfile;
        Insert: Omit<DbUserDisplayProfile, "created_at">;
        Update: Partial<Omit<DbUserDisplayProfile, "user_id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_invitation_by_token: {
        Args: { p_token: string };
        Returns: DbInvitation[];
      };
      accept_invitation_by_token: {
        Args: { p_token: string };
        Returns: void;
      };
      accept_invitation_with_access: {
        Args: { p_token: string; p_user_id: string };
        Returns: void;
      };
      list_received_guardian_invites: {
        Args: Record<string, never>;
        Returns: DbInvitation[];
      };
      create_teacher_student: {
        Args: { p_classroom_id: string; p_name: string; p_student_code: string; p_age: number; p_nickname: string };
        Returns: string;
      };
      create_first_guardian_invite: {
        Args: { p_child_id: string; p_email: string };
        Returns: void;
      };
      submit_first_guardian_request: {
        Args: { p_token: string; p_name: string; p_relationship: string };
        Returns: void;
      };
      review_first_guardian_request: {
        Args: { p_invitation_id: string; p_approve: boolean };
        Returns: void;
      };
      expire_stale_invitations: {
        Args: Record<string, never>;
        Returns: void;
      };
      revoke_child_access: {
        Args: { p_access_id: string };
        Returns: void;
      };
      create_school_organization: {
        Args: { p_name: string; p_type: DbOrganizationType };
        Returns: string;
      };
      archive_student: {
        Args: { p_child_id: string };
        Returns: void;
      };
      revoke_parent_link_for_child: {
        Args: { p_child_id: string };
        Returns: void;
      };
    };
    Enums: {
      session_status: DbSessionStatus;
      evaluation_status: DbEvaluationStatus;
      observation_target_type: DbObservationTargetType;
      observation_category: DbObservationCategory;
      invitation_role: DbInvitationRole;
      invitation_status: DbInvitationStatus;
      access_role: DbAccessRole;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
