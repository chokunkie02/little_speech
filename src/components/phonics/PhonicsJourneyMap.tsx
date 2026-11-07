"use client";

import DisplayIcon from "@/components/ui/DisplayIcon";
import { useState } from "react";
import Link from "next/link";
import { getPhonicsUnits } from "@/data/kindergartenCurriculum";
import type { PhonicsUnit, PhonicsLesson, PhonicsActivityType } from "@/types/phonics";

// ── Labels ────────────────────────────────────────────────────────────────────

const ACTIVITY_LABELS: Record<PhonicsActivityType, string> = {
  listen_and_choose: "ฟังและเลือก",
  say_after_me: "พูดตาม",
  blend_sounds: "ผสมเสียง",
  simple_word: "คำง่าย",
  final_consonant: "ตัวสะกด",
  short_sentence: "ประโยค",
};

// ── Unit status ───────────────────────────────────────────────────────────────

function isUnitCompleted(unit: PhonicsUnit, completedLessonIds: Set<string>): boolean {
  return unit.lessons.length > 0 && unit.lessons.every((l) => completedLessonIds.has(l.id));
}

function getUnitStatus(
  unit: PhonicsUnit,
  completedLessonIds: Set<string>,
  previousUnit: PhonicsUnit | undefined,
): "available" | "completed" | "locked" {
  if (isUnitCompleted(unit, completedLessonIds)) return "completed";
  if (unit.order === 1) return "available";
  // Unlock when previous unit is completed
  if (previousUnit && isUnitCompleted(previousUnit, completedLessonIds)) return "available";
  return "locked";
}

// ── Total items across all lessons in a unit ───────────────────────────────────
function totalItems(unit: PhonicsUnit): number {
  return unit.lessons.reduce((n, l) => n + l.items.length, 0);
}

// ── Unique activity types used in a lesson ────────────────────────────────────
function lessonActivitySummary(lesson: PhonicsLesson): string {
  const types = [...new Set(lesson.items.map((i) => i.type))];
  return types.map((t) => ACTIVITY_LABELS[t]).join(" · ");
}

// ── Lock icon SVG ─────────────────────────────────────────────────────────────
function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ── Chevron icon ──────────────────────────────────────────────────────────────
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  /** When false the child is a shared/read-only view — hide start buttons. */
  canStart: boolean;
  /** Lesson IDs that have been completed (from usePhonicsProgress). */
  completedLessonIds?: Set<string>;
}

// ── Lesson panel (shown when an available unit is expanded) ───────────────────

