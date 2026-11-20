// Learning Studio results: one shape for rounds saved online (learning_session_results)
// and rounds still only in this browser, plus the summaries progress, report, rewards and the
// parent dashboard are built from. Days are counted in Thai time (Asia/Bangkok).

import type { DbLearningSessionResult } from "@/types/database";
import type { Session, Track } from "@/features/learning-studio/types";

export type LearningTrack = Track;

export const TRACK_LABELS: Record<LearningTrack, string> = {
  speech: "ฝึกออกเสียง",
  communication: "พูดเพื่อสื่อสาร",
  phonics: "เสียงกับตัวอักษร",
};
export const TRACK_ORDER: LearningTrack[] = ["speech", "communication", "phonics"];

export type LearningResult = {
  /** Studio session id (unique per round). */
  id: string;
  track: LearningTrack;
  stageLabel: string;
  sound: string;
  startedAt: string;
  completedAt: string;
  /** Activities tried in the round (demo-only tries are not counted). */
  activities: number;
  /** Listen-and-choose questions answered, and how many matched the sound. */
  choiceCount: number;
  correctChoices: number;
  /** "online" once saved to the school/family record, "device" while only in this browser. */
  savedTo: "online" | "device";
};

export function fromDbRow(row: DbLearningSessionResult): LearningResult {
  return {
    id: row.session_id,
    track: row.track,
    stageLabel: row.stage_label,
    sound: row.sound,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    activities: row.activities,
    choiceCount: row.choice_count,
    correctChoices: row.correct_choices,
    savedTo: "online",
  };
}

/** Same rules as the studio's online sync: completed rounds with at least one real (non-demo) try. */
export function fromStudioSessions(sessions: Session[], childId: string): LearningResult[] {
  return sessions.flatMap((session) => {
    if (session.childId !== childId || session.status !== "completed" || !session.completedAt) return [];
    const tries = session.attempts.filter((attempt) => attempt.mode !== "demo");
    if (!tries.length) return [];
    const choices = tries.filter((attempt) => typeof attempt.choiceCorrect === "boolean");
    return [{
      id: session.id,
      track: session.track,
      stageLabel: session.stageLabel,
      sound: session.sound,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      activities: tries.length,
      choiceCount: choices.length,
      correctChoices: choices.filter((attempt) => attempt.choiceCorrect).length,
      savedTo: "device" as const,
    }];
  });
}

