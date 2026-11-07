/**
 * Kindergarten Phonics Mode curriculum configuration.
 *
 * 7 units (K1–K7) covering the foundational Thai phonics sequence:
 *   K1 ฟังและจดจำเสียง → K2 พยัญชนะต้น → K3 สระ → K4 ผสมเสียง
 *   → K5 คำง่าย → K6 ตัวสะกด → K7 ประโยคสั้น
 *
 * Each unit contains lessons; each lesson contains PhonicsPracticeItems.
 * This file is pure data — no React, no storage.
 *
 * Evaluation modes:
 *   K1 listen_and_choose → "none"  (client-side tap scoring)
 *   K2–K7 production activities → "light"
 */

import type { PhonicsUnit, PhonicsLesson, PhonicsPracticeItem } from "@/types/phonics";

// ── Accent colour shared across the Kindergarten theme (amber/orange) ─────────
const K_COLOR = "#F59E0B"; // Tailwind amber-500

// ── K1: ฟังและจดจำเสียง ───────────────────────────────────────────────────────

const K1_LESSONS: PhonicsLesson[] = [
  {
    id: "K1-L1",
    unitId: "K1",
    order: 1,
    title: "เสียงพยัญชนะ ก ค ต ช",
    subtitle: "ฟังแล้วเลือกตัวอักษรที่ได้ยิน",
    items: [
      {
        id: "K1-L1-I1",
        type: "listen_and_choose",
        prompt: "ก",
        sampleAudioText: "กอ",
        instruction: "ฟังเสียง แล้วแตะตัวอักษรที่ได้ยิน",
        emoji: "🐔",
        choices: ["ก", "ค", "ต", "ช"],
        correctAnswer: "ก",
        evaluationMode: "none",
      },
      {
        id: "K1-L1-I2",
        type: "listen_and_choose",
        prompt: "ค",
        sampleAudioText: "คอ",
        instruction: "ฟังเสียง แล้วแตะตัวอักษรที่ได้ยิน",
        emoji: "🐃",
        choices: ["ก", "ค", "ต", "ช"],
        correctAnswer: "ค",
        evaluationMode: "none",
      },
      {
        id: "K1-L1-I3",
        type: "listen_and_choose",
        prompt: "ต",
        sampleAudioText: "ตอ",
        instruction: "ฟังเสียง แล้วแตะตัวอักษรที่ได้ยิน",
        emoji: "🐢",
        choices: ["ก", "ค", "ต", "ช"],
        correctAnswer: "ต",
        evaluationMode: "none",
      },
      {
        id: "K1-L1-I4",
        type: "listen_and_choose",
        prompt: "ช",
        sampleAudioText: "ชอ",
        instruction: "ฟังเสียง แล้วแตะตัวอักษรที่ได้ยิน",
        emoji: "🐘",
        choices: ["ก", "ค", "ต", "ช"],
        correctAnswer: "ช",
        evaluationMode: "none",
      },
    ],
  },
];

// ── K2: พยัญชนะต้น ────────────────────────────────────────────────────────────

const K2_LESSONS: PhonicsLesson[] = [
  {
    id: "K2-L1",
    unitId: "K2",
    order: 1,
    title: "ออกเสียง กอ ไก่",
    items: [
      {
        id: "K2-L1-I1",
        type: "say_after_me",
        prompt: "ก",
        sampleAudioText: "กอ",
        instruction: "ฟังแล้วพูดตาม: กอ",
        emoji: "🐔",
        evaluationMode: "light",
      },
      {
        id: "K2-L1-I2",
        type: "say_after_me",
        prompt: "กา",
        sampleAudioText: "กา",
        instruction: "ฟังแล้วพูดตาม: กา",
        emoji: "🐦",
        evaluationMode: "light",
      },
    ],
  },
  {
    id: "K2-L2",
    unitId: "K2",
    order: 2,
    title: "ออกเสียง คอ ควาย",
    items: [
      {
        id: "K2-L2-I1",
        type: "say_after_me",
        prompt: "ค",
        sampleAudioText: "คอ",
        instruction: "ฟังแล้วพูดตาม: คอ",
        emoji: "🐃",
        evaluationMode: "light",
      },
      {
        id: "K2-L2-I2",
        type: "say_after_me",
        prompt: "คา",
        sampleAudioText: "คา",
        instruction: "ฟังแล้วพูดตาม: คา",
        emoji: "⛏️",
        evaluationMode: "light",
      },
    ],
  },
  {
    id: "K2-L3",
    unitId: "K2",
    order: 3,
    title: "ออกเสียง ตอ เต่า",
    items: [
      {
        id: "K2-L3-I1",
        type: "say_after_me",
        prompt: "ต",
        sampleAudioText: "ตอ",
        instruction: "ฟังแล้วพูดตาม: ตอ",
        emoji: "🐢",
        evaluationMode: "light",
      },
      {
        id: "K2-L3-I2",
        type: "say_after_me",
        prompt: "ตา",
        sampleAudioText: "ตา",
        instruction: "ฟังแล้วพูดตาม: ตา",
        emoji: "👁️",
        evaluationMode: "light",
      },
    ],
  },
  {
    id: "K2-L4",
    unitId: "K2",
    order: 4,
    title: "ออกเสียง ชอ ช้าง",
    items: [
      {
        id: "K2-L4-I1",
        type: "say_after_me",
        prompt: "ช",
        sampleAudioText: "ชอ",
        instruction: "ฟังแล้วพูดตาม: ชอ",
        emoji: "🐘",
        evaluationMode: "light",
      },
      {
        id: "K2-L4-I2",
        type: "say_after_me",
        prompt: "ชา",
        sampleAudioText: "ชา",
        instruction: "ฟังแล้วพูดตาม: ชา",
        emoji: "🍵",
        evaluationMode: "light",
      },
    ],
  },
];

