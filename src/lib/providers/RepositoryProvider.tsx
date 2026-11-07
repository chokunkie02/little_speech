"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type { IProgressRepository } from "@/lib/repositories/IProgressRepository";
import type { IProfileRepository } from "@/lib/repositories/IProfileRepository";
import type { IObservationRepository } from "@/lib/repositories/IObservationRepository";
import type { IInvitationRepository } from "@/lib/repositories/IInvitationRepository";
import type { IChildAccessRepository } from "@/lib/repositories/IChildAccessRepository";
import type { ISchoolRepository } from "@/lib/repositories/ISchoolRepository";
import { LocalProgressRepository } from "@/lib/storage/local/LocalProgressRepository";
import { LocalProfileRepository } from "@/lib/storage/local/LocalProfileRepository";
import { LocalObservationRepository } from "@/lib/storage/local/LocalObservationRepository";
import { LocalInvitationRepository } from "@/lib/storage/local/LocalInvitationRepository";
import { LocalChildAccessRepository } from "@/lib/storage/local/LocalChildAccessRepository";
import { LocalSchoolRepository } from "@/lib/storage/local/LocalSchoolRepository";
import {
  getConfiguredProvider,
  isSupabaseProviderRequested,
} from "@/lib/config/storageProvider";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createSupabaseRepositories } from "@/lib/storage/supabase/createSupabaseRepositories";
import { useAuth } from "@/hooks/useAuth";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Repositories {
  progress: IProgressRepository;
  profile: IProfileRepository;
  observations: IObservationRepository;
  invitations: IInvitationRepository;
  childAccess: IChildAccessRepository;
  school?: ISchoolRepository;
}

// ── Repository resolution ─────────────────────────────────────────────────────
//
// Module-level singletons so the same repository instance is returned on every
// render, preserving useSyncExternalStore subscription stability.
//
// Resolution order:
//  1. If NEXT_PUBLIC_STORAGE_PROVIDER is absent / "local" → localStorage
//  2. If "supabase" or "hybrid" but Supabase env vars are missing → fallback to
//     localStorage (dev warning logged)
//  3. If "supabase" or "hybrid" and Supabase is configured → Supabase repos
//
// localStorage remains the default; Supabase is opt-in via env var only.

const _localRepositories: Repositories = {
  progress: new LocalProgressRepository(),
  profile: new LocalProfileRepository(),
  observations: new LocalObservationRepository(),
  invitations: new LocalInvitationRepository(),
  childAccess: new LocalChildAccessRepository(),
  school: new LocalSchoolRepository(),
};

function _resolveRepositories(): Repositories {
  if (!isSupabaseProviderRequested()) {
    return _localRepositories;
  }

  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[Storage] NEXT_PUBLIC_STORAGE_PROVIDER="${getConfiguredProvider()}" ` +
          "but Supabase env vars are missing. Falling back to localStorage.",
      );
    }
    return _localRepositories;
  }

  const supabaseRepos = createSupabaseRepositories();
  if (!supabaseRepos) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[Storage] NEXT_PUBLIC_STORAGE_PROVIDER="${getConfiguredProvider()}" ` +
          "but Supabase client failed to initialize. Falling back to localStorage.",
      );
    }
    return _localRepositories;
  }

  return supabaseRepos;
}

const defaultRepositories: Repositories = _resolveRepositories();

// ── Session boundary helpers ──────────────────────────────────────────────────
//
// Supabase repositories expose public rehydrate() and reset() methods.
// Local repositories do not. Duck-type guards let RepositoryProvider call
// these methods without changing the IRepository interfaces.

interface Rehydratable {
  rehydrate(): void;
}

interface Resettable {
  reset(): void;
}

interface Scopeable {
  setScope(userId: string | null): void;
}

function hasRehydrate(repo: unknown): repo is Rehydratable {
  return typeof (repo as Rehydratable).rehydrate === "function";
}

function hasReset(repo: unknown): repo is Resettable {
  return typeof (repo as Resettable).reset === "function";
}

function hasScopeSet(repo: unknown): repo is Scopeable {
  return typeof (repo as Scopeable).setScope === "function";
}

// ── Context ───────────────────────────────────────────────────────────────────

const RepositoryContext = createContext<Repositories>(defaultRepositories);

// ── Provider ──────────────────────────────────────────────────────────────────

interface RepositoryProviderProps {
  children: ReactNode;
  /**
   * Partial override map — pass only the repositories you want to replace.
   * Used in tests (mock repositories) and future Supabase migration
   * (swap one or more repositories without touching hooks or UI).
   */
  overrides?: Partial<Repositories>;
}

