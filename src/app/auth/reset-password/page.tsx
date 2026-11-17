"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { PasswordAside } from "@/components/auth/authAsides";
import { PasswordField } from "@/components/auth/AccountFields";
import { Alert, Button, ButtonLink, LoadingState, toast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { thaiAuthError } from "@/lib/auth/accountDetails";
import { getSupabaseClient } from "@/lib/supabase/client";
import { homeFor } from "@/app/auth/AuthPage";

const LINK_SESSION_SECONDS = 30 * 60;

/**
 * True when the current session came from an email link (reset / one-time code) in the last 30 minutes.
 * A session from a normal password sign-in must use "change password" in settings, which asks for the
 * current password, so an unattended signed-in device can't be taken over from this page.
 */
async function signedInByEmailLink(): Promise<boolean> {
  const { data } = await getSupabaseClient()?.auth.getSession() ?? { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
      amr?: { method: string; timestamp: number }[];
    };
    const now = Date.now() / 1000;
    return (payload.amr ?? []).some((entry) => ["otp", "recovery", "magiclink"].includes(entry.method)
      && now - entry.timestamp < LINK_SESSION_SECONDS);
  } catch {
    return false;
  }
}

/** Opened from the reset email: the link signs the person in, then they choose a new password. */
export default function ResetPasswordPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [fromLink, setFromLink] = useState<boolean | null>(null);
  useEffect(() => {
    if (isLoading) return;
    let active = true;
    void signedInByEmailLink().then((value) => { if (active) setFromLink(value); });
    return () => { active = false; };
  }, [isLoading, user]);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    const next: typeof errors = {};
    if (password.length < 8) next.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    if (confirm !== password) next.confirm = "รหัสผ่านทั้งสองช่องไม่ตรงกัน";
    setErrors(next);
    setError("");
    if (Object.keys(next).length) return;
    const client = getSupabaseClient();
    if (!client || !user) return;
    setBusy(true);
    const { error: updateError } = await client.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(thaiAuthError(updateError.message, true));
      return;
    }
    toast.success("ตั้งรหัสผ่านใหม่แล้ว");
    router.replace(homeFor(user));
  }

  return (
    <AuthScreen aside={<PasswordAside />} title="ตั้งรหัสผ่านใหม่">
      {isLoading || (user && fromLink === null) ? <LoadingState variant="list" rows={1} label="กำลังตรวจลิงก์…" /> : user && !fromLink ? (
        <div className="space-y-3">
          <Alert tone="info" title="คุณเข้าสู่ระบบอยู่แล้ว">เปลี่ยนรหัสผ่านได้ที่หน้าตั้งค่า โดยใส่รหัสผ่านปัจจุบันก่อน</Alert>
          <ButtonLink href="/settings#password" block>ไปหน้าตั้งค่า</ButtonLink>
        </div>
      ) : !user ? (
        <div className="space-y-3">
          <Alert tone="warning" title="ลิงก์หมดอายุหรือถูกใช้ไปแล้ว">ขอลิงก์ใหม่ได้ที่หน้าลืมรหัสผ่าน ลิงก์ใช้ได้ครั้งเดียว</Alert>
          <ButtonLink href="/auth/forgot-password" block>ขอลิงก์ใหม่</ButtonLink>
          <p className="text-center text-sm"><Link href="/auth/signin" className="text-text-muted hover:underline">กลับไปเข้าสู่ระบบ</Link></p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit} noValidate>
          <p className="text-sm text-text-muted">บัญชี {user.email}</p>
          <PasswordField mode="signup" label="รหัสผ่านใหม่" error={errors.password} />
          <PasswordField mode="signup" name="confirm" label="ยืนยันรหัสผ่านใหม่" error={errors.confirm} />
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" block size="lg" loading={busy}>บันทึกรหัสผ่านใหม่</Button>
        </form>
      )}
    </AuthScreen>
  );
}
