import { createHash } from "node:crypto";
import { z } from "zod";
import { getStages } from "@/features/learning-studio/curriculum";
import { assessSpeech, speechProvider } from "@/lib/assessment/provider";
import { judgeSpeech, type AssessmentResult } from "@/lib/assessment/policy";
import { inspectWav } from "@/lib/assessment/wav";
import {
  AssessmentError,
  activePolicy,
  assessmentCaller,
  assessmentDb,
  assessmentFailure,
  assessmentForm,
  childPolicy,
  requireChildAccess,
} from "@/lib/assessment/server";

export const runtime = "nodejs";
const inputSchema = z
  .object({
    requestId: z.string().uuid(),
    childId: z.string().uuid(),
    sessionId: z.string().min(1).max(100),
    track: z.enum(["speech", "phonics", "communication"]),
    sound: z.enum(["ป", "ก", "ม"]),
    level: z.enum(["starter", "explorer", "builder", "storyteller"]),
    stageId: z.string().max(50),
    itemId: z.string().max(150),
    selectedChoice: z.string().max(100).optional(),
    adultReview: z
      .enum(["pending", "achieved", "practice", "unavailable"])
      .optional(),
    /** A recorded speech attempt saved without sending audio to AI: waits for an adult instead. */
    adultOnly: z.literal(true).optional(),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const caller = await assessmentCaller(request);
    const declaredSize = Number(request.headers.get("content-length"));
    if (declaredSize > 1100000)
      throw new AssessmentError("ใช้เสียงสั้นไม่เกิน 30 วินาที", 413);
    const form = await assessmentForm(request);
    const parsed = inputSchema.safeParse(
      JSON.parse(String(form?.get("context") ?? "null")),
    );
    if (!parsed.success)
      throw new AssessmentError("ข้อมูลกิจกรรมไม่ครบ กรุณาเปิดกิจกรรมอีกครั้ง");
    const input = parsed.data;
    await requireChildAccess(caller, input.childId, true);
    const stage = getStages(input.track, input.sound, input.level).find(
      (stage) => stage.id === input.stageId,
    );
    const item = stage?.items.find((item) => item.id === input.itemId);
    if (!item) throw new AssessmentError("ไม่พบโจทย์ในหลักสูตรนี้");
    if (
      item.kind === "choice" &&
      !item.choices?.some((choice) => choice.id === input.selectedChoice)
    ) {
      throw new AssessmentError("เลือกคำตอบก่อนบันทึก");
    }
    const file = form?.get("audio");
    if (file instanceof File && file.size > 970000)
      throw new AssessmentError("ไฟล์เสียงใหญ่เกินไป", 413);
    const audio =
      file instanceof File ? Buffer.from(await file.arrayBuffer()) : undefined;
    let measurement: ReturnType<typeof inspectWav> | undefined;
    if (audio) {
      try {
        measurement = inspectWav(audio);
      } catch (error) {
        throw new AssessmentError(
          error instanceof Error ? error.message : "ไฟล์เสียงไม่รองรับ",
        );
      }
    }
    const snapshot = await activePolicy();
    // School children are judged by their school's criteria inside the central frame.
    const judged = await childPolicy(snapshot.config, input.childId);
    const policy = judged.config;
    const rule = policy.rules.find(
      (rule) => rule.stageId === input.stageId,
    )!;
    const automatic =
      item.kind === "speech" &&
      !item.hidePrompt &&
      rule.mode === "azure" &&
      policy.enabled &&
      !input.adultOnly;
    const db = assessmentDb();
    const inputHash = createHash("sha256")
      .update(JSON.stringify(input))
      .update(audio ?? Buffer.alloc(0))
      .digest("hex");
    const existing = await db
      .from("assessment_results")
      .select("recorded_by,input_hash,state,result")
      .eq("id", input.requestId)
      .maybeSingle();
    if (existing.error)
      throw new AssessmentError("อ่านประวัติการตรวจไม่สำเร็จ", 503);
    if (existing.data) {
      if (
        existing.data.recorded_by !== caller.user.id ||
        existing.data.input_hash !== inputHash
      )
        throw new AssessmentError(
          "รหัสการลองนี้ถูกใช้กับข้อมูลอื่นแล้ว กรุณาอัดใหม่",
          409,
        );
      if (existing.data.state === "completed")
        return Response.json(existing.data.result, {
          headers: { "Cache-Control": "no-store" },
        });
    }
    if (automatic && !audio) throw new AssessmentError("อัดเสียงก่อนส่งตรวจ");
    const claim = await db.rpc("claim_assessment", {
      p_row: {
        id: input.requestId,
        child_id: input.childId,
        recorded_by: caller.user.id,
        session_id: input.sessionId,
        item_id: input.itemId,
        stage_id: input.stageId,
        track: input.track,
        level: input.level,
        reference_text: item.sample,
        input_hash: inputHash,
        policy_id: snapshot.id,
      },
    });
    if (claim.error) {
      if (claim.error.code === "23505")
        throw new AssessmentError(
          "รหัสการลองนี้ถูกใช้กับข้อมูลอื่นแล้ว กรุณาอัดใหม่",
          409,
        );
      if (claim.error.code === "P0001")
        throw new AssessmentError("รอผลครั้งก่อนสักครู่ แล้วลองใหม่ได้", 429);
      throw new AssessmentError("เตรียมบันทึกผลไม่สำเร็จ กรุณาลองใหม่", 503);
    }
    if (!claim.data.claimed) {
      const row = claim.data.row;
      if (row.state === "completed")
        return Response.json(row.result, {
          headers: { "Cache-Control": "no-store" },
        });
      throw new AssessmentError(
        Date.now() - Date.parse(row.created_at) < 35000
          ? "กำลังประเมินครั้งนี้ รอสักครู่แล้วลองตรวจอีกครั้ง"
          : "การตรวจครั้งก่อนขัดข้อง กรุณาอัดใหม่",
        409,
      );
    }
    const result: AssessmentResult = {
      id: input.requestId,
      source: "adult",
      outcome: "needs_review",
      policyVersion: snapshot.version,
      ...(judged.schoolVersion ? { schoolRevision: judged.schoolVersion.revision } : {}),
      rule: { mode: rule.mode, passScore: rule.passScore, practiceScore: rule.practiceScore, minCompleteness: rule.minCompleteness },
      feedback: "ให้ผู้ใหญ่ช่วยตรวจการสื่อสารและบันทึกผลของข้อนี้",
      createdAt: new Date().toISOString(),
    };
    if (item.kind === "choice") {
      const correct = item.answer === input.selectedChoice;
      Object.assign(result, {
        source: "rules",
        outcome: correct ? "achieved" : "practice",
        score: correct ? 100 : 0,
        feedback: correct
          ? "เลือกภาพตรงกับเสียงแล้ว เก่งมาก"
          : "ฟังเสียงอีกครั้ง แล้วลองเลือกภาพด้วยกันนะ",
      });
    } else if (
      item.kind === "observation" &&
      input.adultReview &&
      input.adultReview !== "pending"
    ) {
      Object.assign(result, {
        outcome: input.adultReview,
        feedback:
          input.adultReview === "achieved"
            ? "ผู้ใหญ่บันทึกว่าทำได้ตามเป้าหมายรอบนี้"
            : input.adultReview === "practice"
              ? "ผู้ใหญ่แนะนำให้ฝึกกิจกรรมนี้ต่อ"
              : "ผู้ใหญ่บันทึกว่ายังประเมินรอบนี้ไม่ได้",
      });
    } else if (
      item.kind === "speech" &&
      !item.hidePrompt &&
      rule.mode === "azure"
    ) {
      if (input.adultOnly) {
        result.reason = "not_sent_to_ai";
        result.feedback = "บันทึกไว้ให้ผู้ใหญ่ช่วยฟังและตรวจ รอบนี้ไม่ได้ส่งเสียงให้ AI";
      } else if (!policy.enabled) {
        result.reason = "ai_disabled";
        result.feedback =
          "รอบนี้ใช้การฟังร่วมกับผู้ใหญ่ แอดมินยังไม่ได้เปิดประเมินเสียงด้วย AI";
      } else if (!speechProvider().ready) {
        Object.assign(result, {
          source: "unavailable",
          outcome: "unavailable",
          reason: "provider_not_configured",
          feedback: "ระบบ AI ยังไม่พร้อม ให้ผู้ใหญ่ช่วยตรวจรอบนี้ได้",
        });
      } else if (
        !measurement ||
        measurement.durationMs < policy.minDurationMs ||
        measurement.durationMs > policy.maxDurationMs ||
        measurement.rms < 0.003
      ) {
        Object.assign(result, {
          source: "unavailable",
          outcome: "unavailable",
          reason: "audio_quality",
          feedback:
            "เสียงสั้น เบา หรือยาวเกินไป ลองพูดใกล้ไมค์แล้วอัดอีกครั้งนะ",
        });
      } else {
        try {
          const { source, scores } = await assessSpeech(audio!, item.sample);
          if (!scores) {
            Object.assign(result, {
              source: "unavailable",
              outcome: "unavailable",
              reason: "no_recognition",
              feedback:
                "รอบนี้ยังฟังเสียงไม่ชัด ให้ผู้ใหญ่ช่วยฟังหรืออัดใหม่ได้",
            });
          } else {
            Object.assign(result, {
              source,
              ...scores,
              ...judgeSpeech(scores, rule, policy.minConfidence),
            });
          }
        } catch (error) {
          Object.assign(result, {
            source: "unavailable",
            outcome: "unavailable",
            reason:
              error instanceof Error &&
              ["provider_auth_failed", "provider_rate_limited", "provider_failed"].includes(
                error.message,
              )
                ? error.message
                : "provider_timeout",
            feedback:
              "บริการตรวจเสียงยังไม่พร้อม ลองใหม่ภายหลังหรือให้ผู้ใหญ่ช่วยตรวจได้",
          });
        }
      }
    }
    const saved = await db
      .from("assessment_results")
      .update({ state: "completed", result, school_version_id: judged.schoolVersion?.id ?? null })
      .eq("id", input.requestId)
      .eq("recorded_by", caller.user.id);
    if (saved.error)
      throw new AssessmentError(
        "ได้รับผลแล้วแต่บันทึกไม่สำเร็จ กรุณาลองตรวจอีกครั้ง",
        503,
      );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError)
      return assessmentFailure(new AssessmentError("ข้อมูลกิจกรรมไม่ถูกต้อง"));
    return assessmentFailure(error);
  }
}
