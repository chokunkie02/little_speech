import { createClient } from "@supabase/supabase-js";
import { policySchema, type PolicySnapshot } from "./policy";

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
