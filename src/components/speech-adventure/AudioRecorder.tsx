"use client";

import type { RecordingState } from "@/types/speechAdventure";

interface Props {
  state: RecordingState;
  durationMs: number;
  liveRecordingMs: number;
  volumeLevel: number;
  errorMessage: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPlayRecording: () => void;
  onClearRecording: () => void;
  onEvaluate: () => void;
  accentColor: string;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  return `${seconds}.${tenths}s`;
}

function MicIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function StopIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
  );
}

function PlayIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 5.7L19.6 10l-5.7 1.9L12 17.6l-1.9-5.7L4.4 10l5.7-1.9z" />
    </svg>
  );
}

const VOLUME_BAR_SCALES = [0.5, 0.8, 1, 0.9, 0.7, 1, 0.75, 0.45];

export default function AudioRecorder({
  state,
  durationMs,
  liveRecordingMs,
  volumeLevel,
  errorMessage,
  onStartRecording,
  onStopRecording,
  onPlayRecording,
  onClearRecording,
  onEvaluate,
  accentColor,
}: Props) {
  const isRecording = state === "recording";
  const hasRecording = state === "recorded";
  const canRecord = state === "idle";
  const isBusy = state === "requesting_permission" || state === "processing";
  const hasError =
    state === "permission_denied" || state === "unsupported" || state === "error";

  return (
    <div className="space-y-5">
      {/* ── Main mic button ── */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={isBusy || hasRecording}
          aria-label={isRecording ? "หยุดบันทึกเสียง" : canRecord ? "เริ่มบันทึกเสียง" : "บันทึกเสียง"}
          className={`relative flex items-center justify-center rounded-full transition-all active:scale-[0.94] disabled:cursor-not-allowed ${
            isRecording
              ? "w-20 h-20 bg-error/15 text-error animate-recording-ring"
              : isBusy
              ? "w-16 h-16 bg-gray-100 dark:bg-white/8 text-text-muted"
              : "w-16 h-16 hover:scale-[1.05]"
          }`}
          style={
            !isRecording && !isBusy
              ? { backgroundColor: `${accentColor}15`, color: accentColor }
              : undefined
          }
        >
          {isRecording ? <StopIcon size={22} /> : <MicIcon size={26} />}
        </button>

        <span className={`text-sm font-medium transition-colors ${
          isRecording ? "text-error" : "text-text-muted"
        }`}>
          {isRecording
            ? "กดหยุดเมื่อพูดเสร็จ"
            : state === "requesting_permission"
            ? "กำลังขอสิทธิ์ไมโครโฟน..."
            : state === "processing"
            ? "กำลังวิเคราะห์เสียง..."
            : "กดเพื่อบันทึกเสียง"}
        </span>

        {/* Pre-recording tips */}
        {canRecord && (
          <div className="flex items-center justify-center gap-2 text-xs text-text-muted/70 flex-wrap">
            <span>พูดใกล้ไมค์</span>
            <span aria-hidden="true">·</span>
            <span>พูดให้ชัด 1–3 วินาที</span>
            <span aria-hidden="true">·</span>
            <span>รอไฟขึ้นแล้วค่อยพูด</span>
          </div>
        )}
      </div>

      {/* ── Recording indicator ── */}
      {isRecording && (
        <div className="flex flex-col items-center gap-2 animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-error/10 text-error border border-error/20 px-4 py-2 rounded-full text-sm font-medium">
            <span className="w-2 h-2 bg-error rounded-full animate-pulse flex-shrink-0" />
            กำลังบันทึก... พูดให้ชัดและสบายใจ
            <span className="font-mono tabular-nums ml-1">{formatDuration(liveRecordingMs)}</span>
          </div>

          {/* Volume bars */}
          <div className="flex items-end justify-center gap-0.5" style={{ height: "24px" }}>
            {VOLUME_BAR_SCALES.map((scale, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-error transition-[height] duration-100"
                style={{
                  height: `${Math.max(3, Math.round((volumeLevel / 100) * 22 * scale))}px`,
                  opacity: Math.max(0.25, volumeLevel / 100),
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Recorded: preview & actions ── */}
      {hasRecording && (
        <div className="animate-slide-up space-y-4">
          {/* Duration chip */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 bg-success/10 text-success border border-success/20 px-4 py-2 rounded-full text-sm font-medium">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              บันทึกเสร็จแล้ว · {formatDuration(durationMs)}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-2.5 flex-wrap">
            <button
              onClick={onPlayRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-info/10 text-info border border-info/20 font-semibold text-sm hover:bg-info/20 transition-all active:scale-[0.98]"
              aria-label="ฟังเสียงที่บันทึก"
            >
              <PlayIcon />
              ฟังเสียงของฉัน
            </button>

            <button
              onClick={onClearRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bg dark:bg-white/5 text-text-muted border border-border font-semibold text-sm hover:bg-gray-100 dark:hover:bg-white/10 transition-all active:scale-[0.98]"
              aria-label="อัดใหม่"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              อัดใหม่
            </button>

            <button
              onClick={onEvaluate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all active:scale-[0.98] shadow-sm hover:opacity-90"
              style={{ backgroundColor: accentColor }}
              aria-label="ประเมินเสียง"
            >
              <SparkleIcon />
              ประเมินเสียง
            </button>
          </div>

          <p className="text-center text-xs text-text-muted">
            เสียงของคุณใช้เฉพาะการฝึกในโปรโตไทป์นี้เท่านั้น
          </p>
        </div>
      )}

      {/* ── Error state (permission / hardware errors) ── */}
      {hasError && errorMessage && (
        <div className="animate-slide-up flex justify-center">
          <div className="bg-secondary/10 border border-secondary/20 text-secondary px-5 py-3 rounded-xl text-center">
            <p className="text-sm font-medium">{errorMessage}</p>
            <button
              onClick={onClearRecording}
              className="mt-2 text-xs text-text-muted hover:text-text transition-colors underline underline-offset-2"
            >
              ลองอีกครั้ง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
