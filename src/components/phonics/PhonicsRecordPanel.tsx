"use client";

import { plainFeedback } from "@/lib/speech-evaluation/plainFeedback";
/**
 * Shared recording + evaluation + next panel for phonics production activities.
 * Used by: SayAfterMeActivity, BlendSoundsActivity, WordPracticeActivity.
 *
 * Props are passed from the parent; the parent owns useAudioRecorder
 * and the evalResult state so each activity controls its own session data.
 */

import type { PhonicsAttemptStatus } from "@/types/phonics";

function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export interface EvalState {
  score: number;
  status: PhonicsAttemptStatus;
  feedback: string;
  isMock: boolean;
}

interface Props {
  // Recorder state (owned by parent via useAudioRecorder)
  recorderState: string;
  hasRecording: boolean;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPlayRecording: () => void;
  onClearRecording: () => void;

  // Evaluation
  evaluating: boolean;
  evalResult: EvalState | null;
  canEvaluate: boolean;
  onEvaluate: () => void;
  /** Called when user wants to re-record after a bad result — parent clears evalResult + recorder. */
  onRetryRecording: () => void;

  // Proceed
  canProceed: boolean;
  onNext: () => void;
}

export default function PhonicsRecordPanel({
  recorderState,
  hasRecording,
  isRecording,
  onStartRecording,
  onStopRecording,
  onPlayRecording,
  onClearRecording,
  evaluating,
  evalResult,
  canEvaluate,
  onEvaluate,
  onRetryRecording,
  canProceed,
  onNext,
}: Props) {
  const isPermissionError = recorderState === "permission_denied" || recorderState === "unsupported" || recorderState === "error";

  return (
    <div className="space-y-4">
      {/* ── Record button (shown while no eval result) ── */}
      {!evalResult && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-text-muted/70 font-medium uppercase tracking-wider">
            ลองพูดตาม
          </p>

          {isPermissionError ? (
            <p className="text-sm text-amber-600 dark:text-amber-400 text-center px-4">
              ไม่สามารถเข้าถึงไมค์ได้ — ลองกด ถัดไป แล้วฝึกโดยไม่บันทึกเสียงก็ได้นะ
            </p>
          ) : (
            <button
              type="button"
              onClick={isRecording ? onStopRecording : onStartRecording}
              disabled={
                recorderState === "requesting_permission" ||
                recorderState === "processing" ||
                hasRecording
              }
              aria-label={isRecording ? "หยุดบันทึก" : "เริ่มบันทึกเสียง"}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-[0.94] disabled:cursor-not-allowed ${
                isRecording
                  ? "bg-red-100 dark:bg-red-950/40 text-red-500 animate-pulse"
                  : hasRecording
                  ? "bg-border/30 text-text-muted/40"
                  : "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800/50"
              }`}
            >
              {isRecording ? <StopIcon /> : <MicIcon />}
            </button>
          )}

          <span className="text-sm text-text-muted">
            {isRecording
              ? "กำลังบันทึก... กดหยุดเมื่อพูดเสร็จ"
              : hasRecording
              ? "บันทึกเสร็จแล้ว"
              : "กดเพื่อบันทึกเสียง"}
          </span>
        </div>
      )}

      {/* ── After recording: playback + re-record + evaluate ── */}
      {hasRecording && !evalResult && (
        <div className="animate-slide-up flex flex-col items-center gap-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onPlayRecording}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 text-sm font-semibold hover:bg-blue-100 transition-all active:scale-[0.97]"
            >
              <PlayIcon /> ฟังเสียงของฉัน
            </button>
            <button
              type="button"
              onClick={onClearRecording}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-border text-text-muted text-sm font-semibold hover:bg-gray-100 dark:hover:bg-white/8 transition-all active:scale-[0.97]"
            >
              อัดใหม่
            </button>
          </div>
          {canEvaluate && (
            <button
              type="button"
              onClick={onEvaluate}
              disabled={evaluating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60 text-sm font-semibold hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {evaluating ? "กำลังตรวจสอบ..." : "ตรวจสอบเสียง"}
            </button>
          )}
        </div>
      )}

      {/* ── Evaluating spinner ── */}
      {evaluating && !evalResult && (
        <p className="text-center text-sm text-amber-600 dark:text-amber-400 animate-pulse">
          กำลังฟังเสียง...
        </p>
      )}

      {/* ── Eval result card ── */}
      {evalResult && (
        <div
          className={`animate-slide-up rounded-xl px-4 py-4 border ${
            evalResult.status === "passed"
              ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50"
              : evalResult.status === "almost"
              ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-700/50"
              : "bg-surface border-border"
          }`}
        >
          <p
            className={`font-bold text-base text-center ${
              evalResult.status === "passed"
                ? "text-green-700 dark:text-green-400"
                : evalResult.status === "almost"
                ? "text-amber-700 dark:text-amber-400"
                : "text-text"
            }`}
          >
            {plainFeedback(evalResult.feedback)}
          </p>
          <p className="text-xs text-text-muted text-center mt-1">
            คะแนน {evalResult.score}/100
          </p>

          {/* Re-record option for retry status */}
          {evalResult.status === "retry" && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={onRetryRecording}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-text-muted text-sm font-medium hover:text-text hover:border-amber-400/60 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all active:scale-[0.97]"
              >
                <RefreshIcon />
                อัดเสียงใหม่อีกครั้ง
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Next button ── */}
      <button
        type="button"
        onClick={onNext}
        disabled={!canProceed}
        className={`w-full py-3.5 rounded-xl text-base font-semibold transition-all active:scale-[0.98] ${
          canProceed
            ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-300/40"
            : "bg-border/40 text-text-muted/50 cursor-not-allowed"
        }`}
      >
        ถัดไป →
      </button>

      {!canProceed && !evalResult && (
        <p className="text-center text-xs text-text-muted/60">
          ฟังเสียงตัวอย่างก่อน แล้วกด ถัดไป ได้เลย
        </p>
      )}
    </div>
  );
}
