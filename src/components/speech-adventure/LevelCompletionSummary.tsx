"use client";

import DisplayIcon from "@/components/ui/DisplayIcon";
import Link from "next/link";
import type { PracticeAttempt, TrainingStage } from "@/types/speechAdventure";

interface Props {
  attempts: PracticeAttempt[];
  stage: TrainingStage;
  totalMissions: number;
  onRetry: () => void;
}

function getEncouragingMessage(avgScore: number): string {
  if (avgScore >= 85) return "ยอดเยี่ยมมาก! น้องเก่งมากๆ เลย";
  if (avgScore >= 70) return "ดีมากเลย! น้องพัฒนาได้ดีมาก";
  if (avgScore >= 55) return "ดีนะ! การฝึกทุกวันทำให้น้องเก่งขึ้นแน่นอน";
  return "สู้ต่อนะ! ฝึกบ่อยๆ จะเก่งขึ้นทุกวันเลย";
}

function computeFilledStars(totalStars: number, totalMissions: number): number {
  const maxStars = totalMissions * 3;
  if (maxStars === 0) return 0;
  return Math.round((totalStars / maxStars) * 3);
}

export default function LevelCompletionSummary({ attempts, stage, totalMissions, onRetry }: Props) {
  const avgScore =
    attempts.length > 0
      ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
      : 0;
  const totalStars = attempts.reduce((sum, a) => sum + a.starsEarned, 0);
  const uniqueMissions = new Set(attempts.map((a) => a.practiceItemId)).size;
  const filledStars = computeFilledStars(totalStars, totalMissions);

  return (
    <div className="animate-bounce-in space-y-4">
      {/* ── Main completion card ── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Color accent bar */}
        <div className="h-1" style={{ backgroundColor: stage.accentColor }} />

        <div className="p-8 text-center">
          {/* Stage badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold text-white mb-6"
            style={{ backgroundColor: stage.accentColor }}
          >
            <span aria-hidden="true"><DisplayIcon name={stage.icon} /></span>
            {stage.name}
          </div>

          <h2 className="text-2xl font-bold text-text mb-2">สำเร็จแล้ว!</h2>
          <p className="text-text-muted mb-8">{getEncouragingMessage(avgScore)}</p>

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

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-bg dark:bg-white/5 rounded-xl p-4 border border-border">
              <p className="text-xl font-bold text-primary leading-none mb-1">
                {uniqueMissions}/{totalMissions}
              </p>
              <p className="text-xs text-text-muted">ภารกิจ</p>
            </div>
            <div className="bg-bg dark:bg-white/5 rounded-xl p-4 border border-border">
              <p className="text-xl font-bold text-success leading-none mb-1">{avgScore}%</p>
              <p className="text-xs text-text-muted">คะแนนเฉลี่ย</p>
            </div>
            <div className="bg-bg dark:bg-white/5 rounded-xl p-4 border border-border">
              <p className="text-xl font-bold text-secondary leading-none mb-1">★ {totalStars}</p>
              <p className="text-xs text-text-muted">ดาวรวม</p>
            </div>
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
    </div>
  );
}
