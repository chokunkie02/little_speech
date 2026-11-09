"use client";

import Link from "next/link";
import { AudioLines, Mic } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useChildProfile } from "@/hooks/useChildProfile";

export default function HeroSectionV2() {
  const { user } = useAuth();
  const { hasProfile } = useChildProfile();
  const start = user ? "/dashboard" : hasProfile ? "/training" : "/onboarding";

  return (
    <section className="rounded-3xl bg-gradient-to-br from-violet-700 to-indigo-900 px-5 py-8 text-white sm:px-8 lg:px-12 lg:py-12" aria-labelledby="hero-heading">
      <div className="grid items-center gap-7 lg:grid-cols-[1fr_17rem] lg:gap-12">
        <div className="max-w-lg">
          <p className="mb-3 text-sm font-semibold text-violet-100">Speech Adventure · ระบบฝึกพูดสำหรับเด็กไทย</p>
          <h1 id="hero-heading" className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">ฝึกออกเสียงทีละขั้น</h1>
          <p className="mt-3 text-base leading-relaxed text-violet-50 sm:text-lg">
            ดูภาพท่าปาก ฟังเสียงตัวอย่าง แล้วลองพูดตาม ตั้งแต่เตรียมท่าปากไปจนถึงพูดเป็นประโยค
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href={start} className="rounded-xl bg-white px-5 py-2.5 font-semibold text-violet-800 hover:bg-violet-100">
              {user ? "ไปหน้าหลัก" : hasProfile ? "ฝึกต่อ" : "เริ่มทดลองฝึก"}
            </Link>
            <Link href="#how-it-works-heading" className="rounded-xl border border-white/40 px-5 py-2.5 font-semibold text-white hover:bg-white/10">
              ดูวิธีการฝึก
            </Link>
          </div>
        </div>
        <div className="hidden rounded-2xl border border-white/30 bg-surface p-5 text-center text-text lg:block">
          <p className="text-sm font-semibold text-text-muted">ตัวอย่างแบบฝึก · เสียง ก</p>
          <p className="my-3 text-5xl font-bold">กา</p>
          <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 p-3 text-sm font-semibold text-text">
            <AudioLines size={17} aria-hidden="true" /> ฟังตัวอย่าง
            <span aria-hidden="true">·</span>
            <Mic size={17} aria-hidden="true" /> ลองพูดตาม
          </div>
        </div>
      </div>
    </section>
  );
}
