import { z } from "zod";
import type { SpeechScores } from "./policy";

/**
 * OpenAI speech-to-text for the central assessment.
 *
 * OpenAI has no pronunciation-assessment API, so this measures something narrower than Azure did:
 * whether what the model heard matches the target text. Scores come from comparing the transcript with
 * the reference text in code, never from a language model's opinion, and confidence comes from the
 * transcription's own token probabilities. The reference text is deliberately NOT sent to OpenAI,
 * because a prompt containing the target makes the model "hear" the target even when the child said
 * something else.
 */

const OPENAI_TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";
export const DEFAULT_TRANSCRIBE_MODEL = "gpt-4o-transcribe";
/** Models that return token logprobs with response_format=json (per OpenAI's API reference). */
const LOGPROB_MODELS = /^gpt-4o(-mini)?-transcribe(-\d{4}-\d{2}-\d{2})?$/;

/**
 * The assessment has its own variable rather than OPENAI_API_KEY: developers' machines often set
 * OPENAI_API_KEY system-wide for other tools (e.g. an OpenRouter key), and an OS variable overrides
 * .env.local in Next.js. A separate name also keeps this project's usage on its own key and budget.
 */
export const OPENAI_KEY_ENV = "ASSESSMENT_OPENAI_API_KEY";

/** OpenRouter keys look like OpenAI keys (sk-or-…) but api.openai.com rejects them. */
export const isOpenRouterKey = (key: string) => key.startsWith("sk-or-");

export function openaiConnection() {
  const key = process.env[OPENAI_KEY_ENV] ?? "";
  const model = (process.env.OPENAI_ASSESSMENT_TRANSCRIBE_MODEL || DEFAULT_TRANSCRIBE_MODEL).trim();
  return {
    ready:
      key.startsWith("sk-") && !isOpenRouterKey(key) && !/\s/.test(key) && /^[a-z0-9.-]+$/i.test(model),
    model,
  };
}

const responseSchema = z.object({
  text: z.string(),
  logprobs: z.array(z.object({ logprob: z.number().finite() }).passthrough()).optional(),
  /** whisper-1 with verbose_json */
  segments: z.array(z.object({ avg_logprob: z.number().finite() }).passthrough()).optional(),
});

/** Thai text reduced to what the comparison should see: no spaces, punctuation or zero-width marks. */
export function normalizeThai(text: string) {
  return text
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\s.,!?;:'"“”‘’()[\]{}…\-–—~ๆฯ]/g, "")
    .toLowerCase();
}

function editDistance(a: string[], b: string[]) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++)
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    previous = current;
  }
  return previous[b.length];
}

function commonSubsequence(a: string[], b: string[]) {
  let previous = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const current = [0];
    for (let j = 1; j <= b.length; j++)
      current[j] = a[i - 1] === b[j - 1] ? previous[j - 1] + 1 : Math.max(previous[j], current[j - 1]);
    previous = current;
  }
  return previous[b.length];
}

/**
 * Character-level comparison of what was heard with the target, on Thai code points (so a wrong
 * consonant, vowel or tone mark each count).
 * - accuracy: how close the whole transcript is to the target (extra or wrong characters lower it)
 * - completeness: how much of the target appears, in order
 */
export function scoreTranscript(reference: string, transcript: string) {
  const target = [...normalizeThai(reference)];
  const heard = [...normalizeThai(transcript)];
  if (!target.length || !heard.length) return { score: 0, accuracy: 0, completeness: 0 };
  const accuracy = Math.round(100 * (1 - editDistance(target, heard) / Math.max(target.length, heard.length)));
  const completeness = Math.round((100 * commonSubsequence(target, heard)) / target.length);
  return { score: Math.round(accuracy * 0.6 + completeness * 0.4), accuracy, completeness };
}

/**
 * Confidence 0–1 from the model's own probabilities: the geometric mean token probability.
 * Models that return no probabilities give 0, which the policy sends to adult review.
 */
export function parseOpenAITranscription(value: unknown) {
  const parsed = responseSchema.safeParse(value);
  if (!parsed.success) return null;
  const { text, logprobs, segments } = parsed.data;
  const values = logprobs?.length
    ? logprobs.map((token) => token.logprob)
    : segments?.length
      ? segments.map((segment) => segment.avg_logprob)
      : [];
  const confidence = values.length
    ? Math.min(1, Math.max(0, Math.exp(values.reduce((sum, value) => sum + value, 0) / values.length)))
    : 0;
  return { transcript: text.trim().slice(0, 1500), confidence: Math.round(confidence * 1000) / 1000 };
}

export async function assessWithOpenAI(audio: Buffer, referenceText: string): Promise<SpeechScores | null> {
  const connection = openaiConnection();
  if (!connection.ready) throw new Error("provider_not_configured");
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)], { type: "audio/wav" }), "attempt.wav");
  form.append("model", connection.model);
  form.append("language", "th");
  form.append("temperature", "0");
  if (LOGPROB_MODELS.test(connection.model)) {
    form.append("response_format", "json");
    form.append("include[]", "logprobs");
  } else if (connection.model === "whisper-1") {
    form.append("response_format", "verbose_json");
  } else {
    form.append("response_format", "json");
  }
  const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(18000),
    headers: { Authorization: `Bearer ${process.env[OPENAI_KEY_ENV]}` },
    body: form,
  });
  if (!response.ok)
    throw new Error(
      response.status === 401 || response.status === 403
        ? "provider_auth_failed"
        : response.status === 429
          ? "provider_rate_limited"
          : "provider_failed",
    );
  const heard = parseOpenAITranscription(await response.json());
  if (!heard || !normalizeThai(heard.transcript)) return null;
  return { ...scoreTranscript(referenceText, heard.transcript), confidence: heard.confidence, transcript: heard.transcript };
}
