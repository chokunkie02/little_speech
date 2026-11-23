import { useEffect, useState } from "react";
import { createVoiceTracker, rms, type VoiceState } from "./voice-activity";

/** How often the screen hears about the voice (the tracker itself runs every animation frame). */
const UPDATE_MS = 60;

/**
 * Listens to a live microphone stream with Web Audio, on the device only. Returns null when there is
 * no stream. Each new stream starts a fresh tracker, so one recording's numbers never leak into the next.
 */
export function useVoiceActivity(stream: MediaStream | null) {
  const [state, setState] = useState<VoiceState | null>(null);
  useEffect(() => {
    if (!stream) return;
    const Context =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    const tracker = createVoiceTracker();
    let frame = 0;
    let last = performance.now();
    let lastUpdate = 0;
    const tick = (time: number) => {
      analyser.getFloatTimeDomainData(buffer);
      const next = tracker.push(rms(buffer), Math.min(100, time - last));
      last = time;
      if (time - lastUpdate >= UPDATE_MS) {
        lastUpdate = time;
        setState(next);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      void context.close();
      // Keep the last reading: screens read voicedMs/segments after the recording stops.
      setState(tracker.state());
    };
  }, [stream]);
  return state;
}
