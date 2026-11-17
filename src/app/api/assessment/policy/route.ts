import { activePolicy, assessmentFailure } from "@/lib/assessment/server";

export const runtime = "nodejs";
export async function GET() {
  try {
    return Response.json(await activePolicy(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return assessmentFailure(error);
  }
}
