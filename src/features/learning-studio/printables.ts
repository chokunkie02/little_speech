import { STICKERS } from "./kid/stickers";
import type { Stage } from "./types";

/** One take-home word card: a picture and a short word that contains the sound being practised. */
export interface WordCard {
  word: string;
  art: string;
}

const MAX_WORD = 12;

/**
 * Words for the take-home cards: first the plan's own activities (picture choices and single-word speaking
 * items whose word contains the practised sound and whose picture is a sticker), then picture names that
 * contain the sound. Unique words, at most `limit`.
 */
export function homeWordCards(stages: Stage[], sound: string, limit = 8): WordCard[] {
  const cards: WordCard[] = [];
  const add = (word: string | undefined, art: string | undefined) => {
    const w = word?.trim();
    if (!w || !art || !STICKERS[art] || w.length > MAX_WORD || /\s/.test(w) || !w.includes(sound)) return;
    if (cards.some((c) => c.word === w)) return;
    cards.push({ word: w, art });
  };
  for (const stage of stages)
    for (const item of stage.items) {
      if (item.kind === "choice") item.choices?.forEach((c) => add(c.label, c.art));
      else add(item.prompt, item.art);
    }
  // Older levels practise in sentences: top up with picture names that hold the sound (ปู, ปลา, ปากกา …).
  // Single subjects only: scene names ("ปูในกล่อง") are phrases, not words.
  for (const [art, { name }] of Object.entries(STICKERS)) if (!art.includes("-")) add(name, art);
  // Shorter words first: easier to say and to read.
  return cards.sort((a, b) => a.word.length - b.word.length).slice(0, limit);
}

/**
 * Splits a word into letter clusters (a consonant with its vowel and tone marks) and marks the clusters
 * that hold the practised sound, so the card can colour "ก" in "กล้วย" without breaking Thai marks apart.
 */
export function markSound(word: string, sound: string): { text: string; hit: boolean }[] {
  const Segmenter = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  const parts = Segmenter ? [...new Segmenter("th", { granularity: "grapheme" }).segment(word)].map((s) => s.segment) : [...word];
  const out: { text: string; hit: boolean }[] = [];
  for (const text of parts) {
    const hit = text.includes(sound);
    const last = out[out.length - 1];
    if (last && last.hit === hit) last.text += text;
    else out.push({ text, hit });
  }
  return out;
}
