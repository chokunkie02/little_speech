"use client";

import DisplayIcon from "@/components/ui/DisplayIcon";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ChildProfileCard from "@/components/speech-adventure/ChildProfileCard";
import TargetSoundSelector from "@/components/speech-adventure/TargetSoundSelector";
import TrainingMap from "@/components/speech-adventure/TrainingMap";
import { LearningEntryCard } from "@/features/learning-studio/LearningEntryCard";
import TrainingModeTabs from "@/components/speech-adventure/TrainingModeTabs";
import AppShell from "@/components/layout/AppShell";
import { useSpeechProgress } from "@/hooks/useSpeechProgress";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useCurrentChildAccess } from "@/hooks/useCurrentChildAccess";
import { useAuth } from "@/hooks/useAuth";
import {
  mockChildProfile,
  mockTargetSounds,
  mockTrainingStages,
} from "@/data/speechAdventureMockData";
import type { TrainingStage } from "@/types/speechAdventure";
import type { TrainingMode } from "@/lib/child-profile/childProfileStorage";
import PhonicsJourneyMap from "@/components/phonics/PhonicsJourneyMap";
import { usePhonicsProgress } from "@/hooks/usePhonicsProgress";
import { calculateRewards } from "@/lib/rewards/calculateRewards";

export default function TrainingMapPage() {
  const router = useRouter();
  const {
    progress,
    getStageStatus,
    getStageAttempts,
    summary,
    isHydrated,
    selectedSoundId,
    setSelectedSound,
  } = useSpeechProgress();
  const { profile, hasProfile, saveProfile } = useChildProfile();
  const { isSharedChild, canEditChild, canStartPractice } = useCurrentChildAccess();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const activeMode: TrainingMode = profile?.trainingMode ?? "speech_clarity";
  const { completedLessonIds } = usePhonicsProgress();

  const handleModeChange = (mode: TrainingMode) => {
    if (!profile) return;
    void saveProfile({ ...profile, trainingMode: mode });
  };

  // Authenticated parent with no child profile → send to onboarding immediately.
  // Anonymous users are allowed to explore the training map without a profile.
  useEffect(() => {
    if (!isHydrated || isAuthLoading) return;
    if (isAuthenticated && !hasProfile && !isSharedChild) {
      router.replace("/onboarding");
    }
  }, [isHydrated, isAuthLoading, isAuthenticated, hasProfile, isSharedChild, router]);

  const activeSoundId = isHydrated ? (selectedSoundId || undefined) : undefined;

  const liveStages: TrainingStage[] = mockTrainingStages.map((stage) => {
    const status = getStageStatus(stage.id, activeSoundId);
    const stageAttempts = getStageAttempts(stage.id, activeSoundId);
    const starsEarned = stageAttempts.reduce((sum, a) => sum + a.starsEarned, 0);
    return { ...stage, status, starsEarned };
  });

  const liveProfile = {
    ...mockChildProfile,
    name: profile?.name ?? mockChildProfile.name,
    nickname: profile ? profile.name.split(" ")[0] : mockChildProfile.nickname,
    age: profile?.age ?? mockChildProfile.age,
    currentStage: summary.currentStageId,
    totalStars: summary.starsEarned,
    totalAttempts: summary.totalAttempts,
  };

  const selectedSound = mockTargetSounds.find((s) => s.id === selectedSoundId);
  const currentStage = liveStages.find((s) => s.status === "current");
  const completedCount = liveStages.filter((s) => s.status === "completed").length;
  const rewardResult = isHydrated ? calculateRewards(progress) : null;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── No-profile CTA (anonymous users only — authenticated users are redirected above) ── */}
        {isHydrated && !hasProfile && !isSharedChild && !isAuthenticated && (
          <div className="bg-primary/5 border border-primary/15 rounded-2xl px-6 py-8 text-center space-y-4">
            <div
              className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-3xl"
              aria-hidden="true"
            >
              <DisplayIcon name="user" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">เริ่มตั้งค่าโปรไฟล์เด็ก</h2>
              <p className="text-sm text-text-muted mt-1 leading-relaxed max-w-sm mx-auto">
                บันทึกชื่อน้อง เลือกเสียงที่ต้องการฝึก และเริ่ม Pre-test เพื่อประเมินระดับ
              </p>
            </div>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 active:scale-[0.98]"
            >
              ตั้งค่าโปรไฟล์เด็ก →
            </Link>
            <p className="text-xs text-text-muted">หรือเลื่อนลงเพื่อสำรวจแผนที่การฝึก</p>
          </div>
        )}

        {/* ── Page Header ── */}
        <header>
          <nav className="text-xs text-text-muted mb-2" aria-label="Breadcrumb">
            <Link href={isAuthenticated ? "/dashboard" : "/"} className="hover:text-primary transition-colors">หน้าหลัก</Link>
            <span className="mx-1.5 text-disabled">/</span>
            <span className="text-text font-medium">ฝึกออกเสียง</span>
          </nav>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-text">
                {activeMode === "kindergarten_phonics" ? "เรียนเสียงไทย" : "ฝึกออกเสียง"}
              </h1>
              <p className="text-sm text-text-muted mt-0.5">
                {activeMode === "kindergarten_phonics"
                  ? "สวนเสียง · ฟังก่อน แล้วลองพูดตามนะ"
                  : "เลือกเสียงเป้าหมายและระดับที่ต้องการฝึก"}
              </p>
            </div>
            {isHydrated && activeMode === "speech_clarity" && (
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-center hidden sm:block">
                  <p className="font-bold text-primary text-lg leading-none">{completedCount}<span className="text-text-muted text-xs font-normal">/7</span></p>
                  <p className="text-xs text-text-muted">ระดับผ่าน</p>
                </div>
              {currentStage && (
                  canStartPractice ? (
                    <a
                      href={`/training/${currentStage.slug}`}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                      style={{ backgroundColor: currentStage.accentColor }}
                    >
                      ฝึกต่อ →
                    </a>
                  ) : (
                    <span
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-text-muted/60 bg-border/40 cursor-not-allowed"
                      title="คุณมีสิทธิ์ดูเท่านั้น"
                    >
                      ฝึกต่อ →
                    </span>
                  )
              )}
              </div>
            )}
          </div>
        </header>

        <LearningEntryCard />

        {/* ── 2-Column Layout ── */}
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:items-start space-y-6 lg:space-y-0">

          {/* ── Left Column: Mode Tabs + Sound Selector + Journey Map ── */}
          <div className="space-y-5 min-w-0">
            {/* Training mode switcher — only show when user has a profile */}
            {isHydrated && hasProfile && (
              <TrainingModeTabs
                activeMode={activeMode}
                onModeChange={handleModeChange}
                disabled={!canStartPractice}
              />
            )}

            {activeMode === "speech_clarity" && (
              <>
                <TargetSoundSelector
                  sounds={mockTargetSounds}
                  selectedId={isHydrated ? selectedSoundId : null}
                  onSelect={setSelectedSound}
                />

                <section>
                  <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 px-1">
                    เส้นทางการฝึก
                  </h2>
                  <TrainingMap stages={liveStages} canStartPractice={canStartPractice} />
                </section>
              </>
            )}

            {activeMode === "kindergarten_phonics" && (
              <PhonicsJourneyMap
                canStart={canStartPractice}
                completedLessonIds={completedLessonIds}
              />
            )}
          </div>

          {/* ── Right Column: Side Panel ── */}
          <aside className="space-y-4 lg:sticky lg:top-4">

            {/* Child Profile */}
            <div className="relative">
              <ChildProfileCard
                profile={liveProfile}
                compact
                isHydrated={isHydrated}
              />
              {isHydrated && (!isSharedChild || canEditChild) && (
                <Link
                  href="/onboarding"
                  className="absolute top-2 right-2 text-xs text-text-muted hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/8"
                >
                  {hasProfile ? "แก้ไข" : "ตั้งค่า"}
                </Link>
              )}
            </div>

            {/* Selected Sound Summary — speech_clarity only */}
            {isHydrated && activeMode === "speech_clarity" && selectedSound && (
              <div className="flex items-center gap-3 bg-primary/6 border border-primary/15 rounded-xl px-4 py-3">
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold text-primary flex-shrink-0"
                  style={{ backgroundColor: "rgba(108,99,255,0.10)" }}
                >
                  {selectedSound.label}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text truncate">
                    เสียง /{selectedSound.label}/
                  </p>
                  <p className="text-xs text-text-muted truncate">{selectedSound.description}</p>
                </div>
              </div>
            )}

            {/* Next Best Action — speech_clarity only */}
            {isHydrated && activeMode === "speech_clarity" && currentStage && (
              <div
                className="rounded-xl px-4 py-3.5 border"
                style={{
                  backgroundColor: `${currentStage.accentColor}08`,
                  borderColor: `${currentStage.accentColor}25`,
                }}
              >
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">ขั้นต่อไปที่แนะนำ</p>
                <div className="flex items-center gap-3">
                  <span className="text-xl flex-shrink-0" aria-hidden="true"><DisplayIcon name={currentStage.icon} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text text-sm leading-snug">{currentStage.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">{currentStage.shortGoal}</p>
                  </div>
                </div>
                {canStartPractice ? (
                  <a
                    href={`/training/${currentStage.slug}`}
                    className="block w-full text-center mt-3 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.98]"
                    style={{ backgroundColor: currentStage.accentColor }}
                  >
                    ฝึกเลย
                  </a>
                ) : (
                  <div className="mt-3 px-4 py-2 rounded-xl text-sm font-medium text-text-muted bg-border/30 text-center cursor-not-allowed select-none">
                    คุณมีสิทธิ์ดูเท่านั้น
                  </div>
                )}
              </div>
            )}

            {/* Rewards Summary */}
            {isHydrated && rewardResult && rewardResult.earnedCount > 0 && (
              <Link
                href="/rewards"
                className="flex items-center justify-between gap-3 bg-surface border border-border rounded-xl px-4 py-3 hover:border-secondary/40 hover:shadow-sm transition-all group"
                aria-label="ดูรางวัลและเหรียญตรา"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-secondary/12 flex items-center justify-center flex-shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFB347" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text leading-tight">รางวัล</p>
                    <p className="text-xs text-text-muted">
                      {rewardResult.earnedCount}/{rewardResult.totalBadges} เหรียญ
                    </p>
                  </div>
                </div>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted group-hover:text-secondary transition-colors flex-shrink-0" aria-hidden="true">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            )}

            {/* Quick stats on mobile (hidden on desktop since sidebar shows them) */}
            {!isHydrated && (
              <div className="bg-surface border border-border rounded-xl p-4 text-center">
                <p className="text-sm text-text-muted">กำลังโหลดข้อมูล...</p>
              </div>
            )}
          </aside>
        </div>

        <div className="pb-4" />
      </div>
    </AppShell>
  );
}
