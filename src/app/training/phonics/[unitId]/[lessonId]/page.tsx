"use client";

import DisplayIcon from "@/components/ui/DisplayIcon";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
import PhonicsActivityRenderer from "@/components/phonics/PhonicsActivityRenderer";
import { getPhonicsUnit, getPhonicsLesson } from "@/data/kindergartenCurriculum";
import { usePhonicsProgress } from "@/hooks/usePhonicsProgress";
import { useChildProfile } from "@/hooks/useChildProfile";
import type {
  PhonicsActivityResult,
  PhonicsAttempt,
  PhonicsSession,
} from "@/types/phonics";

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

function phonicsStars(score: number): number {
  if (score >= 85) return 3;
  if (score >= 60) return 2;
  if (score >= 40) return 1;
  return 0;
}

type Phase = "activity" | "summary";

interface StoredResult {
  itemId: string;
  passed: boolean;
  score: number;
  feedback: string;
}

// ── Summary screen ─────────────────────────────────────────────────────────────

function SummaryScreen({
  lessonTitle,
  results,
  onRetry,
}: {
  lessonTitle: string;
  results: StoredResult[];
  onRetry: () => void;
}) {
  const router = useRouter();
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const avgScore = total > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / total) : 0;
  const totalStars = results.reduce((s, r) => s + phonicsStars(r.score), 0);
  const pct = total > 0 ? Math.round((passedCount / total) * 100) : 0;

  const headline = pct === 100 ? "เยี่ยมมากเลย!" : pct >= 70 ? "ทำได้ดีมาก!" : "ไม่เป็นไรค่ะ ลองอีกครั้งนะ";

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <nav className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-6 py-3 max-w-lg mx-auto">
          <Link href="/training" className="flex items-center gap-2 text-text-muted hover:text-text transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8">
            <BackIcon />
            <span className="text-sm font-medium hidden sm:inline">สวนเสียง</span>
          </Link>
          <span className="text-sm font-semibold text-text truncate max-w-[180px]">{lessonTitle}</span>
          <ThemeToggle />
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="text-7xl" aria-hidden="true"><DisplayIcon name={pct >= 70 ? "star" : "sprout"} /></div>

          <div>
            <h2 className="text-2xl font-bold text-text">{headline}</h2>
            <p className="text-text-muted mt-1 text-sm">ผ่าน {passedCount}/{total} กิจกรรม</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface border border-border rounded-xl py-3 text-center">
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{avgScore}</p>
              <p className="text-xs text-text-muted mt-0.5">คะแนนเฉลี่ย</p>
            </div>
            <div className="bg-surface border border-border rounded-xl py-3 text-center">
              <p className="text-xl font-bold text-text">{passedCount}/{total}</p>
              <p className="text-xs text-text-muted mt-0.5">ผ่านกิจกรรม</p>
            </div>
            <div className="bg-surface border border-border rounded-xl py-3 text-center">
              <p className="text-xl font-bold text-amber-500">{"★".repeat(Math.min(totalStars, 3))}{totalStars === 0 ? "–" : ""}</p>
              <p className="text-xs text-text-muted mt-0.5">{totalStars} ดาว</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 dark:bg-amber-500 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }} />
          </div>

          <div className="space-y-3 pt-2">
            <button type="button" onClick={() => router.push("/training")}
              className="w-full py-3.5 rounded-xl bg-amber-500 text-white font-semibold text-base hover:bg-amber-600 transition-all shadow-sm shadow-amber-300/40 active:scale-[0.98]">
              กลับไปสวนเสียง
            </button>
            <button type="button" onClick={onRetry}
              className="w-full py-3 rounded-xl border border-border text-text-muted hover:text-text hover:border-amber-400/60 font-medium text-sm transition-all active:scale-[0.98]">
              ลองบทเรียนนี้อีกครั้ง
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PhonicsLessonPage() {
  const params = useParams();
  const unitId = params.unitId as string;
  const lessonId = params.lessonId as string;

  const unit = getPhonicsUnit(unitId);
  const lesson = unit ? getPhonicsLesson(unitId, lessonId) : undefined;

  const { profile, hasProfile } = useChildProfile();
  const { startSession, addAttempt, completeSession, isHydrated } = usePhonicsProgress();

  const [phase, setPhase] = useState<Phase>("activity");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<StoredResult[]>([]);
  const [activeSession, setActiveSession] = useState<PhonicsSession | null>(null);
  const sessionStarted = useRef(false);
  // sessionKey increments on retry to force the session-start effect to re-run
  const [sessionKey, setSessionKey] = useState(0);

  // Start session when lesson + profile are ready
  useEffect(() => {
    if (!lesson || !profile?.id || sessionStarted.current) return;
    sessionStarted.current = true;
    const s = startSession(unitId, lessonId, lesson.items.length);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s) setActiveSession(s);
  }, [lesson, profile?.id, unitId, lessonId, startSession, sessionKey]);

  const resetLesson = () => {
    setPhase("activity");
    setCurrentIndex(0);
    setResults([]);
    setActiveSession(null);
    sessionStarted.current = false;
    setSessionKey((k) => k + 1);
  };

  // ── No profile guard (wait for hydration before showing) ──
  if (isHydrated && !hasProfile) {
    return (
      <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 py-10 gap-4 text-center">
        <div className="text-5xl" aria-hidden="true"><DisplayIcon name="sprout" /></div>
        <p className="text-text font-semibold">กรุณาตั้งค่าโปรไฟล์เด็กก่อนนะคะ</p>
        <p className="text-sm text-text-muted">เพื่อบันทึกความก้าวหน้าในการเรียน</p>
        <Link href="/onboarding" className="px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-all shadow-sm shadow-amber-300/30">
          ตั้งค่าโปรไฟล์ →
        </Link>
        <Link href="/training" className="text-sm text-amber-600 dark:text-amber-400 hover:underline">
          กลับไปสวนเสียง
        </Link>
      </main>
    );
  }

  // ── Not found ──
  if (!unit || !lesson) {
    return (
      <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 py-10 gap-4">
        <p className="text-text font-semibold">ไม่พบบทเรียนนี้</p>
        <Link href="/training" className="px-5 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-all">
          กลับไปสวนเสียง
        </Link>
      </main>
    );
  }

  const items = lesson.items;
  const totalItems = items.length;

  // ── Summary ──
  if (phase === "summary") {
    return <SummaryScreen lessonTitle={lesson.title} results={results} onRetry={resetLesson} />;
  }

  // ── Activity ──
  const currentItem = items[currentIndex];
  if (!currentItem) return null;

  const handleComplete = (activityResult: PhonicsActivityResult) => {
    if (!profile?.id) return;

    // Build and save attempt
    const stars = phonicsStars(activityResult.score);
    const attempt: PhonicsAttempt = {
      id: `pa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      childId: profile.id,
      trainingMode: "kindergarten_phonics",
      unitId,
      lessonId,
      practiceItemId: currentItem.id,
      activityType: currentItem.type,
      prompt: currentItem.prompt,
      score: activityResult.score,
      status: activityResult.status,
      feedback: activityResult.feedback,
      starsEarned: stars,
      sessionId: activeSession?.id,
      durationMs: activityResult.durationMs,
      isMock: activityResult.isMock,
      createdAt: new Date().toISOString(),
    };
    addAttempt(attempt);

    const next = [...results, {
      itemId: currentItem.id,
      passed: activityResult.passed,
      score: activityResult.score,
      feedback: activityResult.feedback,
    }];
    setResults(next);

    if (currentIndex + 1 >= totalItems) {
      // Complete session
      if (activeSession) completeSession(activeSession.id);
      setPhase("summary");
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-6 py-3 max-w-lg mx-auto">
          <Link href="/training" className="flex items-center gap-2 text-text-muted hover:text-text transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8">
            <BackIcon />
            <span className="text-sm font-medium hidden sm:inline">สวนเสียง</span>
          </Link>
          <div className="text-center min-w-0 px-2">
            <p className="text-sm font-semibold text-text truncate">{lesson.title}</p>
            <p className="text-xs text-text-muted">{unit.id} · กิจกรรม {currentIndex + 1}/{totalItems}</p>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      {/* ── Progress dots ── */}
      <div className="flex justify-center gap-1.5 py-3 px-6">
        {items.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
            i < currentIndex ? "w-3 bg-amber-400"
              : i === currentIndex ? "w-6 bg-amber-500"
              : "w-3 bg-border"
          }`} />
        ))}
      </div>

      {/* ── Activity card ── */}
      <div className="flex-1 flex items-start justify-center px-6 py-6">
        <div className="w-full max-w-md">
          <div className="mb-5 px-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-md">{unit.id}</span>
              <span className="text-xs text-text-muted">{unit.title}</span>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-2xl px-6 py-8 shadow-sm">
            <PhonicsActivityRenderer
              key={`${currentItem.id}-${currentIndex}`}
              item={currentItem}
              onComplete={handleComplete}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
