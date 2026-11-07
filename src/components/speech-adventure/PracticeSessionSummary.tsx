"use client";

import { plainFeedback } from "@/lib/speech-evaluation/plainFeedback";
import DisplayIcon from "@/components/ui/DisplayIcon";
import { useState } from "react";
import Link from "next/link";
import type { PracticeSession, PracticeAttempt, TrainingStage } from "@/types/speechAdventure";
import { useObservationNotes } from "@/hooks/useObservationNotes";
import ObservationNoteForm from "@/components/observations/ObservationNoteForm";

interface Props {
  session: PracticeSession;
  stage: TrainingStage;
  onRetry: () => void;
  /** Per-item attempt breakdown to show below session stats. */
  sessionAttempts?: PracticeAttempt[];
}

function getEncouragingText(avgScore: number): string {
  if (avgScore >= 85) return "ยอดเยี่ยมมาก! น้องเก่งเกินคาดเลยค่ะ";
  if (avgScore >= 70) return "ดีมากเลย! น้องพัฒนาได้ดีมากค่ะ";
  if (avgScore >= 55) return "ดีนะ! การฝึกทุกวันทำให้น้องเก่งขึ้นแน่นอนค่ะ";
  return "สู้ต่อนะ! ฝึกบ่อยๆ จะเก่งขึ้นทุกวันเลยค่ะ";
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} วินาที`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds > 0 ? `${minutes} นาที ${seconds} วินาที` : `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return `${hours} ชั่วโมง ${remainMinutes} นาที`;
}

function computeFilledStars(totalStars: number, totalMissions: number): number {
  const maxStars = totalMissions * 3;
  if (maxStars === 0) return 0;
  return Math.round((totalStars / maxStars) * 3);
}

