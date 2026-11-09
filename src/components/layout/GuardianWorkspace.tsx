"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useAuth, isParent } from "@/hooks/useAuth";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useRepositories } from "@/lib/providers/RepositoryProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

export type GuardianMessage = Database["public"]["Functions"]["list_guardian_inbox"]["Returns"][number];
type Inbox = { userId: string; messages: GuardianMessage[]; error: boolean; revision: number; hasLoaded: boolean };
const Context = createContext({
  parent: false, restricted: false, pending: 0, messages: [] as GuardianMessage[],
  loading: false, refreshing: false, hasLoaded: false, error: false, refresh: () => {},
  childStatus: "ready" as "loading" | "ready" | "error", retryChildren: () => {},
});

export function GuardianWorkspace({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { sharedProfiles } = useChildProfile();
  const userId = user && isParent(user) && !user.isPlatformAdmin ? user.id : undefined;
  const { childAccess } = useRepositories();
  const childStatus = useSyncExternalStore(
    (notify) => childAccess.subscribe(notify),
    () => userId ? childAccess.getReceivedStatus?.(userId) ?? "ready" : "ready",
    () => "ready" as const,
  );
  const [inbox, setInbox] = useState<Inbox>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const inboxUserId = userId;
    let active = true;
    let generation = 0;
    async function load() {
      const request = ++generation;
      let messages: GuardianMessage[] = [];
      let error = true;
      try {
        const response = await getSupabaseClient()?.rpc("list_guardian_inbox");
        messages = response?.data ?? [];
        error = !response || !!response.error;
      } catch {
        // Keep the same retry state for failed connections.
      }
      if (active && request === generation) {
        setInbox((previous) => ({
          userId: inboxUserId,
          revision,
          error,
          messages: error && previous?.userId === inboxUserId ? previous.messages : messages,
          hasLoaded: !error || (previous?.userId === inboxUserId && previous.hasLoaded),
        }));
      }
    }
    void load();
    window.addEventListener("focus", load);
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30_000);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", load); };
  }, [userId, revision]);

  const current = userId && inbox?.userId === userId ? inbox : undefined;
  const messages = current?.messages ?? [];
  return <Context.Provider value={{
    parent: !!userId,
    restricted: !!userId && (childStatus !== "ready" || !sharedProfiles.some((child) => !!child.organizationId)),
    pending: messages.filter((message) => message.status === "pending").length,
    messages,
    loading: !!userId && !current,
    refreshing: !!current && current.revision !== revision,
    hasLoaded: current?.hasLoaded ?? false,
    childStatus,
    retryChildren: () => { void childAccess.rehydrate?.(); },
    error: current?.error ?? false,
    refresh: () => setRevision((value) => value + 1),
  }}>{children}</Context.Provider>;
}

export const useGuardianWorkspace = () => useContext(Context);

export function NoLinkedStudent() {
  return <section className="mx-auto max-w-xl px-4 py-10 sm:py-16">
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-6">
      <Mail className="text-primary" size={24} aria-hidden="true" />
      <h1 className="text-xl font-bold">ยังไม่มีนักเรียนเชื่อมกับบัญชีนี้</h1>
      <p className="text-sm text-text-muted">เมื่อครูประจำห้องส่งคำเชิญ คุณจะเห็นคำเชิญในกล่องข้อความและกดตอบรับได้จากที่นั่น</p>
      <p className="text-sm text-text-muted">หากกำลังรอคำเชิญ แจ้งอีเมลที่ใช้สมัครบัญชีนี้ให้ครูประจำห้อง</p>
      <Link href="/inbox" className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">เปิดกล่องข้อความ</Link>
    </div>
  </section>;
}
