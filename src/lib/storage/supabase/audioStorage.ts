/**
 * Supabase Storage service for practice audio recordings.
 *
 * Bucket: practice-audio (private, 10 MB max, audio/* MIME types only)
 *
 * Path convention:
 *   users/{userId}/children/{childId}/attempts/{attemptId}.{ext}
 *
 * All functions return a result object instead of throwing.
 * When Supabase is not configured the functions return a "not configured"
 * error so the calling UI can fall back gracefully.
 *
 * Phase 35 — foundation only. Real AI evaluation is not wired yet.
 */

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export const PRACTICE_AUDIO_BUCKET = "practice-audio";

export interface AudioUploadMetadata {
  userId: string;
  childId: string;
  attemptId: string;
  mimeType: string;
  durationMs?: number;
}

export interface AudioUploadResult {
  /** Supabase Storage path on success, null on failure. */
  path: string | null;
  error: string | null;
}

export interface AudioUrlResult {
  /** Short-lived signed URL for playback, null on failure. */
  url: string | null;
  error: string | null;
}

export interface AudioDeleteResult {
  error: string | null;
}

// ── Path helpers ─────────────────────────────────────────────────────────────

function mimeToExt(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4") || mimeType.includes("mpeg")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

/**
 * Constructs the canonical storage path for a practice audio recording.
 * The path is deterministic — it can be computed before the upload starts.
 */
export function buildAudioPath(meta: AudioUploadMetadata): string {
  const ext = mimeToExt(meta.mimeType);
  return `users/${meta.userId}/children/${meta.childId}/attempts/${meta.attemptId}.${ext}`;
}

// ── Upload ────────────────────────────────────────────────────────────────────

/**
 * Uploads a practice audio blob to Supabase Storage.
 *
 * Returns the storage path on success so callers can store it on the attempt
 * row (practice_attempts.audio_path).
 *
 * Safe to call when Supabase is not configured — returns an error string
 * without throwing, so the UI continues without audio storage.
 */
export async function uploadPracticeAudio(
  blob: Blob,
  meta: AudioUploadMetadata,
): Promise<AudioUploadResult> {
  if (!isSupabaseConfigured()) {
    return { path: null, error: "supabase_not_configured" };
  }

  const client = getSupabaseClient();
  if (!client) return { path: null, error: "no_client" };

  const path = buildAudioPath(meta);

  const { error } = await client.storage
    .from(PRACTICE_AUDIO_BUCKET)
    .upload(path, blob, {
      contentType: meta.mimeType || "audio/webm",
      // Each attempt has a unique ID — reject duplicate uploads so the path
      // always refers to exactly one recording.
      upsert: false,
    });

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[audioStorage] upload failed:", error.message);
    }
    return { path: null, error: error.message };
  }

  return { path, error: null };
}

// ── Signed URL ────────────────────────────────────────────────────────────────

/**
 * Creates a short-lived signed URL for playing back a stored recording.
 *
 * @param path         Storage path returned by uploadPracticeAudio.
 * @param expiresIn    URL validity in seconds (default 1 hour).
 */
export async function getPracticeAudioUrl(
  path: string,
  expiresIn = 3600,
): Promise<AudioUrlResult> {
  if (!isSupabaseConfigured()) {
    return { url: null, error: "supabase_not_configured" };
  }

  const client = getSupabaseClient();
  if (!client) return { url: null, error: "no_client" };

  const { data, error } = await client.storage
    .from(PRACTICE_AUDIO_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[audioStorage] signed URL failed:", error.message);
    }
    return { url: null, error: error.message };
  }

  return { url: data.signedUrl, error: null };
}

/** Resolves a school attempt and downloads with the signed-in account. */
export async function downloadSchoolAttemptAudio(attemptId: string, signal: AbortSignal): Promise<Blob | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data: path, error: accessError } = await client.rpc("get_school_attempt_audio", {
    p_attempt_id: attemptId,
  }).abortSignal(signal);
  if (accessError || !path) return null;

  const { data, error } = await client.storage.from(PRACTICE_AUDIO_BUCKET)
    .download(path, {}, { signal, cache: "no-store" });
  return error ? null : data;
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Removes a stored recording from Supabase Storage.
 * Optional — the UI never calls this automatically.
 * Safe when Supabase is not configured (returns error string, no throw).
 */
export async function deletePracticeAudio(
  path: string,
): Promise<AudioDeleteResult> {
  if (!isSupabaseConfigured()) {
    return { error: "supabase_not_configured" };
  }

  const client = getSupabaseClient();
  if (!client) return { error: "no_client" };

  const { error } = await client.storage
    .from(PRACTICE_AUDIO_BUCKET)
    .remove([path]);

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[audioStorage] delete failed:", error.message);
    }
    return { error: error.message };
  }

  return { error: null };
}