export default function PracticeSessionSummary({ session, stage, onRetry, sessionAttempts }: Props) {
  const filledStars = computeFilledStars(session.starsEarned, session.totalMissions);
  const durationText = session.durationMs ? formatDuration(session.durationMs) : "—";
  const { addNote, getNotesForTarget } = useObservationNotes(session.childId);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const existingNotes = getNotesForTarget("session", session.id);

  return (
    <div className="animate-bounce-in space-y-4">
      {/* ── Main card ── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Color accent bar */}
        <div className="h-1" style={{ backgroundColor: stage.accentColor }} />

        <div className="p-8 text-center">
          {/* Stage badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold text-white mb-4"
            style={{ backgroundColor: stage.accentColor }}
          >
            <span aria-hidden="true"><DisplayIcon name={stage.icon} /></span>
            {stage.name}
          </div>

          <h2 className="text-2xl font-bold text-text mb-2">สำเร็จแล้ว!</h2>
          <p className="text-text-muted mb-6">{getEncouragingText(session.averageScore)}</p>

          {/* Star rating */}
          <div className="flex justify-center gap-3 mb-8" aria-label={`ได้รับ ${filledStars} ดาวจาก 3 ดาว`}>
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`text-5xl leading-none transition-all ${
                  n <= filledStars ? "text-secondary" : "text-disabled dark:text-white/15 opacity-60"
                }`}
                aria-hidden="true"
              >
                ★
              </span>
            ))}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="bg-bg dark:bg-white/5 rounded-xl p-4 border border-border">
              <p className="text-xl font-bold text-primary leading-none mb-1">
                {session.completedMissions}/{session.totalMissions}
              </p>
              <p className="text-xs text-text-muted">ภารกิจ</p>
            </div>
            <div className="bg-bg dark:bg-white/5 rounded-xl p-4 border border-border">
              <p className="text-xl font-bold text-success leading-none mb-1">
                {session.averageScore}%
              </p>
              <p className="text-xs text-text-muted">คะแนนเฉลี่ย</p>
            </div>
            <div className="bg-bg dark:bg-white/5 rounded-xl p-4 border border-border">
              <p className="text-xl font-bold text-secondary leading-none mb-1">
                ★ {session.starsEarned}
              </p>
              <p className="text-xs text-text-muted">ดาวรวม</p>
            </div>
            <div className="bg-bg dark:bg-white/5 rounded-xl p-4 border border-border">
              <p className="text-lg font-bold text-info leading-none mb-1">
                {durationText}
              </p>
              <p className="text-xs text-text-muted">เวลาที่ใช้</p>
            </div>
          </div>

          {/* Sound label */}
          <div className="mt-4">
            <span
              className="inline-block text-xs font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: `${stage.accentColor}18`, color: stage.accentColor }}
            >
              เสียง {session.targetSound}
            </span>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="space-y-2.5">
        <Link
          href="/training"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm shadow-primary/20"
        >
          กลับแผนที่การฝึก
        </Link>
        <Link
          href="/progress"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-primary text-primary font-semibold text-sm hover:bg-primary/5 transition-all active:scale-[0.98]"
        >
          ดูรายงานความก้าวหน้า
        </Link>
        <button
          onClick={onRetry}
          className="w-full py-3 rounded-xl text-text-muted text-sm font-medium hover:bg-surface dark:hover:bg-white/5 transition-all active:scale-[0.98]"
        >
          ฝึกซ้ำอีกครั้ง
        </button>
      </div>

      {/* ── Per-item breakdown ── */}
      {sessionAttempts && sessionAttempts.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-text">รายละเอียดแต่ละภารกิจ</p>
          </div>
          <div className="divide-y divide-border">
            {sessionAttempts.map((attempt, idx) => (
              <div key={attempt.id} className="flex items-center gap-3 px-4 py-3">
                {/* Number */}
                <span className="text-xs font-bold text-text-muted w-5 flex-shrink-0">{idx + 1}</span>

                {/* Score badge */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    attempt.score >= 70
                      ? "bg-success/12 text-success"
                      : attempt.score >= 50
                      ? "bg-warning/12 text-warning"
                      : "bg-secondary/12 text-secondary"
                  }`}
                >
                  {attempt.score}%
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text truncate">{attempt.promptText}</p>
                  {attempt.feedback && (
                    <p className="text-xs text-text-muted truncate mt-0.5">{plainFeedback(attempt.feedback)}</p>
                  )}
                </div>

                {/* Status + stars */}
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      attempt.status === "passed"
                        ? "bg-success/12 text-success"
                        : attempt.status === "almost"
                        ? "bg-warning/12 text-warning"
                        : "bg-secondary/12 text-secondary"
                    }`}
                  >
                    {attempt.status === "passed" ? "ผ่าน" : attempt.status === "almost" ? "เกือบ" : "ฝึกเพิ่ม"}
                  </span>
                  <span className="text-xs text-secondary">{"★".repeat(attempt.starsEarned)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Session note ── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => { setShowNoteForm((v) => !v); setNoteSaved(false); }}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-bg dark:hover:bg-white/3 transition-all"
          aria-expanded={showNoteForm}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-info/12 flex items-center justify-center flex-shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5BC0EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="12" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-text">บันทึกของผู้ปกครอง / ครู</p>
              <p className="text-xs text-text-muted">
                {existingNotes.length > 0
                  ? `${existingNotes.length} บันทึก`
                  : "บันทึกสิ่งที่สังเกตได้ในเซสชันนี้"}
              </p>
            </div>
          </div>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`text-text-muted transition-transform ${showNoteForm ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showNoteForm && (
          <div className="px-4 pb-4 border-t border-border">
            {noteSaved ? (
              <div className="py-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-success/12 flex items-center justify-center mx-auto mb-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4CAF82" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-success">บันทึกเรียบร้อย</p>
                <button
                  type="button"
                  onClick={() => { setNoteSaved(false); setShowNoteForm(false); }}
                  className="text-xs text-text-muted hover:text-primary mt-2 transition-colors"
                >
                  ปิด
                </button>
              </div>
            ) : (
              <div className="pt-3">
                <ObservationNoteForm
                  targetType="session"
                  targetId={session.id}
                  onSave={(data) => {
                    addNote(data);
                    setNoteSaved(true);
                  }}
                  onCancel={() => setShowNoteForm(false)}
                  compact
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
