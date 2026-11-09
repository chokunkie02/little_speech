"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { SchoolTeacherInvitationStatus } from "@/types/school";

type Invitation = { school_name: string; status: SchoolTeacherInvitationStatus };
const buttonClass = "rounded-xl bg-primary px-4 py-2 text-center text-sm font-semibold text-white disabled:opacity-50";

const inviteSettings = {
  teacher: { path: "/invite/school-teacher", dashboard: "/teacher", name: "ครู", title: "คำเชิญเข้าร่วมโรงเรียน" },
  school_admin: { path: "/invite/school-admin", dashboard: "/school", name: "แอดมินโรงเรียน", title: "คำเชิญดูแลโรงเรียน" },
} as const;

type InviteRole = keyof typeof inviteSettings;

function SchoolInvitation({ role }: { role: InviteRole }) {
  const settings = inviteSettings[role];
  const token = useSearchParams().get("token") ?? "";
  const valid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(token);
  const { user, isLoading, signOut } = useAuth();
  const [result, setResult] = useState<{ token: string; invitation: Invitation | null; failed?: boolean }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = result?.token === token ? result : undefined;
  const invitation = current?.invitation;
  const redirect = encodeURIComponent(`${settings.path}?token=${token}`);

  useEffect(() => {
    if (!valid) return;
    let active = true;
    async function load() {
      try {
        const response = await getSupabaseClient()?.rpc(
          role === "teacher" ? "get_school_teacher_invitation" : "get_school_admin_invitation",
          { p_token: token },
        );
        if (active) setResult({ token, invitation: response?.data ?? null, failed: !response || !!response.error });
      } catch {
        if (active) setResult({ token, invitation: null, failed: true });
      }
    }

    void load();
    return () => { active = false; };
  }, [token, valid, role]);

  async function accept() {
    const client = getSupabaseClient();
    if (!client || !invitation || busy) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await client.rpc(
        role === "teacher" ? "accept_school_teacher_invitation" : "accept_school_admin_invitation",
        { p_token: token },
      );
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
      <section className="w-full max-w-md space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <p className="text-xs font-semibold text-primary">Speech Adventure</p>
        <h1 className="text-xl font-bold">{settings.title}</h1>
        {invitation && <p className="text-sm font-semibold">{invitation.school_name}</p>}

        {!valid ? <p role="alert" className="text-sm text-error">ลิงก์คำเชิญไม่ถูกต้อง</p>
          : !current || isLoading ? <p role="status" className="text-sm text-text-muted">กำลังโหลดคำเชิญ…</p>
          : current.failed ? <p role="alert" className="text-sm text-error">โหลดคำเชิญไม่สำเร็จ กรุณาเปิดลิงก์อีกครั้ง</p>
          : !invitation ? <p role="alert" className="text-sm text-error">ไม่พบคำเชิญนี้</p>
          : invitation.status === "expired" ? <p className="text-sm text-text-muted">คำเชิญหมดอายุแล้ว กรุณาขอให้แอดมินส่งลิงก์ใหม่</p>
          : invitation.status === "accepted" ? (
            <div className="space-y-3">
              <p role="status" className="text-sm text-text-muted">
                {role === "teacher" ? "คำเชิญนี้ตอบรับแล้ว ครูจะเห็นห้องเมื่อแอดมินจัดเข้าห้อง" : "คำเชิญนี้ตอบรับแล้ว ผู้รับสามารถเปิดหน้าโรงเรียนด้วยบัญชีของตัวเอง"}
              </p>
              {role === "teacher"
                ? <Link href={settings.dashboard} className={`inline-block ${buttonClass}`}>ไปแดชบอร์ดครู</Link>
                : <button type="button" className={buttonClass} onClick={() => window.location.assign(settings.dashboard)}>ไปหน้าโรงเรียน</button>}
            </div>
          ) : !user ? (
            <div className="space-y-3">
              <p className="text-sm text-text-muted">เข้าสู่ระบบด้วยบัญชี{settings.name}ที่ใช้อีเมลเดียวกับคำเชิญ</p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/auth/signin?redirect=${redirect}`} className={buttonClass}>เข้าสู่ระบบ</Link>
                <Link href={`/auth/signup?redirect=${redirect}`} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-primary">สมัครบัญชี{settings.name}</Link>
              </div>
            </div>
          ) : user.role === role && !user.isPlatformAdmin ? (
            <div className="space-y-3">
              <p className="break-all text-sm text-text-muted">บัญชี{settings.name} {user.email}</p>
              {role === "school_admin" && <p className="text-sm text-text-muted">จัดการครู ห้องเรียน และผู้ปกครอง พร้อมดูรายงานภายในโรงเรียนนี้ได้</p>}
              <button type="button" className={buttonClass} disabled={busy} onClick={() => void accept()}>
                {busy ? "กำลังตอบรับ…" : "ตอบรับคำเชิญ"}
              </button>
            </div>
          ) : (
            <p role="alert" className="text-sm text-text-muted">กรุณาสลับไปใช้บัญชี{settings.name}ที่ได้รับคำเชิญ</p>
          )}
        {user && invitation?.status === "pending" && (
          <button type="button" className="text-sm font-semibold text-primary" onClick={() => void signOut()}>ออกจากบัญชีนี้</button>
        )}
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
      </section>
    </main>
  );
}

export default function SchoolInvitationPage({ role }: { role: InviteRole }) {
  return (
    <Suspense fallback={<p role="status" className="p-6 text-sm text-text-muted">กำลังโหลดคำเชิญ…</p>}>
      <SchoolInvitation role={role} />
    </Suspense>
  );
}
