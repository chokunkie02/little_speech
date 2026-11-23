/**
 * On-device voice activity for the kid games. It only answers "is the child making sound, for how
 * long, in how many bursts, and is the room noisy". It never judges whether a word was right; that
 * stays with the adult (or AI when an admin turns it on). Pure logic so it can be tested in Node.
 */
export interface VoiceState {
  /** 0–1, how far above the room's noise the current sound is. Drives the mic glow, not scoring. */
  level: number;
  speaking: boolean;
  /** Total milliseconds of voice since the tracker started. */
  voicedMs: number;
  /** Separate bursts of voice (syllables or words), merged when the pause between them is short. */
  segments: number;
  /** Estimated background level (RMS). */
  noise: number;
  /** Background is loud enough that a quiet child may not be told apart from the room. */
  noisy: boolean;
}

export interface VoiceTrackerOptions {
  /** Lowest RMS that can count as voice, whatever the room. */
  minThreshold?: number;
  /** Voice must stay above the threshold this long before it counts (filters clicks and taps). */
  attackMs?: number;
  /** Voice ends after this much quiet. Shorter pauses keep the same burst. */
  releaseMs?: number;
  /** Background RMS above this marks the room as noisy. */
  noisyAbove?: number;
  /**
   * The first moments after pressing the mic are taken as the room's own sound (children start talking
   * a beat after pressing). The learned level is capped so a child who speaks at once is still heard.
   */
  calibrateMs?: number;
}

export function createVoiceTracker(options: VoiceTrackerOptions = {}) {
  const minThreshold = options.minThreshold ?? 0.015;
  const attackMs = options.attackMs ?? 60;
  const releaseMs = options.releaseMs ?? 260;
  const noisyAbove = options.noisyAbove ?? 0.045;
  const calibrateMs = options.calibrateMs ?? 150;
  let noise = minThreshold / 3;
  let calibratedMs = 0;
  let roomSum = 0;
  let roomSamples = 0;
  let room = 0;
  let speaking = false;
  let aboveMs = 0;
  let belowMs = 0;
  let voicedMs = 0;
  let segments = 0;
  let level = 0;
  const threshold = () => Math.max(minThreshold, noise * 3);

  return {
    /** Feed one RMS reading taken `dtMs` after the previous one. */
    push(rms: number, dtMs: number): VoiceState {
      if (calibratedMs < calibrateMs) {
        calibratedMs += dtMs;
        roomSum += rms;
        roomSamples++;
        room = roomSum / roomSamples;
        if (calibratedMs >= calibrateMs) noise = Math.max(noise, Math.min(room, 0.03));
        level = 0;
        return this.state();
      }
      const t = threshold();
      if (rms > t) {
        aboveMs += dtMs;
        belowMs = 0;
        if (!speaking && aboveMs >= attackMs) {
          speaking = true;
          segments++;
          voicedMs += aboveMs;
        } else if (speaking) voicedMs += dtMs;
      } else {
        aboveMs = 0;
        if (speaking) {
          belowMs += dtMs;
          if (rms > t * 0.7) voicedMs += dtMs; // trailing sound still counts while it fades
          if (belowMs >= releaseMs) speaking = false;
        } else {
          // Follow the room slowly upward and quickly downward, only while nobody is talking.
          const rate = rms > noise ? 0.02 : 0.2;
          noise += (rms - noise) * rate;
        }
      }
      level = Math.max(0, Math.min(1, (rms - noise) / (t * 4)));
      return this.state();
    },
    state(): VoiceState {
      return { level, speaking, voicedMs, segments, noise, noisy: Math.max(noise, room) > noisyAbove };
    },
  };
}

/** Root-mean-square of one block of samples (-1…1). */
export function rms(samples: ArrayLike<number>) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return samples.length ? Math.sqrt(sum / samples.length) : 0;
}
