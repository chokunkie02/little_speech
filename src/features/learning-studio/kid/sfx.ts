/**
 * Little game sounds for the kid screens, made with Web Audio (no files to load). Kept quiet and short.
 * Never play these while the microphone is recording: the mic would hear them and count them as voice.
 */
let context: AudioContext | null = null;
const MASTER = 0.18;

function audio() {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Context =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return null;
    context = new Context();
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

/** Call from a tap or key press: browsers only start sound after the user has touched the page. */
export function unlockSfx() {
  audio();
}

function tone(
  ctx: AudioContext,
  { type = "sine", from, to = from, at = 0, dur, vol = 1 }: { type?: OscillatorType; from: number; to?: number; at?: number; dur: number; vol?: number },
) {
  const start = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(MASTER * vol, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function noise(ctx: AudioContext, { at = 0, dur, vol = 1, freq = 900 }: { at?: number; dur: number; vol?: number; freq?: number }) {
  const start = ctx.currentTime + at;
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(freq, start);
  filter.frequency.exponentialRampToValueAtTime(Math.max(80, freq / 4), start + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(MASTER * vol, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(start);
}

const SOUNDS = {
  /** พี่ปู jumps. */
  hop: (c: AudioContext) => tone(c, { type: "sine", from: 260, to: 760, dur: 0.18, vol: 0.9 }),
  /** Lands on a stone in the water. */
  splash: (c: AudioContext) => noise(c, { dur: 0.32, vol: 0.7, freq: 1800 }),
  /** A train car or a sticker pops in. */
  pop: (c: AudioContext) => tone(c, { type: "triangle", from: 520, to: 980, dur: 0.1 }),
  /** Something flies through the air. */
  whoosh: (c: AudioContext) => noise(c, { dur: 0.35, vol: 0.45, freq: 2600 }),
  /** พี่ปู eats. */
  chomp: (c: AudioContext) => {
    tone(c, { type: "square", from: 190, to: 120, dur: 0.07, vol: 0.5 });
    tone(c, { type: "square", from: 190, to: 120, at: 0.16, dur: 0.07, vol: 0.5 });
    tone(c, { type: "square", from: 210, to: 130, at: 0.32, dur: 0.07, vol: 0.5 });
  },
  /** Drops into the basket. */
  plop: (c: AudioContext) => tone(c, { type: "sine", from: 600, to: 220, dur: 0.16 }),
  /** Not that one (soft, never a buzzer). */
  nope: (c: AudioContext) => {
    tone(c, { type: "sine", from: 420, to: 330, dur: 0.14, vol: 0.6 });
    tone(c, { type: "sine", from: 330, to: 260, at: 0.15, dur: 0.18, vol: 0.6 });
  },
  /** ปู้น ปู้น */
  whistle: (c: AudioContext) => {
    for (const at of [0, 0.45]) {
      tone(c, { type: "triangle", from: 587, at, dur: 0.38, vol: 0.55 });
      tone(c, { type: "triangle", from: 740, at, dur: 0.38, vol: 0.45 });
    }
  },
  /** ฉึกฉัก while the train runs. */
  chug: (c: AudioContext) => {
    for (let i = 0; i < 8; i++) noise(c, { at: 0.9 + i * 0.22, dur: 0.12, vol: 0.35, freq: 700 });
  },
  /** Made it! */
  fanfare: (c: AudioContext) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(c, { type: "triangle", from: f, at: i * 0.12, dur: i === 3 ? 0.5 : 0.18, vol: 0.7 }));
  },
  /** Star or sparkle. */
  twinkle: (c: AudioContext) => {
    [1319, 1568, 2093].forEach((f, i) => tone(c, { type: "sine", from: f, at: i * 0.07, dur: 0.2, vol: 0.35 }));
  },
};
export type Sfx = keyof typeof SOUNDS;

export function sfx(name: Sfx) {
  const ctx = audio();
  if (!ctx) return;
  try {
    SOUNDS[name](ctx);
  } catch {
    // Sound is decoration only.
  }
}
