import { assessWithAzure, azureConnection } from "./azure";
import { assessWithOpenAI, openaiConnection } from "./openai";
import type { SpeechScores } from "./policy";

/**
 * Which service checks speech items for the central assessment, chosen on the server with
 * ASSESSMENT_SPEECH_PROVIDER (openai | azure, default openai).
 *
 * Policies store the AI method as rule.mode "azure" (published versions, migrations and school
 * overrides already contain it), so that value means "AI checks speech" whatever this returns.
 */
export type SpeechProviderId = "openai" | "azure";

export const SPEECH_PROVIDER_LABELS: Record<SpeechProviderId, string> = {
  openai: "OpenAI",
  azure: "Azure Speech",
};

export interface SpeechProviderStatus {
  id: SpeechProviderId;
  label: string;
  ready: boolean;
  /** Safe to show to admins: a region or model name, never a key. */
  detail?: string;
}

export function speechProviderId(): SpeechProviderId {
  return process.env.ASSESSMENT_SPEECH_PROVIDER?.trim().toLowerCase() === "azure" ? "azure" : "openai";
}

export function speechProvider(): SpeechProviderStatus {
  const id = speechProviderId();
  if (id === "azure") {
    const connection = azureConnection();
    return { id, label: SPEECH_PROVIDER_LABELS.azure, ready: connection.ready, detail: connection.region };
  }
  const connection = openaiConnection();
  return { id, label: SPEECH_PROVIDER_LABELS.openai, ready: connection.ready, detail: connection.model };
}

/** Throws provider_* errors; returns null when the service heard no usable speech. */
export async function assessSpeech(
  audio: Buffer,
  referenceText: string,
): Promise<{ source: SpeechProviderId; scores: SpeechScores | null }> {
  const source = speechProviderId();
  const scores =
    source === "azure" ? await assessWithAzure(audio, referenceText) : await assessWithOpenAI(audio, referenceText);
  return { source, scores };
}
