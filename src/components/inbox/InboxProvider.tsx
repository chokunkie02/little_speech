"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchMyInbox } from "@/lib/joinCodes";
import type { MyInbox } from "@/types/joinCodes";

type InboxState = {
  inbox: MyInbox | null;
  loading: boolean;
  error: boolean;
  /** Requests waiting for this account's decision + unread notifications. */
  count: number;
  refresh: () => void;
};

const InboxContext = createContext<InboxState>({ inbox: null, loading: false, error: false, count: 0, refresh: () => {} });

type Loaded = { userId: string; inbox: MyInbox | null; error: boolean };

/** Loads the unified inbox for every signed-in role; refreshes on focus and every 30 s while visible. */
export function InboxProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = isSupabaseConfigured() ? user?.id : undefined;
  const [loaded, setLoaded] = useState<Loaded>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const forUser = userId;
    let active = true;
    async function load() {
      try {
        const inbox = await fetchMyInbox();
        if (active) setLoaded({ userId: forUser, inbox, error: false });
      } catch {
        if (active) setLoaded((previous) => ({ userId: forUser, inbox: previous?.userId === forUser ? previous.inbox : null, error: true }));
      }
    }
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30_000);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [userId, revision]);

  const current = userId && loaded?.userId === userId ? loaded : undefined;
  const inbox = current?.inbox ?? null;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  return (
    <InboxContext.Provider value={{
      inbox,
      loading: Boolean(userId) && !current,
      error: current?.error ?? false,
      count: inbox ? inbox.to_review.length + inbox.unread : 0,
      refresh,
    }}>
      {children}
    </InboxContext.Provider>
  );
}

export const useInbox = () => useContext(InboxContext);
