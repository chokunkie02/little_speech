import type { LearningLevelId } from "../learning-levels";
import type { Item } from "../types";

/** Which kid game shows an item. Decided from the item's shape, so every track and level is covered. */
export type KidGame = "feed" | "mirror" | "stones" | "card" | "train" | "together";

/** Name on the map and start screen, and พี่ปู's invitation. */
export const GAME_INFO: Record<KidGame, { name: string; line: string }> = {
  feed: { name: "ส่งของให้พี่ปู", line: "พี่ปูมีตะกร้าใบใหญ่! ฟังให้ดี แล้วส่งของที่ได้ยินให้พี่ปูนะ" },
  mirror: { name: "กระจกวิเศษ", line: "มาเล่นกระจกวิเศษกับพี่ปูกัน! ดูปากพี่ปู แล้วทำตามนะ" },
  stones: { name: "กระโดดหิน", line: "หนูพูดหนึ่งครั้ง พี่ปูกระโดดหนึ่งก้อน! พาพี่ปูข้ามลำธารกัน" },
  card: { name: "การ์ดสติกเกอร์", line: "ดูภาพแล้วบอกพี่ปูว่าคืออะไร ได้สติกเกอร์ด้วยนะ" },
  train: { name: "รถไฟคำ", line: "พูดหนึ่งคำ ได้ตู้รถไฟหนึ่งตู้! ต่อให้ครบแล้วรถไฟจะออกวิ่ง ปู้น ปู้น" },
  together: { name: "เล่นกับผู้ใหญ่", line: "ชวนผู้ใหญ่มาเล่นด้วยกันนะ" },
};

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

/** Most cars a word train has: longer sentences group neighbouring words so each car stays readable. */
export const MAX_CARS = 4;

/**
 * Train cars for a phrase: one word per car, or for long sentences, neighbouring words grouped into
 * at most MAX_CARS cars of about equal length ("ปูตัวเล็ก · กำลังเดิน · อยู่บนทราย · ริมทะเล").
 */
export function trainCars(text: string, max = MAX_CARS): string[] {
  const words = splitWords(text);
  if (words.length <= max) return words;
  const cars: string[] = [];
  let rest = words.join("").length;
  let i = 0;
  for (let car = max; car > 0; car--) {
    const target = rest / car;
    let chunk = words[i++];
    // Keep adding words while it brings the car closer to its share and leaves a word for each car left.
    while (i < words.length && words.length - i > car - 1 && Math.abs(chunk.length + words[i].length - target) <= Math.abs(chunk.length - target))
      chunk += words[i++];
    if (car === 1) while (i < words.length) chunk += words[i++];
    cars.push(chunk);
    rest -= chunk.length;
  }
  return cars;
}

/** Who is expected next to the child. Young levels play with an adult; older children may play alone. */
export type PlayMode = "together" | "alone";
export const defaultPlayMode = (level: LearningLevelId | undefined): PlayMode =>
  level === "builder" || level === "storyteller" ? "alone" : "together";