function LessonPanel({
  unit,
  completedLessonIds,
  canStart,
}: {
  unit: PhonicsUnit;
  completedLessonIds: Set<string>;
  canStart: boolean;
}) {
  const hasAnyCompleted = unit.lessons.some((l) => completedLessonIds.has(l.id));

  return (
    <div className="mt-3 rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50/60 dark:bg-amber-950/20 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-amber-200 dark:border-amber-700/40">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
          บทเรียนใน {unit.id}
        </p>
      </div>

      <div className="divide-y divide-amber-100 dark:divide-amber-800/30">
        {unit.lessons.map((lesson) => {
          const isDone = completedLessonIds.has(lesson.id);
          const ctaLabel = isDone
            ? "ดูบทเรียน →"
            : hasAnyCompleted
            ? "เรียนต่อ →"
            : "เริ่มเรียน →";
          const ctaClass = isDone
            ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 hover:bg-green-100 dark:hover:bg-green-900/30"
            : "bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-300/30";

          return (
            <div key={lesson.id} className="px-4 py-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  {lesson.order}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text leading-snug">{lesson.title}</p>
                {lesson.subtitle && (
                  <p className="text-xs text-text-muted mt-0.5">{lesson.subtitle}</p>
                )}
                <p className="text-xs text-text-muted/70 mt-1">
                  {lessonActivitySummary(lesson)}
                  <span className="mx-1.5 text-border">·</span>
                  {lesson.items.length} กิจกรรม
                </p>
              </div>
              {canStart && (
                <div className="flex-shrink-0 self-center">
                  <Link
                    href={`/training/phonics/${unit.id}/${lesson.id}`}
                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.97] ${ctaClass}`}
                  >
                    {ctaLabel}
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2.5 border-t border-amber-200 dark:border-amber-700/40 bg-amber-50/80 dark:bg-amber-950/30">
        <p className="text-xs text-amber-600/70 dark:text-amber-500/70 text-center">
          {hasAnyCompleted ? "ฟังก่อน แล้วลองพูดตามนะ" : "กดปุ่มเพื่อเข้าสู่กิจกรรม"}
        </p>
      </div>
    </div>
  );
}

// ── Unit card ─────────────────────────────────────────────────────────────────

function UnitCard({
  unit,
  expanded,
  onToggle,
  canStart,
  status,
  completedLessonIds,
  isRecommended,
}: {
  unit: PhonicsUnit;
  expanded: boolean;
  onToggle: () => void;
  canStart: boolean;
  status: "available" | "completed" | "locked";
  completedLessonIds: Set<string>;
  isRecommended: boolean;
}) {
  const isAvailable = status === "available" || status === "completed";
  const items = totalItems(unit);
  const completedCount = unit.lessons.filter((l) => completedLessonIds.has(l.id)).length;
  const isInProgress = status === "available" && completedCount > 0;

  return (
    <div
      className={`rounded-xl border transition-all ${
        isAvailable
          ? expanded
            ? "border-amber-400 dark:border-amber-500 bg-surface shadow-sm shadow-amber-200/40 dark:shadow-amber-900/20"
            : isRecommended && status !== "completed"
            ? "border-amber-400 dark:border-amber-500 bg-surface ring-1 ring-amber-300/50 dark:ring-amber-600/30 shadow-sm shadow-amber-100/50"
            : "border-amber-200 dark:border-amber-700/60 bg-surface hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-sm"
          : "border-border bg-surface opacity-55"
      }`}
    >
      <button
        type="button"
        onClick={isAvailable ? onToggle : undefined}
        disabled={!isAvailable}
        aria-expanded={isAvailable ? expanded : undefined}
        className={`w-full flex items-center gap-4 px-4 py-4 text-left rounded-xl transition-colors ${
          isAvailable ? "cursor-pointer active:scale-[0.99]" : "cursor-not-allowed"
        }`}
      >
        {/* Icon badge */}
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
            isAvailable
              ? "bg-amber-100 dark:bg-amber-900/50"
              : "bg-border/40 dark:bg-border/20"
          }`}
        >
          <DisplayIcon name={unit.icon} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                isAvailable
                  ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400"
                  : "bg-border/50 text-text-muted/60"
              }`}
            >
              {unit.id}
            </span>
            <p
              className={`font-semibold text-sm leading-tight ${
                isAvailable ? "text-text" : "text-text-muted"
              }`}
            >
              {unit.title}
            </p>
          </div>
          <p className="text-xs text-text-muted leading-snug line-clamp-1">
            {unit.description}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-text-muted/60">
              {unit.lessons.length} บทเรียน · {items} กิจกรรม
            </span>
            {status === "available" && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                isInProgress
                  ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                  : "bg-border/40 text-text-muted/60"
              }`}>
                {isInProgress ? "กำลังเรียน" : "ยังไม่เริ่ม"}
              </span>
            )}
            {status === "locked" && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-border/40 text-text-muted/60">
                ล็อก
              </span>
            )}
          </div>
        </div>

        {/* Right side: CTA or lock */}
        <div className="flex-shrink-0 ml-1">
          {status === "completed" ? (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
              ✓ ผ่านแล้ว
            </span>
          ) : isAvailable ? (
            canStart ? (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="text-xs font-semibold hidden sm:inline">
                  {expanded ? "ปิด" : "ดูบทเรียน"}
                </span>
                <ChevronIcon open={expanded} />
              </div>
            ) : (
              <div className="text-text-muted/50">
                <ChevronIcon open={expanded} />
              </div>
            )
          ) : (
            <div className="text-text-muted/50">
              <LockIcon />
            </div>
          )}
        </div>
      </button>

      {/* Locked message */}
      {!isAvailable && (
        <div className="px-4 pb-3 -mt-1">
          <p className="text-xs text-text-muted/60 flex items-center gap-1.5">
            <LockIcon />
            ทำด่านก่อนหน้าให้เสร็จก่อน
          </p>
        </div>
      )}

      {/* Expandable lesson panel */}
      {isAvailable && expanded && (
        <div className="px-4 pb-4">
          <LessonPanel unit={unit} completedLessonIds={completedLessonIds} canStart={canStart} />
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PhonicsJourneyMap({ canStart, completedLessonIds = new Set() }: Props) {
  const units = getPhonicsUnits();

  // First available non-completed unit — used for highlight and auto-expand on first mount
  const recommendedUnitId: string | null = (() => {
    for (let i = 0; i < units.length; i++) {
      const u = units[i]!;
      const prev = i > 0 ? units[i - 1] : undefined;
      if (getUnitStatus(u, completedLessonIds, prev) === "available") return u.id;
    }
    return null;
  })();

  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(recommendedUnitId);

  if (units.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center">
        <p className="text-sm text-text-muted">ไม่พบข้อมูลหลักสูตร</p>
      </div>
    );
  }

  const toggleUnit = (unitId: string) => {
    setExpandedUnitId((prev) => (prev === unitId ? null : unitId));
  };

  const completedUnitCount = units.filter((u) => isUnitCompleted(u, completedLessonIds)).length;
  const availableCount = units.filter((u, i) => {
    const prev = units[i - 1];
    return getUnitStatus(u, completedLessonIds, prev) !== "locked";
  }).length;

  return (
    <div className="space-y-4">
      {/* Journey header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
            สวนเสียง
          </h2>
          <p className="text-xs text-text-muted/70 mt-0.5">
            {units.length} หน่วย · เรียนตามลำดับ
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-500 inline-block" />
          {completedUnitCount > 0
            ? `ผ่านแล้ว ${completedUnitCount}/${units.length}`
            : `เปิดใช้งาน ${availableCount}/${units.length}`}
        </div>
      </div>

      {/* Unit cards */}
      <div className="space-y-2">
        {units.map((unit, i) => {
          const prev = units[i - 1];
          const status = getUnitStatus(unit, completedLessonIds, prev);
          return (
            <UnitCard
              key={unit.id}
              unit={unit}
              expanded={expandedUnitId === unit.id}
              onToggle={() => toggleUnit(unit.id)}
              canStart={canStart}
              status={status}
              completedLessonIds={completedLessonIds}
              isRecommended={unit.id === recommendedUnitId}
            />
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-xs text-text-muted/60 text-center px-4">
        หน่วยถัดไปจะเปิดหลังจากผ่านหน่วยก่อนหน้า
      </p>
    </div>
  );
}