export function RepositoryProvider({ children, overrides }: RepositoryProviderProps) {
  const { isLoading, user } = useAuth();

  // useMemo so the merged object only changes when overrides reference changes.
  const value = useMemo<Repositories>(
    () => ({ ...defaultRepositories, ...overrides }),
    // Spread of overrides intentionally not deep-compared; callers must stabilize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overrides?.progress, overrides?.profile, overrides?.observations, overrides?.invitations, overrides?.childAccess, overrides?.school],
  );

  useEffect(() => {
    if (!user?.id || !value.childAccess.rehydrate) return;
    function refreshAccess() {
      void value.childAccess.rehydrate?.();
      value.invitations.rehydrate?.();
    }
    window.addEventListener("focus", refreshAccess);
    return () => window.removeEventListener("focus", refreshAccess);
  }, [user?.id, value.childAccess, value.invitations]);

  // Track the last userId we acted on — prevents duplicate calls and lets us
  // detect the direction of the transition (sign-in, sign-out, account switch).
  const prevUserIdRef = useRef<string | null>(null);

  // Respond to every auth state change after the initial loading phase:
  //
  //  • null → userId  : first sign-in or session restore → rehydrate
  //  • userId → null  : sign-out → reset (clear cache immediately)
  //  • userA → userB  : account switch → reset then rehydrate
  //
  // Only Supabase repos implement reset()/rehydrate(); local repos are unaffected
  // (duck-type guards return false, so those calls are skipped).
  useEffect(() => {
    if (isLoading) return; // auth still initializing — wait

    const userId = user?.id ?? null;
    if (userId === prevUserIdRef.current) return; // no change — skip

    const prevUserId = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    // ── Sign out: scope local repos to anonymous, clear cloud cache ──────────
    if (prevUserId !== null && userId === null) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[RepositoryProvider] sign out — scoping to anonymous, resetting cloud repos");
      }
      if (hasScopeSet(value.profile)) value.profile.setScope(null);
      if (hasScopeSet(value.progress)) value.progress.setScope(null);
      if (hasScopeSet(value.observations)) value.observations.setScope(null);
      if (hasScopeSet(value.invitations)) value.invitations.setScope(null);
      if (hasScopeSet(value.childAccess)) value.childAccess.setScope(null);
      if (value.school && hasScopeSet(value.school)) value.school.setScope(null);
      if (hasReset(value.profile)) value.profile.reset();
      if (hasReset(value.progress)) value.progress.reset();
      if (hasReset(value.observations)) value.observations.reset();
      if (hasReset(value.invitations)) value.invitations.reset();
      if (hasReset(value.childAccess)) value.childAccess.reset();
      if (value.school && hasReset(value.school)) value.school.reset();
      return;
    }

    // ── Account switch: scope to new user, reset previous user's cloud data ───
    if (prevUserId !== null && userId !== null) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[RepositoryProvider] user switch — scoping + resetting before rehydrate");
      }
      if (hasScopeSet(value.profile)) value.profile.setScope(userId);
      if (hasScopeSet(value.progress)) value.progress.setScope(userId);
      if (hasScopeSet(value.observations)) value.observations.setScope(userId);
      if (hasScopeSet(value.invitations)) value.invitations.setScope(userId);
      if (hasScopeSet(value.childAccess)) value.childAccess.setScope(userId);
      if (value.school && hasScopeSet(value.school)) value.school.setScope(userId);
      if (hasReset(value.profile)) value.profile.reset();
      if (hasReset(value.progress)) value.progress.reset();
      if (hasReset(value.observations)) value.observations.reset();
      if (hasReset(value.invitations)) value.invitations.reset();
      if (hasReset(value.childAccess)) value.childAccess.reset();
      if (value.school && hasReset(value.school)) value.school.reset();
    }

    // ── Sign in / session restore / account switch: scope + load cloud data ───
    if (userId) {
      if (process.env.NODE_ENV !== "production") {
        console.debug(`[RepositoryProvider] user ${userId} — scoping local repos, rehydrating cloud`);
      }
      if (hasScopeSet(value.profile)) value.profile.setScope(userId);
      if (hasScopeSet(value.progress)) value.progress.setScope(userId);
      if (hasScopeSet(value.observations)) value.observations.setScope(userId);
      if (hasScopeSet(value.invitations)) value.invitations.setScope(userId);
      if (hasScopeSet(value.childAccess)) value.childAccess.setScope(userId);
      if (value.school && hasScopeSet(value.school)) value.school.setScope(userId);
      if (hasRehydrate(value.profile)) value.profile.rehydrate();
      if (hasRehydrate(value.progress)) value.progress.rehydrate();
      if (hasRehydrate(value.observations)) value.observations.rehydrate();
      if (hasRehydrate(value.invitations)) value.invitations.rehydrate();
      if (hasRehydrate(value.childAccess)) value.childAccess.rehydrate();
      if (value.school && hasRehydrate(value.school)) value.school.rehydrate();
    }
  // value is a stable useMemo result; safe to include — it rarely changes.
  }, [isLoading, user?.id, value]);

  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  );
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

export function useRepositories(): Repositories {
  return useContext(RepositoryContext);
}
