import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIO_FILES } from "./audio-manifest";
import overrides from "./audio-overrides.json";
const VOICE_OVERRIDES: Record<string, string> = overrides;
export const VOICE_CUES = {
  welcome:
    "สวัสดีจ้ะ วันนี้พี่ปูจะชวนมาฟังเสียง แล้วลองพูดไปด้วยกันนะ ค่อย ๆ ลอง ไม่ต้องรีบเลยจ้ะ",
  listen: "ฟังเสียง แล้วลองเลือกภาพที่ได้ยินนะ",
  success: "เก่งมากจ้ะ ขอบคุณที่ลองทำไปด้วยกันนะ",
  retry: "ไม่เป็นไรเลยจ้ะ มาฟังอีกครั้ง แล้วค่อย ๆ ลองกันใหม่นะ",
  complete: "จบภารกิจรอบนี้แล้ว เก่งมากจ้ะ พักสักนิด แล้วค่อยไปผจญภัยกันต่อนะ",
};
function prepareSample(player: HTMLAudioElement, src: string) {
  player.pause();
  player.src = src;
  player.currentTime = 0;
  player.playbackRate = 1;
}
export function useSpeaker() {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef(0);
  useEffect(() => {
    const player = document.querySelector<HTMLAudioElement>(
      ".learning-studio-scope audio[data-sample-player]",
    );
    playerRef.current = player;
    if (!player) return;
    const play = () => {
      setSpeaking(true);
      setLoading(false);
      setMessage("");
    };
    const stop = () => {
      setSpeaking(false);
      setLoading(false);
    };
    const waiting = () => setLoading(true);
    const error = () => {
      stop();
      setMessage("เสียงยังโหลดไม่สำเร็จ ลองกดฟังอีกครั้งนะ");
    };
    player.addEventListener("playing", play);
    player.addEventListener("ended", stop);
    player.addEventListener("pause", stop);
    player.addEventListener("waiting", waiting);
    player.addEventListener("error", error);
    return () => {
      player.removeEventListener("playing", play);
      player.removeEventListener("ended", stop);
      player.removeEventListener("pause", stop);
      player.removeEventListener("waiting", waiting);
      player.removeEventListener("error", error);
      player.pause();
    };
  }, []);
  const stop = useCallback(() => {
    requestRef.current++;
    playerRef.current?.pause();
    setSpeaking(false);
    setLoading(false);
  }, []);
  const speak = (text: string) => {
    const request = ++requestRef.current;
    setMessage("");
    const src = VOICE_OVERRIDES[text] ?? AUDIO_FILES[text];
    const player =
      playerRef.current ??
      document.querySelector<HTMLAudioElement>(
        ".learning-studio-scope audio[data-sample-player]",
      );
    if (!src || !player) {
      setMessage("ยังไม่พบเสียงของข้อนี้ ขอให้ผู้ใหญ่ช่วยอ่านตัวอย่างได้");
      return;
    }
    playerRef.current = player;
    prepareSample(player, src);
    setLoading(true);
    void player.play().catch((err: unknown) => {
      if (
        request !== requestRef.current ||
        (err instanceof DOMException && err.name === "AbortError")
      )
        return;
      setSpeaking(false);
      setLoading(false);
      setMessage(
        "ยังเปิดเสียงไม่ได้ ลองกดฟังอีกครั้ง และตรวจระดับเสียงของเครื่องนะ",
      );
    });
  };
  return { speaking, loading, message, speak, stop };
}
