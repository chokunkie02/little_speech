"use client";

import { Suspense, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseProviderRequested } from "@/lib/config/storageProvider";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import SchoolChildProgressView from "@/components/speech-adventure/SchoolChildProgressView";
import ChildProfileCard from "@/components/speech-adventure/ChildProfileCard";
import StageProgressCard from "@/components/speech-adventure/StageProgressCard";
import PermissionBanner from "@/components/ui/PermissionBanner";
import ObservationNoteList from "@/components/observations/ObservationNoteList";
import AppShell from "@/components/layout/AppShell";
import SessionDetailDrawer from "@/components/details/SessionDetailDrawer";
import AttemptDetailDrawer from "@/components/details/AttemptDetailDrawer";

import PhonicsProgressDashboard from "@/components/phonics/PhonicsProgressDashboard";
import { useSpeechProgress } from "@/hooks/useSpeechProgress";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useCurrentChildAccess } from "@/hooks/useCurrentChildAccess";
import { useObservationNotes } from "@/hooks/useObservationNotes";
import { mockChildProfile, mockTrainingStages, mockTargetSounds } from "@/data/speechAdventureMockData";
import { getSoundSummary, type SoundSummary } from "@/lib/progressUtils";
import { calculateProgressSummary } from "@/lib/speechProgressStorage";
import {
  DEMO_PROGRESS,
  DEMO_OBSERVATIONS,
  DEMO_ATTEMPT_COUNT,
} from "@/lib/demo/speechAdventureDemoData";
import { useRepositories } from "@/lib/providers/RepositoryProvider";
import type { ProgressSummary, PracticeSession, PracticeAttempt } from "@/types/speechAdventure";
import { calculateRewards } from "@/lib/rewards/calculateRewards";

// ─── Helpers ────────────────────────────────────────────────────────────────────

interface ReportData {
  headline: string;
  details: string[];
  strengths: string[];
  recommendation: string;
}

function generateReport(summary: ProgressSummary, completedCount: number): ReportData {
  if (summary.totalAttempts === 0) {
    return {
      headline: "น้องยังไม่ได้เริ่มฝึก",
      details: ["ยังไม่มีข้อมูลการฝึกในระบบ", "แนะนำให้เริ่มจาก Pre-test เพื่อประเมินระดับเสียงเริ่มต้น"],
      strengths: [],
      recommendation: "เริ่มทำ Pre-test ได้เลยนะคะ ไม่มีผิดไม่มีถูก แค่วัดระดับเสียงตอนนี้ค่ะ",
    };
  }
  const details = [
    `ฝึกรวม ${summary.totalAttempts} ครั้ง · คะแนนเฉลี่ย ${summary.averageScore}%`,
    `ผ่านมาแล้ว ${completedCount} จาก 7 ระดับ · สะสมดาว ${summary.starsEarned} ดาว`,
  ];
  const strengths: string[] = [];
  if (summary.averageScore >= 80) strengths.push("คะแนนเฉลี่ยอยู่ในเกณฑ์ดีมาก น้องออกเสียงได้ชัดเจน");
  else if (summary.averageScore >= 60) strengths.push("น้องกำลังพัฒนาขึ้นเรื่อยๆ ทำได้ดีมากค่ะ");
  if (summary.reviewScore > 0 && summary.improvement > 0)
    strengths.push(`พัฒนาการจาก Pre-test ถึง Review: +${summary.improvement} คะแนน`);
  if (completedCount >= 5) strengths.push("น้องมีความสม่ำเสมอในการฝึก ผ่านมาหลายระดับแล้ว");
  let recommendation: string;
  if (completedCount === 7) {
    recommendation = "น้องผ่านครบทุกระดับแล้ว! ลองทบทวน Review อีกรอบเพื่อความมั่นใจนะคะ";
  } else if (summary.difficultItems.length > 0) {
    const items = summary.difficultItems.slice(0, 2).map((d) => `"${d.promptText}"`).join(", ");
    recommendation = `แนะนำให้ฝึกคำ ${items} ซ้ำๆ เพื่อเสริมความมั่นใจค่ะ ออกเสียงช้าๆ ทีละพยางค์`;
  } else {
    recommendation = `ขณะนี้น้องอยู่ที่ ${summary.currentLevel} ควรฝึกต่อเนื่องทุกวัน วันละ 10–15 นาทีค่ะ`;
  }
  return { headline: `น้องอยู่ที่ ${summary.currentLevel}`, details, strengths, recommendation };
}

function formatThaiDate(): string {
  return new Date().toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  } catch {
    return "—";
  }
}

