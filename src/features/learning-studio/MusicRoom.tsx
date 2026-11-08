import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Music2, Volume2, VolumeX, X } from "lucide-react";

// Original pentatonic game theme. Scheduled locally; no external music or service.
const MELODY = [
  72,
  null,
  76,
  79,
  81,
  79,
  76,
  null,
  74,
  76,
  79,
  76,
  74,
  72,
  null,
  null,
  76,
  null,
  79,
  84,
  81,
  79,
  76,
  null,
  74,
  72,
  69,
  72,
  74,
  null,
  72,
  null,
];
const CHORDS = [
  [48, 55, 60],
  [53, 60, 65],
  [45, 52, 57],
  [55, 62, 67],
];
const freq = (m: number) => 440 * 2 ** ((m - 69) / 12);
const KEY = "speech-adventure:soundscape:v1";
export function MusicRoom() {
  const [enabled, setEnabled] = useState(false);
  const [panel, setPanel] = useState(false);
  const [focus, setFocus] = useState("music");
  const [volume, setVolume] = useState(() => {
    try {
      return Math.max(
        0.05,
        Math.min(
          0.6,
          Number(JSON.parse(localStorage.getItem(KEY) ?? "{}").volume) || 0.25,
        ),
      );
    } catch {
      return 0.25;
    }
  });
  const [message, setMessage] = useState("");
  const audio = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const step = useRef(0);
  const next = useRef(0);
  const talking = useRef(false);
  const recording = useRef(false);
  const wanted = useRef(false);
  const loudness = useRef(volume);
  const updateGain = () => {
    setFocus(
      recording.current ? "recording" : talking.current ? "speech" : "music",
    );
    const ctx = audio.current;
    if (ctx && gain.current) {
      const now = ctx.currentTime;
      gain.current.gain.cancelScheduledValues(now);
      if (recording.current) {
        gain.current.gain.setValueAtTime(0, now);
        return;
      }
      const level = document.hidden ? 0 : talking.current ? 0.025 : 1;
      gain.current.gain.setTargetAtTime(
        wanted.current ? loudness.current * level : 0,
        now,
        0.12,
      );
    }
  };
  const tone = (
    note: number,
    at: number,
    duration: number,
    strength: number,
    bell = false,
  ) => {
    const ctx = audio.current,
      out = gain.current;
    if (!ctx || !out) return;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(strength, at + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    env.connect(out);
    for (const [harmonic, level] of bell
      ? [
          [1, 1],
          [2, 0.18],
          [3, 0.05],
        ]
      : [
          [1, 1],
          [2, 0.12],
        ]) {
      const osc = ctx.createOscillator(),
        g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq(note) * harmonic;
      g.gain.value = level;
      osc.connect(g);
      g.connect(env);
      osc.start(at);
      osc.stop(at + duration + 0.03);
    }
  };
  const schedule = () => {
    const ctx = audio.current;
    if (!ctx || !wanted.current || ctx.state !== "running" || document.hidden)
      return;
    if (next.current < ctx.currentTime) next.current = ctx.currentTime + 0.06;
    while (next.current < ctx.currentTime + 0.22) {
      const i = step.current % MELODY.length,
        n = MELODY[i],
        at = next.current;
      if (n !== null) tone(n, at, 0.42, 0.15, true);
      if (i % 8 === 0)
        for (const note of CHORDS[Math.floor(i / 8)])
          tone(note, at, 2.4, 0.035);
      if (i % 4 === 2) tone(60, at, 0.09, 0.025, true);
      step.current++;
      next.current += 0.375;
    }
  };
  const persist = (on: boolean, v: number) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ enabled: on, volume: v }));
    } catch {}
  };
  const start = async () => {
    setMessage("");
    try {
      if (!audio.current || audio.current.state === "closed") {
        audio.current = new AudioContext();
        gain.current = audio.current.createGain();
        gain.current.gain.value = 0;
        gain.current.connect(audio.current.destination);
      }
      await audio.current.resume();
      wanted.current = true;
      setEnabled(true);
      persist(true, loudness.current);
      next.current = audio.current.currentTime + 0.06;
      updateGain();
      if (!timer.current) timer.current = setInterval(schedule, 100);
      schedule();
    } catch {
      setMessage("ยังเปิดเพลงไม่ได้ ลองกดเริ่มเพลงอีกครั้งนะ");
    }
  };
  const stop = () => {
    wanted.current = false;
    setEnabled(false);
    persist(false, loudness.current);
    updateGain();
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    void audio.current?.suspend();
  };
  const restoreStart = useEffectEvent(() => {
    void start();
  });
  useEffect(() => {
    const media = () => {
      talking.current = Array.from(document.querySelectorAll("audio")).some(
        (a) => !a.paused && !a.ended,
      );
      updateGain();
    };
    const mic = (e: Event) => {
      recording.current = Boolean((e as CustomEvent).detail);
      updateGain();
    };
    const visible = () => {
      next.current = audio.current?.currentTime ?? 0;
      updateGain();
    };
    const effect = (e: Event) => {
      if (
        !wanted.current ||
        talking.current ||
        recording.current ||
        document.hidden
      )
        return;
      const at = audio.current?.currentTime ?? 0;
      const notes =
        (e as CustomEvent).detail === "complete" ? [72, 76, 79, 84] : [76, 79];
      notes.forEach((note, i) => tone(note, at + i * 0.14, 0.35, 0.08, true));
    };
    document.addEventListener("play", media, true);
    document.addEventListener("pause", media, true);
    document.addEventListener("ended", media, true);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("speech-adventure:recording", mic);
    window.addEventListener("speech-adventure:chime", effect);
    let restore = false;
    try {
      restore = JSON.parse(localStorage.getItem(KEY) ?? "{}").enabled === true;
    } catch {}
    const resume = () => {
      if (restore && !wanted.current) restoreStart();
    };
    if (restore)
      document.addEventListener("pointerdown", resume, { once: true });
    return () => {
      document.removeEventListener("pointerdown", resume);
      document.removeEventListener("play", media, true);
      document.removeEventListener("pause", media, true);
      document.removeEventListener("ended", media, true);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("speech-adventure:recording", mic);
      window.removeEventListener("speech-adventure:chime", effect);
      if (timer.current) clearInterval(timer.current);
      void audio.current?.close();
      timer.current = null;
      audio.current = null;
      gain.current = null;
      wanted.current = false;
    };
  }, []);
  return (
    <div className="music-room" data-sound-focus={focus}>
      <button
        className={`music-trigger ${enabled ? "on" : ""}`}
        aria-label={enabled ? "ตั้งค่าเพลงประกอบ" : "เปิดเพลงผจญภัย"}
        aria-expanded={panel}
        onClick={() => {
          if (!enabled) void start();
          setPanel(!panel);
        }}
      >
        <Music2 size={16} />
        <span>{enabled ? "เพลงกำลังเล่น" : "เปิดเพลง"}</span>
        {enabled && (
          <i className="music-bars">
            <b />
            <b />
            <b />
          </i>
        )}
      </button>
      {panel && (
        <div className="music-panel">
          <div>
            <strong>เพลงผจญภัยของเรา</strong>
            <button
              className="icon-button"
              aria-label="ปิดแผงเพลง"
              onClick={() => setPanel(false)}
            >
              <X size={15} />
            </button>
          </div>
          <p>
            {focus === "recording"
              ? "เพลงพักอยู่ระหว่างอัดเสียง"
              : focus === "speech"
                ? "เพลงเบาลงให้ฟังเสียงพูดชัด ๆ"
                : "ทำนองเบา ๆ ชวนเล่นไปด้วยกัน"}
          </p>
          <button
            className="button secondary"
            onClick={() => (enabled ? stop() : void start())}
          >
            {enabled ? <VolumeX size={16} /> : <Volume2 size={16} />}{" "}
            {enabled ? "ปิดเพลง" : "เริ่มเพลง"}
          </button>
          <label>
            ความดังเพลง
            <input
              aria-label="ความดังเพลงประกอบ"
              type="range"
              min="5"
              max="60"
              value={Math.round(volume * 100)}
              onChange={(e) => {
                const v = Number(e.target.value) / 100;
                setVolume(v);
                loudness.current = v;
                persist(wanted.current, v);
                updateGain();
              }}
            />
          </label>
          <small>เพลงจะเบาลงขณะฟังตัวอย่าง และเงียบขณะอัดเสียง</small>
          {message && <p role="status">{message}</p>}
        </div>
      )}
    </div>
  );
}
