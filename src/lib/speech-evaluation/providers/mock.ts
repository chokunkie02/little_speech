import type {
  SpeechEvaluationProviderClient,
  SpeechEvaluationInput,
  SpeechEvaluationResult,
} from "../types";
import { mockEvaluate } from "../mockEvaluator";

// Deterministic kindergarten mock: cycles through generous scores suitable for
// kindergarten light evaluation (passingScore 50).
const KINDERGARTEN_MOCK_POOL = [
  { score: 75, status: "passed" as const, feedback: "เก่งมากเลย!" },
  { score: 60, status: "passed" as const, feedback: "ออกเสียงได้ดีมากค่ะ" },
  { score: 52, status: "passed" as const, feedback: "ดีมาก ลองอีกครั้งได้เลย" },
  { score: 40, status: "almost" as const, feedback: "เกือบแล้ว ลองฟังก่อนแล้วพูดตามนะ" },
];
let _kgMockIdx = 0;

function kindergartenMockEvaluate(input: SpeechEvaluationInput): SpeechEvaluationResult {
  const entry = KINDERGARTEN_MOCK_POOL[_kgMockIdx % KINDERGARTEN_MOCK_POOL.length]!;
  _kgMockIdx++;
  return {
    score: entry.score,
    confidence: 0.7,
    status: entry.status,
    feedback: entry.feedback,
    practiceTip: "ลองฟังเสียงตัวอย่างก่อนแล้วพูดตามอีกครั้ง",
    isMock: true,
    provider: "mock",
    createdAt: new Date().toISOString(),
  };
}

export class MockSpeechEvaluationProvider implements SpeechEvaluationProviderClient {
  async evaluate(input: SpeechEvaluationInput): Promise<SpeechEvaluationResult> {
    if (input.trainingMode === "kindergarten_phonics") {
      return kindergartenMockEvaluate(input);
    }
    return mockEvaluate(input);
  }
}
