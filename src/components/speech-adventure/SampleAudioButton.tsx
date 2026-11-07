"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { SampleAudioResult } from "@/lib/sample-audio/types";

interface Props {
  expectedText: string;
  targetSound?: string;
  stageId: string;
  disabled?: boolean;
  className?: string;
  /** Called once when audio finishes playing successfully. */
  onPlayed?: () => void;
}

// Session-level client cache keyed by "<stageId>::<targetSound>::<text>".
// Prevents re-fetching the same sample within a page session.
const _clientCache = new Map<string, SampleAudioResult>();

type BtnState = "ready" | "loading" | "playing" | "error";

function SpeakerIcon({ animate }: { animate: boolean }) {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {animate ? (
        <>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </>
      ) : (
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      )}
    </svg>
  );
}

export default function SampleAudioButton({
  expectedText,
  targetSound,
  stageId,
  disabled = false,
  className = "",
  onPlayed,
}: Props) {
  const [btnState, setBtnState] = useState<BtnState>("ready");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cancel any in-progress audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (btnState === "loading" || btnState === "playing") return;

    setBtnState("loading");

    try {
      const clientKey = `${stageId}::${targetSound ?? ""}::${expectedText.trim().toLowerCase()}`;
      let result = _clientCache.get(clientKey);

      if (!result) {
        const resp = await fetch("/api/audio/sample", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedText, targetSound, stageId, locale: "th-TH" }),
        });
        if (!resp.ok) {
          throw new Error(`API ${resp.status}`);
        }
        result = (await resp.json()) as SampleAudioResult;
        _clientCache.set(clientKey, result);
      }

      setBtnState("playing");

      if (result.audioBase64) {
        // OpenAI: play base64-encoded mp3
        const audio = new Audio(`data:${result.mimeType};base64,${result.audioBase64}`);
        audioRef.current = audio;
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
        audioRef.current = null;
      } else if (
        result.useBrowserTTS &&
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        // Mock: browser speechSynthesis fallback
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(result.browserTTSText ?? expectedText);
        utterance.lang = result.browserTTSLang ?? "th-TH";
        utterance.rate = 0.8;
        await new Promise<void>((resolve) => {
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });
      } else {
        // No audio available — show "playing" briefly then return to ready
        await new Promise((r) => setTimeout(r, 1500));
      }

      setBtnState("ready");
      onPlayed?.();
    } catch {
      setBtnState("error");
      // Auto-reset so user can retry
      setTimeout(() => setBtnState("ready"), 3000);
    }
  }, [btnState, expectedText, targetSound, stageId, onPlayed]);

  const label =
    btnState === "loading" ? "กำลังเตรียมเสียง..." :
    btnState === "playing" ? "กำลังเล่นเสียง" :
    btnState === "error" ? "เล่นเสียงตัวอย่างไม่ได้ ลองใหม่อีกครั้ง" :
    "ฟังเสียงตัวอย่าง";

  const isActive = btnState === "loading" || btnState === "playing";
  const isError = btnState === "error";

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isActive}
        aria-label={label}
        className={`flex items-center gap-2.5 px-5 py-3 rounded-xl transition-all text-sm font-semibold disabled:cursor-not-allowed shadow-sm active:scale-[0.97] ${
          isError
            ? "bg-error/10 text-error border border-error/20"
            : isActive
            ? "bg-primary/12 text-primary animate-pulse-gentle border border-primary/25"
            : "bg-primary/10 text-primary border border-primary/25 hover:bg-primary/18 disabled:opacity-50"
        }`}
      >
        <SpeakerIcon animate={isActive} />
        <span>{label}</span>
      </button>
      {btnState === "ready" && (
        <p className="text-xs font-medium text-primary/70">ฟังก่อน แล้วลองพูดตามนะ</p>
      )}
    </div>
  );
}
