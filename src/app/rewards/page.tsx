"use client";

import DisplayIcon from "@/components/ui/DisplayIcon";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useSpeechProgress } from "@/hooks/useSpeechProgress";
import { usePhonicsProgress } from "@/hooks/usePhonicsProgress";
import { useChildProfile } from "@/hooks/useChildProfile";
import { calculateRewards } from "@/lib/rewards/calculateRewards";
import { mockTrainingStages } from "@/data/speechAdventureMockData";
import { getPhonicsUnits } from "@/data/kindergartenCurriculum";
import type { EarnedReward, RewardProgress } from "@/types/rewards";

// ── Icons ──────────────────────────────────────────────────────────────────────

function LockIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function BadgeIcon({ iconPath, color, size = 20 }: { iconPath: string; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPath.split("M").filter(Boolean).map((segment, i) => (
        <path key={i} d={`M${segment}`} />
      ))}
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l1.09 6.26L18 9.27l-4.91 1.01L12 18l-1.09-7.73L6 9.27l4.91-1.01L12 2z" />
    </svg>
  );
}

// ── Determine if a badge was earned recently (7 days) ──────────────────────────

function isRecentlyEarned(reward: EarnedReward, recentIds: Set<string>): boolean {
  return recentIds.has(reward.badge.id);
}

// ── Badge Cards ─────────────────────────────────────────────────────────────────

