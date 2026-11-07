"use client";

import DisplayIcon from "@/components/ui/DisplayIcon";
import type { TrainingStage } from "@/types/speechAdventure";
import Link from "next/link";

interface Props {
  stage: TrainingStage;
  index: number;
  /** When false the practice CTAs are disabled (viewer role). */
  canStartPractice?: boolean;
}

export default function LevelCard({ stage, index, canStartPractice = true }: Props) {
  const isLocked = stage.status === "locked";
  const isCompleted = stage.status === "completed";
  const isCurrent = stage.status === "current";

  return (
    <div
      className={`relative bg-surface border rounded-xl transition-all duration-200 ${
        isLocked
          ? "opacity-50 border-border/50 bg-bg dark:bg-white/2"
          : isCurrent
          ? "border-l-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-default"
          : isCompleted
          ? "border-border hover:shadow-sm hover:-translate-y-0.5"
          : "border-border hover:shadow-md hover:-translate-y-0.5"
      }`}
      style={
        isCurrent
          ? { borderLeftColor: stage.accentColor, borderColor: `${stage.accentColor}30` }
          : undefined
      }
    >
      {/* Current stage glow */}
      {isCurrent && (
        <div
          className="absolute inset-0 rounded-xl opacity-5 dark:opacity-10 pointer-events-none"
          style={{ backgroundColor: stage.accentColor }}
        />
      )}

      <div className={`flex items-center gap-3 relative ${isCurrent ? "p-4" : isCompleted ? "p-3.5" : "p-4"}`}>
        {/* Icon */}
        <div
          className={`flex-shrink-0 rounded-xl flex items-center justify-center ${
            isCurrent ? "w-11 h-11" : "w-9 h-9"
          }`}
          style={{ backgroundColor: isLocked ? undefined : `${stage.accentColor}15` }}
          aria-hidden="true"
        >
          {isLocked ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ) : isCompleted ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF82" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <span className={isCurrent ? "text-xl" : "text-lg"}><DisplayIcon name={stage.icon} /></span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full text-white flex-shrink-0"
              style={{ backgroundColor: isLocked ? "#94A3B8" : stage.accentColor }}
            >
              {index + 1}
            </span>
            <h3 className={`font-semibold text-text leading-snug ${isCurrent ? "text-sm" : "text-sm"}`}>
              {stage.name}
            </h3>
            {isCompleted && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/12 text-success flex-shrink-0">
                สำเร็จ
              </span>
            )}
            {isCurrent && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full text-white animate-pulse-gentle flex-shrink-0"
                style={{ backgroundColor: stage.accentColor }}
              >
                กำลังฝึก
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">{stage.shortGoal}</p>

          {/* Stars row */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: stage.starsTotal }).map((_, i) => (
                <span
                  key={i}
                  className={`text-xs ${i < stage.starsEarned ? "text-secondary" : "text-disabled dark:text-white/20"}`}
                  aria-hidden="true"
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-xs text-text-muted">
              {stage.starsEarned}/{stage.starsTotal}
            </span>
          </div>
        </div>

        {/* Inline action button (desktop) */}
        {!isLocked && (
          isCompleted
            // "Review" is always allowed — it only shows historical data
            ? <Link
                href={`/training/${stage.slug}`}
                className="hidden sm:flex-shrink-0 sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] flex-shrink-0 border border-current hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: stage.accentColor }}
              >
                ทบทวน
              </Link>
            : canStartPractice
              ? <Link
                  href={`/training/${stage.slug}`}
                  className={`hidden sm:flex-shrink-0 sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] flex-shrink-0 ${
                    isCurrent ? "text-white shadow-sm" : "border border-current hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                  style={isCurrent ? { backgroundColor: stage.accentColor, color: "#fff" } : { color: stage.accentColor }}
                >
                  {isCurrent && stage.starsEarned > 0 ? "ฝึกต่อ" : "เริ่มฝึก"}
                </Link>
              : <span
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border/60 text-text-muted/60 cursor-not-allowed flex-shrink-0"
                  title="คุณมีสิทธิ์ดูเท่านั้น"
                >
                  {isCurrent && stage.starsEarned > 0 ? "ฝึกต่อ" : "เริ่มฝึก"}
                </span>
        )}
      </div>

      {/* Mobile full-width CTA */}
      {!isLocked && (
        isCompleted
          ? <Link
              href={`/training/${stage.slug}`}
              className="sm:hidden block text-center py-2 text-xs font-semibold border-t border-border/50 transition-all hover:bg-bg"
              style={{ color: stage.accentColor }}
            >
              ทบทวน
            </Link>
          : canStartPractice
            ? <Link
                href={`/training/${stage.slug}`}
                className="sm:hidden block text-center py-2 text-xs font-semibold border-t border-border/50 transition-all hover:bg-bg"
                style={{ color: stage.accentColor }}
              >
                {isCurrent && stage.starsEarned > 0 ? "ฝึกต่อ" : "เริ่มฝึก"}
              </Link>
            : <span
                className="sm:hidden block text-center py-2 text-xs text-text-muted/60 border-t border-border/50 cursor-not-allowed"
              >
                {isCurrent && stage.starsEarned > 0 ? "ฝึกต่อ" : "เริ่มฝึก"}
              </span>
      )}
      {isLocked && (
        <div className="text-center py-2 text-xs text-text-muted/70 border-t border-border/40 flex items-center justify-center gap-1.5">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          ทำด่านก่อนหน้าให้เสร็จก่อน
        </div>
      )}
    </div>
  );
}