// ─── Tabs ───────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "ภาพรวม" },
  { id: "sessions", label: "เซสชัน" },
  { id: "attempts", label: "ประวัติ" },
  { id: "notes", label: "บันทึก" },
  { id: "report", label: "รายงาน" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Page ───────────────────────────────────────────────────────────────────────

function ProgressDashboardPage() {
  const { progress: progressRepo, observations: obsRepo } = useRepositories();
  const { progress, attempts, sessions, clearProgressForChild, getStageStatus, getStageAttempts, isHydrated } =
    useSpeechProgress();
  const { profile, hasProfile } = useChildProfile();
  const { isOwner, isSharedChild, canEditChild, canExportReport, canViewProgress } = useCurrentChildAccess();
  const { notes, addNote, updateNote, deleteNote, clearNotes } = useObservationNotes();

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);
  const [selectedSession, setSelectedSession] = useState<PracticeSession | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<PracticeAttempt | null>(null);
  const [filterStageId, setFilterStageId] = useState<string | null>(null);
  const [selectedSoundFilter, setSelectedSoundFilter] = useState<string | null>(null);

  // ── displaySummary: scoped by selected child + UI sound filter ──────────────
  // Uses selectedSoundFilter (null = all sounds) so the overview stats, report,
  // and "next action" card always match what the user is looking at.

  const displaySummary = useMemo<ProgressSummary>(
    () =>
      calculateProgressSummary(
        { ...progress, attempts, sessions },
        selectedSoundFilter ?? undefined,
      ),
    [progress, attempts, sessions, selectedSoundFilter],
  );

  // ── All sessions for child — used in sessions tab (no sound filter) ────────

  const allSessions = useMemo(
    () =>
      [...sessions]
        .filter((s) => s.status !== "active")
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),
    [sessions],
  );

  const allSessionsStats = useMemo(() => {
    const completed = sessions.filter((s) => s.status === "completed");
    if (completed.length === 0) return null;
    return {
      total: completed.length,
      avgScore: Math.round(completed.reduce((sum, s) => sum + s.averageScore, 0) / completed.length),
      totalStars: completed.reduce((sum, s) => sum + s.starsEarned, 0),
    };
  }, [sessions]);

  // ── Derived data ──────────────────────────────────────────────────────────────

  const liveProfile = {
    ...mockChildProfile,
    name: profile?.name ?? mockChildProfile.name,
    nickname: profile ? profile.name.split(" ")[0] : mockChildProfile.nickname,
    age: profile?.age ?? mockChildProfile.age,
    currentStage: displaySummary.currentStageId,
    totalStars: displaySummary.starsEarned,
    totalAttempts: displaySummary.totalAttempts,
  };

  const stageData = mockTrainingStages.map((stage) => {
    const status = getStageStatus(stage.id, selectedSoundFilter ?? undefined);
    const stageAttempts = getStageAttempts(stage.id, selectedSoundFilter ?? undefined);
    const sorted = [...stageAttempts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const bestScore = stageAttempts.length > 0 ? Math.max(...stageAttempts.map((a) => a.score)) : null;
    const latestScore = sorted.length > 0 ? sorted[0].score : null;
    const liveStarsEarned = Math.min(stageAttempts.reduce((sum, a) => sum + a.starsEarned, 0), stage.starsTotal);
    return { ...stage, status, attemptCount: stageAttempts.length, bestScore, latestScore, starsEarned: liveStarsEarned };
  });

  const completedCount = stageData.filter((s) => s.status === "completed").length;
  const hasData = isHydrated && displaySummary.totalAttempts > 0;
  const rewardResult = isHydrated ? calculateRewards(progress) : null;
  const hasReview = isHydrated && displaySummary.reviewScore > 0;
  const report = generateReport(displaySummary, completedCount);
  const dateStr = isHydrated ? formatThaiDate() : "";

  // Next best action — scoped to selected sound filter
  const currentStageForAction = isHydrated
    ? mockTrainingStages.find((s) => s.id === displaySummary.currentStageId)
    : null;

  // Mock footnote: show only when ALL current attempts are mock (isMock !== false)
  const hasMockNote =
    hasData && attempts.length > 0 &&
    !attempts.some((a) => a.isMock === false) &&
    attempts.some((a) => a.isMock === true);

  // Latest observation note
  const latestNote = notes.length > 0 ? notes[notes.length - 1] : null;

  // ── Per-sound summaries ───────────────────────────────────────────────────────

  const soundSummaries = useMemo<SoundSummary[]>(
    () => mockTargetSounds.map((s) => getSoundSummary(attempts, s.id)),
    [attempts],
  );

  // ── Attempt history derived data ──────────────────────────────────────────────

  const sortedAttempts = useMemo(
    () => [...attempts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [attempts],
  );

  const stagesWithAttempts = useMemo(() => {
    const relevant = selectedSoundFilter
      ? attempts.filter((a) => a.targetSound === selectedSoundFilter)
      : attempts;
    const stageIds = new Set(relevant.map((a) => a.stageId));
    return mockTrainingStages.filter((s) => stageIds.has(s.id));
  }, [attempts, selectedSoundFilter]);

  const displayedAttempts = useMemo(() => {
    let list = [...attempts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (selectedSoundFilter) list = list.filter((a) => a.targetSound === selectedSoundFilter);
    if (filterStageId) list = list.filter((a) => a.stageId === filterStageId);
    return list;
  }, [attempts, selectedSoundFilter, filterStageId]);

  const attemptStats = useMemo(() => {
    const pool = selectedSoundFilter
      ? attempts.filter((a) => a.targetSound === selectedSoundFilter)
      : attempts;
    if (pool.length === 0) return null;
    const best = Math.max(...pool.map((a) => a.score));
    const avg = Math.round(pool.reduce((s, a) => s + a.score, 0) / pool.length);
    const lastDate =
      sortedAttempts.find((a) => !selectedSoundFilter || a.targetSound === selectedSoundFilter)
        ?.createdAt ?? null;
    return { total: pool.length, best, avg, lastDate };
  }, [attempts, selectedSoundFilter, sortedAttempts]);

  // Recent sessions for sidebar preview (last 3, all sounds)
  const recentSessionsPreview = allSessions.slice(0, 3);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleReset = () => {
    if (!profile?.id) {
      console.warn("[ProgressPage] handleReset: no active child profile — skipped");
      setShowResetConfirm(false);
      return;
    }
    clearProgressForChild(profile.id);
    clearNotes();
    setShowResetConfirm(false);
  };

  const handleLoadDemo = () => {
    if (attempts.length > 0) {
      setShowDemoConfirm(true);
    } else {
      void progressRepo.replaceProgress(DEMO_PROGRESS);
      void obsRepo.replaceNotes(DEMO_OBSERVATIONS);
    }
  };

  const handleConfirmLoadDemo = () => {
    void progressRepo.replaceProgress(DEMO_PROGRESS);
    void obsRepo.replaceNotes(DEMO_OBSERVATIONS);
    setShowDemoConfirm(false);
  };

  const handleSoundFilter = (soundId: string | null) => {
    setSelectedSoundFilter(soundId);
    setFilterStageId(null);
  };

  // ── Pre-hydration: show skeleton to prevent flash for phonics users ────────────
  if (!isHydrated) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4" aria-busy="true" aria-label="กำลังโหลด">
          <div className="animate-pulse rounded-2xl bg-border/40 h-10 w-48" />
          <div className="animate-pulse rounded-2xl bg-border/40 h-32 w-full" />
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-border/40 h-20" />
            ))}
          </div>
          <div className="animate-pulse rounded-2xl bg-border/40 h-48 w-full" />
        </div>
      </AppShell>
    );
  }

  // ── Mode switch: kindergarten phonics dashboard ───────────────────────────────
  if (profile?.trainingMode === "kindergarten_phonics") {
    return (
      <AppShell>
        <PhonicsProgressDashboard />
      </AppShell>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      {/* ── Sticky tab bar ── */}
      <div className="sticky top-0 lg:top-0 z-20 bg-surface/95 backdrop-blur-md border-b border-border">
        <div className="flex overflow-x-auto gap-1 px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-muted hover:text-text hover:bg-gray-100 dark:hover:bg-white/8"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════ OVERVIEW TAB ══════════════ */}
      {activeTab === "overview" && (
        <div className="px-4 sm:px-6 py-6">
          {/* Desktop: two-column layout. Mobile: single column */}
          <div className="xl:flex xl:gap-6 xl:items-start">
            {/* Main column */}
            <div className="xl:flex-1 xl:min-w-0 space-y-5">
              {/* Page header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-text">รายงานความก้าวหน้า</h2>
                  <p className="text-sm text-text-muted mt-0.5">
                    สำหรับผู้ปกครองและคุณครู{dateStr ? ` · ${dateStr}` : ""}
                  </p>
                </div>
                {isHydrated && (!isSharedChild || canEditChild) && (
                  <Link
                    href={hasProfile ? "/onboarding?edit=true" : "/onboarding"}
                    className="flex-shrink-0 text-sm font-medium text-primary hover:text-primary/80 px-3 py-1.5 rounded-xl hover:bg-primary/8 transition-all border border-primary/20"
                  >
                    {hasProfile ? "แก้ไขโปรไฟล์" : "ตั้งค่าโปรไฟล์"}
                  </Link>
                )}
              </div>

              {/* Child profile card */}
              <ChildProfileCard profile={liveProfile} isHydrated={isHydrated} averageScore={displaySummary.averageScore} />

              {/* Stats grid */}
              {hasData ? (
                <section aria-label="ภาพรวมความก้าวหน้า">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">ภาพรวม</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="bg-surface border border-border rounded-xl p-4">
                      <p className="text-xs font-medium text-text-muted mb-2">คะแนนเฉลี่ย</p>
                      <p className="text-3xl font-bold text-success leading-none">
                        {displaySummary.averageScore}<span className="text-sm ml-0.5">%</span>
                      </p>
                    </div>
                    <div className="bg-surface border border-border rounded-xl p-4">
                      <p className="text-xs font-medium text-text-muted mb-2">ครั้งที่ฝึก</p>
                      <p className="text-3xl font-bold text-info leading-none">{displaySummary.totalAttempts}</p>
                    </div>
                    <div className="bg-surface border border-border rounded-xl p-4">
                      <p className="text-xs font-medium text-text-muted mb-2">ดาวที่ได้รับ</p>
                      <p className="text-3xl font-bold text-secondary leading-none">
                        <span className="text-xl">★</span> {displaySummary.starsEarned}
                      </p>
                    </div>
                    <div className="bg-surface border border-border rounded-xl p-4">
                      <p className="text-xs font-medium text-text-muted mb-2">ระดับที่ผ่าน</p>
                      <div className="flex items-baseline gap-1 mb-1.5">
                        <p className="text-3xl font-bold text-level-pretest leading-none">{completedCount}</p>
                        <p className="text-sm text-text-muted">/ 7</p>
                      </div>
                      <div className="h-1 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-level-pretest rounded-full transition-all duration-700"
                          style={{ width: `${(completedCount / 7) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 bg-primary/8 border border-primary/20 rounded-xl px-4 py-3">
                    <p className="text-xs font-medium text-primary mb-0.5">ระดับปัจจุบัน{selectedSoundFilter ? ` · เสียง ${selectedSoundFilter}` : ""}</p>
                    <p className="font-semibold text-text">{displaySummary.currentLevel}</p>
                  </div>
                </section>
              ) : (
                <section className="bg-surface border border-border rounded-xl p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
                      <path d="M12 8v4l3 3" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-text mb-1">ยังไม่มีข้อมูล</h3>
                  <p className="text-sm text-text-muted mb-5">เริ่มฝึกวันนี้เพื่อเห็นรายงานความก้าวหน้า</p>
                  <Link
                    href="/training"
                    className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    เริ่มฝึกเลย
                  </Link>
                </section>
              )}

              {/* ── Sound filter + per-sound summary ── */}
              {isHydrated && (
                <section aria-label="เสียงที่ฝึก">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">เสียงที่ฝึก</p>
                    {selectedSoundFilter && (
                      <button
                        type="button"
                        onClick={() => handleSoundFilter(null)}
                        className="text-xs text-primary font-medium hover:text-primary/80 transition-colors"
                      >
                        ดูทั้งหมด
                      </button>
                    )}
                  </div>

                  {/* Sound filter chips */}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button
                      type="button"
                      onClick={() => handleSoundFilter(null)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        !selectedSoundFilter
                          ? "bg-primary text-white shadow-sm"
                          : "bg-bg dark:bg-white/5 text-text-muted border border-border hover:border-primary/30 hover:text-text"
                      }`}
                    >
                      ทั้งหมด
                    </button>
                    {mockTargetSounds.map((sound) => (
                      <button
                        key={sound.id}
                        type="button"
                        onClick={() => handleSoundFilter(sound.id)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          selectedSoundFilter === sound.id
                            ? "bg-primary text-white shadow-sm"
                            : "bg-bg dark:bg-white/5 text-text-muted border border-border hover:border-primary/30 hover:text-text"
                        }`}
                      >
                        เสียง {sound.label} · {sound.description}
                      </button>
                    ))}
                  </div>

                  {/* Per-sound cards — shown when "ทั้งหมด" is selected */}
                  {!selectedSoundFilter && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {soundSummaries.map((s) => {
                        const soundMeta = mockTargetSounds.find((m) => m.id === s.soundId);
                        const statusLabel: Record<string, string> = {
                          good: "ทำได้ดีมาก",
                          improving: "กำลังดีขึ้น",
                          needs_practice: "ควรฝึกเพิ่ม",
                          not_started: "ยังไม่เริ่ม",
                        };
                        const statusClass: Record<string, string> = {
                          good: "text-success",
                          improving: "text-info",
                          needs_practice: "text-secondary",
                          not_started: "text-text-muted",
                        };
                        const dotClass: Record<string, string> = {
                          good: "bg-success",
                          improving: "bg-info",
                          needs_practice: "bg-secondary",
                          not_started: "bg-gray-300 dark:bg-white/20",
                        };
                        return (
                          <button
                            key={s.soundId}
                            type="button"
                            onClick={() => handleSoundFilter(s.soundId)}
                            className="bg-surface border border-border rounded-xl p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all active:scale-[0.98]"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-3xl font-bold text-primary leading-none">
                                {s.soundId}
                              </span>
                              <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotClass[s.status]}`} />
                            </div>
                            <p className="text-xs text-text-muted mb-2 leading-tight">
                              {soundMeta?.description ?? s.soundId}
                            </p>
                            {s.status !== "not_started" ? (
                              <>
                                <p className="text-lg font-bold text-text leading-none">{s.averageScore}%</p>
                                <p className="text-xs text-text-muted mt-0.5">{s.totalAttempts} ครั้ง</p>
                                <p className={`text-xs font-medium mt-1.5 ${statusClass[s.status]}`}>
                                  {statusLabel[s.status]}
                                </p>
                                <p className="text-xs font-semibold text-primary mt-2">ฝึกต่อ →</p>
                              </>
                            ) : (
                              <>
                                <p className="text-xs text-text-muted mt-1">ยังไม่เริ่มฝึก</p>
                                <p className="text-xs font-semibold text-primary mt-2">เริ่มฝึก →</p>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Single sound summary — shown when a sound is selected */}
                  {selectedSoundFilter && (() => {
                    const s = soundSummaries.find((x) => x.soundId === selectedSoundFilter);
                    const soundMeta = mockTargetSounds.find((m) => m.id === selectedSoundFilter);
                    if (!s) return null;
                    return (
                      <div className="bg-primary/6 border border-primary/20 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-4xl font-bold text-primary leading-none">{s.soundId}</span>
                          <div>
                            <p className="text-sm font-semibold text-text">{soundMeta?.description ?? s.soundId}</p>
                            {s.status !== "not_started" ? (
                              <p className="text-xs text-text-muted">{s.totalAttempts} ครั้ง · ฝึกล่าสุด {formatShortDate(s.lastPracticedAt)}</p>
                            ) : (
                              <p className="text-xs text-text-muted">ยังไม่มีประวัติการฝึกเสียงนี้</p>
                            )}
                          </div>
                        </div>
                        {s.status !== "not_started" ? (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-surface rounded-xl p-3 text-center border border-border">
                              <p className="text-xl font-bold text-success leading-none">{s.averageScore}%</p>
                              <p className="text-xs text-text-muted mt-1">คะแนนเฉลี่ย</p>
                            </div>
                            <div className="bg-surface rounded-xl p-3 text-center border border-border">
                              <p className="text-xl font-bold text-info leading-none">{s.bestScore}%</p>
                              <p className="text-xs text-text-muted mt-1">คะแนนดีที่สุด</p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-2">
                            <Link
                              href="/training"
                              className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-5 py-2 rounded-xl text-sm hover:bg-primary/90 transition-all"
                            >
                              เริ่มฝึกเสียงนี้
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </section>
              )}

              {/* Next Best Action card */}
              {isHydrated && (
                <section aria-label="ขั้นต่อไปที่แนะนำ">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">ขั้นต่อไปที่แนะนำ</p>
                  {currentStageForAction ? (
                    <div
                      className="flex items-center justify-between gap-4 rounded-xl px-5 py-4 border"
                      style={{
                        backgroundColor: `${currentStageForAction.accentColor}10`,
                        borderColor: `${currentStageForAction.accentColor}30`,
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl flex-shrink-0" aria-hidden="true">{currentStageForAction.icon}</span>
                        <div className="min-w-0">
                          <p className="font-bold text-text text-sm">{currentStageForAction.name}</p>
                          <p className="text-xs text-text-muted truncate">{currentStageForAction.shortGoal}</p>
                        </div>
                      </div>
                      <Link
                        href={`/training/${currentStageForAction.slug}`}
                        className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ backgroundColor: currentStageForAction.accentColor }}
                      >
                        ฝึกเลย
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4 rounded-xl px-5 py-4 border border-primary/20 bg-primary/8">
                      <div>
                        <p className="font-bold text-text text-sm">เริ่มต้นด้วย Pre-test</p>
                        <p className="text-xs text-text-muted">ประเมินระดับเสียงเริ่มต้นของน้อง</p>
                      </div>
                      <Link
                        href="/training/pretest"
                        className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        เริ่มเลย
                      </Link>
                    </div>
                  )}
                </section>
              )}

              {/* Pre-test vs Review */}
              <section className="bg-surface border border-border rounded-xl p-5" aria-label="เปรียบเทียบ Pre-test กับ Review">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Pre-test vs Review</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-level-pretest/8 border border-level-pretest/20 rounded-xl p-4 text-center">
                    <p className="text-xs font-medium text-level-pretest mb-2">Pre-test</p>
                    <p className="text-4xl font-bold text-level-pretest">
                      {displaySummary.pretestScore > 0 ? displaySummary.pretestScore : "—"}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      {displaySummary.pretestScore > 0 ? "ระดับเสียงเริ่มต้น" : "ยังไม่ได้ทำ"}
                    </p>
                  </div>
                  <div className={`rounded-xl p-4 text-center border ${
                    hasReview ? "bg-success/8 border-success/20" : "bg-gray-50 dark:bg-white/3 border-border"
                  }`}>
                    <p className={`text-xs font-medium mb-2 ${hasReview ? "text-success" : "text-text-muted"}`}>Review</p>
                    <p className={`text-4xl font-bold ${hasReview ? "text-success" : "text-text-muted"}`}>
                      {hasReview ? displaySummary.reviewScore : "—"}
                    </p>
                    <p className="text-xs text-text-muted mt-1">{hasReview ? "หลังฝึกเสร็จ" : "ยังไม่มีข้อมูล"}</p>
                  </div>
                </div>
                {hasReview && displaySummary.improvement > 0 && (
                  <div className="bg-success/8 border border-success/20 rounded-xl p-4 text-center">
                    <p className="text-xs font-medium text-success mb-1">พัฒนาการ</p>
                    <p className="text-3xl font-bold text-success">
                      +{displaySummary.improvement}<span className="text-base ml-1">คะแนน</span>
                    </p>
                  </div>
                )}
                {!hasReview && (
                  <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
                    <p className="text-sm text-text-muted">
                      เมื่อน้องทำ Review เสร็จ จะเห็นการเปรียบเทียบที่นี่
                    </p>
                  </div>
                )}
              </section>

              {/* Stage progress */}
              <section className="bg-surface border border-border rounded-xl p-5" aria-label="ความคืบหน้าในแต่ละระดับ">
                <div className="flex items-center gap-2 mb-4">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    ความคืบหน้าในแต่ละระดับ
                  </p>
                  {selectedSoundFilter && (
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      เสียง {selectedSoundFilter}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {stageData.map((stage) => (
                    <StageProgressCard
                      key={stage.id}
                      stageName={stage.name}
                      stageIcon={stage.icon}
                      accentColor={stage.accentColor}
                      status={stage.status}
                      starsEarned={stage.starsEarned}
                      starsTotal={stage.starsTotal}
                      attemptCount={stage.attemptCount}
                      bestScore={stage.bestScore ?? undefined}
                      latestScore={stage.latestScore ?? undefined}
                    />
                  ))}
                </div>
              </section>
            </div>

            {/* Side column (desktop only) */}
            <div className="hidden xl:flex xl:flex-col xl:w-[320px] xl:flex-shrink-0 space-y-5 sticky top-20">
              {/* Recent sessions preview */}
              {recentSessionsPreview.length > 0 && (
                <section className="bg-surface border border-border rounded-xl p-4" aria-label="เซสชันล่าสุด">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">เซสชันล่าสุด</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("sessions")}
                      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      ดูทั้งหมด
                    </button>
                  </div>
                  <div className="space-y-2">
                    {recentSessionsPreview.map((session) => {
                      const sessionStage = mockTrainingStages.find((s) => s.id === session.stageId);
                      return (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => setSelectedSession(session)}
                          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 bg-bg dark:bg-white/3 border border-border text-left hover:border-primary/30 transition-all cursor-pointer"
                        >
                          <span className="text-base flex-shrink-0" aria-hidden="true">{sessionStage?.icon ?? "🎯"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-text truncate">{sessionStage?.name ?? session.stageId}</p>
                            <p className="text-xs text-text-muted">{session.averageScore}% · ★ {session.starsEarned}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Rewards preview */}
              {rewardResult && (
                <Link
                  href="/rewards"
                  className="block group bg-surface border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all"
                  aria-label="ดูเหรียญตราและรางวัล"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary/12 flex items-center justify-center flex-shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB347" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text">รางวัลและเหรียญตรา</p>
                        <p className="text-xs text-text-muted">ได้รับ {rewardResult.earnedCount} / {rewardResult.totalBadges} เหรียญ</p>
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted group-hover:text-primary transition-colors" aria-hidden="true">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <p className="text-lg font-bold text-secondary leading-none">★ {displaySummary.starsEarned}</p>
                    <p className="text-xs text-text-muted">ดาวสะสม</p>
                  </div>
                </Link>
              )}

              {/* Latest observation note */}
              {latestNote && (
                <button
                  type="button"
                  onClick={() => setActiveTab("notes")}
                  className="block w-full text-left bg-surface border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                  aria-label="ดูบันทึกล่าสุด"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">บันทึกล่าสุด</p>
                    <span className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">ดูทั้งหมด</span>
                  </div>
                  <p className="text-sm text-text line-clamp-3 leading-relaxed">{latestNote.content}</p>
                  <p className="text-xs text-text-muted mt-2">
                    {(() => {
                      try { return new Date(latestNote.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" }); }
                      catch { return ""; }
                    })()}
                  </p>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ SESSIONS TAB ══════════════ */}
      {activeTab === "sessions" && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-text">ประวัติเซสชัน</h2>
            <p className="text-sm text-text-muted mt-0.5">คลิกที่แถวเพื่อดูรายละเอียด</p>
          </div>

          {allSessions.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-8 text-center">
              <p className="text-sm font-medium text-text mb-1">ยังไม่มีประวัติเซสชัน</p>
              <p className="text-xs text-text-muted mb-4">เริ่มฝึกเพื่อสร้างเซสชันแรก</p>
              <Link href="/training" className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-all">
                ไปฝึกเลย
              </Link>
            </div>
          ) : (
            <section className="bg-surface border border-border rounded-xl p-5" aria-label="ประวัติเซสชันการฝึก">
              <div className="space-y-2">
                {allSessions.map((session) => {
                  const sessionStage = mockTrainingStages.find((s) => s.id === session.stageId);
                  const durationText = session.durationMs
                    ? Math.round(session.durationMs / 60000) > 0
                      ? `${Math.round(session.durationMs / 60000)} นาที`
                      : `${Math.round(session.durationMs / 1000)} วินาที`
                    : "—";
                  const sessDateStr = (() => {
                    try {
                      return new Date(session.startedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
                    } catch { return ""; }
                  })();
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedSession(session)}
                      className="w-full flex items-center gap-3 bg-bg dark:bg-white/3 rounded-xl p-4 border border-border text-left hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ backgroundColor: `${sessionStage?.accentColor ?? "#6C63FF"}15` }}
                        aria-hidden="true"
                      >
                        {sessionStage?.icon ?? "🎯"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{sessionStage?.name ?? session.stageId}</p>
                        <p className="text-xs text-text-muted">{sessDateStr} · {durationText} · เสียง {session.targetSound}</p>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-0.5">
                        <p className={`text-sm font-bold ${session.averageScore >= 70 ? "text-success" : "text-secondary"}`}>
                          {session.averageScore}%
                        </p>
                        <p className="text-xs text-secondary">★ {session.starsEarned}</p>
                        <p className="text-xs text-text-muted">{session.completedMissions}/{session.totalMissions} ภารกิจ</p>
                      </div>
                      {session.status === "abandoned" && (
                        <span className="text-xs text-text-muted bg-gray-100 dark:bg-white/8 px-2 py-0.5 rounded-full flex-shrink-0">ยังไม่เสร็จ</span>
                      )}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted flex-shrink-0 ml-1" aria-hidden="true">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  );
                })}
              </div>

              {allSessionsStats && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="bg-bg dark:bg-white/3 rounded-xl p-3 text-center border border-border">
                    <p className="text-lg font-bold text-primary">{allSessionsStats.total}</p>
                    <p className="text-xs text-text-muted">เซสชันทั้งหมด</p>
                  </div>
                  <div className="bg-bg dark:bg-white/3 rounded-xl p-3 text-center border border-border">
                    <p className="text-lg font-bold text-success">{allSessionsStats.avgScore}%</p>
                    <p className="text-xs text-text-muted">คะแนนเฉลี่ย</p>
                  </div>
                  <div className="bg-bg dark:bg-white/3 rounded-xl p-3 text-center border border-border">
                    <p className="text-lg font-bold text-secondary">★ {allSessionsStats.totalStars}</p>
                    <p className="text-xs text-text-muted">ดาวจากเซสชัน</p>
                  </div>
                </div>
              )}
            </section>
          )}
          <div className="pb-4" />
        </div>
      )}

      {/* ══════════════ ATTEMPTS TAB ══════════════ */}
      {activeTab === "attempts" && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-text">ประวัติการฝึก</h2>
            <p className="text-sm text-text-muted mt-0.5">
              {profile?.name ?? "น้อง"} · คลิกที่แถวเพื่อดูรายละเอียด
            </p>
          </div>

          {!canViewProgress ? (
            <PermissionBanner
              message="คุณไม่มีสิทธิ์ดูประวัติการฝึก"
              hint="ติดต่อผู้ดูแลเด็กเพื่อขอสิทธิ์ canViewProgress"
            />
          ) : (
            <>
              {/* Sound filter banner */}
              {selectedSoundFilter ? (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-text-muted">กรองตามเสียง:</p>
                  <button
                    type="button"
                    onClick={() => handleSoundFilter(null)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    เสียง {selectedSoundFilter}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ) : null}

              {/* Summary stats */}
              {attemptStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-surface border border-border rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-info leading-none">{attemptStats.total}</p>
                    <p className="text-xs text-text-muted mt-1">ครั้งทั้งหมด</p>
                  </div>
                  <div className="bg-surface border border-border rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-success leading-none">{attemptStats.best}%</p>
                    <p className="text-xs text-text-muted mt-1">คะแนนสูงสุด</p>
                  </div>
                  <div className="bg-surface border border-border rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-primary leading-none">{attemptStats.avg}%</p>
                    <p className="text-xs text-text-muted mt-1">คะแนนเฉลี่ย</p>
                  </div>
                  <div className="bg-surface border border-border rounded-xl p-4 text-center">
                    <p className="text-lg font-bold text-text leading-none">{formatShortDate(attemptStats.lastDate)}</p>
                    <p className="text-xs text-text-muted mt-1">ฝึกล่าสุด</p>
                  </div>
                </div>
              )}

              {/* Stage filter chips */}
              {stagesWithAttempts.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    type="button"
                    onClick={() => setFilterStageId(null)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      !filterStageId
                        ? "bg-primary text-white shadow-sm"
                        : "bg-bg dark:bg-white/5 text-text-muted border border-border hover:border-primary/30 hover:text-text"
                    }`}
                  >
                    ทั้งหมด ({attemptStats?.total ?? 0})
                  </button>
                  {stagesWithAttempts.map((stage) => {
                    const count = (selectedSoundFilter
                      ? attempts.filter((a) => a.targetSound === selectedSoundFilter && a.stageId === stage.id)
                      : attempts.filter((a) => a.stageId === stage.id)
                    ).length;
                    const isActive = filterStageId === stage.id;
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => setFilterStageId(isActive ? null : stage.id)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          isActive
                            ? "text-white shadow-sm"
                            : "bg-bg dark:bg-white/5 text-text-muted border border-border hover:border-primary/30 hover:text-text"
                        }`}
                        style={isActive ? { backgroundColor: stage.accentColor } : undefined}
                      >
                        {stage.icon} {stage.name} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Attempt list */}
              {displayedAttempts.length === 0 ? (
                <div className="bg-surface border border-border rounded-xl p-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/8 flex items-center justify-center mx-auto mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-text mb-1">
                    {selectedSoundFilter
                      ? `ยังไม่มีประวัติการฝึกเสียง ${selectedSoundFilter}`
                      : "ยังไม่มีประวัติการฝึก"}
                  </p>
                  <p className="text-xs text-text-muted mb-4">
                    {filterStageId
                      ? "ไม่มีการฝึกในระดับที่เลือก"
                      : selectedSoundFilter
                      ? "เริ่มฝึกเสียงนี้เพื่อเห็นความก้าวหน้า"
                      : "เริ่มฝึกเพื่อเห็นความก้าวหน้าของน้อง"}
                  </p>
                  {!filterStageId && (
                    <Link
                      href="/training"
                      className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-all"
                    >
                      {selectedSoundFilter ? `เริ่มฝึกเสียง ${selectedSoundFilter}` : "ไปฝึกเลย"}
                    </Link>
                  )}
                </div>
              ) : (
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                  <div className="divide-y divide-border">
                    {displayedAttempts.map((attempt) => {
                      const attemptStage = mockTrainingStages.find((s) => s.id === attempt.stageId);
                      return (
                        <button
                          key={attempt.id}
                          type="button"
                          onClick={() => setSelectedAttempt(attempt)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-bg dark:hover:bg-white/3 transition-all active:scale-[0.99]"
                        >
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
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-text text-sm truncate">{attempt.promptText}</p>
                              <span className="text-secondary text-xs flex-shrink-0">
                                {"★".repeat(attempt.starsEarned)}
                              </span>
                            </div>
                            <p className="text-xs text-text-muted mt-0.5">
                              {attemptStage?.name ?? attempt.stageId}
                              {" · "}เสียง {attempt.targetSound}
                              {" · "}{formatShortDate(attempt.createdAt)}
                            </p>
                          </div>

                          {/* Status badge */}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                              attempt.status === "passed"
                                ? "bg-success/12 text-success"
                                : attempt.status === "almost"
                                ? "bg-warning/12 text-warning"
                                : "bg-secondary/12 text-secondary"
                            }`}
                          >
                            {attempt.status === "passed" ? "ผ่าน" : attempt.status === "almost" ? "เกือบ" : "ฝึกเพิ่ม"}
                          </span>

                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            className="text-text-muted flex-shrink-0 ml-1" aria-hidden="true"
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
          <div className="pb-4" />
        </div>
      )}

      {/* ══════════════ NOTES TAB ══════════════ */}
      {activeTab === "notes" && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-text">บันทึกจากผู้ปกครอง / ครู</h2>
            <p className="text-sm text-text-muted mt-0.5">บันทึกสิ่งที่สังเกตเห็นระหว่างการฝึก</p>
          </div>
          <section className="bg-surface border border-border rounded-xl p-5" aria-label="บันทึกของผู้ปกครองและครู">
            <ObservationNoteList
              notes={notes}
              onAdd={addNote}
              onEdit={updateNote}
              onDelete={deleteNote}
            />
          </section>
          <div className="pb-4" />
        </div>
      )}

      {/* ══════════════ REPORT TAB ══════════════ */}
      {activeTab === "report" && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-text">รายงานสำหรับผู้ปกครอง</h2>
              {dateStr && <p className="text-sm text-text-muted mt-0.5">ข้อมูล ณ {dateStr}</p>}
            </div>
            {canExportReport ? (
              <Link
                href="/report"
                className="flex-shrink-0 text-sm font-medium text-primary hover:text-primary/80 px-3 py-1.5 rounded-xl hover:bg-primary/8 transition-all border border-primary/20"
              >
                รายงานฉบับเต็ม →
              </Link>
            ) : (
              <span
                className="flex-shrink-0 text-sm text-text-muted px-3 py-1.5 rounded-xl border border-border/60 cursor-not-allowed opacity-60"
                title="ต้องได้รับสิทธิ์จากผู้ดูแลเด็ก"
              >
                รายงานฉบับเต็ม →
              </span>
            )}
          </div>

          {/* Difficult items */}
          <section className="bg-surface border border-border rounded-xl p-5" aria-label="รายการที่ต้องฝึกเพิ่ม">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">รายการที่ต้องฝึกเพิ่ม</p>
            {displaySummary.difficultItems.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-text-muted">
                  {hasData ? "ยังไม่มีรายการที่ยาก ทำได้ดีมากค่ะ!" : "เริ่มฝึกเพื่อดูรายการที่ควรฝึกเพิ่ม"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displaySummary.difficultItems.map((item) => (
                  <div key={item.practiceItemId} className="flex items-start gap-4 bg-secondary/5 border border-secondary/15 rounded-xl p-4">
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-secondary/12 flex items-center justify-center">
                      <span className="text-xs font-bold text-secondary leading-none">{item.averageScore}%</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text text-sm">{item.promptText}</p>
                      <p className="text-xs text-text-muted mt-0.5">ฝึก {item.attempts} ครั้ง · คะแนนเฉลี่ย {item.averageScore}%</p>
                      <p className="text-xs text-secondary mt-1.5">ลองฟังเสียงตัวอย่างแล้วออกเสียงช้าๆ ทีละพยางค์</p>
                    </div>
                  </div>
                ))}
                <div className="bg-info/8 border border-info/20 rounded-xl p-4">
                  <p className="text-xs font-semibold text-info mb-1">คำแนะนำสำหรับผู้ปกครอง</p>
                  <p className="text-sm text-text leading-relaxed">
                    ฝึกคำยากๆ ซ้ำๆ วันละ 5–10 ครั้ง โดยออกเสียงช้าๆ แล้วค่อยเพิ่มความเร็วขึ้น
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Auto report card */}
          <section
            className="bg-surface border border-primary/15 rounded-xl p-5"
            style={{ background: "linear-gradient(135deg, rgba(108,99,255,0.04) 0%, transparent 60%)" }}
            aria-label="รายงานสำหรับผู้ปกครอง"
          >
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-text">สรุปผลอัตโนมัติ</h3>
            </div>
            <div className="bg-bg dark:bg-white/4 border border-border rounded-xl p-4 mb-4">
              <p className="font-semibold text-text">{report.headline}</p>
            </div>
            {report.details.length > 0 && (
              <ul className="space-y-2 mb-4">
                {report.details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text">
                    <span className="text-primary flex-shrink-0 mt-0.5 font-bold">·</span>
                    {d}
                  </li>
                ))}
              </ul>
            )}
            {report.strengths.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-success uppercase tracking-wide mb-2">จุดแข็ง</p>
                <ul className="space-y-1.5">
                  {report.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF82" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="bg-primary/8 border border-primary/15 rounded-xl p-4">
              <p className="text-xs font-semibold text-primary mb-1.5">คำแนะนำ</p>
              <p className="text-sm text-text leading-relaxed">{report.recommendation}</p>
            </div>
            {hasMockNote && (
              <p className="text-xs text-text-muted text-center mt-4">
                * ผลประเมินนี้ใช้ข้อมูลสาธิต — เปิดใช้ OpenAI เพื่อรับผลประเมินจริง
              </p>
            )}
            {selectedSoundFilter && (
              <p className="text-xs text-primary/70 text-center mt-2">
                แสดงข้อมูลเสียง {selectedSoundFilter} เท่านั้น
              </p>
            )}
          </section>

          {/* Demo / Presentation Controls — owner only */}
          {isOwner && <section
            className="rounded-2xl border border-dashed border-primary/30 bg-primary/4 dark:bg-primary/6 p-5 pb-6"
            aria-label="ส่วนควบคุมโหมดสาธิต"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-primary/12 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-primary">โหมดนำเสนอ</p>
                <p className="text-xs text-text-muted">สำหรับสาธิตและนำเสนอโปรเจกต์</p>
              </div>
            </div>
            <p className="text-xs text-text-muted leading-relaxed mb-4">
              กดปุ่ม <strong className="text-text">โหลดข้อมูลสาธิต</strong> เพื่อดูตัวอย่างรายงานความก้าวหน้าที่สมบูรณ์
              ({DEMO_ATTEMPT_COUNT} ครั้ง ครอบคลุม 7 ระดับ)
            </p>

            {showDemoConfirm && (
              <div className="bg-surface border border-secondary/30 rounded-xl p-4 mb-4 text-center">
                <p className="text-sm font-semibold text-text mb-1">แทนที่ข้อมูลปัจจุบันด้วยข้อมูลสาธิต?</p>
                <p className="text-xs text-text-muted mb-4">ข้อมูลการฝึกที่มีอยู่ {attempts.length} ครั้งจะถูกแทนที่</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setShowDemoConfirm(false)} className="px-5 py-2 rounded-xl border border-border text-text-muted font-medium text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-all">ยกเลิก</button>
                  <button onClick={handleConfirmLoadDemo} className="px-5 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all">โหลดเลย</button>
                </div>
              </div>
            )}
            {showResetConfirm && (
              <div className="bg-surface border border-error/25 rounded-xl p-4 mb-4 text-center">
                <p className="text-sm font-semibold text-text mb-1">ล้างข้อมูลความก้าวหน้าทั้งหมด?</p>
                <p className="text-xs text-text-muted mb-4">การกระทำนี้ไม่สามารถยกเลิกได้</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setShowResetConfirm(false)} className="px-5 py-2 rounded-xl border border-border text-text-muted font-medium text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-all">ยกเลิก</button>
                  <button onClick={handleReset} className="px-5 py-2 rounded-xl bg-error text-white font-semibold text-sm hover:bg-error/90 transition-all">ล้างข้อมูล</button>
                </div>
              </div>
            )}

            {!showDemoConfirm && !showResetConfirm && (
              <div className="flex gap-3">
                <button
                  onClick={handleLoadDemo}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  โหลดข้อมูลสาธิต
                </button>
                <button
                  onClick={() => { setShowDemoConfirm(false); setShowResetConfirm(true); }}
                  disabled={!isHydrated || attempts.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-error/40 text-error font-semibold text-sm hover:bg-error/8 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                  ล้างข้อมูล
                </button>
              </div>
            )}
          </section>}
          <div className="pb-4" />
        </div>
      )}

      {/* ── Detail Drawers (rendered outside tab panels) ── */}
      <SessionDetailDrawer
        session={selectedSession}
        allAttempts={attempts}
        onClose={() => setSelectedSession(null)}
        onAttemptClick={(attempt) => setSelectedAttempt(attempt)}
      />
      <AttemptDetailDrawer
        attempt={selectedAttempt}
        linkedSession={
          selectedAttempt?.sessionId
            ? (progress.sessions.find((s) => s.id === selectedAttempt.sessionId) ?? null)
            : null
        }
        onClose={() => setSelectedAttempt(null)}
        onSessionClick={(session) => {
          setSelectedAttempt(null);
          setSelectedSession(session);
        }}
      />
    </AppShell>
  );
}

function ProgressEntry() {
  const requestedChild = useSearchParams().get("child");
  const { user, isLoading } = useAuth();
  const { profile, isOwner } = useChildProfile();
  const online = isSupabaseProviderRequested() && isSupabaseConfigured();
  const teacher = user?.role === "teacher";
  const schoolChildId = ((teacher || !user) && requestedChild)
    || (!isOwner && profile?.organizationId ? profile.id : null);

  if (online && (isLoading || schoolChildId || (user?.role === "parent" && !profile))) {
    return (
      <AppShell>
        {isLoading ? (
          <p role="status" className="p-6 text-sm text-text-muted">กำลังโหลด…</p>
        ) : !user ? (
          <Link className="inline-block p-6 text-sm font-semibold text-primary"
            href={`/auth/signin?redirect=${encodeURIComponent(`/progress?child=${encodeURIComponent(requestedChild ?? "")}`)}`}>
            เข้าสู่ระบบเพื่อดูผลฝึก
          </Link>
        ) : schoolChildId ? (
          <SchoolChildProgressView key={`${user.id}:${schoolChildId}`} childId={schoolChildId} teacher={teacher} viewerId={user.id} />
        ) : (
          <p className="p-6 text-sm text-text-muted">เลือกโปรไฟล์เด็กที่เชื่อมอยู่เพื่อดูผลฝึก</p>
        )}
      </AppShell>
    );
  }

  return <ProgressDashboardPage key={profile?.id} />;
}

export default function ProgressPage() {
  return (
    <Suspense fallback={<p role="status" className="p-6 text-sm text-text-muted">กำลังโหลด…</p>}>
      <ProgressEntry />
    </Suspense>
  );
}