function EarnedBadgeCard({ reward, isRecent }: { reward: EarnedReward; isRecent: boolean }) {
  const { badge, earnedAt } = reward;
  const dateStr = (() => {
    try {
      return new Date(earnedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  })();

  return (
    <div
      className={`relative flex flex-col items-center text-center p-5 bg-surface border rounded-2xl transition-all group hover:shadow-md hover:-translate-y-0.5 ${
        isRecent
          ? "border-primary/30 shadow-sm shadow-primary/8"
          : "border-border shadow-sm"
      }`}
    >
      {/* Recently earned accent dot */}
      {isRecent && (
        <span className="absolute top-3 right-3 flex items-center gap-1 text-primary">
          <SparkleIcon />
        </span>
      )}

      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 relative"
        style={{ backgroundColor: `${badge.color}14` }}
        aria-label={badge.name}
      >
        <BadgeIcon iconPath={badge.iconPath} color={badge.color} size={26} />
        {/* Completed check mark */}
        <span
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white"
          style={{ backgroundColor: badge.color }}
        >
          <CheckCircleIcon />
        </span>
      </div>
      <h3 className="text-xs font-bold text-text leading-tight mb-0.5">{badge.name}</h3>
      <p className="text-xs text-text-muted leading-snug mb-2">{badge.description}</p>
      {dateStr && (
        <span
          className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full"
          style={{ color: badge.color, backgroundColor: `${badge.color}12` }}
        >
          {dateStr}
        </span>
      )}
    </div>
  );
}

function LockedBadgeCard({ progress }: { progress: RewardProgress }) {
  const { badge, current, target, percentage, hint } = progress;

  return (
    <div className="flex flex-col items-center text-center p-5 bg-bg dark:bg-white/2 border border-dashed border-border/60 rounded-2xl">
      <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-3 bg-gray-100 dark:bg-white/6">
        <div className="opacity-20">
          <BadgeIcon iconPath={badge.iconPath} color={badge.color} size={26} />
        </div>
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-200 dark:bg-white/15 flex items-center justify-center text-gray-400 dark:text-white/30">
          <LockIcon size={10} />
        </span>
      </div>
      <h3 className="text-xs font-bold text-text-muted/60 leading-tight mb-0.5">{badge.name}</h3>
      <p className="text-xs text-text-muted/40 leading-snug mb-2">{badge.description}</p>

      {target > 1 && (
        <div className="w-full mb-1.5">
          <div className="h-1 bg-gray-200 dark:bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${percentage}%`, backgroundColor: badge.color, opacity: 0.5 }}
            />
          </div>
          <p className="text-xs text-text-muted/50 mt-1">
            {current} / {target}
          </p>
        </div>
      )}

      <p className="text-xs text-text-muted/40 italic">{hint}</p>
    </div>
  );
}

function InProgressCard({ progress }: { progress: RewardProgress }) {
  const { badge, current, target, percentage, hint } = progress;

  return (
    <div
      className="flex items-center gap-4 p-4 bg-surface border rounded-xl transition-all hover:shadow-sm"
      style={{ borderColor: `${badge.color}25` }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${badge.color}10` }}
      >
        <div className="opacity-60">
          <BadgeIcon iconPath={badge.iconPath} color={badge.color} size={18} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-text">{badge.name}</p>
          {target > 1 && (
            <span className="text-xs font-medium text-text-muted">{current}/{target}</span>
          )}
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden mb-1.5">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${percentage}%`, backgroundColor: badge.color }}
          />
        </div>
        <p className="text-xs text-text-muted">{hint}</p>
      </div>
    </div>
  );
}

// ── Recent Achievement Banner ──────────────────────────────────────────────────

function RecentBadgeBanner({ reward }: { reward: EarnedReward }) {
  const { badge } = reward;
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl border"
      style={{ backgroundColor: `${badge.color}0A`, borderColor: `${badge.color}25` }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${badge.color}14` }}
      >
        <BadgeIcon iconPath={badge.iconPath} color={badge.color} size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold" style={{ color: badge.color }}>ปลดล็อกสำเร็จ</p>
        <p className="text-sm font-bold text-text">{badge.name}</p>
        <p className="text-xs text-text-muted truncate">{badge.description}</p>
      </div>
    </div>
  );
}

// ── Next Reward / Next Action Card ─────────────────────────────────────────────

function NextActionCard({
  nextBadge,
  allCompleted,
  currentStageId,
}: {
  nextBadge: RewardProgress | null;
  allCompleted: boolean;
  currentStageId: string | null;
}) {
  // All badges earned
  if (allCompleted) {
    return (
      <section
        className="rounded-2xl border border-success/20 p-5"
        style={{ background: "linear-gradient(135deg, rgba(76,175,130,0.06) 0%, rgba(108,99,255,0.03) 100%)" }}
        aria-label="ขั้นต่อไป"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4CAF82" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-success">ปลดล็อกครบแล้ว!</p>
            <p className="text-xs text-text-muted">น้องได้รับเหรียญตราครบทุกเหรียญแล้ว</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href="/training/review"
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-all active:scale-[0.98]"
          >
            ทบทวน Review
          </Link>
          <Link
            href="/profile"
            className="flex-1 flex items-center justify-center gap-2 border border-primary/30 text-primary font-semibold py-2.5 rounded-xl text-sm hover:bg-primary/8 transition-all active:scale-[0.98]"
          >
            เปลี่ยนเสียงเป้าหมาย
          </Link>
        </div>
      </section>
    );
  }

  // No data / no progress
  if (!nextBadge) {
    const nextStage = currentStageId
      ? mockTrainingStages.find((s) => s.id === currentStageId)
      : null;

    return (
      <section
        className="rounded-2xl border border-primary/15 p-5"
        style={{ background: "linear-gradient(135deg, rgba(108,99,255,0.06) 0%, rgba(255,179,71,0.03) 100%)" }}
        aria-label="ขั้นต่อไป"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <SparkleIcon />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text">เริ่มต้นสะสมเหรียญ</p>
            <p className="text-xs text-text-muted">ฝึกภารกิจแรกเพื่อปลดล็อกเหรียญตรา</p>
          </div>
          <Link
            href={nextStage ? `/training/${nextStage.slug}` : "/training"}
            className="flex-shrink-0 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98]"
          >
            ฝึกเลย
          </Link>
        </div>
      </section>
    );
  }

  // Closest badge to unlock
  const { badge, current, target, percentage, hint } = nextBadge;

  return (
    <section
      className="rounded-2xl border p-5"
      style={{
        borderColor: `${badge.color}25`,
        background: `linear-gradient(135deg, ${badge.color}08 0%, transparent 60%)`,
      }}
      aria-label="เหรียญตราถัดไป"
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${badge.color}14` }}
        >
          <BadgeIcon iconPath={badge.iconPath} color={badge.color} size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: badge.color }}>เหรียญตราถัดไป</p>
          <p className="text-sm font-bold text-text">{badge.name}</p>
        </div>
        {target > 1 && (
          <span className="text-sm font-bold text-text-muted flex-shrink-0">
            {current}<span className="text-text-muted/50 font-medium">/{target}</span>
          </span>
        )}
      </div>
      <div className="h-2 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${percentage}%`, backgroundColor: badge.color }}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">{hint}</p>
        <span className="text-xs font-semibold" style={{ color: badge.color }}>{percentage}%</span>
      </div>
    </section>
  );
}

