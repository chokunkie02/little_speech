import { z } from "zod";

export const STAGE_DEFINITIONS = [
  { id: "listen", label: "ฟังแยกเสียง", track: "speech", automatic: false },
  { id: "imitate", label: "ดูปากและพูดตาม", track: "speech", automatic: true },
  { id: "syllables", label: "ฝึกพยางค์", track: "speech", automatic: true },
  { id: "words", label: "ฝึกคำ", track: "speech", automatic: true },
  { id: "sentences", label: "วลีและประโยค", track: "speech", automatic: true },
  { id: "transfer", label: "ลองใช้จริง", track: "speech", automatic: false },
  {
    id: "understand",
    label: "เข้าใจคำจากภาพ",
    track: "communication",
    automatic: false,
  },
  {
    id: "request",
    label: "บอกความต้องการ",
    track: "communication",
    automatic: false,
  },
  {
    id: "story",
    label: "เล่าเรื่องและสนทนา",
    track: "communication",
    automatic: false,
  },
  {
    id: "letter",
    label: "เสียงกับตัวอักษร",
    track: "phonics",
    automatic: false,
  },
  { id: "blend", label: "ผสมพยางค์และคำ", track: "phonics", automatic: true },
  { id: "read", label: "อ่านคำและประโยค", track: "phonics", automatic: true },
] as const;

const ruleSchema = z
  .object({
    stageId: z.string(),
    mode: z.enum(["azure", "adult"]),
    passScore: z.number().int().min(1).max(100),
    practiceScore: z.number().int().min(0).max(99),
    minCompleteness: z.number().int().min(0).max(100),
  })
  .strict()
  .refine((rule) => rule.practiceScore < rule.passScore, {
    message: "เกณฑ์ฝึกต่อจะต้องน้อยกว่าเกณฑ์ทำได้ตามเป้าหมาย",
  });

export const policySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    enabled: z.boolean(),
    minConfidence: z.number().min(0).max(1),
    minDurationMs: z.number().int().min(200).max(5000),
    maxDurationMs: z.number().int().min(5000).max(30000),
    rules: z.array(ruleSchema).length(STAGE_DEFINITIONS.length),
  })
  .strict()
  .superRefine((policy, context) => {
    for (const stage of STAGE_DEFINITIONS) {
      const matches = policy.rules.filter((rule) => rule.stageId === stage.id);
      if (
        matches.length !== 1 ||
        (!stage.automatic && matches[0].mode !== "adult")
      ) {
        context.addIssue({
          code: "custom",
          message: `ตรวจวิธีประเมินของขั้น ${stage.label}`,
        });
      }
    }
  });

export type AssessmentPolicy = z.infer<typeof policySchema>;
export type AssessmentRule = AssessmentPolicy["rules"][number];
export interface PolicySnapshot {
  id: string;
  version: number;
  config: AssessmentPolicy;
  published_at: string;
}
export type Outcome =
  | "achieved"
  | "practice"
  | "retry"
  | "needs_review"
  | "unavailable";
export interface AssessmentResult {
  id: string;
  source: "azure" | "rules" | "adult" | "unavailable";
  outcome: Outcome;
  policyVersion: number;
  feedback: string;
  reason?: string;
  score?: number;
  accuracy?: number;
  completeness?: number;
  fluency?: number;
  confidence?: number;
  transcript?: string;
  createdAt: string;
}
export const OUTCOME_LABELS: Record<Outcome, string> = {
  achieved: "ทำได้ตามเกณฑ์ต้นแบบ",
  practice: "ฝึกต่ออีกนิด",
  retry: "ลองฟังแล้วพูดอีกครั้ง",
  needs_review: "รอผู้ใหญ่ช่วยตรวจ",
  unavailable: "ยังประเมินไม่ได้",
};
export const DEFAULT_POLICY: AssessmentPolicy = {
  name: "เกณฑ์ทดลองสำหรับการนำเสนอ",
  enabled: false,
  minConfidence: 0.6,
  minDurationMs: 350,
  maxDurationMs: 30000,
  rules: STAGE_DEFINITIONS.map((stage) => ({
    stageId: stage.id,
    mode: stage.automatic ? "azure" : "adult",
    passScore: 75,
    practiceScore: 55,
    minCompleteness: 70,
  })),
};

export interface SpeechScores {
  score: number;
  accuracy: number;
  completeness: number;
  confidence: number;
  fluency?: number;
  transcript?: string;
}

/** Provider scores are suggestions under a versioned POC rubric, never adult reviews. */
export function judgeSpeech(
  scores: SpeechScores,
  rule: AssessmentRule,
  minConfidence: number,
) {
  if (scores.confidence < minConfidence) {
    return {
      outcome: "needs_review" as const,
      feedback: "เสียงรอบนี้ยังไม่มั่นใจ ให้ผู้ใหญ่ช่วยฟังด้วยกันนะ",
    };
  }
  if (
    scores.score >= rule.passScore &&
    scores.accuracy >= rule.passScore &&
    scores.completeness >= rule.minCompleteness
  ) {
    return {
      outcome: "achieved" as const,
      feedback: "ทำได้ตามเกณฑ์รอบนี้แล้ว เก่งมากที่ลองพูดนะ",
    };
  }
  if (scores.score >= rule.practiceScore) {
    return {
      outcome: "practice" as const,
      feedback: "ลองฟังตัวอย่าง แล้วค่อย ๆ พูดอีกครั้งด้วยกันนะ",
    };
  }
  return {
    outcome: "retry" as const,
    feedback: "เราลองใหม่ได้ ฟังตัวอย่างแล้วพูดใกล้ไมค์อีกครั้งนะ",
  };
}
