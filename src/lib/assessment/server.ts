import { createClient } from "@supabase/supabase-js";
import {
  effectivePolicy,
  policySchema,
  schoolSettingsSchema,
  type AssessmentPolicy,
  type PolicySnapshot,
  type SchoolSettings,
} from "./policy";

const authOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};
export class AssessmentError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function assessmentDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new AssessmentError("ยังไม่ได้ตั้งฐานข้อมูลสำหรับระบบประเมิน", 503);
  return createClient(url, key, { auth: authOptions });
}

export async function assessmentCaller(request: Request, adminOnly = false) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    throw new AssessmentError("กรุณาเข้าสู่ระบบก่อน", 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new AssessmentError("ยังไม่ได้ตั้งระบบบัญชี", 503);
  const client = createClient(url, anon, {
    auth: authOptions,
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !data.user)
    throw new AssessmentError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง", 401);
  if (adminOnly && data.user.app_metadata?.platform_admin !== true)
    throw new AssessmentError("เฉพาะแอดมินระบบที่ตั้งเกณฑ์กลางได้", 403);
  return { user: data.user, client };
}

export async function activePolicy(): Promise<PolicySnapshot> {
  const db = assessmentDb();
  const state = await db
    .from("assessment_policy_state")
    .select("published_id")
    .eq("id", "global")
    .single();
  if (state.error || !state.data?.published_id)
    throw new AssessmentError("ยังไม่ได้ติดตั้งตารางเกณฑ์ประเมิน", 503);
  const row = await db
    .from("assessment_policy_versions")
    .select("id,version,config,published_at")
    .eq("id", state.data.published_id)
    .single();
  const config = policySchema.safeParse(row.data?.config);
  if (row.error || !config.success)
    throw new AssessmentError("อ่านเกณฑ์ที่เผยแพร่ไม่สำเร็จ", 503);
  return { ...row.data, config: config.data } as PolicySnapshot;
}

export interface SchoolVersion {
  id: string;
  revision: number;
  settings: SchoolSettings;
  created_at: string;
}

/** Latest saved criteria of a school, or null when it has never saved any. */
export async function latestSchoolVersion(organizationId: string): Promise<SchoolVersion | null> {
  const { data, error } = await assessmentDb()
    .from("school_assessment_versions")
    .select("id,revision,settings,created_at")
    .eq("organization_id", organizationId)
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new AssessmentError("อ่านเกณฑ์ของโรงเรียนไม่สำเร็จ", 503);
  if (!data) return null;
  const settings = schoolSettingsSchema.safeParse(data.settings);
  if (!settings.success) throw new AssessmentError("เกณฑ์ของโรงเรียนไม่สมบูรณ์", 503);
  return { ...data, settings: settings.data } as SchoolVersion;
}

/**
 * The criteria a child is judged by: the central policy, plus the school's criteria when the child
 * belongs to a school (child_profiles.organization_id).
 */
export async function childPolicy(central: AssessmentPolicy, childId: string) {
  const { data, error } = await assessmentDb()
    .from("child_profiles")
    .select("organization_id")
    .eq("id", childId)
    .maybeSingle();
  if (error) throw new AssessmentError("อ่านข้อมูลเด็กไม่สำเร็จ", 503);
  const organizationId: string | null = data?.organization_id ?? null;
  if (!organizationId) return { ...effectivePolicy(central), schoolVersion: null, organizationId };
  const schoolVersion = await latestSchoolVersion(organizationId);
  return { ...effectivePolicy(central, schoolVersion?.settings ?? null), schoolVersion, organizationId };
}

/** Throws 403 unless the caller administers this school. */
export async function requireSchoolAdmin(
  caller: Awaited<ReturnType<typeof assessmentCaller>>,
  organizationId: string,
) {
  const { data, error } = await caller.client.rpc("is_org_admin", { p_org_id: organizationId });
  if (error || data !== true)
    throw new AssessmentError("เฉพาะผู้ดูแลโรงเรียนนี้ที่ตั้งเกณฑ์ได้", 403);
}

/** Throws 403 unless the caller may confirm this child's results (see can_review_assessment). */
export async function requireReviewer(
  caller: Awaited<ReturnType<typeof assessmentCaller>>,
  childId: string,
) {
  const { data, error } = await caller.client.rpc("can_review_assessment", { p_child_id: childId });
  if (error || data !== true)
    throw new AssessmentError("บัญชีนี้ยืนยันผลของเด็กคนนี้ไม่ได้ (นักเรียนในโรงเรียนให้ครูประจำห้องหรือผู้ที่โรงเรียนกำหนดเป็นผู้ยืนยัน)", 403);
}

/**
 * After a new central policy is published: tell the admins of every school whose saved criteria now
 * fall outside the frame (newly, compared with the previous policy) that the edge values apply.
 */
export async function notifyNarrowedSchools(previous: AssessmentPolicy | null, next: AssessmentPolicy, version?: number) {
  const db = assessmentDb();
  const { data, error } = await db
    .from("school_assessment_versions")
    .select("organization_id,revision,settings")
    .order("organization_id")
    .order("revision", { ascending: false });
  if (error || !data) return;
  const latest = new Map<string, SchoolSettings>();
  for (const row of data) {
    if (latest.has(row.organization_id)) continue;
    const settings = schoolSettingsSchema.safeParse(row.settings);
    if (settings.success) latest.set(row.organization_id, settings.data);
  }
  for (const [organizationId, settings] of latest) {
    const now = effectivePolicy(next, settings).clampedStages;
    const before = previous ? effectivePolicy(previous, settings).clampedStages : [];
    const fresh = now.filter((stage) => !before.includes(stage));
    if (!fresh.length) continue;
    const admins = await db
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .in("role", ["owner", "admin"])
      .eq("status", "active");
    if (admins.error || !admins.data?.length) continue;
    await db.from("notifications").insert(admins.data.map((admin) => ({
      user_id: admin.user_id,
      kind: "assessment_frame",
      title: "เกณฑ์ประเมินของโรงเรียนถูกปรับตามกรอบใหม่",
      body: `แอดมินระบบเผยแพร่เกณฑ์กลาง${version ? `เวอร์ชัน ${version}` : "ใหม่"} ค่าของโรงเรียน ${now.length} ขั้นเกินกรอบ ระบบใช้ค่าขอบของกรอบแทน ตรวจแล้วกดบันทึกอีกครั้ง`,
      link: "/school/assessment",
    })));
  }
}

export async function requireChildAccess(
  caller: Awaited<ReturnType<typeof assessmentCaller>>,
  childId: string,
  write: boolean,
) {
  const { data, error } = await caller.client.rpc(
    "can_access_learning_results",
    { p_child_id: childId, p_write: write },
  );
  if (error || data !== true)
    throw new AssessmentError(
      "บัญชีนี้ไม่มีสิทธิ์เข้าถึงผลฝึกของเด็กคนนี้",
      403,
    );
}

export async function assessmentForm(request: Request) {
  if (!request.body) throw new AssessmentError("ไม่มีข้อมูลกิจกรรม");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 1100000) {
      await reader.cancel();
      throw new AssessmentError("ใช้เสียงสั้นไม่เกิน 30 วินาที", 413);
    }
    chunks.push(chunk.value);
  }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
    throw new AssessmentError("รูปแบบข้อมูลกิจกรรมไม่ถูกต้อง");
  }
}

export function assessmentFailure(error: unknown) {
  const status = error instanceof AssessmentError ? error.status : 500;
  const message =
    error instanceof AssessmentError
      ? error.message
      : "ระบบประเมินขัดข้อง กรุณาลองใหม่";
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
