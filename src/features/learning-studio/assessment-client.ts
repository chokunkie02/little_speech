import { assessmentRequest } from "@/lib/assessment/client";
import type { AssessmentResult } from "@/lib/assessment/policy";
import type { Session, Item, Review } from "./types";

export async function submitStudioAssessment(
  session: Session,
  item: Item,
  requestId: string,
  options: {
    audio?: Blob;
    selectedChoice?: string;
    adultReview?: Review;
    /** Record a speech attempt as waiting for an adult, without sending any audio to AI. */
    adultOnly?: boolean;
    signal?: AbortSignal;
  } = {},
) {
  const form = new FormData();
  form.set(
    "context",
    JSON.stringify({
      requestId,
      childId: session.childId,
      sessionId: session.id,
      track: session.track,
      sound: session.sound,
      level: session.level ?? "starter",
      stageId: session.stageId,
      itemId: item.id,
      selectedChoice: options.selectedChoice,
      adultReview: options.adultReview,
      adultOnly: options.adultOnly || undefined,
    }),
  );
  if (options.audio) form.set("audio", options.audio, "practice.wav");
  return assessmentRequest<AssessmentResult>("/api/assessment/evaluate", {
    method: "POST",
    body: form,
    signal: options.signal ?? AbortSignal.timeout(25000),
  });
}
