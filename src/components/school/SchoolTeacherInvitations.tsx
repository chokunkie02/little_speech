"use client";

import { useState } from "react";
import { useSchoolTeacherInvitations } from "@/hooks/useSchoolTeacherInvitations";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function SchoolTeacherInvitations({ organizationId }: { organizationId: string }) {
  const { current, reload } = useSchoolTeacherInvitations(organizationId);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function inviteLink(token: string) {
    return new URL(`/invite/school-teacher?token=${encodeURIComponent(token)}`, window.location.origin).href;
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">ครูในโรงเรียน</h2>
        <button type="button" className="text-xs font-semibold text-primary" onClick={reload}>โหลดสถานะล่าสุด</button>
      </div>
      <form className="flex flex-wrap items-end gap-2" onSubmit={async (event) => {
        event.preventDefault();
        const client = getSupabaseClient();
        if (!client || busy) return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
          const { error } = await client.rpc("create_school_teacher_invitation", {
            p_organization_id: organizationId, p_email: email,
          });
          if (error) throw new Error(error.message);
          setEmail("");
          setNotice("สร้างคำเชิญแล้ว เลือกเปิดแอปอีเมลหรือคัดลอกลิงก์จากรายการด้านล่าง");
          reload();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "สร้างคำเชิญไม่สำเร็จ");
        } finally {
          setBusy(false);
        }
      }}>
        <label className="min-w-48 flex-1 text-sm font-semibold">อีเมลครู
          <input type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)}
            className="block w-full rounded-xl border border-border bg-bg px-3 py-2 font-normal" />
        </label>
        <button type="submit" disabled={busy} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          สร้างคำเชิญ
        </button>
      </form>
      {notice && <p role="status" className="text-xs text-success">{notice}</p>}
      {error && <p role="alert" className="text-xs text-error">{error}</p>}
      {!current ? <p role="status" className="text-xs text-text-muted">กำลังโหลดคำเชิญ…</p>
        : current.failed ? <p role="alert" className="text-xs text-error">โหลดคำเชิญไม่สำเร็จ</p>
        : current.rows.length === 0 ? <p className="text-xs text-text-muted">ยังไม่มีคำเชิญครู</p>
        : (
          <ul className="space-y-2">
            {current.rows.map((invitation) => (
              <li key={invitation.email} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm">
                <div className="break-all">
                  <p className="font-semibold">{invitation.email}</p>
                  <p className="text-xs text-text-muted">
                    {invitation.status === "accepted"
                      ? invitation.assigned ? "ตอบรับแล้ว · มีห้องประจำ" : "ตอบรับแล้ว · ยังไม่มีห้องประจำ"
                      : invitation.status === "expired" ? "หมดอายุ · สร้างคำเชิญใหม่ด้วยอีเมลเดิมได้" : "รอตอบรับ"}
                  </p>
                </div>
                {invitation.token && (
                  <div className="flex gap-2 text-xs font-semibold text-primary">
                    <button type="button" onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(inviteLink(invitation.token!));
                        setError("");
                        setNotice("คัดลอกลิงก์คำเชิญแล้ว");
                      } catch {
                        setError("คัดลอกลิงก์ไม่สำเร็จ กรุณาเปิดแอปอีเมล");
                      }
                    }}>คัดลอกลิงก์</button>
                    <a href={`mailto:${encodeURIComponent(invitation.email)}?subject=${encodeURIComponent("คำเชิญครู Speech Adventure")}&body=${encodeURIComponent(inviteLink(invitation.token))}`}>เปิดแอปอีเมล</a>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