// ── Phonics milestone definition ───────────────────────────────────────────────

interface PhonicsMilestone {
  id: string;
  icon: string;
  name: string;
  description: string;
  color: string;
  earned: boolean;
  earnedLabel?: string;
}

function buildPhonicsMilestones(
  completedLessonIds: Set<string>,
  completedUnitIds: Set<string>,
  totalAttempts: number,
): PhonicsMilestone[] {
  const units = getPhonicsUnits();
  const milestones: PhonicsMilestone[] = [
    {
      id: "first_phonics",
      icon: "sprout",
      name: "เริ่มเรียนเสียงไทยแล้ว",
      description: "ฝึกบทเรียนแรกของสวนเสียง",
      color: "#4CAF82",
      earned: totalAttempts >= 1,
      earnedLabel: "บทเรียนแรก",
    },
    {
      id: "first_lesson",
      icon: "star",
      name: "นักเรียนตัวน้อย",
      description: "ผ่านบทเรียนแรกสำเร็จ",
      color: "#F59E0B",
      earned: completedLessonIds.size >= 1,
    },
    {
      id: "listener",
      icon: "listen",
      name: "นักฟังเสียงตัวน้อย",
      description: "ผ่าน 3 บทเรียนขึ้นไป",
      color: "#6C63FF",
      earned: completedLessonIds.size >= 3,
    },
    {
      id: "k1_complete",
      icon: "target",
      name: "เรียนครบ K1",
      description: "ฟังและจดจำเสียงพยัญชนะครบแล้ว",
      color: "#F59E0B",
      earned: completedUnitIds.has("K1"),
    },
    {
      id: "k2_complete",
      icon: "letters",
      name: "นักพยัญชนะ",
      description: "ผ่านระดับพยัญชนะต้น K2",
      color: "#F59E0B",
      earned: completedUnitIds.has("K2"),
    },
    {
      id: "blender",
      icon: "shuffle",
      name: "นักผสมเสียง",
      description: "ผ่านระดับผสมเสียง K4",
      color: "#EC4899",
      earned: completedUnitIds.has("K4"),
    },
    {
      id: "word_master",
      icon: "book",
      name: "เก่งคำศัพท์",
      description: "ผ่านระดับคำง่าย K5",
      color: "#8B5CF6",
      earned: completedUnitIds.has("K5"),
    },
    {
      id: "half_way",
      icon: "award",
      name: "ครึ่งทางแล้ว!",
      description: "ผ่านครึ่งหนึ่งของสวนเสียง (4 ระดับ)",
      color: "#F59E0B",
      earned: completedUnitIds.size >= 4,
    },
    {
      id: "all_units",
      icon: "star",
      name: "ผ่านสวนเสียงครบแล้ว!",
      description: `ผ่านทั้ง ${units.length} ระดับในสวนเสียง`,
      color: "#F59E0B",
      earned: completedUnitIds.size >= units.length,
    },
  ];
  return milestones;
}

// ── Phonics Rewards View ───────────────────────────────────────────────────────

