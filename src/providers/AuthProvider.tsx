"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { AuthContextValue, AuthSession } from "@/types/auth";
import type { SignUpDetails } from "@/lib/auth/accountDetails";
import * as supabaseAuth from "@/lib/auth/supabaseAuth";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

// ── Context ───────────────────────────────────────────────────────────────────

const noOp = async () => {};

const UNAUTHENTICATED: AuthContextValue = {
  user: null,
  session: null,
  loadingState: "ready",
  isAuthenticated: false,
  isLoading: false,
  signIn: async () => ({ success: false, error: "Not initialized" }),
  signUp: async () => ({ success: false, error: "Not initialized" }),
  signOut: noOp,
};

const AuthContext = createContext<AuthContextValue>(UNAUTHENTICATED);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  // isLoading starts true when Supabase is configured so we wait for
  // getInitialSession() before rendering auth-dependent UI.
  // When Supabase is not configured, skip straight to ready.
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let cancelled = false;

    supabaseAuth.getInitialSession().then((s) => {
      if (!cancelled) {
        setSession(s);
        setIsLoading(false);
      }
    });

    const unsubscribe = supabaseAuth.subscribeToAuthChanges((s) => {
      if (!cancelled) {
        setSession(s);
        setIsLoading(false);
      }
    });

    // A password-reset link can land on any allowed URL; always finish it on the reset page.
    const recovery = getSupabaseClient()?.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/auth/reset-password") {
        window.location.replace("/auth/reset-password");
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
      recovery?.data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    (email: string, password: string) => supabaseAuth.signIn(email, password),
    [],
  );

  const signUp = useCallback(
    (email: string, password: string, details: SignUpDetails) => supabaseAuth.signUp(email, password, details),
    [],
  );

  const handleSignOut = useCallback(async () => {
    await supabaseAuth.signOut();
    setSession(null);
  }, []);

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    loadingState: isLoading ? "initializing" : "ready",
    isAuthenticated: session !== null,
    isLoading,
    signIn,
    signUp,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Internal context hook (used by useAuth) ───────────────────────────────────

export function useAuthContext(): AuthContextValue {
  return useContext(AuthContext);
}
