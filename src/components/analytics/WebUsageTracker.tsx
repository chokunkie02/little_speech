"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClient } from "@/lib/supabase/client";

const intervalMs = 15_000;
const idleMs = 60_000;
const visitTimeoutMs = 30 * 60_000;
const storageKey = "speech-adventure-web-visit";
const interactionEvents = ["pointerdown", "keydown", "scroll"] as const;

type Visit = { userId: string; id: string; lastSeen: number };

function readVisit(userId: string): Visit | undefined {
  try {
    const visit = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as Visit | null;
    if (visit?.userId === userId && typeof visit.id === "string" && Number.isFinite(visit.lastSeen)) return visit;
  } catch {
    // Tracking can still work in memory when browser storage is unavailable.
  }
}

export default function WebUsageTracker() {
  const { user } = useAuth();
  const userId = user?.id;
  const isAdmin = user?.isPlatformAdmin;

  useEffect(() => {
    const client = getSupabaseClient();
    if (!userId || isAdmin || !client || !globalThis.crypto?.randomUUID) return;
    let visit = readVisit(userId);
    let lastInteraction = Date.now();
    let previousTick = lastInteraction;
    let wasActive = false;

    function record(active: boolean) {
      if (document.visibilityState !== "visible" || !document.hasFocus()) return;
      const now = Date.now();
      if (!visit || now - visit.lastSeen >= visitTimeoutMs) {
        visit = { userId: userId!, id: crypto.randomUUID(), lastSeen: now };
        active = false;
      }
      visit.lastSeen = now;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(visit));
      } catch {
        // In-memory visit remains available for this page.
      }
      void client!.rpc("record_web_usage", { p_visit_id: visit.id, p_active: active }).then(() => {}, () => {});
    }

    function interact() {
      const now = Date.now();
      if (now - lastInteraction >= idleMs) {
        record(false);
        previousTick = now;
        wasActive = true;
      }
      lastInteraction = now;
    }

    function visibilityChanged() {
      wasActive = document.visibilityState === "visible" && document.hasFocus();
      previousTick = Date.now();
      if (wasActive) {
        lastInteraction = previousTick;
        record(false);
      }
    }

    visibilityChanged();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - previousTick;
      const active = document.visibilityState === "visible" && document.hasFocus() && now - lastInteraction < idleMs;
      if (active && wasActive && elapsed >= intervalMs - 250 && elapsed < intervalMs * 2) record(true);
      previousTick = now;
      wasActive = active;
    }, intervalMs);
    for (const event of interactionEvents) window.addEventListener(event, interact, { passive: true, capture: true });
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("focus", visibilityChanged);
    window.addEventListener("blur", visibilityChanged);
    return () => {
      window.clearInterval(timer);
      for (const event of interactionEvents) window.removeEventListener(event, interact, true);
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("focus", visibilityChanged);
      window.removeEventListener("blur", visibilityChanged);
    };
  }, [userId, isAdmin]);

  return null;
}
