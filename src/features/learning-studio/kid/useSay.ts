import { useEffect, useEffectEvent, useRef } from "react";
import { hasVoice, type useSpeaker } from "../useSpeaker";

/**
 * พี่ปู's voice for the kid screens: plays lines in order on the studio's sample player and quietly skips
 * lines that have no recorded clip yet (new kid lines are shown as text until their voice is made).
 */
export function useSay(speaker: ReturnType<typeof useSpeaker>) {
  const queue = useRef<string[]>([]);
  const playNext = useEffectEvent(() => {
    const text = queue.current.shift();
    if (text) speaker.speak(text);
  });
  useEffect(() => {
    const player = document.querySelector<HTMLAudioElement>(".learning-studio-scope audio[data-sample-player]");
    if (!player) return;
    const ended = () => playNext();
    player.addEventListener("ended", ended);
    return () => player.removeEventListener("ended", ended);
  }, []);
  const say = (...texts: string[]) => {
    const playable = texts.filter((t) => t && hasVoice(t));
    queue.current = playable.slice(1);
    if (playable[0]) speaker.speak(playable[0]);
    else speaker.stop();
  };
  const hush = () => {
    queue.current = [];
    speaker.stop();
  };
  return { say, hush, speaking: speaker.speaking };
}
export type Say = ReturnType<typeof useSay>;
