"use client";

import DisplayIcon from "@/components/ui/DisplayIcon";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useSpeechProgress } from "@/hooks/useSpeechProgress";
import { useAuth, getUserRole } from "@/hooks/useAuth";
import { mockTargetSounds } from "@/data/speechAdventureMockData";
import type { TrainingMode } from "@/lib/child-profile/childProfileStorage";

// Steps: 1=Welcome, 2=Name+Age, 3=TrainingMode, 4=TargetSound (speech_clarity only), 5=Confirm
type Step = 1 | 2 | 3 | 4 | 5;

const GOALS = [
  { id: "daily", label: "ทุกวัน", desc: "วันละ 10–15 นาที สม่ำเสมอ" },
  { id: "3x-week", label: "3 วัน/สัปดาห์", desc: "ฝึกสัปดาห์ละ 3 ครั้ง" },
  { id: "casual", label: "เมื่อมีเวลา", desc: "ค่อยเป็นค่อยไป ไม่กดดัน" },
];

const GOAL_LABELS: Record<string, string> = {
  daily: "ทุกวัน",
  "3x-week": "3 วัน/สัปดาห์",
  casual: "เมื่อมีเวลา",
};

const ROLE_LABELS: Record<string, string> = {
  parent: "ผู้ปกครอง",
  teacher: "ครู",
  therapist: "นักบำบัด",
  school_admin: "ผู้ดูแลโรงเรียน",
};