function PhonicsRewardsView() {
  const { summary, completedLessonIds, completedUnitIds, progress, isHydrated } = usePhonicsProgress();
  const units = getPhonicsUnits();

  if (!isHydrated) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-border/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const totalAttempts = summary.totalAttempts;
  const completedLessons = summary.completedLessonIds.length;
  const completedUnitsCount = summary.completedUnitIds.length;
  const starsEarned = progress?.attempts.reduce((s, a) => s + a.starsEarned, 0) ?? 0;

  const milestones = buildPhonicsMilestones(completedLessonIds, completedUnitIds, totalAttempts);
  const earned = milestones.filter((m) => m.earned);
  const locked = milestones.filter((m) => !m.earned);

  const latestAttempt = progress?.attempts.length
    ? [...progress.attempts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0]
    : null;

  return (
    <div className="space-y-6">
      {/* ── Hero stats ── */}
      <div
        className="rounded-2xl border border-amber-200 dark:border-amber-800/40 p-5"
        style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(251,191,36,0.04) 100%)" }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
              ดาวสะสม
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold text-amber-500 leading-none">{starsEarned}</span>
              <span className="text-base text-amber-600 dark:text-amber-400 font-semibold">ดาว</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
              บทเรียนผ่าน
            </p>
            <div className="flex items-baseline gap-1 justify-center">
              <span className="text-4xl font-bold text-amber-500 leading-none">{completedLessons}</span>
              <span className="text-base text-text-muted font-medium">บทเรียน</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
              ระดับผ่าน
            </p>
            <div className="flex items-baseline gap-1 justify-end">
              <span className="text-4xl font-bold text-amber-500 leading-none">{completedUnitsCount}</span>
              <span className="text-base text-text-muted font-medium">/ {units.length}</span>
            </div>
          </div>
        </div>

        {/* Unit progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-amber-700/70 dark:text-amber-400/70">ความคืบหน้าสวนเสียง</p>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {Math.round((completedUnitsCount / units.length) * 100)}%
            </p>
          </div>
          <div className="h-2 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.round((completedUnitsCount / units.length) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="flex gap-3">
        <Link
          href="/training"
          className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white font-semibold py-3 rounded-xl hover:bg-amber-600 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm shadow-amber-300/30 text-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 3l14 9-14 9V3z" />
          </svg>
          เรียนต่อ
        </Link>
        <Link
          href="/progress"
          className="flex-1 flex items-center justify-center gap-2 border border-amber-400 text-amber-600 dark:text-amber-400 font-semibold py-3 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all text-sm"
        >
          ดูความก้าวหน้า
        </Link>
      </div>

      {/* ── Empty state ── */}
      {totalAttempts === 0 && (
        <div className="bg-surface border border-border rounded-2xl p-8 text-center">
          <div className="text-5xl mb-3" aria-hidden="true"><DisplayIcon name="sprout" /></div>
          <h2 className="text-base font-bold text-text mb-1">ยังไม่มีความสำเร็จ</h2>
          <p className="text-sm text-text-muted mb-5">เริ่มเรียนบทเรียนแรกเพื่อสะสมดาวและความสำเร็จ</p>
          <Link
            href="/training"
            className="inline-flex items-center gap-2 bg-amber-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-amber-600 transition-all active:scale-[0.98]"
          >
            เริ่มเรียนเสียงไทย →
          </Link>
        </div>
      )}

      {/* ── Latest attempt ── */}
      {latestAttempt && (
        <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="text-2xl flex-shrink-0" aria-hidden="true"><DisplayIcon name="mic" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-muted">ฝึกล่าสุด</p>
            <p className="text-sm font-semibold text-text truncate">
              {latestAttempt.prompt}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {latestAttempt.unitId} · {new Date(latestAttempt.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{latestAttempt.score}%</p>
            <p className="text-xs text-amber-500">{"★".repeat(latestAttempt.starsEarned) || "–"}</p>
          </div>
        </div>
      )}

      {/* ── Earned milestones ── */}
      {earned.length > 0 && (
        <section aria-label="ความสำเร็จที่ได้รับ">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            ความสำเร็จที่ได้รับ ({earned.length})
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {earned.map((m) => (
              <div
                key={m.id}
                className="flex flex-col items-center text-center p-4 bg-surface border rounded-2xl shadow-sm"
                style={{ borderColor: `${m.color}30` }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2 text-3xl"
                  style={{ backgroundColor: `${m.color}14` }}
                  aria-hidden="true"
                >
                  <DisplayIcon name={m.icon} />
                </div>
                <h3 className="text-xs font-bold text-text leading-tight mb-0.5">{m.name}</h3>
                <p className="text-xs text-text-muted leading-snug">{m.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Locked milestones ── */}
      {locked.length > 0 && (
        <section aria-label="ความสำเร็จที่รอปลดล็อก">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            รอการปลดล็อก ({locked.length})
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {locked.map((m) => (
              <div
                key={m.id}
                className="flex flex-col items-center text-center p-4 bg-bg dark:bg-white/2 border border-dashed border-border/60 rounded-2xl opacity-50"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2 text-3xl bg-gray-100 dark:bg-white/6" aria-hidden="true">
                  <DisplayIcon name={m.icon} />
                </div>
                <h3 className="text-xs font-bold text-text-muted leading-tight mb-0.5">{m.name}</h3>
                <p className="text-xs text-text-muted/60 leading-snug">{m.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RewardsPage() {
  const { profile, isHydrated: profileHydrated } = useChildProfile();
  const { progress, summary, isHydrated } = useSpeechProgress();

  const result = isHydrated ? calculateRewards(progress) : null;
  const { earned = [], locked = [], recentAchievements = [], totalBadges = 10, earnedCount = 0 } = result ?? {};

  // Split locked into "in progress" (percentage > 0) and "not started"
  const inProgress = locked.filter((p) => p.percentage > 0).sort((a, b) => b.percentage - a.percentage);
  const notStarted = locked.filter((p) => p.percentage === 0);

  const totalStars = summary.starsEarned;
  const earnPercent = totalBadges > 0 ? Math.round((earnedCount / totalBadges) * 100) : 0;
  const allCompleted = isHydrated && earnedCount === totalBadges;

  // Closest badge to unlock: highest percentage among locked, or first in-progress
  const nextBadge = allCompleted ? null : (inProgress[0] ?? notStarted[0] ?? null);

  // Set of recently earned badge IDs for accent styling
  const recentIds = new Set(recentAchievements.map((r) => r.badge.id));

  // Current stage for CTA
  const currentStage = isHydrated
    ? mockTrainingStages.find((s) => s.id === summary.currentStageId)
    : null;

  const isPhonicsMode = profileHydrated && profile?.trainingMode === "kindergarten_phonics";

  // ── Phonics mode: replace entire page content ────────────────────────────────
  if (isPhonicsMode) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
          <header>
            <nav className="text-xs text-text-muted mb-2" aria-label="Breadcrumb">
              <Link href="/dashboard" className="hover:text-primary transition-colors">หน้าหลัก</Link>
              <span className="mx-1.5 text-disabled">/</span>
              <span className="text-text font-medium">ความสำเร็จ</span>
            </nav>
            <h1 className="text-xl font-bold text-text">ความสำเร็จ</h1>
            <p className="text-sm text-text-muted mt-0.5">ติดตามพัฒนาการสวนเสียงของน้อง</p>
          </header>
          <PhonicsRewardsView />
          <div className="pb-4" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text">รางวัลและเหรียญตรา</h1>
            <p className="text-sm text-text-muted mt-0.5">ติดตามความสำเร็จและแรงบันดาลใจของน้อง</p>
          </div>
          {isHydrated && summary.totalAttempts > 0 && (
            <Link
              href={currentStage ? `/training/${currentStage.slug}` : "/training"}
              className="flex-shrink-0 inline-flex items-center gap-2 bg-primary text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm shadow-primary/20"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
              ฝึกต่อ
            </Link>
          )}
        </div>

        {/* ── Hero stat bar ── */}
        <div
          className="rounded-2xl border border-border p-5"
          style={{ background: "linear-gradient(135deg, rgba(108,99,255,0.06) 0%, rgba(255,179,71,0.04) 100%)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">ดาวสะสมทั้งหมด</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-bold text-secondary leading-none">
                  {isHydrated ? totalStars : "—"}
                </span>
                <span className="text-base text-secondary font-semibold">ดาว</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">เหรียญตรา</p>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-4xl font-bold text-primary leading-none">
                  {isHydrated ? earnedCount : "—"}
                </span>
                <span className="text-base text-text-muted font-medium">/ {totalBadges}</span>
              </div>
            </div>
          </div>

          {/* Overall badge progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-text-muted">ความคืบหน้า</p>
              <p className="text-xs font-semibold text-primary">{isHydrated ? earnPercent : 0}%</p>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${isHydrated ? earnPercent : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Next Reward / Next Action Card ── */}
        {isHydrated && (
          <NextActionCard
            nextBadge={nextBadge ?? null}
            allCompleted={allCompleted}
            currentStageId={summary.currentStageId}
          />
        )}

        {/* ── No data state ── */}
        {isHydrated && summary.totalAttempts === 0 && (
          <section className="bg-surface border border-border rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-text mb-1">ยังไม่มีเหรียญตรา</h2>
            <p className="text-sm text-text-muted mb-5">เริ่มฝึกเพื่อสะสมเหรียญตรา</p>
            <Link
              href="/training"
              className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              เริ่มฝึกเลย
            </Link>
          </section>
        )}

        {/* ── Recent Achievements ── */}
        {isHydrated && recentAchievements.length > 0 && (
          <section aria-label="ความสำเร็จล่าสุด">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">ความสำเร็จล่าสุด (7 วัน)</p>
            <div className="space-y-2">
              {recentAchievements.map((r) => (
                <RecentBadgeBanner key={r.badge.id} reward={r} />
              ))}
            </div>
          </section>
        )}

        {/* ── Earned Badges ── */}
        {isHydrated && earned.length > 0 && (
          <section aria-label="เหรียญตราที่ได้รับ">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              เหรียญตราที่ได้รับ ({earned.length})
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {earned.map((r) => (
                <EarnedBadgeCard
                  key={r.badge.id}
                  reward={r}
                  isRecent={isRecentlyEarned(r, recentIds)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── In Progress ── */}
        {isHydrated && inProgress.length > 0 && (
          <section aria-label="กำลังดำเนินการ">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">ใกล้จะปลดล็อกแล้ว</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {inProgress.map((p) => (
                <InProgressCard key={p.badge.id} progress={p} />
              ))}
            </div>
          </section>
        )}

        {/* ── Locked Badges ── */}
        {isHydrated && notStarted.length > 0 && (
          <section aria-label="เหรียญตราที่ยังล็อก">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              รอการปลดล็อก ({notStarted.length})
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {notStarted.map((p) => (
                <LockedBadgeCard key={p.badge.id} progress={p} />
              ))}
            </div>
          </section>
        )}

        {/* ── Skeleton while hydrating ── */}
        {!isHydrated && (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-gray-100 dark:bg-white/6 animate-pulse" />
            ))}
          </section>
        )}

        {/* ── Bottom CTA ── */}
        {isHydrated && summary.totalAttempts > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/training"
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm shadow-primary/20 text-sm"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
              ไปฝึกต่อ
            </Link>
            <Link
              href="/progress"
              className="flex-1 flex items-center justify-center gap-2 border border-primary text-primary font-semibold py-3 rounded-xl hover:bg-primary/8 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" x2="18" y1="20" y2="10" />
                <line x1="12" x2="12" y1="20" y2="4" />
                <line x1="6" x2="6" y1="20" y2="14" />
              </svg>
              ดูรายงาน
            </Link>
          </div>
        )}

        <div className="pb-4" />
      </div>
    </AppShell>
  );
}
