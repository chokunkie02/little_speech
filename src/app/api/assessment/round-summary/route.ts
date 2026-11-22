import { createHash } from "node:crypto";
import {
  RoundSummaryError,
  claudeConnection,
  roundFacts,
  roundRequestSchema,
  writeRoundSummary,
} from "@/lib/assessment/round-summary";
import {
  AssessmentError,
  activePolicy,
  assessmentCaller,
  assessmentDb,
  assessmentFailure,
  childPolicy,
  requireChildAccess,
} from "@/lib/assessment/server";

export const runtime = "nodejs";
/** New summaries one account may ask Claude for per minute (stored ones are free). */
const PER_MINUTE = 5;

// Parents see these, so they name the feature, not the AI vendor (admins see "Claude" on the admin page).
const FAILURES: Record<string, [string, number]> = {
  provider_not_configured: ["ระบบคำแนะนำยังไม่ได้ตั้งค่า ให้แอดมินตรวจการตั้งค่า", 503],
  provider_auth_failed: ["ระบบคำแนะนำยังใช้งานไม่ได้ ให้แอดมินตรวจการตั้งค่า", 503],
  provider_rate_limited: ["ระบบคำแนะนำไม่ว่างในตอนนี้ ลองใหม่ภายหลัง", 503],
  provider_failed: ["ติดต่อระบบคำแนะนำไม่สำเร็จ ลองใหม่ภายหลัง", 503],
  no_summary: ["รอบนี้ยังเขียนสรุปไม่ได้ ลองใหม่ภายหลัง", 502],
};

/**
 * POST: an end-of-round summary for adults. The browser sends ids and outcomes only; the server
 * looks the round up in the curriculum, so nothing typed in the page reaches Claude.
 */
export async function POST(request: Request) {
  try {
    const caller = await assessmentCaller(request);
    const parsed = roundRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new AssessmentError("ข้อมูลรอบฝึกไม่ครบ กรุณาเปิดสรุปรอบอีกครั้ง");
    const input = parsed.data;
    await requireChildAccess(caller, input.childId, false);
    const snapshot = await activePolicy();
    const judged = await childPolicy(snapshot.config, input.childId);
    if (!judged.config.roundSummary)
      throw new AssessmentError("แอดมินยังไม่ได้เปิดคำแนะนำหลังจบรอบ", 409);
    if (!claudeConnection().ready) throw new AssessmentError(FAILURES.provider_not_configured[0], 503);
    const facts = roundFacts(input);
    if (!facts) throw new AssessmentError("ไม่พบกิจกรรมของรอบนี้ในหลักสูตร");

    const db = assessmentDb();
    const inputHash = createHash("sha256").update(JSON.stringify({ sessionId: input.sessionId, facts })).digest("hex");
    const stored = await db
      .from("assessment_round_summaries")
      .select("summary,model,created_at")
      .eq("child_id", input.childId)
      .eq("session_id", input.sessionId)
      .eq("input_hash", inputHash)
      .maybeSingle();
    if (stored.error) throw new AssessmentError("ติดตั้ง migration สรุปรอบก่อนใช้งาน", 503);
    if (stored.data)
      return Response.json({ ...stored.data, cached: true }, { headers: { "Cache-Control": "no-store" } });

    const recent = await db
      .from("assessment_round_summaries")
      .select("id")
      .eq("requested_by", caller.user.id)
      .gte("created_at", new Date(Date.now() - 60000).toISOString());
    if (recent.error) throw new AssessmentError("ตรวจจำนวนคำขอไม่สำเร็จ", 503);
    if ((recent.data?.length ?? 0) >= PER_MINUTE)
      throw new AssessmentError("ขอสรุปถี่เกินไป รอสักครู่แล้วลองใหม่", 429);

    let written;
    try {
      written = await writeRoundSummary(facts);
    } catch (error) {
      if (error instanceof RoundSummaryError) {
        const [message, status] = FAILURES[error.message] ?? FAILURES.provider_failed;
        throw new AssessmentError(message, status);
      }
      throw error;
    }
    const row = {
      child_id: input.childId,
      session_id: input.sessionId,
      requested_by: caller.user.id,
      input_hash: inputHash,
      summary: written.summary,
      model: written.model,
      policy_id: snapshot.id,
    };
    const saved = await db.from("assessment_round_summaries").insert(row);
    // A parallel request may have stored the same round first; either copy is fine to return.
    if (saved.error && saved.error.code !== "23505")
      throw new AssessmentError("เขียนสรุปแล้วแต่บันทึกไม่สำเร็จ ลองอีกครั้ง", 503);
    return Response.json(
      { summary: written.summary, model: written.model, created_at: new Date().toISOString(), cached: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof SyntaxError) return assessmentFailure(new AssessmentError("ข้อมูลรอบฝึกไม่ถูกต้อง"));
    return assessmentFailure(error);
  }
}
