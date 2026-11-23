import { useEffect, useEffectEvent, useRef } from "react";
import { Hand, Mic } from "lucide-react";

interface Recorder {
  recording: boolean;
  requesting: boolean;
  record: () => Promise<void>;
  stopRecording: () => void;
}

/**
 * Hold to talk: press (finger, mouse or Space) to start recording, let go to stop. If the press ends
 * before the microphone is ready (the first permission prompt, a slow device), recording stops as soon
 * as it starts, so the child is never left recording by accident.
 */
export function HoldToTalk({
  recorder,
  level = 0,
  label,
  disabled = false,
}: {
  recorder: Recorder;
  /** 0–1 voice level for the glow ring. */
  level?: number;
  label: string;
  disabled?: boolean;
}) {
  const pressed = useRef(false);
  const stopWhenReady = useRef(false);
  const start = () => {
    if (disabled || recorder.recording || recorder.requesting || pressed.current) return;
    pressed.current = true;
    stopWhenReady.current = false;
    void recorder.record();
  };
  const stop = () => {
    if (!pressed.current) return;
    pressed.current = false;
    if (recorder.recording) recorder.stopRecording();
    else stopWhenReady.current = true;
  };
  const onSpace = useEffectEvent((down: boolean) => (down ? start() : stop()));
  useEffect(() => {
    if (recorder.recording && stopWhenReady.current) {
      stopWhenReady.current = false;
      recorder.stopRecording();
    }
    if (!recorder.recording && !recorder.requesting) stopWhenReady.current = false;
  }, [recorder]);
  useEffect(() => {
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]");
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || typing(e)) return;
      e.preventDefault();
      if (!e.repeat) onSpace(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || typing(e)) return;
      e.preventDefault();
      onSpace(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  const live = recorder.recording || recorder.requesting;
  return (
    <>
      <button
        type="button"
        className={`kw-mic${live ? " live" : ""}`}
        style={{ ["--kw-level" as string]: live ? level.toFixed(2) : "0" }}
        aria-label={live ? "กำลังฟัง ปล่อยเมื่อพูดจบ" : label}
        aria-pressed={live}
        disabled={disabled}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          start();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onKeyDown={(e) => {
          // Keyboard users without Space-hold: Enter toggles.
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (pressed.current) stop();
          else start();
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Mic />
      </button>
      <div className="kw-mic-label" aria-live="polite">
        {recorder.requesting ? "กำลังเปิดไมค์…" : recorder.recording ? "พี่ปูกำลังฟัง… ปล่อยเมื่อพูดจบ" : label}
      </div>
      <div className="kw-kbd" aria-hidden="true">
        หรือกด <span className="kw-key">Space</span> ค้างไว้
      </div>
    </>
  );
}

/** Tap mode, when the microphone cannot be used: the child speaks to the adult and taps when done. */
export function SaidItButton({ onSaid, disabled }: { onSaid: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="kw-btn gold big" onClick={onSaid} disabled={disabled}>
      <Hand />
      หนูพูดแล้ว
    </button>
  );
}
