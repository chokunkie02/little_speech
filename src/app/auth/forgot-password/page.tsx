"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { PasswordAside } from "@/components/auth/authAsides";
import { EmailField } from "@/components/auth/AccountFields";
import { Alert, Button } from "@/components/ui";
import { thaiAuthError, validateCredentials } from "@/lib/auth/accountDetails";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    const invalid = validateCredentials(email, "x", false).email;
    setFieldError(invalid ?? "");
    setError("");
    if (invalid) return;
    const client = getSupabaseClient();
    if (!client) {
      setError("ยังไม่ได้เชื่อมต่อระบบบัญชี");
      return;
    }
    setBusy(true);
    const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setBusy(false);
    // Same answer whether or not the email has an account, so the form can't be used to find accounts.
    if (resetError && !/not found/i.test(resetError.message)) setError(thaiAuthError(resetError.message, false));
    else setSentTo(email);
  }

  return (
    <AuthScreen aside={<PasswordAside />} title="ลืมรหัสผ่าน" description="กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้"
      footer={<p className="text-center text-sm text-text-muted"><Link href="/auth/signin" className="font-semibold text-primary-text hover:underline">กลับไปเข้าสู่ระบบ</Link></p>}>
      {sentTo ? (
        <Alert tone="success" title="ตรวจอีเมลของคุณ">
          ถ้า {sentTo} มีบัญชีอยู่ จะได้รับลิงก์ตั้งรหัสผ่านใหม่ภายในไม่กี่นาที ไม่เห็นให้ดูในจดหมายขยะ
        </Alert>
      ) : (
        <form className="space-y-4" onSubmit={submit} noValidate>
          <EmailField error={fieldError || undefined} />
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" block size="lg" loading={busy}>ส่งลิงก์ตั้งรหัสผ่านใหม่</Button>
        </form>
      )}
    </AuthScreen>
  );
}
