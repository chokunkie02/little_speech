import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Session } from "./types";

export function useStudioResultSync(childId: string | undefined, accountId: string | undefined, sessions: Session[]) {
  const saved = useRef(new Set<string>());
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [revision, setRevision] = useState(0);

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
      if (!rows.length) return;

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
        if (active) setStatus("saved");
      } catch {
        if (active) setStatus("error");
      }
    }

    void upload(accountId);
    return () => { active = false; };
  }, [childId, accountId, sessions, revision]);

  return { status, retry: () => setRevision((value) => value + 1) };
}
