"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useGuardianWorkspace } from "@/components/layout/GuardianWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useInvitations } from "@/hooks/useInvitations";
import { getSupabaseClient } from "@/lib/supabase/client";

const labels = { pending: "รอตอบรับ", review: "รอตรวจคำขอ", accepted: "ตอบรับแล้ว", expired: "หมดอายุ", revoked: "ยกเลิกแล้ว" };
const badgeStyles = {
  pending: "border-primary/30 bg-primary/10 text-text",
  review: "border-warning/40 bg-warning/10 text-text",
  accepted: "border-success/40 bg-success/10 text-text",
  expired: "border-border bg-bg text-text-muted",
  revoked: "border-border bg-bg text-text-muted",
};
const card = "space-y-3 rounded-2xl border border-border bg-surface p-4";
const action = "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";

function InboxContent() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { parent, messages, loading, refreshing, hasLoaded, error, refresh } = useGuardianWorkspace();
  const { openLinkedChild } = useInvitations();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ id: string; message: string; child?: string }>();
  const [chosen, setChosen] = useState("");

  async function accept(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const relationship = String(new FormData(event.currentTarget).get("relationship"));
    setBusy(id);
    setNotice(undefined);
    try {
      const response = await getSupabaseClient()?.rpc("accept_guardian_inbox_invite", { p_invitation_id: id, p_relationship: relationship });
      if (!response?.data || response.error) throw new Error(response?.error?.message || "ตอบรับคำเชิญไม่สำเร็จ");
      setNotice({ id, message: "ตอบรับและเชื่อมกับนักเรียนแล้ว", child: response.data });
      setChosen("");
      await openLinkedChild(response.data).catch(() => {});
    } catch (cause) {
      setNotice({ id, message: cause instanceof Error ? cause.message : "ตอบรับคำเชิญไม่สำเร็จ" });
    } finally {
      setBusy("");
      refresh();
    }
  }

  async function openChild(id: string, child: string) {
    try {
      await openLinkedChild(child);
      router.push("/profile");
    } catch {
      setNotice({ id, message: "โหลดข้อมูลนักเรียนไม่สำเร็จ กรุณากดเปิดข้อมูลลูกอีกครั้ง" });
    }
  }

  const actionable = [
    ...messages.filter((message) => message.status === "pending"),
    ...messages.filter((message) => message.status === "review"),
  ];
  const history = messages.filter((message) => message.status !== "pending" && message.status !== "review");

  return <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div><h1 className="flex items-center gap-2 text-xl font-bold"><Mail size={21} aria-hidden="true" />กล่องข้อความ</h1>
        <p className="mt-1 text-sm text-text-muted">คำเชิญเชื่อมนักเรียนที่ส่งถึงบัญชีนี้</p></div>
      {parent && <button className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-primary disabled:opacity-60"
        onClick={refresh} disabled={loading || refreshing}>{refreshing ? "กำลังตรวจคำเชิญ…" : "ตรวจคำเชิญล่าสุด"}</button>}
    </header>
    {refreshing && <p role="status" className="sr-only">กำลังตรวจคำเชิญ…</p>}
    {error && <p role="alert" className={card}>โหลดคำเชิญไม่สำเร็จ{hasLoaded ? " กำลังแสดงข้อมูลจากครั้งล่าสุด" : ""} กรุณากดตรวจคำเชิญล่าสุด</p>}
    {isLoading || loading ? <p role="status">กำลังโหลดคำเชิญ…</p> :
      !user ? <Link href="/auth/signin?redirect=%2Finbox" className="text-primary">เข้าสู่ระบบเพื่อดูกล่องข้อความ</Link> :
      !parent ? <p className={card}>กล่องคำเชิญนี้ใช้สำหรับบัญชีผู้ปกครอง</p> :
      !hasLoaded ? null :
      messages.length === 0 ? <div className={card}><h2 className="font-semibold">ยังไม่มีคำเชิญ</h2>
        <p className="text-sm text-text-muted">เมื่อได้รับคำเชิญจากครู รายการจะแสดงที่นี่</p></div> :
      [
        { heading: "คำเชิญที่กำลังดำเนินการ", items: actionable },
        { heading: "ประวัติคำเชิญ", items: history },
      ].filter(({ items }) => items.length).map(({ heading, items }) => (
        <section key={heading} className="space-y-3">
          <h2 className="font-semibold">{heading} <span className="text-sm text-text-muted">({items.length})</span></h2>
          <ul className="space-y-3">{items.map((message) => <li key={message.id} className={card}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h3 className="break-words font-bold">คำเชิญดูแล {message.child_name}</h3>
                  <p className="text-sm text-text-muted">{message.school_name}{message.classroom_name && " · " + message.classroom_name}</p>
                  {(message.sender_name || message.inviter_email) && <p className="break-words text-xs text-text-muted">ผู้ส่ง {message.sender_name || message.inviter_email}</p>}</div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeStyles[message.status]}`}>{labels[message.status]}</span>
              </div>
              {message.status === "pending" && <p className="text-xs text-text-muted">ตอบรับได้ถึง {new Date(message.expires_at).toLocaleDateString("th-TH")}</p>}
              {message.legacy_token && ["pending", "review", "accepted"].includes(message.status) ?
                <Link className="inline-block text-sm font-semibold text-primary" href={"/invite/accept?token=" + encodeURIComponent(message.legacy_token)}>เปิดคำเชิญ</Link> :
                message.status === "pending" && (chosen === message.id ?
                  <form onSubmit={(event) => void accept(event, message.id)} className="flex flex-wrap items-end gap-2">
                    <label className="min-w-40 flex-1 text-sm">ความสัมพันธ์กับนักเรียน<input name="relationship" placeholder="เช่น แม่ พ่อ หรือผู้ดูแล"
                      className="mt-1 block w-full rounded-lg border border-border bg-bg px-3 py-2" required maxLength={60} /></label>
                    <button className={action} disabled={!!busy}>{busy === message.id ? "กำลังตอบรับ…" : "ตอบรับคำเชิญ"}</button>
                  </form> :
                  <button className={action} onClick={() => { setNotice(undefined); setChosen(message.id); }}>เปิดคำเชิญ</button>)}
              {notice?.id === message.id && <p role={notice.child ? "status" : "alert"}
                className={`rounded-xl border p-3 text-sm ${notice.child ? "border-success/30 bg-success/10" : "border-error/30 bg-error/8"}`}>{notice.message}</p>}
              {(message.linked_child_id || (notice?.id === message.id && notice.child)) &&
                <button className={action} onClick={() => {
                  const child = message.linked_child_id || notice?.child;
                  if (child) void openChild(message.id, child);
                }}>เปิดข้อมูลลูก</button>}
            </li>)}</ul>
        </section>
      ))}
  </div>;
}

export default function InboxPage() {
  return <AppShell><InboxContent /></AppShell>;
}
