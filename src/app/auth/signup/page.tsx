"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { safeAuthRedirect } from "@/lib/auth/safeRedirect";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ui/ThemeToggle";
import type { UserRole } from "@/types/auth";

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

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const PASSWORD_RULES = [
  { label: "อย่างน้อย 8 ตัวอักษร", test: (p: string) => p.length >= 8 },
  { label: "มีตัวเลข", test: (p: string) => /\d/.test(p) },
];

const ROLE_OPTIONS: { value: UserRole; label: string; desc: string; available: boolean }[] = [
  { value: "parent", label: "ผู้ปกครอง", desc: "ติดตามพัฒนาการบุตรหลาน", available: true },
  { value: "teacher", label: "ครู", desc: "ติดตามเด็กที่ได้รับมอบหมาย", available: true },
  { value: "therapist", label: "นักบำบัด", desc: "ดูแลผู้ใช้หลายคน", available: false },
  { value: "school_admin", label: "ผู้ดูแลโรงเรียน", desc: "บริหารจัดการทั้งโรงเรียน", available: true },
];

function SignUpContent() {
  const { signUp, isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const redirect = safeAuthRedirect(useSearchParams().get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(() => {
    if (redirect?.startsWith("/invite/school-admin?")) return "school_admin";
    if (redirect?.startsWith("/invite/school-teacher?")) return "teacher";
    return "parent";
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (redirect) router.replace(redirect);
      else if (user?.isPlatformAdmin) router.replace("/platform");
      else if (user?.role === "school_admin") router.replace("/school");
      else if (user?.role === "teacher") router.replace("/teacher");
      else router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router, user?.role, user?.isPlatformAdmin, redirect]);

  const passwordValid = PASSWORD_RULES.every((r) => r.test(password));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !passwordValid) return;

    setError("");
    setSubmitting(true);

    const result = await signUp(email.trim(), password, selectedRole);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error ?? "สมัครสมาชิกไม่สำเร็จ");
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
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

      <div className="flex-1 flex items-start justify-center px-4 py-7 sm:py-10 lg:py-12">
        <div className="w-full max-w-lg">
          {success ? (
            /* Success state */
            <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm text-center">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-text mb-2">สมัครสมาชิกสำเร็จ</h2>
              <p className="text-sm text-text-muted mb-6 leading-relaxed">
                กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี
                แล้วกลับมาเข้าสู่ระบบ
              </p>
              <Link
                href={redirect ? `/auth/signin?redirect=${encodeURIComponent(redirect)}` : "/auth/signin"}
                className="inline-block bg-primary text-white font-semibold rounded-xl px-6 py-2.5 text-sm hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                ไปยังหน้าเข้าสู่ระบบ
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-text mb-1.5">สร้างบัญชีใหม่</h1>
                <p className="text-sm text-text-muted">เลือกบทบาทที่ตรงกับการใช้งานของคุณ</p>
              </div>

              {!isSupabaseConfigured() && (
                <div className="mb-5 bg-info/8 border border-info/20 rounded-xl px-4 py-3">
                  <p className="text-xs text-info leading-relaxed">
                    <strong>โหมดทดสอบ:</strong> ยังไม่ได้ตั้งค่า Supabase Authentication
                  </p>
                </div>
              )}

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
                      autoComplete="new-password"
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

                  {/* Password rules */}
                  {password.length > 0 && (
                    <ul className="space-y-1 pt-1">
                      {PASSWORD_RULES.map((rule) => {
                        const passed = rule.test(password);
                        return (
                          <li
                            key={rule.label}
                            className={`flex items-center gap-1.5 text-xs transition-colors ${
                              passed ? "text-success" : "text-text-muted"
                            }`}
                          >
                            <span className={passed ? "text-success" : "text-disabled"}>
                              <CheckIcon />
                            </span>
                            {rule.label}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Role */}
                <fieldset className="space-y-2">
                  <legend className="text-sm font-semibold text-text">บทบาทของบัญชี</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ROLE_OPTIONS.map((opt) => {
                      const active = selectedRole === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={!opt.available}
                          aria-pressed={active}
                          onClick={() => opt.available && setSelectedRole(opt.value)}
                          className={[
                            "relative rounded-xl border px-3 py-2.5 text-left transition-all",
                            opt.available
                              ? active
                                ? "border-primary bg-primary/8 ring-1 ring-primary/30"
                                : "border-border bg-bg hover:border-primary/40"
                              : "border-border bg-bg opacity-50 cursor-not-allowed",
                          ].join(" ")}
                        >
                          <span className="block text-sm font-semibold text-text">{opt.label}</span>
                          <span className="block text-xs text-text-muted leading-relaxed mt-1">{opt.desc}</span>
                          {!opt.available && (
                            <span className="absolute top-1.5 right-1.5 bg-surface border border-border text-[9px] text-text-muted font-medium px-1 py-0.5 rounded-md leading-none">
                              เร็วๆ นี้
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
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
                  disabled={submitting || !email.trim() || !passwordValid}
                  className="w-full bg-primary text-white font-semibold rounded-xl py-3 text-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? "กำลังสมัครสมาชิก…" : "สมัครสมาชิก"}
                </button>
              </form>

              <p className="text-center text-xs text-text-muted mt-5">
                มีบัญชีอยู่แล้ว?{" "}
                <Link href={redirect ? `/auth/signin?redirect=${encodeURIComponent(redirect)}` : "/auth/signin"} className="text-primary font-semibold hover:underline">
                  เข้าสู่ระบบ
                </Link>
              </p>

              <p className="text-center text-xs text-text-muted mt-3">
                <Link href="/training" className="hover:text-text transition-colors">
                  ข้ามและใช้งานแบบไม่ล็อกอิน →
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function SignUpPage() {
  return <Suspense><SignUpContent /></Suspense>;
}
