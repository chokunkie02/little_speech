/**
 * Evaluation rubric for Kindergarten Phonics Mode.
 *
 * Light evaluation: lower passing threshold, no clinical/therapy wording.
 * Kept separate from targetSoundRubric.ts which is used by Speech Clarity mode.
 */

import type { PhonicsEvaluationRubric, PhonicsEvaluationMode } from "@/types/phonics";

/** Rubric applied when evaluationMode = "light". */
export const PHONICS_LIGHT_RUBRIC: PhonicsEvaluationRubric = {
  passingScore: 50,
  evaluationMode: "light",
  childFriendlyFeedback: {
    passed: [
      "เก่งมากเลย!",
      "ออกเสียงได้ดีมากค่ะ",
      "เยี่ยมไปเลย!",
      "ทำได้ดีมากๆ เลย!",
    ],
    almost: [
      "เกือบแล้ว ลองอีกครั้งนะ",
      "ดีมากเลย แต่ลองฟังอีกทีแล้วพูดตาม",
      "ใกล้แล้วค่ะ ลองใหม่ได้เลย",
    ],
    retry: [
      "ลองฟังเสียงตัวอย่างก่อนแล้วพูดตามนะ",
      "ไม่เป็นไรค่ะ ลองอีกครั้งได้เลย",
      "ค่อยๆ ฝึกนะคะ ทำได้แน่นอน",
    ],
  },
  scoringNote:
    "Kindergarten phonics light evaluation. " +
    "Be generous: a child approximating the sound should score at least 50. " +
    "Focus on whether the target phoneme was produced, not accent or tone. " +
    "Do not penalise background noise or child voice quality. " +
    "No clinical diagnostic language — keep feedback encouraging.",
};

/** Rubric applied when evaluationMode = "none" (e.g. listen_and_choose tap activities). */
export const PHONICS_NONE_RUBRIC: PhonicsEvaluationRubric = {
  passingScore: 100, // auto-pass — scoring handled client-side by correctAnswer check
  evaluationMode: "none",
  childFriendlyFeedback: {
    passed: ["ถูกต้องเลย!", "เก่งมากๆ!", "ใช่เลย!"],
    almost: [],
    retry: ["ลองใหม่อีกครั้งนะ", "ไม่เป็นไรค่ะ ลองดูอีกที"],
  },
  scoringNote: "",
};

export function getPhonicsRubric(mode: PhonicsEvaluationMode): PhonicsEvaluationRubric {
  return mode === "none" ? PHONICS_NONE_RUBRIC : PHONICS_LIGHT_RUBRIC;
}
