"use client";

import Link from "next/link";
import { useChildProfile } from "@/hooks/useChildProfile";

/** Mini mock UI card — imitates the practice card in the actual app */
function MockPracticeCard() {
  return (
    <div
      className="bg-surface/95 backdrop-blur-sm border border-white/15 rounded-2xl overflow-hidden w-full max-w-xs"
      style={{ boxShadow: "0 24px 60px -8px rgba(108,99,255,0.4), 0 8px 24px -4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)" }}
    >
      {/* Top bar */}
      <div className="bg-primary/10 border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-gentle" />
          <span className="text-xs font-semibold text-primary">ระดับที่ 4 · ฝึกออกเสียง</span>
        </div>
        <span className="text-xs text-text-muted">ก → กา</span>
      </div>

      {/* Content */}
      <div className="px-5 py-5">
        {/* Target word */}
        <div className="text-center mb-5">
          <p className="text-xs text-text-muted mb-1 uppercase tracking-wide">คำเป้าหมาย</p>
          <p className="text-4xl font-bold text-text tracking-wide">กา</p>
          <p className="text-sm text-text-muted mt-1">kaa · อีกา</p>
        </div>

        {/* Waveform visualizer mock */}
        <div className="bg-bg border border-border rounded-xl px-4 py-3 mb-4 flex items-center gap-1 justify-center h-12">
          {[3, 8, 5, 12, 7, 15, 9, 6, 13, 4, 10, 7, 3].map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-primary/40"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>

        {/* Record button */}
        <button className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-3 text-sm font-semibold hover:bg-primary/90 transition-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
          กดเพื่ออัดเสียง
        </button>
      </div>

      <div className="border-t border-border px-4 py-2.5 text-xs text-text-muted">
        อัดเสียงแล้วเปิดฟังทบทวน
      </div>
    </div>
  );
}

/** Mini progress widget mock */
function MockProgressWidget() {
  const stages = [
    { name: "เตรียมท่าปาก", done: true, color: "bg-level-oral" },
    { name: "พยางค์", done: false, color: "bg-primary", active: true },
    { name: "คำ", done: false, color: "bg-border" },
    { name: "ประโยค", done: false, color: "bg-border" },
  ];

  return (
    <div
      className="bg-surface/95 backdrop-blur-sm border border-white/12 rounded-2xl overflow-hidden w-full max-w-[200px]"
      style={{ boxShadow: "0 16px 40px -8px rgba(79,70,229,0.35), 0 6px 16px -4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)" }}
    >
      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs font-semibold text-text">ความก้าวหน้า</p>
        <p className="text-xs text-text-muted">น้องแพร · เสียง ก</p>
      </div>
      <div className="px-4 py-3 space-y-2">
        {stages.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.active ? "animate-pulse-gentle " + s.color : s.color}`} />
            <span className={`text-xs ${s.done ? "text-text line-through opacity-60" : s.active ? "text-text font-semibold" : "text-text-muted"}`}>
              {s.name}
            </span>
            {s.done && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-success ml-auto flex-shrink-0" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {s.active && (
              <span className="ml-auto text-[10px] font-bold text-level-sound-prod bg-level-sound-prod/15 rounded px-1">ฝึกอยู่</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HeroSectionV2() {
  const { hasProfile } = useChildProfile();

  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-800 px-8 py-14 md:px-16 md:py-20 text-white"
      aria-labelledby="hero-heading"
    >
      {/* Gradient depth blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-28 -right-24 w-96 h-96 rounded-full bg-violet-400/25 blur-[80px]" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-[70px]" />
        <div className="absolute top-1/4 right-1/3 w-52 h-52 rounded-full bg-emerald-400/10 blur-[50px]" />
        <div className="absolute top-1/3 right-1/4 w-3 h-3 rounded-full bg-white/30" />
        <div className="absolute bottom-1/3 right-12 w-2 h-2 rounded-full bg-violet-300/50" />
        <div className="absolute top-1/5 left-1/3 w-1.5 h-1.5 rounded-full bg-emerald-300/60" />
        {/* Grid dot pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-dots)" />
        </svg>
      </div>

      {/* Layout: left text + right product preview */}
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-12">
        {/* ── Left: copy ── */}
        <div className="flex-1 max-w-lg">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8 text-sm font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-gentle flex-shrink-0" />
            ระบบฝึกพูดสำหรับเด็กไทย
          </div>

          {/* Headline */}
          <h1 id="hero-heading" className="text-3xl md:text-5xl font-bold mb-5 leading-tight">
            ฝึกออกเสียง
            <br />
            <span className="text-violet-200">อย่างเป็นระบบ</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-base md:text-lg text-white/80 mb-3 leading-relaxed">
            แพลตฟอร์มฝึกพูดพยัญชนะไทยสำหรับเด็ก ตั้งแต่การฝึกกล้ามเนื้อปาก (Oral Motor)
            จนถึงการสื่อสารในประโยค ผ่านเส้นทาง 7 ระดับที่ออกแบบโดยผู้เชี่ยวชาญ
          </p>
          <p className="text-sm text-white/60 mb-8">
            พร้อมภาพท่าปาก เสียงตัวอย่าง และรายงานสำหรับผู้ปกครองและครู
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3">
            {hasProfile ? (
              <>
                <Link
                  href="/training"
                  className="inline-flex items-center gap-2 bg-white text-violet-700 font-semibold px-7 py-3.5 rounded-xl text-base hover:bg-violet-50 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/20"
                >
                  ฝึกต่อเลย →
                </Link>
                <Link
                  href="/progress"
                  className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 text-white font-semibold px-7 py-3.5 rounded-xl text-base hover:bg-white/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  ดูความก้าวหน้า
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 bg-white text-violet-700 font-semibold px-7 py-3.5 rounded-xl text-base hover:bg-violet-50 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/20"
                >
                  เริ่มฝึกฟรี →
                </Link>
                <Link
                  href="/training"
                  className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 text-white font-semibold px-7 py-3.5 rounded-xl text-base hover:bg-white/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  ดูตัวอย่างระบบ
                </Link>
              </>
            )}
          </div>

          {/* Trust signals */}
          <div className="mt-8 flex flex-wrap gap-4">
            {[
              "✓ ไม่ต้องสมัครสมาชิก",
              "✓ ใช้งานฟรี",
              "✓ บันทึกข้อมูลในเครื่อง",
            ].map((t) => (
              <span key={t} className="text-xs text-white/60">{t}</span>
            ))}
          </div>
        </div>

        {/* ── Right: product preview ── */}
        <div className="flex-shrink-0 hidden lg:flex items-end gap-4 opacity-95 relative">
          {/* Floating achievement badge */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap pointer-events-none">
            <div className="animate-float">
              <div className="flex items-center gap-2 bg-emerald-900/55 backdrop-blur-md border border-emerald-400/30 rounded-xl px-3 py-1.5 shadow-lg shadow-black/25">
                <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center flex-shrink-0">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-emerald-300/80 leading-none">พัฒนาการดีขึ้น</p>
                  <p className="text-xs font-bold text-white leading-tight">+15% สัปดาห์นี้</p>
                </div>
              </div>
            </div>
          </div>

          {/* Practice card — float A */}
          <div className="animate-float-card-a relative">
            <div className="absolute inset-x-4 -bottom-2 h-10 bg-violet-500/30 blur-2xl rounded-full -z-10" aria-hidden="true" />
            <MockPracticeCard />
          </div>

          {/* Progress widget — float B, raised */}
          <div className="animate-float-card-b mb-8 relative">
            <div className="absolute inset-x-2 -bottom-2 h-7 bg-indigo-500/25 blur-xl rounded-full -z-10" aria-hidden="true" />
            <MockProgressWidget />
          </div>
        </div>
      </div>
    </section>
  );
}
