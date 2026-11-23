import { getStages } from "../curriculum";
import type { Item, Session, Stage } from "../types";

/**
 * Sticker book. Every picture a child has practised becomes one sticker: the answer picture of a
 * listen-and-choose item, the picture of a speaking or real-life item. Stickers reward trying (like the
 * stars), so any saved attempt counts. Nothing new is stored: the book is worked out from the rounds the
 * studio already keeps.
 */
export type StickerPage = "animals" | "food" | "things" | "places";

export const STICKER_PAGES: { id: StickerPage; name: string; icon: string }[] = [
  { id: "animals", name: "สัตว์", icon: "chicken" },
  { id: "food", name: "ของกิน", icon: "banana" },
  { id: "things", name: "ของใช้", icon: "backpack" },
  { id: "places", name: "ผู้คนและสถานที่", icon: "school" },
];

/** Short name and page of each picture (Art kind) that can be a sticker. */
export const STICKERS: Record<string, { name: string; page: StickerPage }> = {
  crab: { name: "ปู", page: "animals" },
  "crab-beach": { name: "ปูที่ทะเล", page: "animals" },
  "crab-box": { name: "ปูในกล่อง", page: "animals" },
  chicken: { name: "ไก่", page: "animals" },
  "chicken-rice": { name: "ไก่กินข้าว", page: "animals" },
  crow: { name: "กา", page: "animals" },
  "crow-tree": { name: "กาบนต้นไม้", page: "animals" },
  "crow-box": { name: "กาในกล่อง", page: "animals" },
  horse: { name: "ม้า", page: "animals" },
  "horse-garden": { name: "ม้าในสวน", page: "animals" },
  "horse-box": { name: "ม้ากับกล่อง", page: "animals" },
  cat: { name: "แมว", page: "animals" },
  "cat-fish": { name: "แมวกับปลา", page: "animals" },
  fish: { name: "ปลา", page: "animals" },
  shrimp: { name: "กุ้ง", page: "animals" },
  snake: { name: "งู", page: "animals" },
  banana: { name: "กล้วย", page: "food" },
  coconut: { name: "มะพร้าว", page: "food" },
  mangosteen: { name: "มังคุด", page: "food" },
  rice: { name: "ข้าว", page: "food" },
  cup: { name: "แก้วน้ำ", page: "food" },
  backpack: { name: "กระเป๋า", page: "things" },
  clock: { name: "นาฬิกา", page: "things" },
  pen: { name: "ปากกา", page: "things" },
  umbrella: { name: "ร่ม", page: "things" },
  ball: { name: "ลูกบอล", page: "things" },
  box: { name: "กล่อง", page: "things" },
  hand: { name: "มือ", page: "things" },
  eye: { name: "ตา", page: "things" },
  school: { name: "โรงเรียน", page: "places" },
  market: { name: "ตลาด", page: "places" },
  garden: { name: "สวน", page: "places" },
  tree: { name: "ต้นไม้", page: "places" },
  aunt: { name: "คุณป้า", page: "places" },
};

/** The sticker an item gives, or null when its picture is not a sticker (letters, mouth shapes, rhythm). */
export function stickerFor(item: Item): string | null {
  const art = item.kind === "choice" ? item.choices?.find((c) => c.id === item.answer)?.art : item.art;
  return art && STICKERS[art] ? art : null;
}

/** Stickers that can be collected with this plan's stages (the book shows these, plus any already owned). */
export function stickerCatalog(stages: Stage[]): string[] {
  const kinds = new Set<string>();
  for (const stage of stages) for (const item of stage.items) {
    const kind = stickerFor(item);
    if (kind) kinds.add(kind);
  }
  return [...kinds];
}

/** The first stage that gives a sticker, so a locked sticker can say where to find it. */
export function stickerSource(stages: Stage[], kind: string): Stage | undefined {
  return stages.find((stage) => stage.items.some((item) => stickerFor(item) === kind));
}

/** Looks an attempt's item up in the curriculum the round was played with. */
function itemFinder() {
  const cache = new Map<string, Map<string, Item>>();
  return (session: Session, itemId: string) => {
    const key = `${session.track}|${session.sound}|${session.level ?? ""}`;
    let items = cache.get(key);
    if (!items) {
      items = new Map(getStages(session.track, session.sound, session.level).flatMap((s) => s.items.map((i) => [i.id, i] as const)));
      cache.set(key, items);
    }
    return items.get(itemId);
  };
}

export interface StickerBook {
  /** Sticker kind → the round in which it was first earned. */
  owned: Map<string, { sessionId: string; at: string }>;
  /** Stickers first earned in each round (round id → kinds), for the round-end moment. */
  newIn: Map<string, string[]>;
}

/** Works out the child's sticker book from their rounds (any status; every saved attempt counts). */
export function stickerBook(sessions: Session[], childId: string): StickerBook {
  const find = itemFinder();
  const owned = new Map<string, { sessionId: string; at: string }>();
  for (const session of sessions) {
    if (session.childId !== childId) continue;
    for (const attempt of session.attempts) {
      const item = find(session, attempt.itemId);
      const kind = item && stickerFor(item);
      if (!kind) continue;
      const seen = owned.get(kind);
      if (!seen || attempt.createdAt < seen.at) owned.set(kind, { sessionId: session.id, at: attempt.createdAt });
    }
  }
  const newIn = new Map<string, string[]>();
  for (const [kind, { sessionId }] of owned) newIn.set(sessionId, [...(newIn.get(sessionId) ?? []), kind]);
  return { owned, newIn };
}

/** Stickers an item set gives, in order and without repeats (for the round-end moment). */
export function stickersOfRound(session: Session): string[] {
  const find = itemFinder();
  const kinds: string[] = [];
  for (const attempt of session.attempts) {
    const item = find(session, attempt.itemId);
    const kind = item && stickerFor(item);
    if (kind && !kinds.includes(kind)) kinds.push(kind);
  }
  return kinds;
}
