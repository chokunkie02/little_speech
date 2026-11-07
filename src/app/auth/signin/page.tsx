"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { safeAuthRedirect } from "@/lib/auth/safeRedirect";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ui/ThemeToggle";

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    </svg>
  );
}

function EyeIcon({ show }: { show: boolean }) {
  return show ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function SignInContent() {
  const { signIn, isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitRedirect = safeAuthRedirect(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isLoading && isAuthenticated) {
      if (explicitRedirect) {
        router.replace(explicitRedirect);
      } else if (user?.isPlatformAdmin) {
        router.replace("/platform");
      } else if (user?.role === "school_admin") {
        router.replace("/school");
      } else if (user?.role === "teacher") {
        router.replace("/teacher");
      } else {
        router.replace("/training");
      }
    }
  }, [mounted, isLoading, isAuthenticated, router, explicitRedirect, user?.role, user?.isPlatformAdmin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError("");
    setSubmitting(true);

    const result = await signIn(email.trim(), password);

    if (!result.success) {
      setError(result.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      setSubmitting(false);
    }
    // On success: subscribeToAuthChanges updates the session, then the
    // useEffect above redirects based on user.role.
  }

  // Render a minimal skeleton until client hydrates
  if (!mounted) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-bg/90 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <MicIcon />
          </div>
          <span className="font-bold text-base text-text">Speech Adventure</span>
        </Link>
        <ThemeToggle />
      </nav>

      {/* Form area */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text mb-1.5">ยินดีต้อนรับกลับ</h1>
            <p className="text-sm text-text-muted">เข้าสู่ระบบเพื่อดูความก้าวหน้าของคุณ</p>
          </div>

          {/* Supabase not configured notice */}
          {!isSupabaseConfigured() && (
            <div className="mb-5 bg-info/8 border border-info/20 rounded-xl px-4 py-3">
              <p className="text-xs text-info leading-relaxed">
                <strong>โหมดทดสอบ:</strong> ยังไม่ได้ตั้งค่า Supabase
                Authentication แอปยังคงทำงานผ่าน localStorage ได้ตามปกติ
              </p>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4"
          >
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-semibold text-text">
                อีเมล
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-semibold text-text">
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-bg border border-border rounded-xl px-4 py-3 pr-11 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors p-1"
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  <EyeIcon show={showPassword} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p role="alert" className="text-xs text-error bg-error/8 border border-error/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !email.trim() || !password}
              className="w-full bg-primary text-white font-semibold rounded-xl py-3 text-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
            </button>
          </form>

          <p className="text-center text-xs text-text-muted mt-5">
            ยังไม่มีบัญชี?{" "}
            <Link href="/auth/signup" className="text-primary font-semibold hover:underline">
              สมัครสมาชิก
            </Link>
          </p>

          <p className="text-center text-xs text-text-muted mt-3">
            <Link href="/training" className="hover:text-text transition-colors">
              ข้ามและใช้งานแบบไม่ล็อกอิน →
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
