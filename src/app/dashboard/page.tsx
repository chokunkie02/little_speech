"use client";

import { plainFeedback } from "@/lib/speech-evaluation/plainFeedback";
import DisplayIcon from "@/components/ui/DisplayIcon";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useSpeechProgress } from "@/hooks/useSpeechProgress";
import { usePhonicsProgress } from "@/hooks/usePhonicsProgress";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentChildAccess } from "@/hooks/useCurrentChildAccess";
import {
  getSpeechClarityHomeRecommendation,
  getPhonicsHomeRecommendation,
} from "@/lib/homeRecommendations";
import type { TrainingMode } from "@/lib/child-profile/childProfileStorage";
import type { PracticeAttempt } from "@/types/speechAdventure";
import type { PhonicsAttempt } from "@/types/phonics";

// ── Tiny inline SVG helpers (no external icon lib) ────────────────────────────

function StarIcon({ filled = false, size = 13 }: { filled?: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "#FFB347" : "none"}
      stroke="#FFB347"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ChevronRightIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function MicIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

// ── Mode label helpers ────────────────────────────────────────────────────────

function modeBadge(mode: TrainingMode) {
  if (mode === "kindergarten_phonics") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold">
        <DisplayIcon name="star" className="mr-1" /> เรียนเสียงไทย
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
      <DisplayIcon name="target" className="mr-1" /> ฝึกเสียงให้ชัด
    </span>
  );
}

function statusLabel(status: string) {
  if (status === "passed") return { text: "ผ่าน", cls: "text-emerald-600 dark:text-emerald-400" };
  if (status === "almost") return { text: "เสียงใกล้เคียงแล้ว", cls: "text-amber-600 dark:text-amber-400" };
  return { text: "ลองอีกครั้ง", cls: "text-rose-500 dark:text-rose-400" };
}

// ── Score pill ────────────────────────────────────────────────────────────────

function ScorePill({ score }: { score: number }) {
  const cls =
    score >= 80
      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
      : score >= 60
      ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
      : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${cls}`}>
      {score}%
    </span>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-border/40 dark:bg-white/8 ${className ?? ""}`} aria-hidden="true" />
  );
}

// ── Empty state card ──────────────────────────────────────────────────────────

function EmptyState({ message, cta, href }: { message: string; cta: string; href: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="text-4xl" aria-hidden="true"><DisplayIcon name="sprout" /></span>
      <p className="text-sm text-text-muted">{message}</p>
      <Link
        href={href}
        className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98]"
      >
        {cta}
      </Link>
    </div>
  );
}

// ── Stars row ─────────────────────────────────────────────────────────────────

