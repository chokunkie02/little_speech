"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getPracticeAudioUrl } from "@/lib/storage/supabase/audioStorage";

// ── Module-level signed URL cache ─────────────────────────────────────────────
//
// Signed URLs expire in 1 hour. We cache for 50 minutes to give a 10-minute
// safety buffer. Cache survives component unmount/remount within the session
// (e.g. closing and re-opening the drawer without a page reload).

interface CacheEntry {
  url: string;
  expiresAt: number;
}
const URL_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 50 * 60 * 1000; // 50 minutes

async function getSignedUrl(path: string): Promise<string | null> {
  const now = Date.now();
  const cached = URL_CACHE.get(path);
  if (cached && cached.expiresAt > now) return cached.url;

  const { url, error } = await getPracticeAudioUrl(path);
  if (error || !url) return null;

  URL_CACHE.set(path, { url, expiresAt: now + CACHE_TTL_MS });
  return url;
}

// ── Component ─────────────────────────────────────────────────────────────────

type PlayerState = "loading" | "ready" | "playing" | "error";

interface Props {
  audioPath: string;
  accentColor?: string;
}

export default function AttemptAudioPlayer({ audioPath, accentColor = "#6C63FF" }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Both pieces of state remember which audioPath they belong to, so a new path shows "loading"
  // without resetting state inside the effect.
  const [loaded, setLoaded] = useState<{ path: string; url: string | null } | null>(null);
  const [playback, setPlayback] = useState<{ path: string; state: "ready" | "playing" | "error" } | null>(null);
  const current = loaded?.path === audioPath ? loaded : null;
  const signedUrl = current?.url ?? null;
  const baseState: PlayerState = !current ? "loading" : current.url ? "ready" : "error";
  const playerState: PlayerState = baseState === "ready" && playback?.path === audioPath ? playback.state : baseState;
  const setPlayerState = useCallback((state: "ready" | "playing" | "error") => setPlayback({ path: audioPath, state }), [audioPath]);

  // Fetch signed URL when path changes (handles drawer close + reopen too,
  // because cache hit avoids a network round-trip).
  useEffect(() => {
    let cancelled = false;
    getSignedUrl(audioPath).then((url) => {
      if (!cancelled) setLoaded({ path: audioPath, url: url ?? null });
    });

    const audio = audioRef;
    return () => {
      cancelled = true;
      // Stop playback if the component unmounts (or the path changes) while audio is playing.
      audio.current?.pause();
    };
  }, [audioPath]);

  const handlePlay = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.play().catch(() => setPlayerState("error"));
    setPlayerState("playing");
  }, [setPlayerState]);

  const handlePause = useCallback(() => {
    audioRef.current?.pause();
    setPlayerState("ready");
  }, [setPlayerState]);

  const handleAudioEnded = useCallback(() => setPlayerState("ready"), [setPlayerState]);
  const handleAudioError = useCallback(() => setPlayerState("error"), [setPlayerState]);

  return (
    <div className="bg-bg dark:bg-white/5 border border-border rounded-xl p-4">
      <p className="text-xs font-semibold text-text-muted mb-3">เสียงที่บันทึก</p>

      {/* ── Loading ── */}
      {playerState === "loading" && (
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <div
              className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${accentColor}`, borderTopColor: "transparent" }}
            />
          </div>
          <span className="text-sm text-text-muted">กำลังโหลดเสียง…</span>
        </div>
      )}

      {/* ── Error / unavailable ── */}
      {playerState === "error" && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/8 flex items-center justify-center flex-shrink-0">
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="text-text-muted" aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <span className="text-sm text-text-muted">ไม่สามารถโหลดเสียงได้</span>
        </div>
      )}

      {/* ── Ready / Playing ── */}
      {(playerState === "ready" || playerState === "playing") && signedUrl && (
        <div className="flex items-center gap-3">
          {/* Play/Pause button */}
          <button
            type="button"
            onClick={playerState === "playing" ? handlePause : handlePlay}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 hover:opacity-90"
            style={{ backgroundColor: accentColor }}
            aria-label={playerState === "playing" ? "หยุดเล่นเสียง" : "เล่นเสียง"}
          >
            {playerState === "playing" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          {/* Status label */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text">
              {playerState === "playing" ? "กำลังเล่น…" : "กดเพื่อเล่น"}
            </p>
          </div>

          {/* Native audio element — hidden, controlled via ref.
              preload="none" avoids an automatic network fetch on render. */}
          <audio
            ref={audioRef}
            src={signedUrl}
            preload="none"
            onEnded={handleAudioEnded}
            onError={handleAudioError}
          />
        </div>
      )}
    </div>
  );
}
