import { z } from "zod";
import { policySchema } from "@/lib/assessment/policy";
import { speechProvider } from "@/lib/assessment/provider";
import {
  AssessmentError,
  activePolicy,
  assessmentCaller,
  assessmentDb,
  assessmentFailure,
  notifyNarrowedSchools,
} from "@/lib/assessment/server";

export const runtime = "nodejs";
const mutation = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("save"),
      expectedRevision: z.number().int().min(1),
      config: policySchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("publish"),
      expectedRevision: z.number().int().min(1),
    })
    .strict(),
]);

export async function GET(request: Request) {
  try {
    await assessmentCaller(request, true);
    const db = assessmentDb();
    const [state, versions] = await Promise.all([
      db
        .from("assessment_policy_state")
        .select("draft,draft_revision,published_id,updated_at")
        .eq("id", "global")
        .single(),
      db
        .from("assessment_policy_versions")
        .select("id,version,config,published_at")
        .order("version", { ascending: false })
        .limit(12),
    ]);
    if (state.error || versions.error)
      throw new AssessmentError(
        "ติดตั้ง migration ระบบประเมินก่อนเปิดหน้านี้",
        503,
      );
    return Response.json(
      {
        state: state.data,
        versions: versions.data,
        provider: speechProvider(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return assessmentFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await assessmentCaller(request, true);
    const parsed = mutation.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new AssessmentError(
        parsed.error.issues[0]?.message ?? "ตรวจข้อมูลเกณฑ์อีกครั้ง",
      );
    const input = parsed.data;
    const db = assessmentDb();
    if (input.action === "save") {
      const result = await db
        .from("assessment_policy_state")
        .update({
          draft: input.config,
          draft_revision: input.expectedRevision + 1,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("id", "global")
        .eq("draft_revision", input.expectedRevision)
        .select("draft_revision")
        .maybeSingle();
      if (result.error) throw new AssessmentError("บันทึกร่างไม่สำเร็จ", 503);
      if (!result.data)
        throw new AssessmentError(
          "ร่างถูกเปลี่ยนจากอีกหน้าต่าง กรุณาโหลดใหม่ก่อนแก้ต่อ",
          409,
        );
      return Response.json(result.data);
    }
    const state = await db
      .from("assessment_policy_state")
      .select("draft")
      .eq("id", "global")
      .single();
    const draft = policySchema.safeParse(state.data?.draft);
    if (state.error || !draft.success)
      throw new AssessmentError("ร่างไม่สมบูรณ์ กรุณาบันทึกเกณฑ์อีกครั้ง", 409);
    const provider = speechProvider();
    if (draft.data.enabled && !provider.ready)
      throw new AssessmentError(
        provider.id === "openai"
          ? "ตั้ง ASSESSMENT_OPENAI_API_KEY (คีย์ของ OpenAI ไม่ใช่ OpenRouter) บนเซิร์ฟเวอร์ก่อนเปิด AI"
          : "ตั้ง AZURE_SPEECH_KEY และ region หรือ endpoint บนเซิร์ฟเวอร์ก่อนเปิด AI",
        409,
      );
    const previous = await activePolicy().catch(() => null);
    const result = await db.rpc("publish_assessment_policy", {
      p_expected_revision: input.expectedRevision,
      p_actor: user.id,
    });
    if (result.error)
      throw new AssessmentError(
        result.error.code === "40001"
          ? "ร่างเปลี่ยนแล้ว กรุณาโหลดใหม่"
          : "เผยแพร่เกณฑ์ไม่สำเร็จ",
        result.error.code === "40001" ? 409 : 503,
      );
    // Best effort: a failed notice never undoes the publish.
    await notifyNarrowedSchools(previous?.config ?? null, draft.data, result.data?.version).catch(() => {});
    return Response.json(result.data);
  } catch (error) {
    return assessmentFailure(error);
  }
}
