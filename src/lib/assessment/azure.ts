import { z } from "zod";
import type { SpeechScores } from "./policy";

const score = z.number().finite().min(0).max(100);
const responseSchema = z.object({
  RecognitionStatus: z.string(),
  NBest: z
    .array(
      z.object({
        Confidence: z.number().finite().min(0).max(1),
        Display: z.string().optional(),
        Lexical: z.string().optional(),
        AccuracyScore: score,
        CompletenessScore: score,
        PronScore: score,
        FluencyScore: score.optional(),
      }),
    )
    .optional(),
});

export function azureConnection() {
  const region = process.env.AZURE_SPEECH_REGION ?? "";
  const endpoint = process.env.AZURE_SPEECH_ENDPOINT?.replace(/\/$/, "");
  const validEndpoint =
    endpoint &&
    /^https:\/\/[a-z0-9-]+\.cognitiveservices\.azure\.com$/i.test(endpoint);
  const validRegion = /^[a-z]+\d?$/.test(region);
  return {
    ready: !!process.env.AZURE_SPEECH_KEY && !!(validEndpoint || validRegion),
    baseUrl: validEndpoint
      ? `${endpoint}/stt`
      : validRegion
        ? `https://${region}.stt.speech.microsoft.com`
        : undefined,
    region: validRegion ? region : undefined,
  };
}

export function parseAzureResponse(value: unknown): SpeechScores | null {
  const parsed = responseSchema.safeParse(value);
  if (!parsed.success || parsed.data.RecognitionStatus !== "Success")
    return null;
  const best = parsed.data.NBest?.[0];
  if (!best) return null;
  return {
    score: best.PronScore,
    accuracy: best.AccuracyScore,
    completeness: best.CompletenessScore,
    fluency: best.FluencyScore,
    confidence: best.Confidence,
    transcript: (best.Display ?? best.Lexical ?? "").slice(0, 1500),
  };
}

export async function assessWithAzure(audio: Buffer, referenceText: string) {
  const connection = azureConnection();
  if (!connection.ready || !connection.baseUrl)
    throw new Error("provider_not_configured");
  const parameters = Buffer.from(
    JSON.stringify({
      ReferenceText: referenceText,
      GradingSystem: "HundredMark",
      Granularity: "Word",
      Dimension: "Comprehensive",
      EnableMiscue: true,
    }),
    "utf8",
  ).toString("base64");
  const response = await fetch(
    `${connection.baseUrl}/speech/recognition/conversation/cognitiveservices/v1?language=th-TH&format=detailed`,
    {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(18000),
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY!,
        "Pronunciation-Assessment": parameters,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        Accept: "application/json",
      },
      body: new Uint8Array(audio),
    },
  );
  if (!response.ok)
    throw new Error(
      response.status === 401 || response.status === 403
        ? "provider_auth_failed"
        : "provider_failed",
    );
  return parseAzureResponse(await response.json());
}