// ── K3: สระ ───────────────────────────────────────────────────────────────────

const K3_LESSONS: PhonicsLesson[] = [
  {
    id: "K3-L1",
    unitId: "K3",
    order: 1,
    title: "สระ อา",
    items: [
      {
        id: "K3-L1-I1",
        type: "say_after_me",
        prompt: "อา",
        sampleAudioText: "อา",
        instruction: "ฟังแล้วพูดตาม: อา",
        emoji: "👄",
        evaluationMode: "light",
      },
    ],
  },
  {
    id: "K3-L2",
    unitId: "K3",
    order: 2,
    title: "สระ อิ อี",
    items: [
      {
        id: "K3-L2-I1",
        type: "say_after_me",
        prompt: "อิ",
        sampleAudioText: "อิ",
        instruction: "ฟังแล้วพูดตาม: อิ",
        emoji: "😁",
        evaluationMode: "light",
      },
      {
        id: "K3-L2-I2",
        type: "say_after_me",
        prompt: "อี",
        sampleAudioText: "อี",
        instruction: "ฟังแล้วพูดตาม: อี",
        emoji: "😄",
        evaluationMode: "light",
      },
    ],
  },
  {
    id: "K3-L3",
    unitId: "K3",
    order: 3,
    title: "สระ อุ อู",
    items: [
      {
        id: "K3-L3-I1",
        type: "say_after_me",
        prompt: "อุ",
        sampleAudioText: "อุ",
        instruction: "ฟังแล้วพูดตาม: อุ",
        emoji: "🫦",
        evaluationMode: "light",
      },
      {
        id: "K3-L3-I2",
        type: "say_after_me",
        prompt: "อู",
        sampleAudioText: "อู",
        instruction: "ฟังแล้วพูดตาม: อู",
        emoji: "🦉",
        evaluationMode: "light",
      },
    ],
  },
];

// ── K4: ผสมเสียง ──────────────────────────────────────────────────────────────

const K4_LESSONS: PhonicsLesson[] = [
  {
    id: "K4-L1",
    unitId: "K4",
    order: 1,
    title: "ก + อา = กา",
    subtitle: "ออกเสียงพยางค์จากการผสม",
    items: [
      {
        id: "K4-L1-I1",
        type: "blend_sounds",
        prompt: "กา",
        sampleAudioText: "กา",
        instruction: "ก + อา = กา  ลองพูดดูนะ",
        emoji: "🐦",
        evaluationMode: "light",
      },
      {
        id: "K4-L1-I2",
        type: "blend_sounds",
        prompt: "ตา",
        sampleAudioText: "ตา",
        instruction: "ต + อา = ตา  ลองพูดดูนะ",
        emoji: "👁️",
        evaluationMode: "light",
      },
      {
        id: "K4-L1-I3",
        type: "blend_sounds",
        prompt: "ชา",
        sampleAudioText: "ชา",
        instruction: "ช + อา = ชา  ลองพูดดูนะ",
        emoji: "🍵",
        evaluationMode: "light",
      },
      {
        id: "K4-L1-I4",
        type: "blend_sounds",
        prompt: "มา",
        sampleAudioText: "มา",
        instruction: "ม + อา = มา  ลองพูดดูนะ",
        emoji: "🙋",
        evaluationMode: "light",
      },
    ],
  },
];

