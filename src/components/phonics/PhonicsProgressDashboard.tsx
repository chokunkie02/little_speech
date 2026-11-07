"use client";

import { plainFeedback } from "@/lib/speech-evaluation/plainFeedback";
import DisplayIcon from "@/components/ui/DisplayIcon";
import Link from "next/link";
import { usePhonicsProgress } from "@/hooks/usePhonicsProgress";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useCurrentChildAccess } from "@/hooks/useCurrentChildAccess";
import { getPhonicsUnits } from "@/data/kindergartenCurriculum";
import type { PhonicsUnit, PhonicsLesson, PhonicsAttempt } from "@/types/phonics";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  } catch {
    return "—";
  }
}

function phonicsStars(score: number): number {
  if (score >= 85) return 3;
  if (score >= 60) return 2;
  if (score >= 40) return 1;
  return 0;
}

const ACTIVITY_LABELS: Record<string, string> = {
  listen_and_choose: "ฟังและเลือก",
  say_after_me: "พูดตาม",
  blend_sounds: "ผสมเสียง",
  simple_word: "คำง่าย",
  final_consonant: "ตัวสะกด",
  short_sentence: "ประโยค",
};

const STATUS_LABELS = {
  passed: { label: "ผ่าน", color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30" },
  almost: { label: "เสียงใกล้แล้ว", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20" },
  retry: { label: "ลองอีกครั้ง", color: "text-text-muted bg-border/30" },
};

// ── Next recommendation ───────────────────────────────────────────────────────

function getNextRecommendation(
  units: PhonicsUnit[],
  completedLessonIds: Set<string>,
  attempts: PhonicsAttempt[],
): { unit: PhonicsUnit; lesson: PhonicsLesson } | null {
  if (attempts.length === 0) {
    const k1 = units[0];
    const l1 = k1?.lessons[0];
    if (k1 && l1) return { unit: k1, lesson: l1 };
    return null;
  }

  for (let i = 0; i < units.length; i++) {
    const unit = units[i]!;
    const prevUnit = i > 0 ? units[i - 1] : undefined;
    const prevCompleted =
      !prevUnit || prevUnit.lessons.every((l) => completedLessonIds.has(l.id));
    if (i > 0 && !prevCompleted) break;

    for (const lesson of unit.lessons) {
      if (!completedLessonIds.has(lesson.id)) return { unit, lesson };
    }
  }
  return null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3.5 text-center">
      <p className={`text-2xl font-bold leading-none ${accent ? "text-amber-600 dark:text-amber-400" : "text-text"}`}>
        {value}
      </p>
      <p className="text-xs text-text-muted mt-1 leading-snug">{label}</p>
      {sub && <p className="text-xs text-text-muted/60 mt-0.5">{sub}</p>}
    </div>
  );
}

function UnitProgressCard({
  unit,
  completedLessonIds,
  unitAttempts,
  isAvailable,
  canStart,
}: {
  unit: PhonicsUnit;
  completedLessonIds: Set<string>;
  unitAttempts: PhonicsAttempt[];
  isAvailable: boolean;
  canStart: boolean;
}) {
  const totalLessons = unit.lessons.length;
  const completedCount = unit.lessons.filter((l) => completedLessonIds.has(l.id)).length;
  const isCompleted = completedCount === totalLessons && totalLessons > 0;
  const isInProgress = !isCompleted && (completedCount > 0 || unitAttempts.length > 0);
  const avgScore =
    unitAttempts.length > 0
      ? Math.round(unitAttempts.reduce((s, a) => s + a.score, 0) / unitAttempts.length)
      : null;

  // Find first incomplete lesson for CTA
  const nextLesson = unit.lessons.find((l) => !completedLessonIds.has(l.id));
  const ctaHref =
    nextLesson && isAvailable
      ? `/training/phonics/${unit.id}/${nextLesson.id}`
      : `/training/phonics/${unit.id}/${unit.lessons[0]?.id ?? ""}`;

  const statusLabel = isCompleted ? "เรียนแล้ว" : isInProgress ? "กำลังเรียน" : "ยังไม่เริ่ม";
  const statusColor = isCompleted
    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
    : isInProgress
    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
    : "bg-border/40 text-text-muted/60";

  return (
    <div
      className={`bg-surface border rounded-xl p-4 transition-all ${
        isAvailable
          ? "border-border hover:border-amber-300 dark:hover:border-amber-600"
          : "border-border opacity-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
            isAvailable
              ? "bg-amber-100 dark:bg-amber-900/40"
              : "bg-border/30 dark:bg-border/20"
          }`}
        >
          <DisplayIcon name={unit.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                isAvailable
                  ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                  : "bg-border/50 text-text-muted/50"
              }`}
            >
              {unit.id}
            </span>
            <p className="text-sm font-semibold text-text leading-tight truncate">
              {unit.title}
            </p>
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
              {statusLabel}
            </span>
            <span className="text-xs text-text-muted">
              {completedCount}/{totalLessons} บทเรียน
            </span>
            {avgScore !== null && (
              <span className="text-xs text-text-muted">เฉลี่ย {avgScore}%</span>
            )}
          </div>

          {/* Progress bar */}
          {totalLessons > 0 && (
            <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isCompleted ? "bg-green-400 dark:bg-green-500" : "bg-amber-400 dark:bg-amber-500"
                }`}
                style={{ width: `${(completedCount / totalLessons) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      {isAvailable && canStart && (
        <div className="mt-3">
          {isCompleted ? (
            <Link
              href={ctaHref}
              className="block w-full text-center py-2 rounded-xl text-xs font-semibold bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 hover:bg-green-100 transition-all"
            >
              ดูบทเรียน →
            </Link>
          ) : (
            <Link
              href={ctaHref}
              className="block w-full text-center py-2 rounded-xl text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-sm shadow-amber-300/30"
            >
              {isInProgress ? "เรียนต่อ →" : "เริ่มเรียน →"}
            </Link>
          )}
        </div>
      )}

      {!isAvailable && (
        <p className="mt-2 text-xs text-text-muted/50 flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          ผ่านหน่วยก่อนหน้าก่อนนะ
        </p>
      )}
    </div>
  );
}

function RecentAttemptRow({ attempt }: { attempt: PhonicsAttempt }) {
  const stars = phonicsStars(attempt.score);
  const statusInfo = STATUS_LABELS[attempt.status] ?? STATUS_LABELS.retry;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-sm font-bold text-amber-700 dark:text-amber-400 flex-shrink-0">
        {attempt.score}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">{attempt.prompt}</p>
        <p className="text-xs text-text-muted mt-0.5">
          {attempt.unitId} · {ACTIVITY_LABELS[attempt.activityType] ?? attempt.activityType}
          <span className="mx-1 text-border">·</span>
          {formatDate(attempt.createdAt)}
        </p>
        {attempt.feedback && (
          <p className="text-xs text-text-muted/70 mt-0.5 truncate">{plainFeedback(attempt.feedback)}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
        {stars > 0 && (
          <span className="text-xs text-amber-500">{"★".repeat(stars)}</span>
        )}
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function PhonicsProgressDashboard() {
  const { progress, summary, completedLessonIds, isHydrated } = usePhonicsProgress();
  const { profile } = useChildProfile();
  const { canStartPractice } = useCurrentChildAccess();

  const units = getPhonicsUnits();
  const attempts = progress?.attempts ?? [];
  const childName = profile?.name?.split(" ")[0] ?? "น้อง";

  // Stats
  const totalAttempts = attempts.length;
  const avgScore =
    totalAttempts > 0
      ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / totalAttempts)
      : 0;
  const totalStars = attempts.reduce((s, a) => s + a.starsEarned, 0);
  const completedLessonsCount = summary.completedLessonIds.length;
  const completedUnitsCount = summary.completedUnitIds.length;
  const sortedAttempts = [...attempts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const lastPracticeDate = sortedAttempts[0]?.createdAt ?? null;

  // Next recommendation
  const nextRec = getNextRecommendation(units, completedLessonIds, attempts);

  // Recent attempts (last 6)
  const recentAttempts = sortedAttempts.slice(0, 6);

  // ── Loading ──
  if (!isHydrated) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── No profile ──
  if (!profile) {
    return (
      <div className="px-4 sm:px-6 py-10 text-center space-y-4">
        <p className="text-text font-semibold">กรุณาตั้งค่าโปรไฟล์เด็กก่อน</p>
        <Link
          href="/onboarding"
          className="inline-flex px-5 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-all"
        >
          ตั้งค่าโปรไฟล์ →
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 space-y-7 max-w-3xl mx-auto">

      {/* ── Header ── */}
      <header>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-lg" aria-hidden="true"><DisplayIcon name="star" /></span>
              <h2 className="text-xl font-bold text-text">ความก้าวหน้าเสียงไทย</h2>
            </div>
            <p className="text-sm text-text-muted">
              {profile.name} · อายุ {profile.age} ปี
              {lastPracticeDate && (
                <> · ฝึกล่าสุด {formatDate(lastPracticeDate)}</>
              )}
            </p>
          </div>
          <Link
            href="/training"
            className="flex-shrink-0 text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 px-3 py-1.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all border border-amber-200 dark:border-amber-700/50"
          >
            สวนเสียง →
          </Link>
        </div>
      </header>

      {/* ── No data: empty state ── */}
      {totalAttempts === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-amber-200 dark:border-amber-700/50 bg-amber-50/60 dark:bg-amber-950/20 px-6 py-10 text-center space-y-4">
          <div className="text-5xl" aria-hidden="true"><DisplayIcon name="sprout" /></div>
          <div>
            <h3 className="text-base font-bold text-amber-700 dark:text-amber-400">
              ยังไม่มีประวัติการเรียนเสียงไทย
            </h3>
            <p className="text-sm text-amber-600/80 dark:text-amber-500/80 mt-1">
              เริ่มฝึกหน่วยแรกเพื่อติดตามความก้าวหน้านะคะ
            </p>
          </div>
          {canStartPractice && (
            <Link
              href="/training/phonics/K1/K1-L1"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-all shadow-sm shadow-amber-300/30"
            >
              เริ่มเรียนเสียงไทย →
            </Link>
          )}
        </div>
      )}

      {/* ── Summary stats ── */}
      {totalAttempts > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 px-0.5">
            ภาพรวม
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="ครั้งที่ฝึก" value={totalAttempts} accent />
            <StatCard label="บทเรียนที่ผ่าน" value={completedLessonsCount} />
            <StatCard label="คะแนนเฉลี่ย" value={`${avgScore}%`} accent />
            <StatCard label="ดาวสะสม" value={`★ ${totalStars}`} />
          </div>
          {completedUnitsCount > 0 && (
            <p className="text-center text-xs text-text-muted/70 mt-2">
              ผ่านหน่วยแล้ว {completedUnitsCount}/{units.length} หน่วย · {childName}กำลังเรียนรู้ได้ดี
            </p>
          )}
        </section>
      )}

      {/* ── Next recommendation ── */}
      {nextRec && canStartPractice && (
        <section>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 px-0.5">
            วันนี้เรียนอะไรต่อดี
          </h3>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-700/50 px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-2xl flex-shrink-0">
              <DisplayIcon name={nextRec.unit.icon} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-0.5">
                {nextRec.unit.id} · {nextRec.unit.title}
              </p>
              <p className="text-sm font-semibold text-text leading-snug">{nextRec.lesson.title}</p>
              {nextRec.lesson.subtitle && (
                <p className="text-xs text-text-muted mt-0.5">{nextRec.lesson.subtitle}</p>
              )}
            </div>
            <Link
              href={`/training/phonics/${nextRec.unit.id}/${nextRec.lesson.id}`}
              className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-all shadow-sm shadow-amber-300/30 active:scale-[0.97]"
            >
              เรียนต่อ →
            </Link>
          </div>
        </section>
      )}

      {/* ── All completed message ── */}
      {!nextRec && totalAttempts > 0 && (
        <div className="rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 px-5 py-4 text-center">
          <p className="text-base font-bold text-green-700 dark:text-green-400">
             ยอดเยี่ยมมาก! ผ่านทุกบทเรียนที่เปิดอยู่แล้ว
          </p>
          <p className="text-sm text-green-600/80 dark:text-green-500/80 mt-1">
            หน่วยใหม่กำลังเตรียมพร้อม รอติดตามด้วยนะคะ
          </p>
        </div>
      )}

      {/* ── Unit progress grid ── */}
      <section>
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 px-0.5">
          หน่วยการเรียน K1–K7
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {units.map((unit, i) => {
            const prevUnit = i > 0 ? units[i - 1] : undefined;
            const prevCompleted =
              !prevUnit || prevUnit.lessons.every((l) => completedLessonIds.has(l.id));
            const isAvailable = i === 0 || prevCompleted;
            const unitAttempts = attempts.filter((a) => a.unitId === unit.id);
            return (
              <UnitProgressCard
                key={unit.id}
                unit={unit}
                completedLessonIds={completedLessonIds}
                unitAttempts={unitAttempts}
                isAvailable={isAvailable}
                canStart={canStartPractice}
              />
            );
          })}
        </div>
      </section>

      {/* ── Recent attempts ── */}
      {recentAttempts.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 px-0.5">
            ประวัติล่าสุด
          </h3>
          <div className="bg-surface border border-border rounded-xl px-4 divide-y divide-border">
            {recentAttempts.map((attempt) => (
              <RecentAttemptRow key={attempt.id} attempt={attempt} />
            ))}
          </div>
        </section>
      )}

      <div className="pb-4" />
    </div>
  );
}
