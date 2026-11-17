// Types for join codes and the unified inbox (migration 20261116000100_join_codes_and_inbox.sql).

export type JoinCodeKind = "guardian" | "classroom_guardian" | "teacher" | "school_admin";

export type JoinCode = {
  id: string;
  code: string;
  kind: JoinCodeKind;
  organization_id: string;
  classroom_id: string | null;
  child_id: string | null;
  max_uses: number;
  uses: number;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

export type JoinCodePreview = {
  status: "valid" | "expired" | "used_up" | "revoked" | "not_found";
  kind?: JoinCodeKind;
  code?: string;
  school_name?: string | null;
  classroom_name?: string | null;
  child_name?: string | null;
  students?: { id: string; name: string }[] | null;
  expires_at?: string;
};

export type RedeemResult =
  | { result: "linked"; child_id: string; already?: boolean }
  | { result: "requested"; request_id?: string; already?: boolean }
  | { result: "joined"; organization_id: string; already?: boolean };

export type JoinRequestToReview = {
  id: string;
  /** "school" = a school applying to use the platform (platform admins only). */
  kind: "classroom_guardian" | "teacher" | "school";
  requester_name: string;
  requester_email: string | null;
  relationship: string | null;
  school_name: string;
  organization_id: string | null;
  classroom_id: string | null;
  classroom_name: string | null;
  child_name: string | null;
  created_at: string;
  /** School applications only. */
  province?: string | null;
  phone?: string;
  note?: string | null;
  school_code?: string | null;
  affiliation?: string | null;
};

export type MyJoinRequest = {
  id: string;
  kind: "classroom_guardian" | "teacher" | "school";
  status: "pending" | "approved" | "rejected" | "cancelled";
  school_name: string;
  child_name: string | null;
  classroom_name: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
  read_at: string | null;
};

export type MyInbox = {
  to_review: JoinRequestToReview[];
  my_requests: MyJoinRequest[];
  notifications: AppNotification[];
  unread: number;
};

/** "ABCD2345" → "ABCD-2345" for display; codes are stored without the dash. */
export const formatJoinCode = (code: string) => (code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code);

/** Same normalisation as the database: keep letters/digits, uppercase. */
export const normalizeJoinCode = (value: string) => value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
