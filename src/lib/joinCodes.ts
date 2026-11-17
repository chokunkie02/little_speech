// Client calls for join codes and the unified inbox. Each throws an Error with a Thai message
// from the database (RAISE EXCEPTION) so pages can show it as-is.
import { getSupabaseClient } from "@/lib/supabase/client";
import type { JoinCode, JoinCodeKind, JoinCodePreview, MyInbox, RedeemResult } from "@/types/joinCodes";

function client() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("ยังไม่ได้เชื่อมต่อระบบ กรุณาลองใหม่ภายหลัง");
  return supabase;
}

async function call<T>(promise: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(error.message || "ทำรายการไม่สำเร็จ กรุณาลองใหม่");
  return data as T;
}

export const SAVED_JOIN_CODE_KEY = "speech-adventure-join-code";

export function issueJoinCode(input: {
  kind: JoinCodeKind; organizationId?: string; classroomId?: string; childId?: string; rotate?: boolean;
}) {
  return call<JoinCode>(client().rpc("issue_join_code", {
    p_kind: input.kind,
    p_organization_id: input.organizationId ?? null,
    p_classroom_id: input.classroomId ?? null,
    p_child_id: input.childId ?? null,
    p_rotate: input.rotate ?? false,
  }));
}

export const revokeJoinCode = (codeId: string) => call<void>(client().rpc("revoke_join_code", { p_code_id: codeId }));

export const previewJoinCode = (code: string) => call<JoinCodePreview>(client().rpc("preview_join_code", { p_code: code }));

export async function redeemJoinCode(input: {
  code: string; relationship?: string; consent?: boolean; childId?: string; displayName?: string;
}) {
  const result = await call<RedeemResult>(client().rpc("redeem_join_code", {
    p_code: input.code,
    p_relationship: input.relationship ?? null,
    p_consent: input.consent ?? false,
    p_child_id: input.childId ?? null,
    p_display_name: input.displayName ?? null,
  }));
  // The account role may have changed (e.g. parent → teacher); refresh so the JWT carries it.
  await client().auth.refreshSession().catch(() => undefined);
  return result;
}

export const reviewJoinRequest = (requestId: string, approve: boolean, classroomId?: string) =>
  call<void>(client().rpc("review_join_request", { p_request_id: requestId, p_approve: approve, p_classroom_id: classroomId ?? null }));

/** Phone of the person asking to join, only for someone allowed to approve the request. */
export const getRequesterPhone = (requestId: string) =>
  call<string | null>(client().rpc("get_join_requester_phone", { p_request_id: requestId }));

export const cancelJoinRequest = (requestId: string) => call<void>(client().rpc("cancel_join_request", { p_request_id: requestId }));

export const fetchMyInbox = () => call<MyInbox>(client().rpc("list_my_inbox"));

export const markNotificationsRead = (ids?: string[]) =>
  call<void>(client().rpc("mark_notifications_read", { p_ids: ids ?? null }));

export const createSchoolByPlatform = (name: string) => call<string>(client().rpc("create_school_by_platform", { p_name: name }));

/** Absolute link that opens /join with the code filled in (used inside QR codes). */
export function joinUrl(code: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/join?code=${encodeURIComponent(code)}`;
}

export const submitSchoolApplication = (input: {
  schoolName: string; province: string; contactName: string; position: string; phone: string; note?: string;
  schoolCode?: string; affiliation?: string;
}) => call<string>(client().rpc("submit_school_application", {
  p_school_name: input.schoolName, p_province: input.province, p_contact_name: input.contactName,
  p_position: input.position, p_phone: input.phone, p_note: input.note ?? null,
  p_school_code: input.schoolCode || null, p_affiliation: input.affiliation || null,
}));

export async function reviewSchoolApplication(applicationId: string, approve: boolean, schoolName?: string) {
  return call<string | null>(client().rpc("review_school_application", {
    p_application_id: applicationId, p_approve: approve, p_school_name: schoolName ?? null,
  }));
}

export const cancelSchoolApplication = (applicationId: string) =>
  call<void>(client().rpc("cancel_school_application", { p_application_id: applicationId }));

/** PDPA: ask the platform team to delete this account and its data. */
export const requestDataDeletion = (reason?: string) =>
  call<void>(client().rpc("request_data_deletion", { p_reason: reason ?? null }));
