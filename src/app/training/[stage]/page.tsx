"use client";

import DisplayIcon from "@/components/ui/DisplayIcon";
import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
import PracticeCard from "@/components/speech-adventure/PracticeCard";
import LevelCompletionSummary from "@/components/speech-adventure/LevelCompletionSummary";
import PracticeSessionSummary from "@/components/speech-adventure/PracticeSessionSummary";
import { useSpeechProgress } from "@/hooks/useSpeechProgress";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useCurrentChildAccess } from "@/hooks/useCurrentChildAccess";
import PermissionBanner from "@/components/ui/PermissionBanner";
import {
  mockPracticeItemsBySound,
  mockTrainingStages,
} from "@/data/speechAdventureMockData";
import type { PracticeAttempt, PracticeSession } from "@/types/speechAdventure";

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

export default function PracticePage() {
  const params = useParams();
  const stageSlug = params.stage as string;
  const stage = mockTrainingStages.find((s) => s.slug === stageSlug);
  const { addAttempt, selectedSoundId, isHydrated, startSession, completeSession } = useSpeechProgress();
  const { profile } = useChildProfile();
  const { canStartPractice } = useCurrentChildAccess();

  const soundContent =
    mockPracticeItemsBySound[selectedSoundId] ??
    mockPracticeItemsBySound["ก"] ??
    {};
  const items = soundContent[stageSlug] ?? [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [sessionAttempts, setSessionAttempts] = useState<PracticeAttempt[]>([]);
  const [activeSession, setActiveSession] = useState<PracticeSession | null>(null);
  const [completedSession, setCompletedSession] = useState<PracticeSession | null>(null);
  const sessionStarted = useRef(false);

  // Start a session when the stage loads with content.
  // Guards: must have canStartPractice permission AND a valid child profile ID.
  // Attempting to start a session without a profile ID would create an
  // orphaned record with an empty childId.
  useEffect(() => {
    if (!canStartPractice) return;
    if (!isHydrated || !stage || items.length === 0 || sessionStarted.current) return;
    if (!profile?.id) return; // no valid profile — skip session creation
    sessionStarted.current = true;
    void (async () => {
      try {
        const session = await startSession({
          childId: profile.id,
          targetSound: selectedSoundId,
          stageId: stageSlug,
          totalMissions: items.length,
        });
        setActiveSession(session);
      } catch {
        // startSession throws if childId is empty; safe to ignore here.
      }
    })();
  }, [canStartPractice, isHydrated, stage, stageSlug, items.length, selectedSoundId, startSession, profile?.id]);

  const handleSaveAttempt = useCallback(
    (attempt: PracticeAttempt) => {
      const attemptWithSession = activeSession
        ? { ...attempt, sessionId: activeSession.id }
        : attempt;
      addAttempt(attemptWithSession);
      setSessionAttempts((prev) => [...prev, attemptWithSession]);
    },
    [addAttempt, activeSession]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Complete the session when all missions are done
      if (activeSession) {
        void completeSession(activeSession.id).then((completed) => {
          if (completed) setCompletedSession(completed);
        });
      }
      setShowCompletion(true);
    }
  }, [currentIndex, items.length, activeSession, completeSession]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleRetry = useCallback(() => {
    if (!canStartPractice) return;
    setCurrentIndex(0);
    setShowCompletion(false);
    setSessionAttempts([]);
    setCompletedSession(null);
    sessionStarted.current = true;
    if (!profile?.id) return; // no valid profile — skip session creation
    void (async () => {
      try {
        const session = await startSession({
          childId: profile.id,
          targetSound: selectedSoundId,
          stageId: stageSlug,
          totalMissions: items.length,
        });
        setActiveSession(session);
      } catch {
        // safe to ignore
      }
    })();
  }, [canStartPractice, stageSlug, selectedSoundId, items.length, startSession, profile]);

  /* ── No profile guard: authenticated user needs to complete onboarding ── */
  if (isHydrated && !profile?.id && canStartPractice) {
    return (
      <main className="min-h-screen bg-bg">
        <nav className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between px-6 py-3 max-w-3xl mx-auto">
            <Link href="/training" className="flex items-center gap-2 text-text-muted hover:text-text transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8">
              <BackIcon />
              <span className="text-sm font-medium hidden sm:inline">แผนที่</span>
            </Link>
            <h1 className="font-semibold text-text text-sm">{stage?.name ?? stageSlug}</h1>
            <ThemeToggle />
          </div>
        </nav>
        <div className="max-w-3xl mx-auto px-6 py-16 flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl" aria-hidden="true">
            <DisplayIcon name="user" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text mb-2">ยังไม่ได้ตั้งค่าโปรไฟล์เด็ก</h2>
            <p className="text-sm text-text-muted max-w-sm mx-auto leading-relaxed">
              กรุณาตั้งค่าโปรไฟล์เด็กก่อนเริ่มฝึก เพื่อให้ระบบบันทึกความก้าวหน้าได้ถูกต้อง
            </p>
          </div>
          <Link
            href="/onboarding"
            className="px-6 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all"
          >
            ตั้งค่าโปรไฟล์ →
          </Link>
          <Link href="/training" className="text-sm text-text-muted hover:text-text transition-colors">
            กลับแผนที่
          </Link>
        </div>
      </main>
    );
  }

  /* ── Permission guard: viewer cannot start practice ── */
  if (isHydrated && !canStartPractice) {
    return (
      <main className="min-h-screen bg-bg">
        <nav className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between px-6 py-3 max-w-3xl mx-auto">
            <Link href="/training" className="flex items-center gap-2 text-text-muted hover:text-text transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8">
              <BackIcon />
              <span className="text-sm font-medium hidden sm:inline">แผนที่</span>
            </Link>
            <h1 className="font-semibold text-text text-sm">{stage?.name ?? stageSlug}</h1>
            <ThemeToggle />
          </div>
        </nav>
        <div className="max-w-3xl mx-auto px-6 py-16 flex flex-col items-center gap-6 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ backgroundColor: stage ? `${stage.accentColor}15` : "var(--border)" }}
            aria-hidden="true"
          >
            <DisplayIcon name={stage?.icon ?? "lock"} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text mb-2">คุณมีสิทธิ์ดูความก้าวหน้าเท่านั้น</h2>
            <p className="text-sm text-text-muted max-w-sm mx-auto leading-relaxed">
              ไม่สามารถเริ่มการฝึกได้ ติดต่อเจ้าของโปรไฟล์เด็กเพื่อขอสิทธิ์เพิ่มเติม
            </p>
          </div>
          <PermissionBanner
            message="คุณมีสิทธิ์ดูความก้าวหน้าเท่านั้น ไม่สามารถเริ่มการฝึกได้"
            hint="ติดต่อเจ้าของโปรไฟล์เด็กเพื่อขอสิทธิ์ “เริ่มการฝึก”"
            className="w-full max-w-sm"
          />
          <Link
            href="/progress"
            className="text-sm font-semibold text-primary hover:text-primary/80 px-5 py-2.5 rounded-xl border border-primary/30 hover:bg-primary/8 transition-all"
          >
            ดูความก้าวหน้า →
          </Link>
        </div>
      </main>
    );
  }

  /* ── Not found ── */
  if (!stage) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-text mb-2">ไม่พบระดับนี้</h1>
          <p className="text-text-muted text-sm mb-6">ระดับที่กำลังมองหาไม่มีอยู่ในระบบ</p>
          <Link
            href="/training"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all"
          >
            กลับแผนที่การฝึก
          </Link>
        </div>
      </main>
    );
  }

  /* ── No content for this sound ── */
  if (isHydrated && items.length === 0) {
    return (
      <main className="min-h-screen bg-bg">
        <nav className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between px-6 py-3 max-w-3xl mx-auto">
            <Link href="/training" className="flex items-center gap-2 text-text-muted hover:text-text transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8">
              <BackIcon />
              <span className="text-sm font-medium hidden sm:inline">แผนที่</span>
            </Link>
            <h1 className="font-semibold text-text text-sm">{stage.name}</h1>
            <ThemeToggle />
          </div>
        </nav>
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl"
            style={{ backgroundColor: `${stage.accentColor}15` }}
            aria-hidden="true"
          >
            <DisplayIcon name={stage.icon} />
          </div>
          <h2 className="text-xl font-bold text-text mb-2">ยังไม่มีภารกิจสำหรับเสียงนี้</h2>
          <p className="text-text-muted mb-1 text-sm">
            เสียง <strong className="text-primary">{selectedSoundId}</strong> ใน {stage.name} ยังอยู่ระหว่างเตรียม
          </p>
          <p className="text-sm text-text-muted mb-6">ลองเปลี่ยนเสียงที่ต้องการฝึกที่หน้าแผนที่</p>
          <Link
            href="/training"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all"
          >
            เปลี่ยนเสียงที่แผนที่
          </Link>
        </div>
      </main>
    );
  }

  const currentItem = items[currentIndex];
  const isLastMission = currentIndex === items.length - 1;
  const progressPercent = showCompletion
    ? 100
    : items.length > 0
    ? ((currentIndex + 1) / items.length) * 100
    : 0;

  return (
    <main className="min-h-screen bg-bg">
      {/* ── Top Bar ── */}
      <nav className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-6 py-3 max-w-3xl mx-auto">
          <Link
            href="/training"
            className="flex items-center gap-2 text-text-muted hover:text-text transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8"
            aria-label="กลับแผนที่การฝึก"
          >
            <BackIcon />
            <span className="text-sm font-medium hidden sm:inline">แผนที่</span>
          </Link>

          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
              style={{ backgroundColor: `${stage.accentColor}20` }}
              aria-hidden="true"
            >
              <DisplayIcon name={stage.icon} />
            </span>
            <h1 className="font-semibold text-text text-sm hidden sm:block">{stage.name}</h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-muted tabular-nums">
              {showCompletion
                ? `${items.length}/${items.length}`
                : items.length > 0 ? `${currentIndex + 1}/${items.length}` : ""}
            </span>
            <ThemeToggle />
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-white/8">
          <div
            className="h-full rounded-r-full transition-all duration-500"
            style={{ width: `${progressPercent}%`, backgroundColor: stage.accentColor }}
          />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {showCompletion ? (
          completedSession ? (
            <PracticeSessionSummary
              session={completedSession}
              stage={stage}
              onRetry={handleRetry}
              sessionAttempts={sessionAttempts}
            />
          ) : (
            <LevelCompletionSummary
              attempts={sessionAttempts}
              stage={stage}
              totalMissions={items.length}
              onRetry={handleRetry}
            />
          )
        ) : (
          <>
            {/* ── Stage info + mission dots ── */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${stage.accentColor}18` }}
                  aria-hidden="true"
                >
                  <DisplayIcon name={stage.icon} />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-text text-sm leading-tight">{stage.name}</h2>
                  <p className="text-xs text-text-muted truncate">{stage.shortGoal}</p>
                </div>

                <div className="ml-auto shrink-0 text-right space-y-0.5">
                  {isHydrated && (
                    <span
                      className="inline-block text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${stage.accentColor}18`, color: stage.accentColor }}
                    >
                      เสียง {selectedSoundId}
                    </span>
                  )}
                  {items.length > 0 && (
                    <p className="text-xs text-text-muted">
                      ภารกิจ{" "}
                      <span className="font-bold" style={{ color: stage.accentColor }}>
                        {currentIndex + 1}
                      </span>
                      {" / "}{items.length}
                    </p>
                  )}
                </div>
              </div>

              {/* Step dots */}
              {items.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-4">
                  {items.map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-full transition-all duration-300 ${
                        i < currentIndex ? "w-3 h-2" : i === currentIndex ? "w-6 h-2" : "w-2 h-2"
                      } ${i > currentIndex ? "bg-gray-200 dark:bg-white/15" : ""}`}
                      style={
                        i <= currentIndex ? { backgroundColor: stage.accentColor } : undefined
                      }
                      aria-hidden="true"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Practice card ── */}
            {currentItem && (
              <PracticeCard
                key={currentItem.id}
                item={currentItem}
                accentColor={stage.accentColor}
                stageName={stage.name}
                targetSound={selectedSoundId}
                missionIndex={currentIndex}
                totalMissions={items.length}
                isLastMission={isLastMission}
                onSaveAttempt={handleSaveAttempt}
                onNext={handleNext}
              />
            )}

            {/* ── Previous mission button ── */}
            {currentIndex > 0 && (
              <div className="flex justify-start">
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-text-muted hover:text-text hover:bg-surface dark:hover:bg-white/5 border border-transparent hover:border-border transition-all text-sm font-medium"
                >
                  <BackIcon />
                  ภารกิจก่อนหน้า
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
