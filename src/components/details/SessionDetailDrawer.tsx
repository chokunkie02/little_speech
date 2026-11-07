"use client";

import DisplayIcon from "@/components/ui/DisplayIcon";
import { useEffect } from "react";
import { mockTrainingStages } from "@/data/speechAdventureMockData";
import type { PracticeSession, PracticeAttempt } from "@/types/speechAdventure";
import DetailMetricCard from "./DetailMetricCard";
import LinkedObservationNotes from "./LinkedObservationNotes";

interface Props {
  session: PracticeSession | null;
  allAttempts: PracticeAttempt[];
  onClose: () => void;
  onAttemptClick?: (attempt: PracticeAttempt) => void;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} วินาที`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds > 0 ? `${minutes} นาที ${seconds} วินาที` : `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ชั่วโมง ${Math.floor(minutes % 60)} นาที`;
}

const SESSION_STATUS_MAP: Record<string, { label: string; color: string }> = {
  completed: { label: "เสร็จสมบูรณ์", color: "#4CAF82" },
  active: { label: "กำลังดำเนินการ", color: "#5BC0EB" },
  abandoned: { label: "ยังไม่เสร็จ", color: "#94A3B8" },
};

export default function SessionDetailDrawer({ session, allAttempts, onClose, onAttemptClick }: Props) {
  useEffect(() => {
    if (!session) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [session, onClose]);

  if (!session) return null;

  const stage = mockTrainingStages.find((s) => s.id === session.stageId);
  const accentColor = stage?.accentColor ?? "#6C63FF";
  const linkedAttempts = allAttempts.filter((a) => session.attemptIds.includes(a.id));
  const statusInfo = SESSION_STATUS_MAP[session.status] ?? SESSION_STATUS_MAP.active;

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="รายละเอียดเซสชัน">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="absolute inset-y-0 right-0 w-full max-w-md bg-surface shadow-2xl overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md border-b border-border">
          <div className="h-1" style={{ backgroundColor: accentColor }} />
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl flex-shrink-0" aria-hidden="true"><DisplayIcon name={stage?.icon ?? "target"} /></span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-text truncate">{stage?.name ?? session.stageId}</p>
                <p className="text-xs text-text-muted">รายละเอียดเซสชัน</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl text-text-muted hover:text-text hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
              aria-label="ปิด"
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 p-5 space-y-5">

          {/* Status + sound */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: statusInfo.color }}
            >
              {statusInfo.label}
            </span>
            <span
              className="inline-block text-xs font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
            >
              เสียง {session.targetSound}
            </span>
          </div>

          {/* Time info */}
          <div className="bg-bg dark:bg-white/5 border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm gap-4">
              <span className="text-text-muted flex-shrink-0">เริ่มต้น</span>
              <span className="font-medium text-text text-right">{formatDateTime(session.startedAt)}</span>
            </div>
            {session.endedAt && (
              <div className="flex items-center justify-between text-sm gap-4">
                <span className="text-text-muted flex-shrink-0">สิ้นสุด</span>
                <span className="font-medium text-text text-right">{formatDateTime(session.endedAt)}</span>
              </div>
            )}
            {session.durationMs != null && session.durationMs > 0 && (
              <div className="flex items-center justify-between text-sm border-t border-border pt-2 mt-2 gap-4">
                <span className="text-text-muted flex-shrink-0">เวลาที่ใช้</span>
                <span className="font-semibold text-text text-right">{formatDuration(session.durationMs)}</span>
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <DetailMetricCard
              label="คะแนนเฉลี่ย"
              value={`${session.averageScore}%`}
              valueColor={session.averageScore >= 70 ? "#4CAF82" : "#FFB347"}
            />
            <DetailMetricCard
              label="ดาวรวม"
              value={`★ ${session.starsEarned}`}
              valueColor="#FFB347"
            />
            <DetailMetricCard
              label="ภารกิจ"
              value={`${session.completedMissions} / ${session.totalMissions}`}
              valueColor="#6C63FF"
              subtext={session.completedMissions === session.totalMissions ? "ครบทุกภารกิจ" : "ยังไม่ครบ"}
            />
            <DetailMetricCard
              label="ครั้งที่ฝึก"
              value={session.attemptIds.length}
              valueColor="#5BC0EB"
              subtext="ครั้ง"
            />
          </div>

          {/* Linked attempts */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              รายการฝึกในเซสชันนี้ ({linkedAttempts.length})
            </p>
            {linkedAttempts.length === 0 ? (
              <div className="text-center py-5 border border-dashed border-border rounded-xl">
                <p className="text-sm text-text-muted">ไม่มีรายการฝึกที่เชื่อมโยง</p>
              </div>
            ) : (
              <div className="space-y-2">
                {linkedAttempts.map((attempt) => {
                  const isPassed = attempt.status === "passed";
                  const isAlmost = attempt.status === "almost";
                  return (
                    <button
                      key={attempt.id}
                      type="button"
                      onClick={() => onAttemptClick?.(attempt)}
                      disabled={!onAttemptClick}
                      className={`w-full flex items-center gap-3 bg-bg dark:bg-white/3 rounded-xl px-3 py-2.5 border border-border text-left transition-all ${
                        onAttemptClick
                          ? "hover:border-primary/30 hover:shadow-sm active:scale-[0.99] cursor-pointer"
                          : "cursor-default"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isPassed
                            ? "bg-success/12 text-success"
                            : isAlmost
                            ? "bg-secondary/12 text-secondary"
                            : "bg-error/12 text-error"
                        }`}
                      >
                        {attempt.score}%
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{attempt.promptText}</p>
                        <p className="text-xs text-text-muted">
                          {attempt.starsEarned > 0 ? `★ ${attempt.starsEarned}` : "ไม่ได้ดาว"}
                        </p>
                      </div>
                      {onAttemptClick && (
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className="text-text-muted flex-shrink-0" aria-hidden="true"
                        >
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Observation notes */}
          <div className="bg-bg dark:bg-white/5 border border-border rounded-xl p-4">
            <LinkedObservationNotes
              childId={session.childId}
              targetType="session"
              targetId={session.id}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface border-t border-border p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl border-2 border-border text-text font-semibold text-sm hover:bg-bg dark:hover:bg-white/5 transition-all active:scale-[0.98]"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
