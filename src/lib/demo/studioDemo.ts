// Sample practice for trying the app without a real child: finished Learning Studio rounds spread
// over the last three weeks, written to this browser only (never uploaded). Progress, report,
// rewards and the studio's own "ผลการฝึก" tab all read them like real rounds.

import { getStages } from "@/features/learning-studio/curriculum";
import { createStudioState, STUDIO_STATE_EVENT, studioStorageKey, type StudioChild } from "@/features/learning-studio/integration";
import type { Attempt, Item, Session, Track } from "@/features/learning-studio/types";

/** Days ago that have practice, with what was practised (oldest first). */
const PLAN: { daysAgo: number; track: Track; sound: string; stage: number }[] = [
  { daysAgo: 20, track: "speech", sound: "ก", stage: 0 },
  { daysAgo: 18, track: "speech", sound: "ก", stage: 1 },
  { daysAgo: 17, track: "speech", sound: "ก", stage: 2 },
  { daysAgo: 15, track: "communication", sound: "ก", stage: 0 },
  { daysAgo: 13, track: "speech", sound: "ก", stage: 3 },
  { daysAgo: 11, track: "speech", sound: "ป", stage: 0 },
  { daysAgo: 10, track: "phonics", sound: "ก", stage: 0 },
  { daysAgo: 8, track: "speech", sound: "ก", stage: 4 },
  { daysAgo: 6, track: "communication", sound: "ก", stage: 1 },
  { daysAgo: 5, track: "speech", sound: "ป", stage: 1 },
  { daysAgo: 3, track: "speech", sound: "ก", stage: 5 },
  { daysAgo: 2, track: "phonics", sound: "ก", stage: 1 },
  { daysAgo: 1, track: "speech", sound: "ม", stage: 0 },
  { daysAgo: 0, track: "communication", sound: "ก", stage: 2 },
];

function at(daysAgo: number, minutes: number) {
  const date = new Date();
  if (daysAgo === 0) {
    // Today's round finished a little while ago (never in the future).
    date.setMinutes(date.getMinutes() - 60 + minutes);
    return date.toISOString();
  }
  date.setDate(date.getDate() - daysAgo);
  date.setHours(17, 30 + minutes, 0, 0);
  return date.toISOString();
}

function attemptFor(item: Item, index: number, round: number, createdAt: string): Attempt {
  const base = { id: `demo-${round}-${index}`, itemId: item.id, createdAt, kind: item.kind, retries: index % 2 };
  if (item.kind === "choice") {
    // Mostly right, getting steadier over time.
    const correct = (round + index) % (round < 6 ? 3 : 5) !== 0;
    const wrong = item.choices?.find((choice) => choice.id !== item.answer);
    return { ...base, mode: "choice", choiceId: correct ? item.answer : wrong?.id, choiceCorrect: correct, support: "independent", review: "achieved" };
  }
  if (item.kind === "observation") {
    return { ...base, mode: "observation", support: "adult", review: "pending" };
  }
  return { ...base, mode: "recording", support: index % 3 === 0 ? "modeled" : "independent", review: "pending" };
}

export function buildDemoSessions(child: StudioChild, planId: string): Session[] {
  return PLAN.map((day, round) => {
    const stages = getStages(day.track, day.sound, "explorer");
    const stage = stages[day.stage % stages.length];
    const items = stage.items.slice(0, 3);
    const startedAt = at(day.daysAgo, 0);
    return {
      id: `demo-session-${round}`,
      childId: child.id,
      planId,
      level: "explorer",
      track: day.track,
      sound: day.sound,
      stageId: stage.id,
      stageLabel: stage.label,
      itemIds: items.map((item) => item.id),
      index: items.length - 1,
      attempts: items.map((item, index) => attemptFor(item, index, round, at(day.daysAgo, index + 1))),
      status: "completed",
      startedAt,
      completedAt: at(day.daysAgo, items.length + 1),
    };
  });
}

/**
 * Replace this browser's practice record for the child with the sample rounds.
 * Only for guest/local profiles: signed-in rounds would also be uploaded by the studio.
 */
export function seedStudioDemo(child: StudioChild, accountId?: string) {
  const key = studioStorageKey(accountId, child.id);
  const state = createStudioState(null, child);
  const next = { ...state, sessions: buildDemoSessions(child, state.plan.id), activeSessionId: undefined };
  localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(STUDIO_STATE_EVENT, { detail: { storageKey: key } }));
  return next.sessions.length;
}
