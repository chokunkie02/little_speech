import ThemeToggle from "@/components/ui/ThemeToggle";
import Link from "next/link";
import HomeBackground from "@/components/home/HomeBackground";
import HeroSectionV2 from "@/components/home/HeroSectionV2";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import TrainingJourneySection from "@/components/home/TrainingJourneySection";
import ParentDashboardSection from "@/components/home/ParentDashboardSection";
import TrustSection from "@/components/home/TrustSection";
import HomeCTASection from "@/components/home/HomeCTASection";

export const metadata = {
  title: "Speech Adventure — ระบบฝึกพูดสำหรับเด็กไทย",
  description:
    "แพลตฟอร์มฝึกพูดพยัญชนะไทยสำหรับเด็ก พร้อมแบบฝึกสี่ระดับ ภาพและเสียงตัวอย่าง และรายงานความก้าวหน้า",
};

/** Thin nav bar — standalone (no AppShell) */
function LandingNav() {
  return (
    <nav
      className="sticky top-0 z-30 bg-bg/90 backdrop-blur-md border-b border-border"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-3 max-w-5xl sm:px-6 mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
          </div>
          <span className="font-bold text-sm text-text sm:text-base">Speech Adventure</span>
        </div>

        {/* Nav actions */}
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <div className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
          <Link
            href="/auth/signin"
            className="text-sm font-medium text-text-muted hover:text-text whitespace-nowrap px-1.5 py-1.5 sm:px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-all"
          >
            เข้าสู่ระบบ
          </Link>
          <Link
            href="/auth/signup"
            className="hidden whitespace-nowrap text-sm font-semibold text-white bg-primary px-3 sm:inline-flex py-1.5 rounded-lg hover:bg-primary/90 transition-all active:scale-[0.97]"
          >
            เริ่มต้นฟรี
          </Link>
        </div>
      </div>
    </nav>
  );
}

/** Stats strip — quick numbers above the fold */
function StatsStrip() {
  const stats = [
    { label: "ระดับเนื้อหา", value: "4" },
    { label: "กลุ่มเสียง ป ก ม", value: "3" },
    { label: "เป้าหมายการฝึก", value: "3" },
  ];

  return (
    <div className="mt-3 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface py-2" aria-label="สถิติแพลตฟอร์ม">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="px-1.5 py-1 text-center sm:px-3"
        >
          <p className="text-base font-bold text-text">{stat.value}</p>
          <p className="text-xs text-text-muted mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

/** Landing page — standalone (no AppShell) */
export default function LandingPage() {
  return (
    <main className="min-h-screen relative isolate">
      <HomeBackground />
      <LandingNav />

      <div className="max-w-5xl mx-auto px-4 pb-14 sm:px-6">
        {/* ── Hero ── */}
        <div className="pt-5 pb-2">
          <HeroSectionV2 />
        </div>

        {/* ── Stats strip ── */}
        <StatsStrip />

        {/* ── How It Works ── */}
        <HowItWorksSection />

        {/* ── Training Journey ── */}
        <TrainingJourneySection />

        {/* ── Parent Dashboard ── */}
        <ParentDashboardSection />

        {/* ── Trust & Thai Focus ── */}
        <TrustSection />

        {/* ── Final CTA ── */}
        <HomeCTASection />
      </div>

      {/* ── Footer ── */}
      <footer className="bg-surface border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center flex-shrink-0" aria-hidden="true">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                </svg>
              </div>
              <p className="text-sm text-text-muted font-medium">
                Speech Adventure — ระบบฝึกพูดสำหรับเด็กไทย
              </p>
            </div>

            {/* Footer links */}
            <div className="flex items-center gap-4">
              <Link href="/auth/signin" className="text-xs text-text-muted hover:text-text transition-colors">เข้าสู่ระบบ</Link>
              <Link href="/auth/signup" className="text-xs text-text-muted hover:text-text transition-colors">สมัครสมาชิก</Link>
              <span className="text-xs text-text-muted">Prototype v1.0 · 2026</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
