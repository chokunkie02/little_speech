import { z } from "zod";
import {
  AssessmentError,
  assessmentCaller,
  assessmentDb,
  assessmentFailure,
  requireReviewer,
} from "@/lib/assessment/server";

const schema = z
  .object({
    childId: z.string().uuid(),
    items: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            review: z.enum(["achieved", "practice", "unavailable"]),
          })
          .strict(),
      )
      .min(1)
      .max(25),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const caller = await assessmentCaller(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new AssessmentError("ข้อมูลผลตรวจของผู้ใหญ่ไม่ถูกต้อง");
    const input = parsed.data;
    await requireReviewer(caller, input.childId);
    const db = assessmentDb();
    const rows = await db
      .from("assessment_results")
      .select("id")
      .eq("child_id", input.childId)
      .eq("state", "completed")
      .in(
        "id",
        input.items.map((item) => item.id),
      );
    if (
      rows.error ||
      input.items.some((item) => !rows.data?.some((row) => row.id === item.id))
    )
      throw new AssessmentError("ไม่พบผลตรวจของเด็กคนนี้", 404);
    for (const item of input.items) {
      const saved = await db
        .from("assessment_results")
        .update({
          adult_review: {
            review: item.review,
            reviewed_by: caller.user.id,
            reviewed_at: new Date().toISOString(),
          },
        })
        .eq("id", item.id)
        .eq("child_id", input.childId);
      if (saved.error)
        throw new AssessmentError(
          "บันทึกผลตรวจของผู้ใหญ่ยังไม่ครบ กรุณาลองส่งอีกครั้ง",
          503,
        );
    }
    return Response.json({ saved: input.items.length });
  } catch (error) {
    return assessmentFailure(error);
  }
}
