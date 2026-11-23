import { useCallback, useState } from "react";
import type { LearningLevelId } from "../learning-levels";
import { defaultPlayMode, type PlayMode } from "./games";

/** Adult choices for the kid screens, remembered on this device. */
const UI_KEY = "speech-adventure:practice-ui";
const MODE_KEY = "speech-adventure:play-mode";

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private mode or full storage: the choice lasts for this visit only.
  }
};

/** "kid" (approved design, default) or "classic" (the previous practice screen). */
export function usePracticeUi() {
  const [ui, setUi] = useState<"kid" | "classic">(() => (read(UI_KEY) === "classic" ? "classic" : "kid"));
  return [
    ui,
    (next: "kid" | "classic") => {
      write(UI_KEY, next);
      setUi(next);
    },
  ] as const;
}

/**
 * Tap mode for this visit: the adult chose it, or the microphone was refused or missing. Kept in
 * sessionStorage so every item after the first stays in tap mode without asking for the mic again.
 */
const TAP_KEY = "speech-adventure:tap-mode";
export function useTapMode() {
  const [tap, setTap] = useState(() => {
    try {
      return sessionStorage.getItem(TAP_KEY) === "on";
    } catch {
      return false;
    }
  });
  // Stable, so effects that depend on it do not re-run every render.
  const set = useCallback((next: boolean) => {
    try {
      if (next) sessionStorage.setItem(TAP_KEY, "on");
      else sessionStorage.removeItem(TAP_KEY);
    } catch {
      // Storage blocked: tap mode lasts until this item changes.
    }
    setTap(next);
  }, []);
  return [tap, set] as const;
}

/** Play together or alone. Follows the content level until an adult picks one. */
export function usePlayMode(level: LearningLevelId | undefined) {
  const [chosen, setChosen] = useState<PlayMode | null>(() => {
    const saved = read(MODE_KEY);
    return saved === "together" || saved === "alone" ? saved : null;
  });
  return [
    chosen ?? defaultPlayMode(level),
    (next: PlayMode) => {
      write(MODE_KEY, next);
      setChosen(next);
    },
  ] as const;
}