/** Online rows win over the same round still held on this device. Newest first. */
export function mergeResults(online: LearningResult[], device: LearningResult[]): LearningResult[] {
  const byId = new Map<string, LearningResult>();
  for (const result of device) byId.set(result.id, result);
  for (const result of online) byId.set(result.id, result);
  return [...byId.values()].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

// ── Days and weeks in Thai time ─────────────────────────────────────────────────

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" });

/** "YYYY-MM-DD" of the instant in Asia/Bangkok. */
export function dayKey(value: string | Date): string {
  return dayFormat.format(typeof value === "string" ? new Date(value) : value);
}

export function shiftDay(key: string, days: number): string {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monday of the week containing the day. */
function weekStart(key: string): string {
  const weekday = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return shiftDay(key, -((weekday + 6) % 7));
}

export function filterByDays(results: LearningResult[], from?: string, to?: string): LearningResult[] {
  return results.filter((result) => {
    const day = dayKey(result.completedAt);
    return (!from || day >= from) && (!to || day <= to);
  });
}

// ── Summary ─────────────────────────────────────────────────────────────────────

export type Accuracy = { correct: number; total: number; percent: number } | null;

function accuracy(results: LearningResult[]): Accuracy {
  const total = results.reduce((sum, result) => sum + result.choiceCount, 0);
  if (!total) return null;
  const correct = results.reduce((sum, result) => sum + result.correctChoices, 0);
  return { correct, total, percent: Math.round((correct / total) * 100) };
}

export type GroupSummary = { key: string; label: string; sessions: number; activities: number; accuracy: Accuracy; lastAt: string };
export type WeekBucket = { start: string; sessions: number; activities: number; current: boolean };

export type LearningSummary = {
  sessions: number;
  activities: number;
  accuracy: Accuracy;
  practiceDays: number;
  /** Consecutive practice days ending today (or yesterday, so the streak survives until bedtime). */
  streak: number;
  /** Longest run of consecutive practice days ever. */
  bestStreak: number;
  /** Days with practice in the last 7 days, including today. */
  daysThisWeek: number;
  lastPracticedAt: string | null;
  byTrack: GroupSummary[];
  bySound: GroupSummary[];
  /** Oldest → newest, the current week last. */
  weeks: WeekBucket[];
  tracksTried: number;
  soundsTried: number;
};

function group(results: LearningResult[], keyOf: (result: LearningResult) => string, labelOf: (key: string) => string): GroupSummary[] {
  const groups = new Map<string, LearningResult[]>();
  for (const result of results) {
    const key = keyOf(result);
    groups.set(key, [...(groups.get(key) ?? []), result]);
  }
  return [...groups.entries()].map(([key, items]) => ({
    key,
    label: labelOf(key),
    sessions: items.length,
    activities: items.reduce((sum, item) => sum + item.activities, 0),
    accuracy: accuracy(items),
    lastAt: items.reduce((last, item) => (item.completedAt > last ? item.completedAt : last), items[0].completedAt),
  }));
}

export function summarize(results: LearningResult[], now: Date = new Date(), weekCount = 8): LearningSummary {
  const today = dayKey(now);
  const days = new Set(results.map((result) => dayKey(result.completedAt)));

  let streak = 0;
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  while (days.has(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }

  let bestStreak = 0;
  for (const day of days) {
    if (days.has(shiftDay(day, -1))) continue; // count each run once, from its first day
    let length = 1;
    while (days.has(shiftDay(day, length))) length += 1;
    bestStreak = Math.max(bestStreak, length);
  }

  const weekFrom = shiftDay(today, -6);
  const daysThisWeek = [...days].filter((day) => day >= weekFrom && day <= today).length;

  const thisWeek = weekStart(today);
  const weeks: WeekBucket[] = Array.from({ length: weekCount }, (_, index) => {
    const start = shiftDay(thisWeek, -7 * (weekCount - 1 - index));
    return { start, sessions: 0, activities: 0, current: start === thisWeek };
  });
  for (const result of results) {
    const bucket = weeks.find((week) => week.start === weekStart(dayKey(result.completedAt)));
    if (bucket) {
      bucket.sessions += 1;
      bucket.activities += result.activities;
    }
  }

  const byTrack = group(results, (result) => result.track, (key) => TRACK_LABELS[key as LearningTrack] ?? key)
    .sort((a, b) => TRACK_ORDER.indexOf(a.key as LearningTrack) - TRACK_ORDER.indexOf(b.key as LearningTrack));
  const bySound = group(results, (result) => result.sound, (key) => `เสียง ${key}`)
    .sort((a, b) => b.sessions - a.sessions || a.key.localeCompare(b.key, "th"));

  return {
    sessions: results.length,
    activities: results.reduce((sum, result) => sum + result.activities, 0),
    accuracy: accuracy(results),
    practiceDays: days.size,
    streak,
    bestStreak,
    daysThisWeek,
    lastPracticedAt: results[0]?.completedAt ?? null,
    byTrack,
    bySound,
    weeks,
    tracksTried: byTrack.length,
    soundsTried: bySound.length,
  };
}

/** Gentle, non-diagnostic next step for adults, from the practice pattern only. */
export function suggestNextStep(summary: LearningSummary): string {
  if (!summary.sessions) return "เริ่มจากรอบสั้น ๆ ในห้องฝึก วันละ 5–10 นาทีก็พอ";
  if (summary.daysThisWeek === 0) return "ไม่ได้ฝึกมาหลายวันแล้ว ลองกลับมาเล่นรอบสั้น ๆ ที่เด็กชอบก่อน";
  if (summary.daysThisWeek < 3) return "ลองฝึกให้ได้ 3 วันต่อสัปดาห์ รอบละไม่กี่นาที ความสม่ำเสมอช่วยได้มากกว่าการฝึกนาน ๆ";
  if (summary.accuracy && summary.accuracy.percent < 60) return "ข้อฟังแล้วเลือกยังสลับกันบ้าง ลองฟังตัวอย่างซ้ำช้า ๆ ด้วยกันก่อนตอบ";
  if (summary.tracksTried < 2) return "ฝึกได้สม่ำเสมอดีมาก ลองเพิ่มแนวทางอื่นในห้องฝึก เช่น พูดเพื่อสื่อสาร เพื่อใช้เสียงในสถานการณ์จริง";
  return "ฝึกได้สม่ำเสมอดีมาก ฝึกต่อในจังหวะเดิม และชวนเด็กใช้คำที่ฝึกในชีวิตประจำวัน";
}