// ── K5: คำง่าย ────────────────────────────────────────────────────────────────

const K5_LESSONS: PhonicsLesson[] = [
  {
    id: "K5-L1",
    unitId: "K5",
    order: 1,
    title: "คำง่าย: กา ตา มา",
    items: [
      {
        id: "K5-L1-I1",
        type: "simple_word",
        prompt: "กา",
        sampleAudioText: "กา",
        instruction: "พูดคำนี้ให้ชัด: กา",
        emoji: "🐦",
        evaluationMode: "light",
      },
      {
        id: "K5-L1-I2",
        type: "simple_word",
        prompt: "ตา",
        sampleAudioText: "ตา",
        instruction: "พูดคำนี้ให้ชัด: ตา",
        emoji: "👁️",
        evaluationMode: "light",
      },
      {
        id: "K5-L1-I3",
        type: "simple_word",
        prompt: "มา",
        sampleAudioText: "มา",
        instruction: "พูดคำนี้ให้ชัด: มา",
        emoji: "🙋",
        evaluationMode: "light",
      },
      {
        id: "K5-L1-I4",
        type: "simple_word",
        prompt: "ชา",
        sampleAudioText: "ชา",
        instruction: "พูดคำนี้ให้ชัด: ชา",
        emoji: "🍵",
        evaluationMode: "light",
      },
      {
        id: "K5-L1-I5",
        type: "simple_word",
        prompt: "ปู",
        sampleAudioText: "ปู",
        instruction: "พูดคำนี้ให้ชัด: ปู",
        emoji: "🦀",
        evaluationMode: "light",
      },
      {
        id: "K5-L1-I6",
        type: "simple_word",
        prompt: "ดู",
        sampleAudioText: "ดู",
        instruction: "พูดคำนี้ให้ชัด: ดู",
        emoji: "👀",
        evaluationMode: "light",
      },
    ],
  },
];

// ── K6: ตัวสะกด ───────────────────────────────────────────────────────────────

const K6_LESSONS: PhonicsLesson[] = [
  {
    id: "K6-L1",
    unitId: "K6",
    order: 1,
    title: "ตัวสะกด น ง ด",
    subtitle: "สังเกตความต่างระหว่างคำ",
    items: [
      {
        id: "K6-L1-I1",
        type: "final_consonant",
        prompt: "กาน",
        sampleAudioText: "กาน",
        instruction: "ฟังและพูดตาม: กาน (ตัวสะกด น)",
        emoji: "🥕",
        evaluationMode: "light",
      },
      {
        id: "K6-L1-I2",
        type: "final_consonant",
        prompt: "กาง",
        sampleAudioText: "กาง",
        instruction: "ฟังและพูดตาม: กาง (ตัวสะกด ง)",
        emoji: "🧲",
        evaluationMode: "light",
      },
      {
        id: "K6-L1-I3",
        type: "final_consonant",
        prompt: "กาด",
        sampleAudioText: "กาด",
        instruction: "ฟังและพูดตาม: กาด (ตัวสะกด ด)",
        emoji: "📍",
        evaluationMode: "light",
      },
    ],
  },
];

// ── K7: ประโยคสั้น ────────────────────────────────────────────────────────────

const K7_LESSONS: PhonicsLesson[] = [
  {
    id: "K7-L1",
    unitId: "K7",
    order: 1,
    title: "ประโยคสั้น",
    subtitle: "พูดประโยคให้ชัดและครบ",
    items: [
      {
        id: "K7-L1-I1",
        type: "short_sentence",
        prompt: "กาบินไป",
        sampleAudioText: "กา บิน ไป",
        instruction: "พูดประโยคนี้: กาบินไป",
        emoji: "🐦",
        evaluationMode: "light",
      },
      {
        id: "K7-L1-I2",
        type: "short_sentence",
        prompt: "ตามองดาว",
        sampleAudioText: "ตา มอง ดาว",
        instruction: "พูดประโยคนี้: ตามองดาว",
        emoji: "⭐",
        evaluationMode: "light",
      },
      {
        id: "K7-L1-I3",
        type: "short_sentence",
        prompt: "แมวกินปลา",
        sampleAudioText: "แมว กิน ปลา",
        instruction: "พูดประโยคนี้: แมวกินปลา",
        emoji: "🐱",
        evaluationMode: "light",
      },
      {
        id: "K7-L1-I4",
        type: "short_sentence",
        prompt: "ช้างตัวโต",
        sampleAudioText: "ช้าง ตัว โต",
        instruction: "พูดประโยคนี้: ช้างตัวโต",
        emoji: "🐘",
        evaluationMode: "light",
      },
    ],
  },
];

