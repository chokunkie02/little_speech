import type { LearningLevelId } from "./learning-levels";
export type Track = "speech" | "communication" | "phonics";
export type Route =
  | "home"
  | "path"
  | "library"
  | "plan"
  | "practice"
  | "summary"
  | "progress"
  | "guide"
  | "wireframes";
export type Review = "pending" | "achieved" | "practice" | "unavailable";
export interface Plan {
  level?: LearningLevelId;
  id: string;
  childId: string;
  childName: string;
  age: string;
  track: Track;
  sound: string;
  startStage: string;
  selectedItems: string[];
  adultSupport: boolean;
  createdAt: string;
}
export interface Option {
  id: string;
  label: string;
  art: string;
}
export interface Item {
  id: string;
  stageId: string;
  kind: "choice" | "speech" | "observation";
  title: string;
  instruction: string;
  prompt: string;
  art: string;
  choices?: Option[];
  answer?: string;
  sample: string;
  hidePrompt?: boolean;
  hint: string;
  subLabel?: string;
  segments?: string[];
}
export interface Stage {
  id: string;
  label: string;
  short: string;
  description: string;
  color: string;
  icon: string;
  items: Item[];
}
export interface Attempt {
  id: string;
  itemId: string;
  createdAt: string;
  kind: Item["kind"];
  mode: "choice" | "recording" | "demo" | "observation";
  choiceId?: string;
  choiceCorrect?: boolean;
  support: "independent" | "modeled" | "adult";
  review: Review;
  retries: number;
}
export interface Session {
  level?: LearningLevelId;
  id: string;
  childId: string;
  planId: string;
  track: Track;
  sound: string;
  stageId: string;
  stageLabel: string;
  itemIds: string[];
  index: number;
  attempts: Attempt[];
  status: "active" | "completed";
  startedAt: string;
  completedAt?: string;
  reviewNote?: string;
}
export interface AppState {
  schemaVersion: 1;
  plan: Plan;
  sessions: Session[];
  activeSessionId?: string;
  lastCompletedId?: string;
  wireframe: boolean;
  theme: "light" | "dark";
}
export interface LearningEvent {
  type:
    | "plan.saved"
    | "session.started"
    | "attempt.saved"
    | "session.completed"
    | "review.saved";
  childId: string;
  planId: string;
  sessionId?: string;
  payload: unknown;
}
