import { normalizeLevel } from "./learning-levels";
import type { AppState, Attempt, Session, Stage, Plan } from "./types";
export const STORAGE_KEY = "speech-adventure-learning:v1";
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const now = () => new Date().toISOString();
export function initialState(): AppState {
  return {
    schemaVersion: 1,
    plan: {
      id: uid(),
      childId: "demo-child-meena",
      childName: "น้องมีนา",
      age: "4–5 ปี",
      level: "starter",
      track: "speech",
      sound: "ป",
      startStage: "listen",
      selectedItems: [],
      adultSupport: true,
      createdAt: now(),
    },
    sessions: [],
    wireframe: false,
    theme: "light",
  };
}
export function readState(raw: string | null): AppState {
  try {
    const s = JSON.parse(raw ?? "null");
    if (
      !s ||
      s.schemaVersion !== 1 ||
      !s.plan ||
      !["speech", "communication", "phonics"].includes(s.plan.track) ||
      !["ป", "ก", "ม"].includes(s.plan.sound) ||
      typeof s.plan.childName !== "string" ||
      typeof s.plan.childId !== "string" ||
      !Array.isArray(s.plan.selectedItems) ||
      !s.plan.selectedItems.every((id: unknown) => typeof id === "string") ||
      !Array.isArray(s.sessions)
    )
      return initialState();
    const sessions = s.sessions.filter(
      (x: Session) =>
        x &&
        typeof x.id === "string" &&
        typeof x.childId === "string" &&
        ["speech", "communication", "phonics"].includes(x.track) &&
        ["ป", "ก", "ม"].includes(x.sound) &&
        Array.isArray(x.attempts) &&
        x.attempts.every(
          (a) =>
            a &&
            typeof a.id === "string" &&
            typeof a.itemId === "string" &&
            ["choice", "speech", "observation"].includes(a.kind),
        ) &&
        Array.isArray(x.itemIds) &&
        x.itemIds.length > 0 &&
        Number.isInteger(x.index) &&
        x.index >= 0 &&
        x.index < x.itemIds.length &&
        ["active", "completed"].includes(x.status),
    );
    return {
      ...initialState(),
      ...s,
      sessions,
      plan: {
        ...initialState().plan,
        ...s.plan,
        level: normalizeLevel(s.plan.level),
      },
    };
  } catch {
    return initialState();
  }
}
export function startSession(
  state: AppState,
  stage: Stage,
  itemIds?: string[],
): { state: AppState; session: Session } {
  const ids = itemIds?.length
    ? stage.items.filter((i) => itemIds.includes(i.id)).map((i) => i.id)
    : stage.items.map((i) => i.id);
  if (!ids.length) throw new Error("Empty lesson");
  const active = state.sessions.find(
    (s) => s.id === state.activeSessionId && s.status === "active",
  );
  if (
    active &&
    active.childId === state.plan.childId &&
    active.planId === state.plan.id &&
    active.stageId === stage.id &&
    active.itemIds.join("|") === ids.join("|")
  )
    return { state, session: active };
  const session: Session = {
    id: uid(),
    childId: state.plan.childId,
    planId: state.plan.id,
    level: normalizeLevel(state.plan.level),
    track: state.plan.track,
    sound: state.plan.sound,
    stageId: stage.id,
    stageLabel: stage.label,
    itemIds: ids,
    index: 0,
    attempts: [],
    status: "active",
    startedAt: now(),
  };
  return {
    session,
    state: {
      ...state,
      activeSessionId: session.id,
      sessions: [...state.sessions, session],
    },
  };
}
export function saveAttempt(
  state: AppState,
  sessionId: string,
  attempt: Attempt,
): AppState {
  return {
    ...state,
    sessions: state.sessions.map((s) => {
      if (
        s.id !== sessionId ||
        s.status !== "active" ||
        s.itemIds[s.index] !== attempt.itemId ||
        s.attempts.some((a) => a.itemId === attempt.itemId)
      )
        return s;
      return { ...s, attempts: [...s.attempts, attempt] };
    }),
  };
}
export function advanceSession(
  state: AppState,
  sessionId: string,
): { state: AppState; done: boolean } {
  let done = false;
  const sessions = state.sessions.map((s) => {
    if (
      s.id !== sessionId ||
      s.status !== "active" ||
      !s.attempts.some((a) => a.itemId === s.itemIds[s.index])
    )
      return s;
    if (s.index + 1 < s.itemIds.length) return { ...s, index: s.index + 1 };
    done = true;
    return { ...s, status: "completed" as const, completedAt: now() };
  });
  return {
    done,
    state: {
      ...state,
      sessions,
      ...(done
        ? { activeSessionId: undefined, lastCompletedId: sessionId }
        : {}),
    },
  };
}
export function reviewSession(
  state: AppState,
  id: string,
  review: Attempt["review"],
  note: string,
): AppState {
  return {
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === id && s.status === "completed"
        ? {
            ...s,
            reviewNote: note,
            attempts: s.attempts.map((a) =>
              a.kind === "choice" ? a : { ...a, review },
            ),
          }
        : s,
    ),
  };
}
export function planMatchesSession(p: Plan, s: Session) {
  return p.id === s.planId && p.childId === s.childId;
}
export function metrics(sessions: Session[]) {
  const completed = sessions.filter((s) => s.status === "completed");
  const all = completed.flatMap((s) => s.attempts);
  const choices = all.filter((a) => a.kind === "choice");
  return {
    sessions: completed.length,
    participation: all.length,
    listeningCorrect: choices.filter((a) => a.choiceCorrect).length,
    listeningTotal: choices.length,
    independent: all.filter(
      (a) => a.kind !== "choice" && a.support === "independent",
    ).length,
    assisted: all.filter(
      (a) => a.kind !== "choice" && a.support !== "independent",
    ).length,
    pending: all.filter((a) => a.kind !== "choice" && a.review === "pending")
      .length,
    reviewed: all.filter(
      (a) => a.kind !== "choice" && ["achieved", "practice"].includes(a.review),
    ).length,
  };
}
