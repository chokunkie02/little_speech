"use client";

import { plainFeedback } from "@/lib/speech-evaluation/plainFeedback";
import { useState, useCallback, useRef } from "react";
import type { PracticeItem, EvaluationResult, PracticeAttempt } from "@/types/speechAdventure";
import type { SpeechEvaluationResult } from "@/lib/speech-evaluation/types";
import { evaluateSpeechViaApi } from "@/lib/speech-evaluation/client";
import { validateRecordedAudio } from "@/lib/audio/audioQuality";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAuth } from "@/hooks/useAuth";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useCurrentChildAccess } from "@/hooks/useCurrentChildAccess";
import { uploadPracticeAudio } from "@/lib/storage/supabase/audioStorage";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import AudioRecorder from "./AudioRecorder";
import SampleAudioButton from "./SampleAudioButton";
import EvaluationResultCard from "./EvaluationResultCard";
import RewardBadge from "./RewardBadge";
import SessionSummaryCard from "./SessionSummaryCard";
import PermissionBanner from "@/components/ui/PermissionBanner";

interface Props {
  item: PracticeItem;
  accentColor: string;
  stageName: string;
  targetSound: string;
  missionIndex?: number;
  totalMissions?: number;
  isLastMission?: boolean;
  onSaveAttempt?: (attempt: PracticeAttempt) => void;
  onNext?: () => void;
}

function toUIResult(evalResult: SpeechEvaluationResult): EvaluationResult {
  const { score, status } = evalResult;
  // 1–3 stars matching computeStars — UI and saved value must be identical.
  const stars = score >= 85 ? 3 : score >= 70 ? 2 : 1;
  const message =
    score >= 85 ? "ยอดเยี่ยม! เก่งมาก!" :
    score >= 70 ? "ดีมาก! ใกล้เก่งแล้ว!" :
    "พยายามต่อไปนะ!";
  return { score, maxScore: 100, stars, message, isPassed: status !== "retry" };
}

function computeStars(score: number): number {
  if (score >= 85) return 3;
  if (score >= 70) return 2;
  return 1;
}

