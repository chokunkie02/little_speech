"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseProviderRequested } from "@/lib/config/storageProvider";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { AccountDetails, Title } from "@/lib/auth/accountDetails";

export type AccountProfile = AccountDetails & { termsAcceptedAt: string | null };

type ProfileRow = {
  title: string | null; first_name: string; last_name: string; phone: string | null; terms_accepted_at: string | null;
};

type AccountProfileContextValue = {
  /** null = signed in but no name yet (older account); undefined while loading or signed out. */
  profile: AccountProfile | null | undefined;
  status: "idle" | "loading" | "ready" | "error";
  /** "ชื่อ นามสกุล", or the email prefix until a name is saved. */
  displayName: string;
  save: (details: AccountDetails, acceptTerms?: boolean) => Promise<{ ok: true } | { ok: false; error: string }>;
  reload: () => void;
};

const AccountProfileContext = createContext<AccountProfileContextValue>({
  profile: undefined, status: "idle", displayName: "", save: async () => ({ ok: false, error: "ยังไม่พร้อม" }), reload: () => {},
});

function fromRow(row: ProfileRow): AccountProfile {
  return {
    title: (row.title as Title | null) ?? null,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    termsAcceptedAt: row.terms_accepted_at,
  };
}

/** The signed-in person's own name, phone and consent (account_profiles, readable only by its owner). */
export function AccountProfileProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const online = !!user && isSupabaseProviderRequested() && isSupabaseConfigured();
  const [state, setState] = useState<{ userId: string; profile: AccountProfile | null; failed: boolean }>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!online || !user) return;
    const client = getSupabaseClient();
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Right after sign-up the first request can go out before the new session token is attached
    // (401); try again a few times before giving up.
    const load = async (attempt: number) => {
      try {
        if (!client) throw new Error("no client");
        const { data, error } = await client.from("account_profiles")
          .select("title, first_name, last_name, phone, terms_accepted_at").eq("user_id", user.id).maybeSingle();
        if (error) throw error;
        if (active) setState({ userId: user.id, profile: data ? fromRow(data as unknown as ProfileRow) : null, failed: false });
      } catch {
        if (!active) return;
        if (attempt < 3) timer = setTimeout(() => void load(attempt + 1), 800 * (attempt + 1));
        else setState({ userId: user.id, profile: null, failed: true });
      }
    };
    void load(0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [online, user, revision]);

  const save = useCallback<AccountProfileContextValue["save"]>(async (details, acceptTerms = false) => {
    const client = getSupabaseClient();
    if (!client || !user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
    const { data, error } = await client.rpc("save_my_account_profile", {
      p_title: details.title, p_first_name: details.firstName, p_last_name: details.lastName,
      p_phone: details.phone, p_accept_terms: acceptTerms,
    });
    if (error) return { ok: false, error: error.message || "บันทึกไม่สำเร็จ" };
    setState({ userId: user.id, profile: fromRow(data as unknown as ProfileRow), failed: false });
    return { ok: true };
  }, [user]);

  const current = state && user && state.userId === user.id ? state : undefined;
  const status: AccountProfileContextValue["status"] = !online ? "idle"
    : isLoading || !current ? "loading" : current.failed ? "error" : "ready";
  const profile = status === "ready" ? current?.profile ?? null : undefined;
  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : user?.email.split("@")[0] ?? "";

  const value = useMemo(() => ({
    profile, status, displayName, save, reload: () => setRevision((count) => count + 1),
  }), [profile, status, displayName, save]);

  return <AccountProfileContext.Provider value={value}>{children}</AccountProfileContext.Provider>;
}

export function useAccountProfile() {
  return useContext(AccountProfileContext);
}
