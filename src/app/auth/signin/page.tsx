"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { safeAuthRedirect } from "@/lib/auth/safeRedirect";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { AuthUser } from "@/types/auth";
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

const SIGN_IN_ROLES = {
  parent: { label: "ผู้ปกครอง", home: "/dashboard" },
  teacher: { label: "ครู", home: "/teacher" },
  school_admin: { label: "ผู้ดูแลโรงเรียน", home: "/school" },
  platform_admin: { label: "แอดมินระบบ", home: "/platform" },
} as const;

type SignInRole = keyof typeof SIGN_IN_ROLES;
const roleOptions = Object.keys(SIGN_IN_ROLES) as SignInRole[];

function roleFromRedirect(redirect: string | null): SignInRole | undefined {
  const path = redirect?.split(/[?#]/, 1)[0];
  if (path === "/invite/school-admin") return "school_admin";
  if (path === "/invite/school-teacher") return "teacher";
  if (path === "/invite/accept") return "parent";
  return roleOptions.find((role) => role !== "parent" && SIGN_IN_ROLES[role].home === path);
}

function getSignInRole(user: AuthUser): SignInRole | undefined {
  if (user.isPlatformAdmin) return "platform_admin";
  if (user.role !== "therapist") return user.role;
}

function SignInContent() {
  const { signIn, signOut, isLoading, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitRedirect = safeAuthRedirect(searchParams.get("redirect"));
  const redirectRole = roleFromRedirect(explicitRedirect);
  const accountRole = user ? getSignInRole(user) : undefined;
  const accountHome = accountRole ? SIGN_IN_ROLES[accountRole].home : "/training";
  const destination = explicitRedirect && (!redirectRole || redirectRole === accountRole)
    ? explicitRedirect : accountHome;
  const [roleChoice, setRoleChoice] = useState<SignInRole | "auto">();
  const selectedRole = roleChoice === "auto" ? undefined : roleChoice ?? redirectRole;
  const roleMismatch = !!user && !!selectedRole && selectedRole !== accountRole;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user && !roleMismatch) {
      router.replace(destination);
    }
  }, [isLoading, user, roleMismatch, router, destination]);

  async function switchAccount() {
    await signOut();
    setPassword("");
    setError("");
    setSubmitting(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (user || isLoading || !email.trim() || !password) return;

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

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      {/* Nav */}
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6" aria-label="บัญชีผู้ใช้">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <MicIcon />
          </div>
          <span className="font-bold text-base text-text">Speech Adventure</span>
        </Link>
        <ThemeToggle />
      </nav>

      {/* Form area */}
      <div className="flex-1 flex items-start justify-center px-4 py-7 sm:py-10 lg:py-12">
        <div className="w-full max-w-lg">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-text mb-1.5">ยินดีต้อนรับกลับ</h1>
            <p className="text-sm text-text-muted">ใช้อีเมลและรหัสผ่านของบัญชี Speech Adventure</p>
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

          {roleMismatch ? (
            <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <p role="alert" className="text-sm text-error">
                {user.email} ใช้บทบาท {accountRole ? SIGN_IN_ROLES[accountRole].label : "นักบำบัด"}
                {" "}คุณเลือกเข้าสู่ระบบในบทบาท {SIGN_IN_ROLES[selectedRole].label}
              </p>
              <div className="flex flex-wrap gap-3 text-sm font-semibold text-primary">
                <Link href={destination}>ไปหน้าของบัญชีนี้</Link>
                <button type="button" onClick={() => void switchAccount()}>ออกและเปลี่ยนบัญชี</button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="bg-surface border border-border rounded-2xl p-4 shadow-sm sm:p-5 space-y-4"
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
                  className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
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
                    className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 pr-11 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
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

              <fieldset className="space-y-2" disabled={submitting || !!user}>
                <legend className="text-sm font-semibold text-text">บทบาท (เลือกได้)</legend>
                <div className="grid grid-cols-2 gap-2">
                  {roleOptions.map((role) => (
                    <label key={role} className="cursor-pointer">
                      <input type="radio" name="role" value={role} checked={selectedRole === role}
                        onChange={() => setRoleChoice(role)} className="peer sr-only" />
                      <span className="block rounded-xl border border-border px-3 py-2.5 text-center text-sm font-medium text-text peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary">
                        {SIGN_IN_ROLES[role].label}
                      </span>
                    </label>
                  ))}
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm">
                  <input type="radio" name="role" checked={!selectedRole} onChange={() => setRoleChoice("auto")} className="accent-primary" />
                  ใช้บทบาทของบัญชีอัตโนมัติ
                </label>
              </fieldset>

              {/* Error */}
              {error && (
                <p role="alert" className="text-xs text-error bg-error/8 border border-error/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || isLoading || !!user || !email.trim() || !password}
                className="w-full bg-primary text-white font-semibold rounded-xl py-3 text-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-sm"><Link href="/auth/activate" className="font-semibold text-primary">เข้าใช้ครั้งแรกด้วยรหัสจากโรงเรียน</Link></p>
          <p className="text-center text-xs text-text-muted mt-5">
            ยังไม่มีบัญชี?{" "}
            <Link href={explicitRedirect ? `/auth/signup?redirect=${encodeURIComponent(explicitRedirect)}` : "/auth/signup"} className="text-primary font-semibold hover:underline">
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
