"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { Alert, Button, ButtonLink, Card, CardContent, LoadingState } from "@/components/ui";
import { AuthLayout } from "@/components/auth/AuthScreen";
import { SignInAside, SignUpAside } from "@/components/auth/authAsides";
import { AccountFields, ConsentField, EmailField, PasswordField } from "@/components/auth/AccountFields";
import {
  focusFirstError, readAccountDetails, thaiAuthError, validateAccountDetails, validateCredentials, type DetailErrors,
} from "@/lib/auth/accountDetails";
import { useAuth } from "@/hooks/useAuth";
import { safeAuthRedirect } from "@/lib/auth/safeRedirect";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { AuthUser } from "@/types/auth";

/** Where each account lands after signing in. */
export function homeFor(user: AuthUser): string {
  if (user.isPlatformAdmin) return "/platform";
  if (user.role === "school_admin") return "/school";
  if (user.role === "teacher") return "/teacher";
  return "/dashboard";
}

export default function AuthPage({ mode }: { mode: "signin" | "signup" }) {
  const { user, isLoading, signIn, signUp } = useAuth();
  const router = useRouter();
  const redirect = safeAuthRedirect(useSearchParams().get("redirect"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<DetailErrors>({});
  const [confirmEmail, setConfirmEmail] = useState("");
  const signup = mode === "signup";
  const otherHref = (signup ? "/auth/signin" : "/auth/signup") + (redirect ? `?redirect=${encodeURIComponent(redirect)}` : "");

  useEffect(() => {
    if (!isLoading && user) router.replace(redirect ?? homeFor(user));
  }, [isLoading, user, redirect, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const details = readAccountDetails(form);
    const acceptedTerms = form.get("acceptedTerms") === "yes";
    const errors: DetailErrors = signup
      ? { ...validateAccountDetails(details), ...validateCredentials(email, password, true),
          ...(acceptedTerms ? {} : { acceptedTerms: "ต้องยอมรับข้อตกลงก่อนสมัคร" }) }
      : validateCredentials(email, password, false);
    setFieldErrors(errors);
    setError("");
    if (Object.keys(errors).length) {
      focusFirstError(element, errors);
      return;
    }
    setBusy(true);
    const result = signup ? await signUp(email, password, { ...details, acceptedTerms }) : await signIn(email, password);
    setBusy(false);
    if (!result.success) {
      setError(thaiAuthError(result.error, signup));
      return;
    }
    if (result.needsConfirmation) setConfirmEmail(email);
    // Otherwise the effect above redirects once the session arrives.
  }

  return (
    <AuthLayout aside={signup ? <SignUpAside /> : <SignInAside />} formWidth={signup ? "md" : "sm"}>
          <div className="space-y-1 text-center lg:text-left">
            <h1 className="text-page-title">{signup ? "สมัครบัญชี" : "ยินดีต้อนรับกลับ"}</h1>
            <p className="text-sm text-text-muted">{signup ? "กรอกชื่อจริงเพื่อให้ครูและโรงเรียนรู้ว่าเป็นใคร สมัครเสร็จใช้งานได้ทันที" : "เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน"}</p>
          </div>

          <Card>
            <CardContent className="space-y-4 p-5 sm:p-6">
              {!isSupabaseConfigured() ? (
                <Alert tone="warning" title="ยังไม่ได้เชื่อมต่อระบบบัญชี">ใช้งานแบบไม่ล็อกอินได้ ข้อมูลจะเก็บในเครื่องนี้</Alert>
              ) : isLoading || user ? (
                <LoadingState variant="list" rows={1} label="กำลังตรวจบัญชี…" />
              ) : confirmEmail ? (
                <Alert tone="info" title="ตรวจอีเมลเพื่อยืนยันบัญชี">
                  ส่งลิงก์ยืนยันไปที่ {confirmEmail} แล้ว กดลิงก์แล้วกลับมาเข้าสู่ระบบ
                </Alert>
              ) : (
                <form className="space-y-4" onSubmit={submit} noValidate>
                  {signup && <AccountFields errors={fieldErrors} />}
                  <div className={signup ? "grid gap-4 sm:grid-cols-2 sm:items-start" : "space-y-4"}>
                    <EmailField error={fieldErrors.email} />
                    <PasswordField mode={mode} error={fieldErrors.password} />
                  </div>
                  {!signup && (
                    <p className="-mt-2 text-right text-sm">
                      <Link href="/auth/forgot-password" className="inline-flex min-h-11 items-center font-medium text-primary-text hover:underline">ลืมรหัสผ่าน?</Link>
                    </p>
                  )}
                  {signup && <ConsentField error={fieldErrors.acceptedTerms} />}
                  {error && <Alert tone="error">{error}</Alert>}
                  <Button type="submit" block size="lg" loading={busy}>{signup ? "สมัครบัญชี" : "เข้าสู่ระบบ"}</Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-sm text-text-muted lg:text-left">
            {signup ? "มีบัญชีแล้ว? " : "ยังไม่มีบัญชี? "}
            <Link href={otherHref} className="font-semibold text-primary hover:underline">{signup ? "เข้าสู่ระบบ" : "สมัครบัญชี"}</Link>
          </p>

          <Card dashed>
            <CardContent className="flex items-center gap-3 p-4">
              <KeyRound size={20} className="shrink-0 text-primary" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-sm text-text-muted">ได้รับใบเชิญ QR หรือรหัสจากโรงเรียน?</p>
              <ButtonLink href="/join" size="sm" variant="outline">ใช้รหัส</ButtonLink>
            </CardContent>
          </Card>

          <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-center text-sm lg:justify-start">
            <Link href="/register-school" className="inline-flex min-h-11 items-center text-text-muted hover:text-primary">ลงทะเบียนโรงเรียน</Link>
            <Link href="/training" className="inline-flex min-h-11 items-center text-text-muted hover:text-primary">ลองใช้งานแบบไม่ล็อกอิน →</Link>
          </p>
    </AuthLayout>
  );
}
