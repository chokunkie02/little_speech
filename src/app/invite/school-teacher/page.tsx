"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { SchoolTeacherInvitationStatus } from "@/types/school";

type Invitation = { school_name: string; status: SchoolTeacherInvitationStatus };
const buttonClass = "rounded-xl bg-primary px-4 py-2 text-center text-sm font-semibold text-white disabled:opacity-50";

function SchoolTeacherInvitation() {
  const token = useSearchParams().get("token") ?? "";
  const valid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(token);
  const { user, isLoading } = useAuth();
  const [result, setResult] = useState<{ token: string; invitation: Invitation | null; failed?: boolean }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = result?.token === token ? result : undefined;
  const invitation = current?.invitation;
  const redirect = encodeURIComponent(`/invite/school-teacher?token=${token}`);

  useEffect(() => {
    if (!valid) return;
    let active = true;
    async function load() {
      try {
        const response = await getSupabaseClient()?.rpc("get_school_teacher_invitation", { p_token: token });
        if (active) setResult({ token, invitation: response?.data ?? null, failed: !response || !!response.error });
      } catch {
        if (active) setResult({ token, invitation: null, failed: true });
      }
    }

    void load();
    return () => { active = false; };
  }, [token, valid]);

  async function accept() {
    const client = getSupabaseClient();
    if (!client || !invitation || busy) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await client.rpc("accept_school_teacher_invitation", { p_token: token });
      if (error) throw new Error(error.message);
      setResult({ token, invitation: { ...invitation, status: "accepted" } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ตอบรับไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-8">
      <section className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-surface p-6">
        <p className="text-xs font-semibold text-primary">Speech Adventure</p>
        <h1 className="text-xl font-bold">คำเชิญเข้าร่วมโรงเรียน</h1>
        {invitation && <p className="text-sm font-semibold">{invitation.school_name}</p>}

        {!valid ? <p role="alert" className="text-sm text-error">ลิงก์คำเชิญไม่ถูกต้อง</p>
          : !current || isLoading ? <p role="status" className="text-sm text-text-muted">กำลังโหลดคำเชิญ…</p>
          : current.failed ? <p role="alert" className="text-sm text-error">โหลดคำเชิญไม่สำเร็จ กรุณาเปิดลิงก์อีกครั้ง</p>
          : !invitation ? <p role="alert" className="text-sm text-error">ไม่พบคำเชิญนี้</p>
          : invitation.status === "expired" ? <p className="text-sm text-text-muted">คำเชิญหมดอายุแล้ว กรุณาขอให้แอดมินส่งลิงก์ใหม่</p>
          : invitation.status === "accepted" ? (
            <div className="space-y-3">
              <p role="status" className="text-sm text-text-muted">คำเชิญนี้ตอบรับแล้ว ครูจะเห็นห้องเมื่อแอดมินจัดเข้าห้อง</p>
              <Link href="/teacher" className={`inline-block ${buttonClass}`}>ไปแดชบอร์ดครู</Link>
            </div>
          ) : !user ? (
            <div className="space-y-3">
              <p className="text-sm text-text-muted">เข้าสู่ระบบด้วยบัญชีครูที่ใช้อีเมลเดียวกับคำเชิญ</p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/auth/signin?redirect=${redirect}`} className={buttonClass}>เข้าสู่ระบบ</Link>
                <Link href={`/auth/signup?redirect=${redirect}`} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-primary">สมัครบัญชีครู</Link>
              </div>
            </div>
          ) : user.role === "teacher" ? (
            <div className="space-y-3">
              <p className="break-all text-sm text-text-muted">บัญชีครู {user.email}</p>
              <button type="button" className={buttonClass} disabled={busy} onClick={() => void accept()}>
                {busy ? "กำลังตอบรับ…" : "ตอบรับคำเชิญ"}
              </button>
            </div>
          ) : (
            <p role="alert" className="text-sm text-text-muted">กรุณาสลับไปใช้บัญชีครูที่ได้รับคำเชิญ</p>
          )}
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
      </section>
    </main>
  );
}

export default function SchoolTeacherInvitationPage() {
  return (
    <Suspense fallback={<p role="status" className="p-6 text-sm text-text-muted">กำลังโหลดคำเชิญ…</p>}>
      <SchoolTeacherInvitation />
    </Suspense>
  );
}
