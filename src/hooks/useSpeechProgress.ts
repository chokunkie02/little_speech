"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type {
  SpeechProgress,
  PracticeAttempt,
  PracticeSession,
  ProgressSummary,
  StageStatus,
} from "@/types/speechAdventure";
import {
  calculateProgressSummary,
  getStageStatus as computeStageStatus,
  getStageAttempts as computeStageAttempts,
  getSessionSummary as storageGetSessionSummary,
} from "@/lib/speechProgressStorage";
import { useRepositories } from "@/lib/providers/RepositoryProvider";
import { useAuth } from "@/hooks/useAuth";
import { useChildProfile } from "@/hooks/useChildProfile";

// ── isHydrated detection ──────────────────────────────────────────────────────
// useSyncExternalStore with different server/client snapshots:
// • Server + client hydration → false  (matches → no hydration mismatch)
// • After hydration            → true   (React re-renders once, synchronously)

const noopSubscribe = () => () => {};
const clientSnapshot = () => true as const;
const serverSnapshot = () => false as const;

// ─────────────────────────────────────────────────────────────────────────────

export function useSpeechProgress() {
  const { progress: repo } = useRepositories();
  const { profile } = useChildProfile();
  const { isAuthenticated } = useAuth();

  // progress is synchronized via the repository's pub-sub.
  // getServerProgress() is used on the server AND during client hydration so
  // the initial HTML matches — no hydration mismatch.
  const progress = useSyncExternalStore<SpeechProgress>(
    repo.subscribe.bind(repo),
    repo.getProgress.bind(repo),
    repo.getServerProgress.bind(repo),
  );

  // isHydrated: false during SSR + hydration, true right after.
  const isHydrated = useSyncExternalStore(
    noopSubscribe,
    clientSnapshot,
    serverSnapshot,
  );

  const selectedSoundId = useSyncExternalStore(
    repo.subscribeToSelectedSound.bind(repo),
    repo.getSelectedSoundId.bind(repo),
    repo.getServerSoundId.bind(repo),
  );

  // Always filter by the selected child's ID so owned and shared children
  // never bleed into each other. Only anonymous local practice has no child context.
  const activeChildId = profile?.id ?? null;

  const filteredAttempts = useMemo(
    () =>
      activeChildId
        ? progress.attempts.filter((a) => a.childId === activeChildId)
        : isAuthenticated ? [] : progress.attempts,
    [progress.attempts, activeChildId, isAuthenticated],
  );

  const filteredSessions = useMemo(
    () =>
      activeChildId
        ? progress.sessions.filter((s) => s.childId === activeChildId)
        : isAuthenticated ? [] : progress.sessions,
    [progress.sessions, activeChildId, isAuthenticated],
  );

  // Memoized so consumers receive a stable reference between renders.
  // Without this, every render produced a fresh `summary` object whose
  // recentAttempts/recentSessions arrays were new — invalidating downstream
  // useMemo deps and causing unnecessary re-renders + visual flicker on
  // refresh/child-switch transitions.
  const summary: ProgressSummary = useMemo(
    () =>
      calculateProgressSummary(
        { ...progress, attempts: filteredAttempts, sessions: filteredSessions },
        selectedSoundId || undefined,
      ),
    [progress, filteredAttempts, filteredSessions, selectedSoundId],
  );

  const addAttempt = useCallback((attempt: PracticeAttempt) => {
    // repo.addAttempt persists and notifies listeners, which triggers
    // useSyncExternalStore to re-read getProgress().
    repo.addAttempt(attempt);
  }, [repo]);

  const clearAllProgress = useCallback(() => {
    repo.clearProgress();
  }, [repo]);

  const clearProgressForChild = useCallback(
    (childId: string) => {
      repo.clearProgressForChild(childId);
    },
    [repo],
  );

  const refreshProgress = useCallback(() => {
    // With useSyncExternalStore the snapshot is re-read automatically
    // whenever notifyListeners fires. Kept for API compatibility.
  }, []);

  const setSelectedSound = useCallback((id: string) => {
    repo.setSelectedSoundId(id);
  }, [repo]);

  // Notifies the progress repository that the selected child changed.
  // Only meaningful in Supabase mode (duck-typed — no-op for local repo).
  const switchChildProgress = useCallback((childId: string) => {
    const r = repo as { setSelectedChildId?: (id: string | null) => void };
    if (typeof r.setSelectedChildId === "function") {
      r.setSelectedChildId(childId);
    }
  }, [repo]);

  // Auto-sync the active child to the progress repository whenever the
  // selected child changes. Previously this was only called explicitly from
  // ChildSelector / teacher page — any other code path that changed the
  // selected child (programmatic navigation, deep link, shared-child fallback)
  // would leave the progress repo hydrating the wrong child's data.
  useEffect(() => {
    if (!activeChildId) return;
    switchChildProgress(activeChildId);
  }, [activeChildId, switchChildProgress]);

  const getStageStatus = useCallback(
    (stageId: string, targetSoundId?: string): StageStatus => {
      return computeStageStatus(filteredAttempts, stageId, targetSoundId);
    },
    [filteredAttempts],
  );

  const getStageAttempts = useCallback(
    (stageId: string, targetSoundId?: string): PracticeAttempt[] => {
      return computeStageAttempts(filteredAttempts, stageId, targetSoundId);
    },
    [filteredAttempts],
  );

  const startSession = useCallback(
    (input: { childId: string; targetSound: string; stageId: string; totalMissions: number }) => {
      return repo.startSession(input);
    },
    [repo],
  );

  const completeSession = useCallback((sessionId: string) => {
    return repo.completeSession(sessionId);
  }, [repo]);

  const abandonSession = useCallback((sessionId: string) => {
    return repo.abandonSession(sessionId);
  }, [repo]);

  const getActiveSessionForStage = useCallback(
    (stageId: string): PracticeSession | null => {
      return repo.getActiveSession(stageId);
    },
    [repo],
  );

  const getSessionById = useCallback(
    (sessionId: string): PracticeSession | null => {
      // Reads from the in-memory cache inside speechProgressStorage.
      // No async needed here because local reads are synchronous.
      return storageGetSessionSummary(sessionId);
    },
    [],
  );

  // Dev-only diagnostic dump — wired to window.dumpProgressState() so it can
  // be invoked from the browser console while reproducing persistence bugs.
  // Does NOT log audio blobs, secrets, or auth tokens.
  const dumpProgressState = useCallback(() => {
    const attemptsByChild = new Map<string, number>();
    const sessionsByChild = new Map<string, number>();
    for (const a of progress.attempts) {
      attemptsByChild.set(a.childId, (attemptsByChild.get(a.childId) ?? 0) + 1);
    }
    for (const s of progress.sessions) {
      sessionsByChild.set(s.childId, (sessionsByChild.get(s.childId) ?? 0) + 1);
    }
    return {
      selectedChildId: activeChildId,
      selectedSoundId,
      filteredAttempts: filteredAttempts.length,
      filteredSessions: filteredSessions.length,
      totalAttempts: progress.attempts.length,
      totalSessions: progress.sessions.length,
      attemptsByChild: Object.fromEntries(attemptsByChild),
      sessionsByChild: Object.fromEntries(sessionsByChild),
      providerMode: process.env.NEXT_PUBLIC_STORAGE_PROVIDER ?? "local",
    };
  }, [activeChildId, selectedSoundId, filteredAttempts.length, filteredSessions.length, progress.attempts, progress.sessions]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (typeof window === "undefined") return;
    (window as unknown as { dumpProgressState?: () => unknown }).dumpProgressState = dumpProgressState;
    return () => {
      delete (window as unknown as { dumpProgressState?: () => unknown }).dumpProgressState;
    };
  }, [dumpProgressState]);

  return {
    progress,
    summary,
    attempts: filteredAttempts,
    sessions: filteredSessions,
    isHydrated,
    selectedSoundId,
    setSelectedSound,
    addAttempt,
    clearProgress: clearAllProgress,
    clearProgressForChild,
    refreshProgress,
    getStageStatus,
    getStageAttempts,
    startSession,
    completeSession,
    abandonSession,
    getActiveSessionForStage,
    getSessionById,
    switchChildProgress,
    dumpProgressState,
  };
}
