import { useCallback, useEffect, useEffectEvent, useRef } from "react";
import { hasVoice, type useSpeaker } from "../useSpeaker";

/** Longest a line may take before play goes on anyway (a clip that never ends must not freeze a game). */
const MAX_LINE_MS = 9000;

/**
 * พี่ปู's voice for the kid screens: plays lines in order on the studio's sample player and quietly skips
 * lines that have no recorded clip yet (new kid lines are shown as text until their voice is made).
 *
 * `say()` returns a promise that settles when พี่ปู has finished (or was cut off by another line, hush,
 * a blocked autoplay or a broken clip), so a game can wait for the praise before moving on.
 */
export function useSay(speaker: ReturnType<typeof useSpeaker>) {
  const queue = useRef<string[]>([]);
  const finish = useRef<(() => void) | null>(null);
  const watch = useRef<ReturnType<typeof setInterval>>(undefined);

  const settle = useCallback(() => {
    clearInterval(watch.current);
    queue.current = [];
    const done = finish.current;
    finish.current = null;
    done?.();
  }, []);
  const playNext = useEffectEvent(() => {
    const text = queue.current.shift();
    if (text) speaker.speak(text);
    else settle();
  });
  useEffect(() => {
    const player = document.querySelector<HTMLAudioElement>(".learning-studio-scope audio[data-sample-player]");
    if (!player) return;
    const ended = () => playNext();
    const failed = () => settle();
    player.addEventListener("ended", ended);
    player.addEventListener("error", failed);
    return () => {
      player.removeEventListener("ended", ended);
      player.removeEventListener("error", failed);
      settle();
    };
  }, [settle]);

  const say = (...texts: string[]) => {
    settle();
    const playable = texts.filter((t) => t && hasVoice(t));
    if (!playable[0]) {
      speaker.stop();
      return Promise.resolve();
    }
    queue.current = playable.slice(1);
    const promise = new Promise<void>((resolve) => {
      finish.current = resolve;
    });
    speaker.speak(playable[0]);
    // Safety net: autoplay blocked, the clip stalled, or its "ended" event was missed. Between two queued
    // clips the next one starts at once, so a player that stays paused or ended for 0.6 s is done.
    const started = Date.now();
    let pausedTicks = 0;
    watch.current = setInterval(() => {
      const player = document.querySelector<HTMLAudioElement>(".learning-studio-scope audio[data-sample-player]");
      pausedTicks = !player || player.paused ? pausedTicks + 1 : 0;
      if (pausedTicks >= 3 || Date.now() - started > MAX_LINE_MS * Math.max(1, playable.length)) settle();
    }, 200);
    return promise;
  };
  const hush = () => {
    settle();
    speaker.stop();
  };
  return { say, hush, speaking: speaker.speaking };
}
export type Say = ReturnType<typeof useSay>;
