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

/** [min, max] a school may choose for one score. */
const rangeSchema = z
  .tuple([z.number().int().min(0).max(100), z.number().int().min(0).max(100)])
  .refine(([min, max]) => min <= max, { message: "ค่าต่ำสุดของกรอบต้องไม่มากกว่าค่าสูงสุด" });

/**
 * What a school admin may change for one stage. `locked` keeps the central method; `choice` lets the
 * school pick AI or adult review. Scores may move only inside their ranges.
 */
const schoolFrameSchema = z
  .object({
    mode: z.enum(["locked", "choice"]),
    passScore: rangeSchema,
    practiceScore: rangeSchema,
    minCompleteness: rangeSchema,
  })
  .strict();
export type SchoolFrame = z.infer<typeof schoolFrameSchema>;
export type ScoreKey = "passScore" | "practiceScore" | "minCompleteness";
export const SCORE_KEYS: ScoreKey[] = ["passScore", "practiceScore", "minCompleteness"];
export const SCORE_LABELS: Record<ScoreKey, string> = {
  passScore: "ทำได้",
  practiceScore: "ฝึกต่อ",
  minCompleteness: "ความครบ",
};

const ruleSchema = z
  .object({
    stageId: z.string(),
    mode: z.enum(["azure", "adult"]),
    passScore: z.number().int().min(1).max(100),
    practiceScore: z.number().int().min(0).max(99),
    minCompleteness: z.number().int().min(0).max(100),
    /** Absent in policies published before school criteria existed: DEFAULT_SCHOOL_FRAME applies. */
    school: schoolFrameSchema.optional(),
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
    /** Schools may switch AI on for themselves (only while `enabled` is on). Absent = not allowed. */
    allowSchoolAi: z.boolean().optional(),
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
        continue;
      }
      const frame = matches[0].school;
      if (!frame) continue;
      if (!stage.automatic && frame.mode !== "locked") {
        context.addIssue({ code: "custom", message: `ขั้น ${stage.label} ต้องให้ผู้ใหญ่ตรวจเสมอ โรงเรียนเลือกวิธีตรวจไม่ได้` });
      }
      for (const key of SCORE_KEYS) {
        const [min, max] = frame[key];
        const value = matches[0][key];
        if (value < min || value > max) {
          context.addIssue({
            code: "custom",
            message: `ค่ากลาง "${SCORE_LABELS[key]}" ของขั้น ${stage.label} (${value}) ต้องอยู่ในกรอบ ${min}–${max}`,
          });
        }
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
  /** Name of the service that checks speech (for consent text); added by GET /api/assessment/policy. */
  providerLabel?: string;
}
export type Outcome =
  | "achieved"
  | "practice"
  | "retry"
  | "needs_review"
  | "unavailable";
/** Results scored by a speech service ("azure" results predate the switch to OpenAI). */
export type AiSource = "azure" | "openai";
export const AI_SOURCE_LABELS: Record<AiSource, string> = { azure: "Azure Speech", openai: "OpenAI" };
export const isAiSource = (source: AssessmentResult["source"]): source is AiSource =>
  source === "azure" || source === "openai";
export interface AssessmentResult {
  id: string;
  source: AiSource | "rules" | "adult" | "unavailable";
  outcome: Outcome;
  policyVersion: number;
  /** Revision of the school criteria used, when the child belongs to a school that saved some. */
  schoolRevision?: number;
  /** The rule actually applied (central or school), kept so old results stay explainable. */
  rule?: Pick<AssessmentRule, "mode" | "passScore" | "practiceScore" | "minCompleteness">;
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
/** Frame used for a stage whose rule has none (policies published before school criteria). */
export function defaultSchoolFrame(stageId: string): SchoolFrame {
  const automatic = STAGE_DEFINITIONS.find((stage) => stage.id === stageId)?.automatic ?? false;
  return {
    mode: automatic ? "choice" : "locked",
    passScore: [60, 90],
    practiceScore: [40, 80],
    minCompleteness: [50, 90],
  };
}
export const frameOf = (rule: AssessmentRule): SchoolFrame => rule.school ?? defaultSchoolFrame(rule.stageId);

export const DEFAULT_POLICY: AssessmentPolicy = {
  name: "เกณฑ์ทดลองสำหรับการนำเสนอ",
  enabled: false,
  minConfidence: 0.6,
  minDurationMs: 350,
  maxDurationMs: 30000,
  allowSchoolAi: false,
  rules: STAGE_DEFINITIONS.map((stage) => ({
    stageId: stage.id,
    mode: stage.automatic ? "azure" : "adult",
    passScore: 75,
    practiceScore: 55,
    minCompleteness: 70,
    school: defaultSchoolFrame(stage.id),
  })),
};

// ── School criteria ─────────────────────────────────────────────────────────
// A school stores only what differs from the central rule. The effective rule is the central rule,
// overlaid with the school's values and clamped into the current frame, so a narrower frame published
// later never lets an old school value escape it.

const overrideSchema = z
  .object({
    stageId: z.string().max(50),
    mode: z.enum(["azure", "adult"]).optional(),
    passScore: z.number().int().min(0).max(100).optional(),
    practiceScore: z.number().int().min(0).max(100).optional(),
    minCompleteness: z.number().int().min(0).max(100).optional(),
  })
  .strict();
export type SchoolOverride = z.infer<typeof overrideSchema>;

export const REVIEWER_OPTIONS = {
  teacher: "ครูยืนยันผลเท่านั้น",
  teacher_guardian: "ครูหรือผู้ปกครองยืนยันผลได้",
} as const;

export const schoolSettingsSchema = z
  .object({
    aiEnabled: z.boolean(),
    reviewers: z.enum(["teacher", "teacher_guardian"]),
    overrides: z.array(overrideSchema).max(STAGE_DEFINITIONS.length),
  })
  .strict();
export type SchoolSettings = z.infer<typeof schoolSettingsSchema>;
export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = { aiEnabled: false, reviewers: "teacher", overrides: [] };

const clamp = (value: number, [min, max]: [number, number]) => Math.min(max, Math.max(min, value));

/** Problems that stop a school from saving these settings under the central policy (empty = valid). */
export function validateSchoolSettings(settings: SchoolSettings, policy: AssessmentPolicy): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  if (settings.aiEnabled && !(policy.enabled && policy.allowSchoolAi))
    issues.push("แอดมินระบบยังไม่อนุญาตให้โรงเรียนเปิดการประเมินเสียงด้วย AI");
  for (const override of settings.overrides) {
    const stage = STAGE_DEFINITIONS.find((stage) => stage.id === override.stageId);
    const rule = policy.rules.find((rule) => rule.stageId === override.stageId);
    if (!stage || !rule) {
      issues.push("ไม่พบขั้นที่ปรับในเกณฑ์กลาง");
      continue;
    }
    if (seen.has(stage.id)) issues.push(`ขั้น ${stage.label} ถูกปรับซ้ำ`);
    seen.add(stage.id);
    const frame = frameOf(rule);
    if (override.mode && override.mode !== rule.mode && (frame.mode === "locked" || !stage.automatic))
      issues.push(`ขั้น ${stage.label} ล็อกวิธีตรวจไว้ เปลี่ยนไม่ได้`);
    for (const key of SCORE_KEYS) {
      const value = override[key];
      if (value === undefined) continue;
      const [min, max] = frame[key];
      if (value < min || value > max)
        issues.push(`"${SCORE_LABELS[key]}" ของขั้น ${stage.label} ต้องอยู่ระหว่าง ${min}–${max}`);
    }
    const pass = override.passScore ?? rule.passScore;
    const practice = override.practiceScore ?? rule.practiceScore;
    if (practice >= pass) issues.push(`ขั้น ${stage.label}: เกณฑ์ฝึกต่อต้องน้อยกว่าเกณฑ์ทำได้`);
  }
  return issues;
}

/** One central rule with the school's values applied and clamped into the frame. */
export function effectiveRule(rule: AssessmentRule, override?: SchoolOverride) {
  const frame = frameOf(rule);
  const stage = STAGE_DEFINITIONS.find((stage) => stage.id === rule.stageId);
  const canChoose = frame.mode === "choice" && !!stage?.automatic;
  const next: AssessmentRule = { ...rule };
  let clamped = false;
  if (override?.mode && canChoose) next.mode = override.mode;
  for (const key of SCORE_KEYS) {
    const wanted = override?.[key];
    if (wanted === undefined) continue;
    next[key] = clamp(wanted, frame[key]);
    if (next[key] !== wanted) clamped = true;
  }
  if (next.practiceScore >= next.passScore) {
    next.practiceScore = Math.max(0, next.passScore - 1);
    clamped = true;
  }
  return { rule: next, clamped };
}

/**
 * The policy a child is judged by. Families outside a school use the central policy as is. School
 * children use the school's overrides, and AI runs only when the platform enabled it, allows schools
 * to use it, and this school switched it on.
 */
export function effectivePolicy(policy: AssessmentPolicy, school?: SchoolSettings | null) {
  if (school === undefined) return { config: policy, clampedStages: [] as string[] };
  const settings = school ?? DEFAULT_SCHOOL_SETTINGS;
  const clampedStages: string[] = [];
  const rules = policy.rules.map((rule) => {
    const result = effectiveRule(rule, settings.overrides.find((override) => override.stageId === rule.stageId));
    if (result.clamped) clampedStages.push(rule.stageId);
    return result.rule;
  });
  return {
    config: { ...policy, rules, enabled: policy.enabled && !!policy.allowSchoolAi && settings.aiEnabled },
    clampedStages,
  };
}

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
