"use client";

import { useOverlayFocus } from "./useOverlayFocus";

import { useState, useEffect, useRef, useCallback } from "react";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useSpeechProgress } from "@/hooks/useSpeechProgress";
import { mockTargetSounds } from "@/data/speechAdventureMockData";

// ── Icons ─────────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GOALS = [
  { id: "daily",    label: "ทุกวัน",         desc: "วันละ 10–15 นาที สม่ำเสมอ" },
  { id: "3x-week",  label: "3 วัน/สัปดาห์",  desc: "ฝึกสัปดาห์ละ 3 ครั้ง" },
  { id: "casual",   label: "เมื่อมีเวลา",     desc: "ค่อยเป็นค่อยไป ไม่กดดัน" },
];

const AGE_RANGE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// ── Component ─────────────────────────────────────────────────────────────────

interface AddChildModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddChildModal({ open, onClose }: AddChildModalProps) {
  const { saveProfile, selectChild } = useChildProfile();
  const { setSelectedSound } = useSpeechProgress();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState(5);
  const [trainingGoal, setTrainingGoal] = useState("daily");
  const [targetSound, setTargetSound] = useState("ก");
  const [submitting, setSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus name field when modal opens at step 1
  useEffect(() => {
    if (open && step === 1) {
      const id = setTimeout(() => nameInputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [open, step]);

  // Close on Escape; reset form state on close so next open starts fresh
  const resetForm = useCallback(() => {
    setStep(1);
    setName("");
    setAge(5);
    setTrainingGoal("daily");
    setTargetSound("ก");
    setSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const dialogRef = useRef<HTMLDivElement>(null);
  useOverlayFocus(open, dialogRef, handleClose);

  if (!open) return null;

  async function handleSubmit() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const newId = `child-${Date.now()}`;
      await saveProfile({
        id: newId,
        name: name.trim(),
        age,
        targetSound,
        trainingGoal,
        trainingMode: "speech_clarity",
        createdAt: now,
        updatedAt: now,
      });
      // Select the newly created child and sync its target sound
      selectChild(newId);
      setSelectedSound(targetSound);
      handleClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel — bottom sheet on mobile, centered modal on sm+ */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="เพิ่มเด็ก"
        className="fixed inset-x-0 bottom-0 sm:inset-0 z-[61] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none"
      >
        <div className="pointer-events-auto w-full sm:max-w-md bg-surface border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92dvh] sm:max-h-[85vh] flex flex-col">

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {step === 2 && (
                <button
                  onClick={() => setStep(1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-gray-100 dark:hover:bg-white/10 transition-all flex-shrink-0"
                  aria-label="ย้อนกลับ"
                >
                  <BackIcon />
                </button>
              )}
              <div className="min-w-0">
                <h2 className="text-base font-bold text-text">เพิ่มเด็กใหม่</h2>
                <div className="flex items-center gap-1 mt-0.5">
                  {[1, 2].map((s) => (
                    <div
                      key={s}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        s === step ? "w-5 bg-primary" : s < step ? "w-3 bg-primary/40" : "w-3 bg-border"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-gray-100 dark:hover:bg-white/10 transition-all flex-shrink-0 ml-2"
              aria-label="ปิด"
            >
              <CloseIcon />
            </button>
          </div>

          {/* ── Step 1: Name + Age + Goal ── */}
          {step === 1 && (
            <div className="flex-1 px-5 py-5 space-y-5 overflow-y-auto">
              {/* Name */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text">
                  ชื่อน้อง
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && name.trim() && setStep(2)}
                  placeholder="เช่น น้องส้ม หรือ สมชาย"
                  maxLength={40}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all text-sm"
                />
              </div>

              {/* Age */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text">
                  อายุ: <span className="text-primary font-bold">{age} ปี</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAge((a) => Math.max(3, a - 1))}
                    className="w-9 h-9 rounded-xl border border-border bg-surface hover:bg-gray-100 dark:hover:bg-white/8 flex items-center justify-center text-text font-bold transition-all active:scale-90"
                    aria-label="ลดอายุ"
                  >
                    –
                  </button>
                  <div className="flex-1 flex gap-1.5 flex-wrap justify-center">
                    {AGE_RANGE.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setAge(y)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all active:scale-90 ${
                          age === y
                            ? "bg-primary text-white shadow-sm shadow-primary/25"
                            : "bg-bg border border-border text-text-muted hover:border-primary/40 hover:text-primary"
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setAge((a) => Math.min(12, a + 1))}
                    className="w-9 h-9 rounded-xl border border-border bg-surface hover:bg-gray-100 dark:hover:bg-white/8 flex items-center justify-center text-text font-bold transition-all active:scale-90"
                    aria-label="เพิ่มอายุ"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Training goal */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text">
                  เป้าหมายการฝึก
                </label>
                <div className="space-y-2">
                  {GOALS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setTrainingGoal(g.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left active:scale-[0.99] ${
                        trainingGoal === g.id
                          ? "border-primary bg-primary/8"
                          : "border-border bg-bg hover:border-primary/30"
                      }`}
                    >
                      <div>
                        <p className={`font-semibold text-sm ${trainingGoal === g.id ? "text-primary" : "text-text"}`}>
                          {g.label}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">{g.desc}</p>
                      </div>
                      {trainingGoal === g.id && (
                        <span className="text-primary flex-shrink-0 ml-2">
                          <CheckIcon />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => setStep(2)}
                disabled={!name.trim()}
                className="w-full bg-primary text-white font-semibold py-3.5 rounded-xl text-sm hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] shadow-sm shadow-primary/20"
              >
                ถัดไป →
              </button>
            </div>
          )}

          {/* ── Step 2: Target Sound + Confirm ── */}
          {step === 2 && (
            <div className="flex-1 px-5 py-5 space-y-5 overflow-y-auto">
              {/* Summary header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-primary/8 border border-primary/15 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                  {name.trim().charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-text truncate">{name.trim()}</p>
                  <p className="text-xs text-text-muted">{age} ปี</p>
                </div>
              </div>

              {/* Target sound */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text">
                  เลือกเสียงที่ต้องการฝึก
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {mockTargetSounds.map((sound) => (
                    <button
                      key={sound.id}
                      type="button"
                      onClick={() => setTargetSound(sound.id)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl border-2 transition-all text-left active:scale-[0.98] ${
                        targetSound === sound.id
                          ? "border-primary bg-primary/8"
                          : "border-border bg-bg hover:border-primary/30"
                      }`}
                    >
                      <span
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold flex-shrink-0 ${
                          targetSound === sound.id
                            ? "bg-primary text-white"
                            : "bg-surface text-text"
                        }`}
                      >
                        {sound.label}
                      </span>
                      <div className="min-w-0">
                        <p className={`font-semibold text-xs ${targetSound === sound.id ? "text-primary" : "text-text"}`}>
                          {sound.description}
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5">เสียง {sound.id}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Info notice */}
              <div className="bg-info/8 border border-info/20 rounded-xl px-4 py-3">
                <p className="text-xs text-info leading-relaxed">
                  ข้อมูลการฝึกของน้อง <strong>{name.trim()}</strong> จะเริ่มต้นใหม่
                  โดยไม่กระทบประวัติของเด็กคนอื่น
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="w-full bg-primary text-white font-semibold py-3.5 rounded-xl text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] shadow-sm shadow-primary/20"
              >
                {submitting ? "กำลังบันทึก..." : `สร้างโปรไฟล์ ${name.trim()} →`}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