function buildAttempt(
  item: PracticeItem,
  targetSound: string,
  evalResult: SpeechEvaluationResult,
  durationMs: number,
  childId: string,
): PracticeAttempt {
  return {
    id: `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    childId,
    stageId: item.stageSlug,
    practiceItemId: item.id,
    targetSound,
    promptText: item.target,
    durationMs,
    score: evalResult.score,
    confidence: evalResult.confidence,
    status: evalResult.status,
    feedback: evalResult.feedback,
    recommendation: evalResult.recommendation,
    starsEarned: computeStars(evalResult.score),
    createdAt: evalResult.createdAt,
    transcript: evalResult.transcript,
    practiceTip: evalResult.practiceTip,
    detectedIssues: evalResult.detectedIssues?.length ? evalResult.detectedIssues : undefined,
    isMock: evalResult.isMock,
  };
}

const usesRecorder = (type: PracticeItem["type"]) =>
  type !== "oral_motor" && type !== "sound_choice";

export default function PracticeCard({
  item,
  accentColor,
  stageName,
  targetSound,
  missionIndex,
  totalMissions,
  isLastMission = false,
  onSaveAttempt,
  onNext,
}: Props) {
  const recorder = useAudioRecorder();
  const { user, isAuthenticated } = useAuth();
  const { profile } = useChildProfile();
  const { canStartPractice } = useCurrentChildAccess();
  const [phase, setPhase] = useState<"idle" | "listening" | "recording" | "evaluated" | "saved" | "reward">("idle");
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [evalResult, setEvalResult] = useState<SpeechEvaluationResult | null>(null);
  const [savedAttempt, setSavedAttempt] = useState<PracticeAttempt | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  // Track whether sample audio was played before recording — enables gentle nudge.
  const hasListenedRef = useRef(false);
  const [showListenNudge, setShowListenNudge] = useState(false);

  const handleSamplePlayed = useCallback(() => {
    hasListenedRef.current = true;
    setShowListenNudge(false);
  }, []);

  const handleStartRecording = useCallback(() => {
    // Soft nudge if user records before listening to the sample
    if (!hasListenedRef.current) {
      setShowListenNudge(true);
    }
    setPhase("recording");
    recorder.startRecording();
  }, [recorder]);

  const handleStopRecording = useCallback(() => {
    recorder.stopRecording();
    setPhase("idle");
  }, [recorder]);

  const handleRetry = useCallback(() => {
    recorder.clearRecording();
    setResult(null);
    setEvalResult(null);
    setSavedAttempt(null);
    setEvaluationError(null);
    setShowListenNudge(false);
    setPhase("idle");
  }, [recorder]);

  const handleEvaluate = useCallback(() => {
    setEvaluationError(null);

    const quality = validateRecordedAudio(recorder.blob, { durationMs: recorder.durationMs });
    if (!quality.ok) {
      setEvaluationError(quality.message ?? "เสียงไม่ถูกต้อง ลองพูดอีกครั้ง");
      return;
    }

    setIsEvaluating(true);
    evaluateSpeechViaApi({
      stageId: item.stageSlug,
      practiceItemId: item.id,
      targetSound,
      promptText: item.target,
      itemType: item.type,
      durationMs: recorder.durationMs,
      audioBlob: recorder.blob ?? undefined,
    }).then((ev) => {
      setEvalResult(ev);
      setResult(toUIResult(ev));
      setPhase("evaluated");
    }).catch(() => {
      setEvaluationError("ยังประเมินเสียงไม่ได้ กรุณาลองใหม่อีกครั้ง");
    }).finally(() => {
      setIsEvaluating(false);
    });
  }, [item, targetSound, recorder.durationMs, recorder.blob]);

  const handleAccept = useCallback(async () => {
    if (!evalResult) return;
    const attempt = buildAttempt(item, targetSound, evalResult, recorder.durationMs, profile?.id ?? "");

    // Upload audio to Supabase Storage when all prerequisites are met.
    // Falls back gracefully — attempt is saved regardless of upload outcome.
    if (
      recorder.blob &&
      isAuthenticated &&
      user?.id &&
      profile?.id &&
      isSupabaseConfigured()
    ) {
      const { path } = await uploadPracticeAudio(recorder.blob, {
        userId: user.id,
        childId: profile.id,
        attemptId: attempt.id,
        mimeType: recorder.mimeType,
        durationMs: recorder.durationMs,
      });
      if (path) {
        attempt.audioPath = path;
      }
    }

    setSavedAttempt(attempt);
    onSaveAttempt?.(attempt);
    setPhase("saved");
  }, [evalResult, item, targetSound, recorder, onSaveAttempt, isAuthenticated, user, profile]);

  const handleContinue = () => setPhase("reward");

  const handleOralMotorComplete = useCallback(() => {
    evaluateSpeechViaApi({
      stageId: item.stageSlug,
      practiceItemId: item.id,
      targetSound,
      promptText: item.target,
      itemType: "oral_motor",
      durationMs: 0,
    }).then((ev) => {
      const attempt = buildAttempt(item, targetSound, ev, 0, profile?.id ?? "");
      setSavedAttempt(attempt);
      setResult(toUIResult(ev));
      onSaveAttempt?.(attempt);
      setPhase("reward");
    });
  }, [item, targetSound, onSaveAttempt, profile]);

  const handleSoundChoice = useCallback((choice: string) => {
    evaluateSpeechViaApi({
      stageId: item.stageSlug,
      practiceItemId: item.id,
      targetSound,
      promptText: item.target,
      itemType: "sound_choice",
      durationMs: 0,
      selectedChoice: choice,
    }).then((ev) => {
      setEvalResult(ev);
      setResult(toUIResult(ev));
      setPhase("evaluated");
    });
  }, [item, targetSound]);

  const sizeClass =
    item.type === "sentence" ? "text-xl md:text-2xl" :
    item.type === "word" ? "text-3xl md:text-4xl" :
    item.type === "oral_motor" ? "text-2xl md:text-3xl" :
    "text-5xl md:text-6xl";

  const isPracticePhase = phase !== "evaluated" && phase !== "saved" && phase !== "reward";

  return (
    <div className="bg-surface border border-border rounded-xl p-5 animate-slide-up">
      {/* ── Header ── */}
      <div className="mb-5">
        {missionIndex !== undefined && totalMissions !== undefined && (
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-1">
            ภารกิจที่ {missionIndex + 1} / {totalMissions}
          </p>
        )}
        <p className="text-sm text-text-muted">{stageName}</p>
        <p className="text-base font-semibold text-text">{item.instruction}</p>
      </div>

      {/* ── Target Display ── */}
      <div
        className="rounded-xl px-6 py-8 text-center mb-5"
        style={{ backgroundColor: `${accentColor}10` }}
      >
        {item.type === "sound_choice" ? (
          <>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: `${accentColor}20` }}
              aria-hidden="true"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <p className="text-sm font-medium text-text-muted">{item.instruction}</p>
          </>
        ) : (
          <>
            <p
              className={`font-bold leading-tight ${sizeClass}`}
              style={{ color: accentColor }}
            >
              {item.target}
            </p>
            {item.hint && isPracticePhase && (
              <p className="text-sm text-text-muted mt-3 leading-relaxed">
                {item.hint}
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Evaluated phase ── */}
      {phase === "evaluated" && result && evalResult && (
        <div className="animate-slide-up space-y-4">
          <EvaluationResultCard result={result} accentColor={accentColor} />

          {/* Feedback card — extra emphasis when score is low */}
          <div
            className="rounded-xl p-4 text-sm space-y-2 border"
            style={{
              backgroundColor: !result.isPassed ? "rgba(255,107,107,0.04)" : `${accentColor}06`,
              borderColor: !result.isPassed ? "rgba(255,107,107,0.20)" : `${accentColor}20`,
            }}
          >
            <p className="font-semibold text-text">{plainFeedback(evalResult.feedback)}</p>

            {/* Practice tip — shown prominently when score is low */}
            {(evalResult.practiceTip ?? evalResult.recommendation) && (
              <div className={`rounded-lg px-3 py-2 ${!result.isPassed ? "bg-info/8 border border-info/15" : ""}`}>
                <p className="text-text-muted text-xs">
                  {plainFeedback(evalResult.practiceTip ?? evalResult.recommendation)}
                </p>
              </div>
            )}

            {evalResult.transcript && (
              <p className="text-xs text-text-muted pt-1 border-t border-border/50">
                ที่ได้ยิน: &ldquo;{evalResult.transcript}&rdquo;
                {" · "}
                <span className={
                  evalResult.confidence >= 0.8
                    ? "text-success"
                    : evalResult.confidence >= 0.55
                    ? "text-info"
                    : "text-warning"
                }>
                  {evalResult.confidence >= 0.8
                    ? "ฟังได้ชัด"
                    : evalResult.confidence >= 0.55
                    ? "ค่อนข้างชัด"
                    : "เสียงยังไม่ชัด ลองอัดใหม่"}
                </span>
              </p>
            )}
            {!evalResult.transcript && !evalResult.isMock && (
              <p className="text-xs text-warning pt-1 border-t border-border/50">
                เสียงยังไม่ชัด ลองอัดใหม่อีกครั้ง
              </p>
            )}
            {evalResult.isMock && usesRecorder(item.type) && (
              <p className="text-xs text-text-muted pt-1 border-t border-border/50">
                ระบบทดลอง · ผลนี้เป็นตัวอย่าง ยังไม่ใช่ AI จริง
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${
                !result.isPassed
                  ? "bg-primary text-white hover:bg-primary/90 shadow-sm"
                  : "border-2 border-primary text-primary hover:bg-primary/5"
              }`}
            >
              ลองอีกครั้ง
            </button>
            <button
              onClick={handleAccept}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${
                !result.isPassed
                  ? "border-2 border-border text-text-muted hover:bg-surface/80"
                  : "bg-primary text-white hover:bg-primary/90 shadow-sm"
              }`}
            >
              {result.isPassed ? "ยืนยันผล ✓" : "บันทึกและต่อไป"}
            </button>
          </div>
        </div>
      )}

      {/* ── Saved phase ── */}
      {phase === "saved" && savedAttempt && result && (
        <div className="animate-slide-up space-y-4">
          <SessionSummaryCard attempt={savedAttempt} accentColor={accentColor} />
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 py-3 rounded-xl border-2 border-primary text-primary font-semibold text-sm hover:bg-primary/5 transition-all active:scale-[0.98]"
            >
              ลองอีกครั้ง
            </button>
            <button
              onClick={handleContinue}
              className="flex-1 py-3 rounded-xl bg-secondary text-white font-semibold text-sm hover:bg-secondary/90 transition-all active:scale-[0.98] shadow-sm"
            >
              ดูรางวัล
            </button>
          </div>
        </div>
      )}

      {/* ── Reward phase ── */}
      {phase === "reward" && result && (
        <div className="animate-bounce-in space-y-4">
          <RewardBadge stars={result.stars} message={result.message} />
          {onNext && (
            <button
              onClick={onNext}
              className="w-full py-3 rounded-xl bg-secondary text-white font-semibold text-base hover:bg-secondary/90 transition-all active:scale-[0.98] shadow-sm"
            >
              {isLastMission ? "ดูผลสรุประดับ" : "ภารกิจต่อไป"}
            </button>
          )}
        </div>
      )}

      {/* ── Practice phase ── */}
      {isPracticePhase && (
        <>
          {/* Oral Motor */}
          {item.type === "oral_motor" && (
            <div className="text-center space-y-3">
              <p className="text-sm text-text-muted">ทำตามภารกิจด้านบน แล้วกดปุ่มเมื่อเสร็จ</p>
              {canStartPractice ? (
                <button
                  onClick={handleOralMotorComplete}
                  className="w-full py-3.5 rounded-xl font-bold text-base text-white transition-all active:scale-[0.98] shadow-sm hover:opacity-90"
                  style={{ backgroundColor: accentColor }}
                >
                  เสร็จแล้ว
                </button>
              ) : (
                <PermissionBanner
                  message="คุณมีสิทธิ์ดูเท่านั้น ไม่สามารถบันทึกผลได้"
                  hint="ติดต่อเจ้าของโปรไฟล์เด็กเพื่อขอสิทธิ์ “เริ่มการฝึก”"
                />
              )}
            </div>
          )}

          {/* Sound Choice */}
          {item.type === "sound_choice" && item.soundChoices && (
            <div className="space-y-3">
              <p className="text-center text-sm text-text-muted font-medium">เลือกคำตอบที่ถูกต้อง</p>
              {canStartPractice ? (
                <div className="grid grid-cols-2 gap-3">
                  {item.soundChoices.map((choice) => (
                    <button
                      key={choice}
                      onClick={() => handleSoundChoice(choice)}
                      className="py-5 rounded-xl border-2 border-border bg-bg dark:bg-white/3 text-2xl font-bold text-text hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-[0.96]"
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              ) : (
                <PermissionBanner
                  message="คุณมีสิทธิ์ดูเท่านั้น ไม่สามารถตอบได้"
                  hint="ติดต่อเจ้าของโปรไฟล์เด็กเพื่อขอสิทธิ์ “เริ่มการฝึก”"
                />
              )}
              {item.hint && (
                <p className="text-center text-xs text-text-muted">{item.hint}</p>
              )}
            </div>
          )}

          {/* Recorder */}
          {usesRecorder(item.type) && (
            <>
              <div className="flex justify-center mb-4">
                <SampleAudioButton
                  expectedText={item.target}
                  targetSound={targetSound}
                  stageId={item.stageSlug}
                  onPlayed={handleSamplePlayed}
                  disabled={
                    recorder.state === "recording" ||
                    recorder.state === "requesting_permission"
                  }
                />
              </div>

              {/* Gentle listen-first nudge — shown once if recording starts without listening */}
              {showListenNudge && (
                <div className="mb-3 flex items-center gap-2 bg-info/8 border border-info/20 rounded-xl px-3 py-2 animate-slide-up">
                  <p className="text-xs text-info flex-1">ลองฟังเสียงตัวอย่างก่อนนะ จะช่วยให้พูดตามได้ง่ายขึ้น</p>
                  <button
                    type="button"
                    onClick={() => setShowListenNudge(false)}
                    className="text-info/60 hover:text-info transition-colors flex-shrink-0"
                    aria-label="ปิด"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              )}

              {/* Recorder controls — gated by canStartPractice */}
              {canStartPractice ? (
                <>
                  <AudioRecorder
                    state={isEvaluating ? "processing" : recorder.state}
                    durationMs={recorder.durationMs}
                    liveRecordingMs={recorder.liveRecordingMs}
                    volumeLevel={recorder.volumeLevel}
                    errorMessage={recorder.errorMessage}
                    onStartRecording={handleStartRecording}
                    onStopRecording={handleStopRecording}
                    onPlayRecording={recorder.playRecording}
                    onClearRecording={handleRetry}
                    onEvaluate={handleEvaluate}
                    accentColor={accentColor}
                  />
                  {isEvaluating && (
                    <p className="text-center text-sm text-text-muted animate-pulse mt-2">
                      กำลังวิเคราะห์เสียง...
                    </p>
                  )}
                  {!isEvaluating && evaluationError && recorder.state === "recorded" && (
                    <div className="flex justify-center mt-2 animate-slide-up">
                      <div className="bg-warning/10 border border-warning/20 text-warning px-4 py-2.5 rounded-xl text-center max-w-xs">
                        <p className="text-sm font-medium">{evaluationError}</p>
                        <p className="text-xs text-text-muted mt-1">กด &ldquo;อัดใหม่&rdquo; เพื่อลองอีกครั้ง</p>
                      </div>
                    </div>
                  )}
                  {!isEvaluating && evaluationError && recorder.state !== "recorded" && (
                    <div className="flex justify-center mt-2 animate-slide-up">
                      <div className="bg-secondary/10 border border-secondary/20 text-secondary px-4 py-2.5 rounded-xl text-center max-w-xs">
                        <p className="text-sm font-medium">{evaluationError}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <PermissionBanner
                  message="คุณมีสิทธิ์ดูเท่านั้น ไม่สามารถบันทึกเสียงได้"
                  hint="ติดต่อเจ้าของโปรไฟล์เด็กเพื่อขอสิทธิ์ “เริ่มการฝึก”"
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
