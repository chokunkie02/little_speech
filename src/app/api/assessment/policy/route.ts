import { z } from "zod";
import { speechProvider } from "@/lib/assessment/provider";
import { claudeConnection } from "@/lib/assessment/round-summary";
import {
  AssessmentError,
  activePolicy,
  assessmentCaller,
  assessmentFailure,
  childPolicy,
  requireChildAccess,
} from "@/lib/assessment/server";

export const runtime = "nodejs";

/**
 * Without a childId: the published central policy (public, as before).
 * With ?childId=: the criteria that child is judged by (central + school), for signed-in adults who
 * can see the child's results.
 */
export async function GET(request: Request) {
  try {
    const snapshot = await activePolicy();
    const childId = new URL(request.url).searchParams.get("childId");
    if (!childId)
      return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } });
    if (!z.string().uuid().safeParse(childId).success)
      throw new AssessmentError("รหัสเด็กไม่ถูกต้อง");
    const caller = await assessmentCaller(request);
    await requireChildAccess(caller, childId, false);
    const judged = await childPolicy(snapshot.config, childId);
    return Response.json(
      {
        ...snapshot,
        config: judged.config,
        schoolRevision: judged.schoolVersion?.revision,
        providerLabel: speechProvider().label,
        roundSummaryReady: !!judged.config.roundSummary && claudeConnection().ready,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return assessmentFailure(error);
  }
}
