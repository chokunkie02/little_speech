import type { LearningLevelId } from "../learning-levels";
import type { Item } from "../types";

/** Which kid game shows an item. Decided from the item's shape, so every track and level is covered. */
export type KidGame = "feed" | "mirror" | "stones" | "card" | "train" | "together";

export function gameFor(item: Item): KidGame {
  if (item.kind === "choice") return "feed";
  if (item.kind === "observation") return "together";
  if (item.art === "mouth") return "mirror";
  if (item.segments?.length || item.art === "sound-pattern") return "stones";
  if (item.stageId === "words") return "card";
  return splitWords(item.prompt).length > 1 ? "train" : "card";
}

/** Stones for the stepping-stone game: "ป + า → ปา" for blends, or the syllables of "ปา ปี ปู". */
export function stonesFor(item: Item): string[] {
  if (item.segments?.length) return [...item.segments, item.prompt];
  return item.prompt.split(/\s+/).filter(Boolean);
}

/**
 * Splits a Thai phrase into words for the word train ("ปูตัวเล็ก" → ปู · ตัว · เล็ก). Uses the browser's
 * Thai dictionary (Intl.Segmenter); without it, falls back to spaces, then to the whole phrase.
 */
export function splitWords(text: string): string[] {
  const clean = text.trim();
  if (!clean) return [];
  const Segmenter = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Segmenter) {
    const words = [...new Segmenter("th", { granularity: "word" }).segment(clean)]
      .filter((s) => s.isWordLike)
      .map((s) => s.segment);
    if (words.length) return words;
  }
  return clean.split(/\s+/).filter(Boolean);
}

/** Who is expected next to the child. Young levels play with an adult; older children may play alone. */
export type PlayMode = "together" | "alone";
export const defaultPlayMode = (level: LearningLevelId | undefined): PlayMode =>
  level === "builder" || level === "storyteller" ? "alone" : "together";