const MODE_LABELS: Record<TrainingMode, string> = {
  speech_clarity: "ฝึกเสียงให้ชัด",
  kindergarten_phonics: "เรียนเสียงไทย",
};

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editParam = searchParams.get("edit");

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState(5);
  const [targetSound, setTargetSound] = useState("ก");
  const [trainingGoal, setTrainingGoal] = useState("daily");
  const [trainingMode, setTrainingMode] = useState<TrainingMode>("speech_clarity");
  const [isEdit, setIsEdit] = useState(false);

  const { saveProfile: repoSaveProfile, profile: existingProfile } = useChildProfile();
  const { setSelectedSound } = useSpeechProgress();
  const { user } = useAuth();
  const role = getUserRole(user);
  const editDetectedRef = useRef(false);

  useEffect(() => {
    if (!existingProfile) return;
    if (editParam !== "true") {
      router.replace("/training");
    }
  }, [existingProfile, editParam, router]);

  useEffect(() => {
    if (editDetectedRef.current || !existingProfile || editParam !== "true") return;
    editDetectedRef.current = true;
    setName(existingProfile.name);
    setAge(existingProfile.age);
    setTargetSound(existingProfile.targetSound || "ก");
    setTrainingGoal(existingProfile.trainingGoal);
    setTrainingMode(existingProfile.trainingMode ?? "speech_clarity");
    setIsEdit(true);
    setStep(2);
  }, [existingProfile, editParam]);

  const advanceFromStep3 = () => {
    // Skip target-sound step when kindergarten mode selected
    if (trainingMode === "kindergarten_phonics") {
      setStep(5);
    } else {
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step === 5 && trainingMode === "kindergarten_phonics") {
      setStep(3);
    } else {
      setStep((s) => Math.max(2, s - 1) as Step);
    }
  };

  const buildProfile = () => {
    const now = new Date().toISOString();
    return {
      id: existingProfile?.id ?? `child-${Date.now()}`,
      name: name.trim(),
      age,
      targetSound: trainingMode === "speech_clarity" ? targetSound : (existingProfile?.targetSound ?? ""),
      trainingGoal,
      trainingMode,
      createdAt: existingProfile?.createdAt ?? now,
      updatedAt: now,
    };
  };

  const handleFinish = () => {
    const p = buildProfile();
    void repoSaveProfile(p);
    if (trainingMode === "speech_clarity") {
      setSelectedSound(p.targetSound);
    }
    if (isEdit) {
      router.push("/training");
    } else if (trainingMode === "speech_clarity") {
      router.push("/training");
    } else {
      router.push("/training");
    }
  };

  // Progress dots shown after welcome step
  // speech_clarity: steps 2,3,4,5 → dots [2,3,4,5]
  // kindergarten:   steps 2,3,5   → dots [2,3,5] (dot 4 hidden)
  const visibleDots =
    trainingMode === "kindergarten_phonics" ? ([2, 3, 5] as Step[]) : ([2, 3, 4, 5] as Step[]);
  const totalSteps = visibleDots.length;
  const currentDotIndex = visibleDots.indexOf(step);
  const progressStep = currentDotIndex + 1;

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      {/* ── Top bar (hidden on welcome step) ── */}
      {step > 1 && (
        <nav className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between px-6 py-3 max-w-xl mx-auto">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-text-muted hover:text-text transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8"
            >
              <BackIcon />
              <span className="text-sm font-medium hidden sm:inline">ย้อนกลับ</span>
            </button>

            <div className="flex items-center gap-1.5">
              {visibleDots.map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    s === step
                      ? "w-6 bg-primary"
                      : s < step
                      ? "w-3 bg-primary/50"
                      : "w-3 bg-border"
                  }`}
                />
              ))}
            </div>

            <span className="text-sm text-text-muted w-16 text-right">
              {progressStep}/{totalSteps}
            </span>
          </div>
        </nav>
      )}

      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
        <div className="w-full max-w-xl">

          {/* ── Step 1: Welcome ── */}
          {step === 1 && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/25">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </div>

              <div>
                <h1 className="text-3xl font-bold text-text mb-3">
                  ยินดีต้อนรับสู่<br />
                  <span className="text-primary">Speech Adventure</span>
                </h1>
                <p className="text-text-muted text-base leading-relaxed max-w-sm mx-auto">
                  ระบบฝึกพูดสำหรับเด็กไทย ออกแบบโดยผู้เชี่ยวชาญด้านนักบำบัดการพูด
                  ใช้เวลาเพียง 2 นาทีในการตั้งค่าเริ่มต้น
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                {[
                  { icon: "target", label: "7 ระดับการฝึก" },
                  { icon: "mic", label: "อัดเสียงได้" },
                  { icon: "chart", label: "ติดตามผล" },
                ].map((f) => (
                  <div key={f.label} className="bg-surface border border-border rounded-xl px-3 py-3 text-center">
                    <div className="text-xl mb-1"><DisplayIcon name={f.icon} /></div>
                    <p className="text-xs text-text-muted">{f.label}</p>
                  </div>
                ))}
              </div>

              {user ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                    {ROLE_LABELS[role] ?? "ผู้ปกครอง"}
                  </span>
                  <span className="text-text-muted truncate max-w-[200px]">{user.email}</span>
                </div>
              ) : (
                <p className="text-xs text-text-muted">ไม่ต้องล็อกอินก็ใช้งานได้</p>
              )}

              <button
                onClick={() => setStep(2)}
                className="w-full bg-primary text-white font-semibold px-8 py-4 rounded-xl text-base hover:bg-primary/90 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-primary/25"
              >
                เริ่มตั้งค่าเลย →
              </button>

              <button
                onClick={() => router.push("/")}
                className="text-sm text-text-muted hover:text-text transition-colors"
              >
                ข้ามและไปหน้าแรก
              </button>
            </div>
          )}

          {/* ── Step 2: Name + Age ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-text mb-1">ชื่อน้องคืออะไร?</h2>
                <p className="text-text-muted">เราจะใช้ชื่อนี้ในการฝึกค่ะ</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-2">
                    ชื่อ-นามสกุล (หรือชื่อเล่น)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="เช่น น้องส้ม หรือ อรวรรณ สุขใจ"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text mb-2">
                    อายุ: <span className="text-primary font-bold">{age} ปี</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setAge((a) => Math.max(3, a - 1))}
                      className="w-11 h-11 rounded-xl border border-border bg-surface hover:bg-gray-100 dark:hover:bg-white/8 flex items-center justify-center text-text font-bold text-lg transition-all active:scale-95"
                    >
                      –
                    </button>
                    <div className="flex-1 flex gap-1.5 flex-wrap justify-center">
                      {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((y) => (
                        <button
                          key={y}
                          onClick={() => setAge(y)}
                          className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                            age === y
                              ? "bg-primary text-white shadow-sm shadow-primary/25"
                              : "bg-surface border border-border text-text-muted hover:border-primary/40 hover:text-primary"
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setAge((a) => Math.min(12, a + 1))}
                      className="w-11 h-11 rounded-xl border border-border bg-surface hover:bg-gray-100 dark:hover:bg-white/8 flex items-center justify-center text-text font-bold text-lg transition-all active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text mb-2">
                    เป้าหมายการฝึก
                  </label>
                  <div className="space-y-2">
                    {GOALS.map((goal) => (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => setTrainingGoal(goal.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left active:scale-[0.99] ${
                          trainingGoal === goal.id
                            ? "border-primary bg-primary/8"
                            : "border-border bg-surface hover:border-primary/40"
                        }`}
                      >
                        <div>
                          <p className={`font-semibold text-sm ${trainingGoal === goal.id ? "text-primary" : "text-text"}`}>
                            {goal.label}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">{goal.desc}</p>
                        </div>
                        {trainingGoal === goal.id && (
                          <span className="text-primary flex-shrink-0 ml-3">
                            <CheckIcon />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(3)}
                disabled={!name.trim()}
                className="w-full bg-primary text-white font-semibold px-8 py-3.5 rounded-xl text-base hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                ถัดไป →
              </button>
            </div>
          )}

          {/* ── Step 3: Training Mode ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-text mb-1">เลือกโหมดการฝึก</h2>
                <p className="text-text-muted">น้องต้องการฝึกแบบไหน?</p>
              </div>

              <div className="space-y-3">
                {/* Speech Clarity option */}
                <button
                  type="button"
                  onClick={() => setTrainingMode("speech_clarity")}
                  className={`w-full flex items-start gap-4 px-5 py-4 rounded-xl border-2 transition-all text-left active:scale-[0.99] ${
                    trainingMode === "speech_clarity"
                      ? "border-primary bg-primary/8"
                      : "border-border bg-surface hover:border-primary/40"
                  }`}
                >
                  <span className={`text-3xl mt-0.5 flex-shrink-0`}><DisplayIcon name="target" /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-bold text-base ${trainingMode === "speech_clarity" ? "text-primary" : "text-text"}`}>
                        ฝึกเสียงให้ชัด
                      </p>
                      {trainingMode === "speech_clarity" && (
                        <span className="text-primary flex-shrink-0 ml-2">
                          <CheckIcon />
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-muted mt-1 leading-relaxed">
                      เลือกเสียงพยัญชนะที่ต้องการฝึก เช่น ก ค ต ช
                      ผ่าน 7 ระดับพร้อมการประเมินด้วย AI
                    </p>
                  </div>
                </button>

                {/* Kindergarten Phonics option */}
                <button
                  type="button"
                  onClick={() => setTrainingMode("kindergarten_phonics")}
                  className={`w-full flex items-start gap-4 px-5 py-4 rounded-xl border-2 transition-all text-left active:scale-[0.99] ${
                    trainingMode === "kindergarten_phonics"
                      ? "border-amber-500 bg-amber-500/8"
                      : "border-border bg-surface hover:border-amber-400/60"
                  }`}
                >
                  <span className="text-3xl mt-0.5 flex-shrink-0"><DisplayIcon name="star" /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className={`font-bold text-base ${trainingMode === "kindergarten_phonics" ? "text-amber-600 dark:text-amber-400" : "text-text"}`}>
                          เรียนเสียงไทย
                        </p>
                        <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-full">
                          เร็ว ๆ นี้
                        </span>
                      </div>
                      {trainingMode === "kindergarten_phonics" && (
                        <span className="text-amber-500 flex-shrink-0 ml-2">
                          <CheckIcon />
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-muted mt-1 leading-relaxed">
                      เรียนพยัญชนะ สระ และการประสมเสียงภาษาไทย
                      เหมาะสำหรับเด็กอนุบาล
                    </p>
                  </div>
                </button>
              </div>

              <button
                onClick={advanceFromStep3}
                className="w-full bg-primary text-white font-semibold px-8 py-3.5 rounded-xl text-base hover:bg-primary/90 transition-all active:scale-[0.99]"
              >
                ถัดไป →
              </button>
            </div>
          )}

          {/* ── Step 4: Target Sound (speech_clarity only) ── */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-text mb-1">เลือกเสียงที่ต้องการฝึก</h2>
                <p className="text-text-muted">เสียงพยัญชนะที่น้องต้องการพัฒนา</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {mockTargetSounds.map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => setTargetSound(sound.id)}
                    className={`flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition-all text-left active:scale-[0.98] ${
                      targetSound === sound.id
                        ? "border-primary bg-primary/8"
                        : "border-border bg-surface hover:border-primary/40"
                    }`}
                  >
                    <span
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold flex-shrink-0 ${
                        targetSound === sound.id
                          ? "bg-primary text-white"
                          : "bg-bg text-text"
                      }`}
                    >
                      {sound.label}
                    </span>
                    <div>
                      <p className={`font-semibold text-sm ${targetSound === sound.id ? "text-primary" : "text-text"}`}>
                        {sound.description}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">เสียง {sound.id}</p>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(5)}
                className="w-full bg-primary text-white font-semibold px-8 py-3.5 rounded-xl text-base hover:bg-primary/90 transition-all active:scale-[0.99]"
              >
                ถัดไป →
              </button>
            </div>
          )}

          {/* ── Step 5: Confirmation ── */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-text mb-1">
                  {isEdit ? "บันทึกการเปลี่ยนแปลง" : "พร้อมเริ่มต้นแล้ว!"}
                </h2>
                <p className="text-text-muted">ตรวจสอบข้อมูลก่อนเริ่มฝึก</p>
              </div>

              <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm text-text-muted">ชื่อน้อง</span>
                  <span className="font-semibold text-text">{name.trim()}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm text-text-muted">อายุ</span>
                  <span className="font-semibold text-text">{age} ปี</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm text-text-muted">โหมดการฝึก</span>
                  <span className={`font-semibold ${trainingMode === "kindergarten_phonics" ? "text-amber-600 dark:text-amber-400" : "text-primary"}`}>
                    {MODE_LABELS[trainingMode]}
                  </span>
                </div>
                {trainingMode === "speech_clarity" && (
                  <div className="flex items-center justify-between px-5 py-3.5">
                    <span className="text-sm text-text-muted">เสียงที่ฝึก</span>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                        {targetSound}
                      </span>
                      <span className="font-semibold text-text">
                        {mockTargetSounds.find((s) => s.id === targetSound)?.description}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm text-text-muted">เป้าหมาย</span>
                  <span className="font-semibold text-text">{GOAL_LABELS[trainingGoal]}</span>
                </div>
              </div>

              <div className="bg-info/8 border border-info/20 rounded-xl px-4 py-3">
                <p className="text-sm text-info">
                  {isEdit
                    ? "การเปลี่ยนโหมดหรือเสียงจะไม่ลบประวัติการฝึกเดิม"
                    : trainingMode === "speech_clarity"
                    ? "เลือกแผนและระดับเริ่มต้นได้ในหน้าฝึกและเรียน"
                    : "ระบบจะเปิดแผนฝึกเรียนเสียงไทยให้เริ่มเลือกกิจกรรม"}
                </p>
              </div>

              <button
                onClick={handleFinish}
                className="w-full bg-primary text-white font-semibold px-8 py-4 rounded-xl text-base hover:bg-primary/90 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-primary/25"
              >
                {isEdit
                  ? "บันทึกและกลับไปฝึก"
                  : trainingMode === "speech_clarity"
                  ? "ไปหน้าฝึกและเรียน →"
                  : "เริ่มต้น →"}
              </button>

              {!isEdit && trainingMode === "speech_clarity" && (
                <button
                  onClick={() => {
                    const p = buildProfile();
                    void repoSaveProfile(p);
                    setSelectedSound(p.targetSound);
                    router.push("/training");
                  }}
                  className="w-full border border-border text-text-muted hover:text-text hover:border-primary/40 font-medium px-8 py-3 rounded-xl text-sm transition-all active:scale-[0.99]"
                >
                  ข้าม Pre-test ไปที่แผนที่การฝึกก่อน
                </button>
              )}

              {isEdit && (
                <p className="text-center text-xs text-text-muted">
                  ต้องการส่งออก / นำเข้า / ล้างข้อมูล?{" "}
                  <a href="/settings" className="text-primary hover:text-primary/80 font-medium transition-colors">
                    ไปที่ตั้งค่า →
                  </a>
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
