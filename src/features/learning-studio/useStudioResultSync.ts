import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Session } from "./types";
import { assessmentRequest } from "@/lib/assessment/client";

export function useStudioResultSync(childId: string | undefined, accountId: string | undefined, sessions: Session[]) {
  const saved = useRef(new Set<string>());
  const savedReviews = useRef(new Map<string, string>());
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [revision, setRevision] = useState(0);
  /**
   * Whether this account may confirm results for this child centrally. For a school child the school
   * decides (class teacher only, by default); then the adult's taps stay on this device and are not
   * re-sent (and refused) on every visit.
   */
  const canReview = useRef<{ childId: string; allowed: boolean } | null>(null);
  const [teacherConfirms, setTeacherConfirms] = useState(false);

  useEffect(() => {
    if (!childId || !accountId) return;
    let active = true;

    async function upload(recordedBy: string) {
      const rows = sessions.flatMap((session) => {
        if (session.childId !== childId || session.status !== "completed" || !session.completedAt || saved.current.has(session.id)) return [];
        const activities = session.attempts.filter((attempt) => attempt.mode !== "demo");
        if (!activities.length) return [];
        const choices = activities.filter((attempt) => typeof attempt.choiceCorrect === "boolean");
        return [{
          child_id: session.childId,
          recorded_by: recordedBy,
          session_id: session.id,
          track: session.track,
          stage_label: session.stageLabel,
          sound: session.sound,
          started_at: session.startedAt,
          completed_at: session.completedAt,
          activities: activities.length,
          choice_count: choices.length,
          correct_choices: choices.filter((attempt) => attempt.choiceCorrect).length,
        }];
      });
      const reviews = sessions.filter((session) => session.childId === childId && session.status === "completed")
        .flatMap((session) => session.attempts)
        .filter((attempt) => attempt.assessment && attempt.kind !== "choice" && attempt.review !== "pending"
          && savedReviews.current.get(attempt.assessment.id) !== attempt.review)
        .map((attempt) => ({ id: attempt.assessment!.id, review: attempt.review }));
      if (!rows.length && !reviews.length) return;

      const client = getSupabaseClient();
      setStatus("saving");
      try {
        if (!client) throw new Error("Missing Supabase client");
        for (let offset = 0; offset < rows.length && active; offset += 100) {
          const batch = rows.slice(offset, offset + 100);
          const { error } = await client.from("learning_session_results").upsert(batch, {
            onConflict: "child_id,recorded_by,session_id", ignoreDuplicates: true,
          });
          if (error) throw error;
          if (active) batch.forEach(({ session_id }) => saved.current.add(session_id));
        }
        if (reviews.length && canReview.current?.childId !== childId) {
          // Not in the generated Database type (same loose call as src/lib/schoolAdmin.ts).
          const { data, error } = await (client.rpc as unknown as (fn: string, params: Record<string, unknown>) =>
            PromiseLike<{ data: unknown; error: { message: string } | null }>)("can_review_assessment", { p_child_id: childId });
          if (error) throw error;
          canReview.current = { childId: childId!, allowed: data === true };
        }
        const allowed = canReview.current?.allowed ?? true;
        if (active) setTeacherConfirms(!allowed);
        for (let offset = 0; allowed && offset < reviews.length && active; offset += 25) {
          const batch = reviews.slice(offset, offset + 25);
          await assessmentRequest("/api/assessment/review", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ childId, items: batch }),
          });
          if (active) batch.forEach(({ id, review }) => savedReviews.current.set(id, review));
        }
        if (active) setStatus("saved");
      } catch {
        if (active) setStatus("error");
      }
    }

    void upload(accountId);
    return () => { active = false; };
  }, [childId, accountId, sessions, revision]);

  return { status, teacherConfirms, retry: () => setRevision((value) => value + 1) };
}
