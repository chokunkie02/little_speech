"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { readState } from "./domain";
import { STUDIO_STATE_EVENT, studioStorageKey } from "./integration";
import type { AppState } from "./types";

const serverSnapshot = () => "";

/**
 * The studio's saved state for one account + child, kept in sync with the open studio
 * (same tab via STUDIO_STATE_EVENT, other tabs via the storage event).
 */
export function useStudioState(accountId: string | undefined, childId: string | undefined): AppState | null {
  const key = studioStorageKey(accountId, childId);
  const subscribe = useCallback((listener: () => void) => {
    const update = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== null && event.key !== key) return;
      if (event instanceof CustomEvent && event.detail?.storageKey !== key) return;
      listener();
    };
    window.addEventListener("storage", update);
    window.addEventListener(STUDIO_STATE_EVENT, update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener(STUDIO_STATE_EVENT, update);
    };
  }, [key]);
  const snapshot = useCallback(() => {
    try {
      return localStorage.getItem(key) || "";
    } catch {
      return "";
    }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return useMemo(() => (childId && raw ? readState(raw) : null), [raw, childId]);
}