// ── Unit registry ─────────────────────────────────────────────────────────────

export const KINDERGARTEN_UNITS: PhonicsUnit[] = [
  {
    id: "K1",
    order: 1,
    title: "ฟังและจดจำเสียง",
    description: "ฝึกฟังเสียงพยัญชนะและเลือกตัวอักษรที่ถูกต้อง",
    icon: "listen",
    accentColor: K_COLOR,
    lessons: K1_LESSONS,
  },
  {
    id: "K2",
    order: 2,
    title: "พยัญชนะต้น",
    description: "ออกเสียงพยัญชนะต้น ก ค ต ช ให้ชัดเจน",
    icon: "letters",
    accentColor: K_COLOR,
    lessons: K2_LESSONS,
  },
  {
    id: "K3",
    order: 3,
    title: "สระ",
    description: "เรียนสระพื้นฐาน อา อิ อี อุ อู",
    icon: "music",
    accentColor: K_COLOR,
    lessons: K3_LESSONS,
  },
  {
    id: "K4",
    order: 4,
    title: "ผสมเสียง",
    description: "ผสมพยัญชนะต้นกับสระเป็นพยางค์",
    icon: "link",
    accentColor: K_COLOR,
    lessons: K4_LESSONS,
  },
  {
    id: "K5",
    order: 5,
    title: "คำง่าย",
    description: "ออกเสียงคำสั้นๆ ที่พบบ่อยในชีวิตประจำวัน",
    icon: "edit",
    accentColor: K_COLOR,
    lessons: K5_LESSONS,
  },
  {
    id: "K6",
    order: 6,
    title: "ตัวสะกด",
    description: "เรียนรู้ตัวสะกดและความต่างของเสียงปิดท้าย",
    icon: "end",
    accentColor: K_COLOR,
    lessons: K6_LESSONS,
  },
  {
    id: "K7",
    order: 7,
    title: "ประโยคสั้น",
    description: "พูดประโยคสั้นๆ ให้ชัดเจนและต่อเนื่อง",
    icon: "chat",
    accentColor: K_COLOR,
    lessons: K7_LESSONS,
  },
];

// ── Helper functions ──────────────────────────────────────────────────────────

export function getPhonicsUnits(): PhonicsUnit[] {
  return KINDERGARTEN_UNITS;
}

export function getPhonicsUnit(unitId: string): PhonicsUnit | undefined {
  return KINDERGARTEN_UNITS.find((u) => u.id === unitId);
}

export function getPhonicsLesson(unitId: string, lessonId: string): PhonicsLesson | undefined {
  return getPhonicsUnit(unitId)?.lessons.find((l) => l.id === lessonId);
}

export function getFirstPhonicsLesson(): { unit: PhonicsUnit; lesson: PhonicsLesson } | undefined {
  const unit = KINDERGARTEN_UNITS[0];
  if (!unit) return undefined;
  const lesson = unit.lessons[0];
  if (!lesson) return undefined;
  return { unit, lesson };
}

export function getNextPhonicsLesson(
  unitId: string,
  lessonId: string,
): { unit: PhonicsUnit; lesson: PhonicsLesson } | undefined {
  const unitIdx = KINDERGARTEN_UNITS.findIndex((u) => u.id === unitId);
  if (unitIdx === -1) return undefined;
  const unit = KINDERGARTEN_UNITS[unitIdx]!;
  const lessonIdx = unit.lessons.findIndex((l) => l.id === lessonId);

  // Try next lesson in the same unit
  const nextLesson = unit.lessons[lessonIdx + 1];
  if (nextLesson) return { unit, lesson: nextLesson };

  // Advance to the first lesson of the next unit
  const nextUnit = KINDERGARTEN_UNITS[unitIdx + 1];
  if (!nextUnit) return undefined;
  const firstLesson = nextUnit.lessons[0];
  if (!firstLesson) return undefined;
  return { unit: nextUnit, lesson: firstLesson };
}

export function getPhonicsItem(
  unitId: string,
  lessonId: string,
  itemId: string,
): PhonicsPracticeItem | undefined {
  return getPhonicsLesson(unitId, lessonId)?.items.find((i) => i.id === itemId);
}
