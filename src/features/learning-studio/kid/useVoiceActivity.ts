import { useEffect, useEffectEvent, useState } from "react";
import { createVoiceTracker, rms, type VoiceState, type VoiceTrackerOptions } from "./voice-activity";

/** How often the screen hears about the voice (the tracker itself runs every animation frame). */
const UPDATE_MS = 60;

/**
 * Listens to a live microphone stream with Web Audio, on the device only. Returns null when there is
 * no stream. Each new stream starts a fresh tracker, so one recording's numbers never leak into the next.
 *
 * `onBurst` fires the moment a new burst of voice starts (a syllable or word), for games that move
 * one step per sound. `releaseMs` sets how short a pause still splits two bursts.
 */
export function useVoiceActivity(
  stream: MediaStream | null,
  { onBurst, releaseMs }: { onBurst?: () => void; releaseMs?: VoiceTrackerOptions["releaseMs"] } = {},
) {
  const [state, setState] = useState<VoiceState | null>(null);
  const burst = useEffectEvent(() => onBurst?.());
  useEffect(() => {
    if (!stream) return;
    const Context =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    // iOS starts a context made outside a tap as suspended; the mic press counts as the tap.
    if (context.state === "suspended") void context.resume();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    const tracker = createVoiceTracker({ releaseMs });
    let frame = 0;
    let last = performance.now();
    let lastUpdate = 0;
    let bursts = 0;
    const tick = (time: number) => {
      analyser.getFloatTimeDomainData(buffer);
      const next = tracker.push(rms(buffer), Math.min(100, time - last));
      last = time;
      if (next.segments > bursts) {
        bursts = next.segments;
        burst();
      }
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
  }, [stream, releaseMs]);
  return state;
}
