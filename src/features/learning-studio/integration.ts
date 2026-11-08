import { initialState, readState } from "./domain";
import { getStages } from "./curriculum";
import type { AppState, Track } from "./types";
import type { LearningLevelId } from "./learning-levels";

export interface StudioChild {
  id: string;
  name: string;
  age?: number;
  initialTrack?: Track;
  targetSound?: string;
}
export const STUDIO_STATE_EVENT = "speech-adventure:studio-state";
export function studioStorageKey(accountId?: string, childId?: string): string {
  return `speech-adventure:studio:v1:${encodeURIComponent(accountId || "anonymous")}:${encodeURIComponent(childId || "demo-child-meena")}`;
}
/** Content band suggestion only; adults can select any level. */
export function suggestedLevel(age?: number): LearningLevelId {
  if (!age || age < 4) return "starter";
  if (age < 7) return "explorer";
  if (age < 10) return "builder";
  return "storyteller";
}
export function createStudioState(
  raw: string | null,
  child?: StudioChild,
): AppState {
  let state = readState(raw);
  const expectedId = child?.id || "demo-child-meena";
  // Never transfer a different child's saved sessions into the selected profile.
  const fresh = !raw || state.plan.childId !== expectedId;
  if (fresh) state = initialState();
  if (!child) return state;
  const track = fresh ? child.initialTrack || "speech" : state.plan.track;
  const level = fresh ? suggestedLevel(child.age) : state.plan.level;
  const sound =
    fresh && ["ป", "ก", "ม"].includes(child.targetSound || "")
      ? child.targetSound!
      : state.plan.sound;
  return {
    ...state,
    plan: {
      ...state.plan,
      childId: child.id,
      childName: child.name,
      age: child.age ? `${child.age} ปี` : state.plan.age,
      track,
      level,
      sound,
      startStage: fresh
        ? getStages(track, sound, level)[0].id
        : state.plan.startStage,
    },
    sessions: state.sessions.filter((s) => s.childId === child.id),
  };
}
