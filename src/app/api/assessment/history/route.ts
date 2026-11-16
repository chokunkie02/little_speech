import { z } from "zod";
import {
  AssessmentError,
  assessmentCaller,
  assessmentFailure,
  requireChildAccess,
} from "@/lib/assessment/server";

const querySchema = z.object({
  childId: z.string().uuid(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});
export async function GET(request: Request) {
  try {
    const caller = await assessmentCaller(request);
    const input = querySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!input.success)
      throw new AssessmentError("เลือกเด็กและช่วงวันที่ให้ถูกต้อง");
    await requireChildAccess(caller, input.data.childId, false);
    let query = caller.client
      .from("assessment_results")
      .select(
        "id,session_id,stage_id,reference_text,result,adult_review,created_at",
      )
      .eq("child_id", input.data.childId)
      .eq("state", "completed")
      .order("created_at", { ascending: false })
      .limit(30);
    if (input.data.from)
      query = query.gte("created_at", `${input.data.from}T00:00:00+07:00`);
    if (input.data.to) {
      const next = new Date(`${input.data.to}T00:00:00+07:00`);
      next.setUTCDate(next.getUTCDate() + 1);
      query = query.lt("created_at", next.toISOString());
    }
    const result = await query;
    if (result.error) throw new AssessmentError("โหลดผลประเมินไม่สำเร็จ", 503);
    return Response.json(result.data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return assessmentFailure(error);
  }
}
