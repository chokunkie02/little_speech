"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseProviderRequested } from "@/lib/config/storageProvider";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useStudioState } from "@/features/learning-studio/useStudioState";
import { fromDbRow, fromStudioSessions, mergeResults, type LearningResult } from "@/lib/learning/results";

const ONLINE_LIMIT = 1000;

export type LearningResultsState = {
  results: LearningResult[];
  /** "loading" only before the first online answer; device results show straight away. */
  status: "loading" | "ready" | "error";
  /** True when results are read from the shared online record (not only this browser). */
  online: boolean;
  retry: () => void;
};

/**
 * Finished Learning Studio rounds for one child: the online record (every adult who practised
 * with the child, readable by teachers and guardians with access) merged with rounds that are
 * still only in this browser.
 */
export function useLearningResults(childId: string | undefined): LearningResultsState {
  const { user, isLoading } = useAuth();
  const online = !!user && isSupabaseProviderRequested() && isSupabaseConfigured();
  const studio = useStudioState(user?.id, childId);
  const [remote, setRemote] = useState<{ key: string; rows: LearningResult[] | null; failed: boolean }>();
  const [revision, setRevision] = useState(0);
  const requestKey = `${user?.id ?? ""}:${childId ?? ""}:${revision}`;

  useEffect(() => {
    if (!online || !childId) return;
    const client = getSupabaseClient();
    let active = true;
    async function load() {
      try {
        if (!client) throw new Error("no client");
        const { data, error } = await client.from("learning_session_results").select("*")
          .eq("child_id", childId ?? "").order("completed_at", { ascending: false }).limit(ONLINE_LIMIT);
        if (error) throw error;
        if (active) setRemote({ key: requestKey, rows: (data ?? []).map(fromDbRow), failed: false });
      } catch {
        if (active) setRemote((current) => ({ key: requestKey, rows: current?.rows ?? null, failed: true }));
      }
    }
    void load();
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
    };
  }, [online, childId, requestKey]);

  const device = useMemo(
    () => (studio && childId ? fromStudioSessions(studio.sessions, childId) : []),
    [studio, childId],
  );
  const onlineRows = remote?.rows;
  const results = useMemo(() => mergeResults(onlineRows ?? [], device), [onlineRows, device]);

  const status: LearningResultsState["status"] = isLoading
    ? "loading"
    : !online || !childId ? "ready"
      : !remote || (remote.key !== requestKey && !remote.rows) ? "loading"
        : remote.failed && !remote.rows ? "error" : "ready";

  return { results, status, online, retry: () => setRevision((value) => value + 1) };
}