function StarsRow({ stars, max = 3 }: { stars: number; max?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${stars} ดาว`}>
      {Array.from({ length: max }).map((_, i) => (
        <StarIcon key={i} filled={i < stars} size={12} />
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function ParentDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { profile, hasProfile, isHydrated, profiles, selectChild, selectedChildId } = useChildProfile();
  const { summary, isHydrated: spHydrated, selectedSoundId } = useSpeechProgress();
  const {
    summary: phonicsSummary,
    completedLessonIds,
    progress: phonicsProgress,
    isHydrated: phHydrated,
  } = usePhonicsProgress();
  const { canStartPractice } = useCurrentChildAccess();

  const trainingMode: TrainingMode = profile?.trainingMode ?? "speech_clarity";

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isHydrated || isAuthLoading) return;
    if (!isAuthenticated) router.replace("/auth/signin");
  }, [isHydrated, isAuthLoading, isAuthenticated, router]);

  // Redirect authenticated parents with no child profile
  useEffect(() => {
    if (!isHydrated || isAuthLoading || !isAuthenticated) return;
    if (!hasProfile) router.replace("/onboarding");
  }, [isHydrated, isAuthLoading, isAuthenticated, hasProfile, router]);

  // ── Recommendations ───────────────────────────────────────────────────────

  const speechRec =
    trainingMode === "speech_clarity" && spHydrated
      ? getSpeechClarityHomeRecommendation(summary)
      : null;

  const phonicsRec =
    trainingMode === "kindergarten_phonics" && phHydrated
      ? getPhonicsHomeRecommendation(completedLessonIds)
      : null;

  // ── Latest attempt ────────────────────────────────────────────────────────

  const latestSpeechAttempt: PracticeAttempt | null =
    summary.recentAttempts[0] ?? null;

  const latestPhonicsAttempt: PhonicsAttempt | null = (() => {
    if (!phonicsProgress?.attempts.length) return null;
    return [...phonicsProgress.attempts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0] ?? null;
  })();

  // ── CTAs ──────────────────────────────────────────────────────────────────

  const practiceHref =
    trainingMode === "kindergarten_phonics" && phonicsRec
      ? `/training/phonics/${phonicsRec.unitId}/${phonicsRec.lessonId}`
      : speechRec
      ? `/training/${speechRec.stageSlug}`
      : "/training";

  const progressHref = "/progress";
  const contentHref = "/library";

  // ── Loading guard ─────────────────────────────────────────────────────────
  // Show skeleton until hydrated; redirect guards above handle invalid states.

  const showSkeleton = !isHydrated || isAuthLoading;

  if (showSkeleton) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </AppShell>
    );
  }

  // ── No profile guard ──────────────────────────────────────────────────────
  if (!hasProfile || !profile) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
          <EmptyState
            message="ยังไม่มีโปรไฟล์เด็ก — ตั้งค่าก่อนเพื่อเริ่มฝึก"
            cta="ตั้งค่าโปรไฟล์เด็ก"
            href="/onboarding"
          />
        </div>
      </AppShell>
    );
  }

  // ── Derived display values ────────────────────────────────────────────────

  const childFirstName = profile.name.split(" ")[0] ?? profile.name;
  const targetSoundLabel = selectedSoundId || profile.targetSound || "ก";

  const phonicsCompletedCount = phonicsSummary.completedLessonIds.length;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Page header ── */}
        <header>
          <nav className="text-xs text-text-muted mb-2" aria-label="Breadcrumb">
            <Link href="/training" className="hover:text-primary transition-colors">ฝึกออกเสียง</Link>
            <span className="mx-1.5 text-disabled">/</span>
            <span className="text-text font-medium">หน้าหลัก</span>
          </nav>
          <h1 className="text-xl font-bold text-text">
            วันนี้จะฝึกอะไรกับ{childFirstName}?
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            {trainingMode === "kindergarten_phonics"
              ? "สวนเสียง · เรียนเสียงไทยทีละขั้น"
              : "ฝึกเสียงให้ชัด · เลือกระดับที่เหมาะสม"}
          </p>
        </header>

        {/* ── Child card ── */}
        <section
          className="bg-surface border border-border rounded-2xl px-5 py-4 flex items-center gap-4"
          aria-label="ข้อมูลเด็ก"
        >
          {/* Child avatar — first letter of name */}
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl font-bold select-none ${
              trainingMode === "kindergarten_phonics"
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                : "bg-primary/10 text-primary"
            }`}
            aria-hidden="true"
          >
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-bold text-text leading-tight truncate">
                {profile.name}
              </p>
              {modeBadge(trainingMode)}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-text-muted">{profile.age} ปี</span>
              {trainingMode === "speech_clarity" && (
                <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                  <MicIcon size={12} />
                  เสียง&nbsp;/{targetSoundLabel}/
                </span>
              )}
              {trainingMode === "kindergarten_phonics" && (
                <span className="text-xs text-text-muted">
                  เสร็จแล้ว {phonicsCompletedCount} บทเรียน
                </span>
              )}
            </div>
          </div>
          {/* Edit link */}
          <Link
            href="/onboarding?edit=true"
            className="text-xs text-text-muted hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/8 flex-shrink-0"
          >
            แก้ไข
          </Link>
        </section>

        {/* ── Multi-child switcher (only if >1 child) ── */}
        {profiles.length > 1 && (
          <section aria-label="เปลี่ยนเด็ก" className="bg-surface/60 border border-border rounded-xl px-4 py-2.5 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs text-text-muted flex-shrink-0">เปลี่ยนเด็ก:</span>
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => selectChild(p.id)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  p.id === selectedChildId
                    ? "bg-primary text-white"
                    : "bg-border/40 text-text-muted hover:bg-primary/10 hover:text-primary"
                }`}
              >
                {p.name.split(" ")[0]}
              </button>
            ))}
          </section>
        )}

        {/* ── Today's practice plan ── */}
        <section aria-labelledby="plan-heading">
          <h2 id="plan-heading" className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 px-0.5">
            วันนี้ควรฝึกอะไรต่อดี
          </h2>

          {/* Speech Clarity recommendation */}
          {trainingMode === "speech_clarity" && spHydrated && (
            speechRec ? (
              <div
                className="rounded-2xl border px-5 py-4 space-y-3"
                style={{
                  backgroundColor: `${speechRec.accentColor}09`,
                  borderColor: `${speechRec.accentColor}28`,
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true">
                    <DisplayIcon name={speechRec.stageIcon} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                      {speechRec.action === "pre-test"
                        ? "เริ่มต้น — ทำแบบทดสอบก่อน"
                        : speechRec.action === "review"
                        ? "ทบทวนทักษะ"
                        : "ฝึกต่อจากที่ค้างไว้"}
                    </p>
                    <p className="font-bold text-text text-base leading-tight mt-0.5">
                      {speechRec.stageName}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      {speechRec.action === "pre-test"
                        ? "ประเมินระดับเสียงก่อนเริ่มฝึก ใช้เวลาประมาณ 3–5 นาที"
                        : speechRec.action === "review"
                        ? `ทบทวนเสียง /${targetSoundLabel}/ ที่ฝึกมาแล้ว`
                        : `ฝึกเสียง /${targetSoundLabel}/ ต่อ — ระดับที่แนะนำสำหรับวันนี้`}
                    </p>
                  </div>
                </div>
                {canStartPractice ? (
                  <Link
                    href={practiceHref}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.01] active:scale-[0.98] shadow-sm"
                    style={{ backgroundColor: speechRec.accentColor }}
                  >
                    ฝึกต่อ →
                  </Link>
                ) : (
                  <div className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-medium text-text-muted bg-border/30 cursor-not-allowed select-none">
                    ดูเท่านั้น
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-2xl px-5 py-4">
                <EmptyState
                  message="ยังไม่มีข้อมูลการฝึก — เริ่ม Pre-test เพื่อประเมินระดับ"
                  cta="เริ่ม Pre-test"
                  href="/training/pretest"
                />
              </div>
            )
          )}

          {/* Phonics recommendation */}
          {trainingMode === "kindergarten_phonics" && phHydrated && (
            phonicsRec ? (
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10 px-5 py-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true"><DisplayIcon name="star" /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                      {phonicsRec.action === "start"
                        ? "เริ่มต้น — บทเรียนแรก"
                        : phonicsRec.action === "next"
                        ? "ทำครบแล้ว — ทบทวนอีกครั้ง"
                        : `${phonicsRec.unitId} · ฝึกต่อ`}
                    </p>
                    <p className="font-bold text-text text-base leading-tight mt-0.5">
                      {phonicsRec.lessonTitle}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      {phonicsRec.unitTitle}
                    </p>
                  </div>
                </div>
                {canStartPractice ? (
                  <Link
                    href={practiceHref}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition-all hover:scale-[1.01] active:scale-[0.98] shadow-sm shadow-amber-500/20"
                  >
                    {phonicsRec.action === "start" ? "เริ่มเรียน →" : "เรียนต่อ →"}
                  </Link>
                ) : (
                  <div className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-medium text-text-muted bg-border/30 cursor-not-allowed select-none">
                    ดูเท่านั้น
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-2xl px-5 py-4">
                <EmptyState
                  message="ยังไม่มีข้อมูลการฝึก — เริ่มบทเรียนแรกได้เลย"
                  cta="เริ่มบทเรียน K1"
                  href="/training/phonics/K1/K1-L1"
                />
              </div>
            )
          )}

          {/* Hydrating state */}
          {trainingMode === "speech_clarity" && !spHydrated && (
            <Skeleton className="h-36 w-full" />
          )}
          {trainingMode === "kindergarten_phonics" && !phHydrated && (
            <Skeleton className="h-36 w-full" />
          )}
        </section>

        {/* ── Latest result ── */}
        <section aria-labelledby="latest-heading">
          <h2 id="latest-heading" className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 px-0.5">
            ผลล่าสุด
          </h2>

          {/* Speech clarity: last attempt */}
          {trainingMode === "speech_clarity" && spHydrated && (
            latestSpeechAttempt ? (
              <div className="bg-surface border border-border rounded-2xl px-5 py-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-muted">
                      {new Date(latestSpeechAttempt.createdAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}
                    </p>
                    <p className="text-sm font-semibold text-text mt-0.5 truncate">
                      {latestSpeechAttempt.promptText || latestSpeechAttempt.practiceItemId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ScorePill score={latestSpeechAttempt.score} />
                    <StarsRow stars={latestSpeechAttempt.starsEarned} />
                  </div>
                </div>
                {latestSpeechAttempt.feedback && (
                  <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                    {plainFeedback(latestSpeechAttempt.feedback)}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {(() => {
                    const { text, cls } = statusLabel(latestSpeechAttempt.status);
                    return <span className={`text-xs font-semibold ${cls}`}>{text}</span>;
                  })()}
                  <Link
                    href={progressHref}
                    className="ml-auto text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors"
                  >
                    ดูทั้งหมด
                    <ChevronRightIcon size={11} />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-surface/60 border border-border/60 rounded-2xl px-5 py-6 text-center">
                <p className="text-sm text-text-muted">ยังไม่มีผลการฝึก — เริ่มฝึกเพื่อดูผล</p>
              </div>
            )
          )}

          {/* Phonics: last attempt */}
          {trainingMode === "kindergarten_phonics" && phHydrated && (
            latestPhonicsAttempt ? (
              <div className="bg-surface border border-border rounded-2xl px-5 py-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-muted">
                      {new Date(latestPhonicsAttempt.createdAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}
                      {" · "}
                      {latestPhonicsAttempt.unitId}
                    </p>
                    <p className="text-sm font-semibold text-text mt-0.5 truncate">
                      {latestPhonicsAttempt.prompt}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ScorePill score={latestPhonicsAttempt.score} />
                    <StarsRow stars={latestPhonicsAttempt.starsEarned} />
                  </div>
                </div>
                {latestPhonicsAttempt.feedback && (
                  <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                    {plainFeedback(latestPhonicsAttempt.feedback)}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {(() => {
                    const { text, cls } = statusLabel(latestPhonicsAttempt.status);
                    return <span className={`text-xs font-semibold ${cls}`}>{text}</span>;
                  })()}
                  <Link
                    href={progressHref}
                    className="ml-auto text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors"
                  >
                    ดูทั้งหมด
                    <ChevronRightIcon size={11} />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-surface/60 border border-border/60 rounded-2xl px-5 py-6 text-center">
                <p className="text-sm text-text-muted">ยังไม่มีผลการฝึก — เริ่มเรียนเพื่อดูผล</p>
              </div>
            )
          )}
        </section>

        {/* ── Progress snapshot ── */}
        <section aria-labelledby="snapshot-heading">
          <h2 id="snapshot-heading" className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 px-0.5">
            ภาพรวมความก้าวหน้า
          </h2>

          {trainingMode === "speech_clarity" && spHydrated && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface border border-border rounded-xl px-3 py-3 text-center">
                <p className="text-xl font-bold text-primary tabular-nums">{summary.totalAttempts}</p>
                <p className="text-xs text-text-muted mt-0.5 leading-tight">ครั้งที่ฝึก</p>
              </div>
              <div className="bg-surface border border-border rounded-xl px-3 py-3 text-center">
                <p className="text-xl font-bold text-primary tabular-nums">{summary.starsEarned}</p>
                <p className="text-xs text-text-muted mt-0.5 leading-tight">ดาวรวม</p>
              </div>
              <div className="bg-surface border border-border rounded-xl px-3 py-3 text-center">
                <p className="text-xl font-bold text-primary tabular-nums">
                  {summary.completedStages}
                  <span className="text-text-muted font-normal text-xs">/7</span>
                </p>
                <p className="text-xs text-text-muted mt-0.5 leading-tight">ระดับผ่าน</p>
              </div>
            </div>
          )}

          {trainingMode === "kindergarten_phonics" && phHydrated && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface border border-border rounded-xl px-3 py-3 text-center">
                <p className="text-xl font-bold text-amber-500 tabular-nums">
                  {phonicsSummary.totalAttempts}
                </p>
                <p className="text-xs text-text-muted mt-0.5 leading-tight">ครั้งที่ฝึก</p>
              </div>
              <div className="bg-surface border border-border rounded-xl px-3 py-3 text-center">
                <p className="text-xl font-bold text-amber-500 tabular-nums">
                  {phonicsCompletedCount}
                </p>
                <p className="text-xs text-text-muted mt-0.5 leading-tight">บทเรียนผ่าน</p>
              </div>
              <div className="bg-surface border border-border rounded-xl px-3 py-3 text-center">
                <p className="text-xl font-bold text-amber-500 tabular-nums">
                  {phonicsSummary.completedUnitIds.length}
                  <span className="text-text-muted font-normal text-xs">/7</span>
                </p>
                <p className="text-xs text-text-muted mt-0.5 leading-tight">ระดับผ่าน</p>
              </div>
            </div>
          )}

          {((trainingMode === "speech_clarity" && !spHydrated) ||
            (trainingMode === "kindergarten_phonics" && !phHydrated)) && (
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
            </div>
          )}
        </section>

        {/* ── Quick actions ── */}
        <section aria-label="ทางลัด" className="pb-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Primary: ฝึกต่อ */}
            {canStartPractice ? (
              <Link
                href={practiceHref}
                className="flex flex-col items-center gap-2 bg-primary/8 hover:bg-primary/14 border border-primary/20 rounded-xl px-3 py-3.5 text-center transition-all active:scale-[0.97] group"
              >
                <span className="text-xl" aria-hidden="true"><DisplayIcon name="mic" /></span>
                <span className="text-xs font-semibold text-primary leading-tight">ฝึกต่อ</span>
              </Link>
            ) : (
              <div className="flex flex-col items-center gap-2 bg-border/20 border border-border rounded-xl px-3 py-3.5 text-center cursor-not-allowed opacity-60">
                <span className="text-xl" aria-hidden="true"><DisplayIcon name="mic" /></span>
                <span className="text-xs font-semibold text-text-muted leading-tight">ฝึกต่อ</span>
              </div>
            )}

            {/* ดูความก้าวหน้า */}
            <Link
              href={progressHref}
              className="flex flex-col items-center gap-2 bg-surface hover:bg-surface/80 border border-border rounded-xl px-3 py-3.5 text-center transition-all active:scale-[0.97]"
            >
              <span className="text-xl" aria-hidden="true"><DisplayIcon name="chart" /></span>
              <span className="text-xs font-semibold text-text-muted leading-tight">ดูก้าวหน้า</span>
            </Link>

            {/* ดูเนื้อหา */}
            <Link
              href={contentHref}
              className="flex flex-col items-center gap-2 bg-surface hover:bg-surface/80 border border-border rounded-xl px-3 py-3.5 text-center transition-all active:scale-[0.97]"
            >
              <span className="text-xl" aria-hidden="true"><DisplayIcon name="book" /></span>
              <span className="text-xs font-semibold text-text-muted leading-tight">ดูเนื้อหา</span>
            </Link>
          </div>
        </section>

      </div>
    </AppShell>
  );
}
