"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { SchoolPersonMatch } from "@/types/school";

const field = "mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm";
const button = "rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50";
const kinds = { student: "นักเรียน", teacher: "ครู", guardian: "ผู้ปกครอง" };

export default function SchoolGuardianTools({ organizationId, onOpenClassroom }: {
  organizationId: string;
  onOpenClassroom: (id: string) => void;
}) {
  const [account, setAccount] = useState<{ busy?: boolean; text?: string; code?: string; error?: boolean }>({});
  const [search, setSearch] = useState<{ busy?: boolean; matches?: SchoolPersonMatch[]; error?: boolean }>({});
  const [copyStatus, setCopyStatus] = useState("");

  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    setCopyStatus("");
    setAccount({ busy: true });
    try {
      const session = await getSupabaseClient()?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) throw new Error("กรุณาเข้าสู่ระบบผู้ดูแลโรงเรียน");
      const response = await fetch("/api/parent-activation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ action: "prepare", organizationId, email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setAccount(result.existing
        ? { text: "มีบัญชีอีเมลนี้แล้ว ให้เจ้าของบัญชีเข้าสู่ระบบตามปกติ" }
        : { code: result.code, text: "ส่งรหัสนี้ให้เจ้าของบัญชีโดยตรง รหัสใช้ได้ครั้งเดียว การออกรหัสใหม่จะยกเลิกรหัสเดิม" });
    } catch (error) {
      setAccount({ error: true, text: error instanceof Error ? error.message : "เตรียมบัญชีไม่สำเร็จ" });
    }
  }

  async function find(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("query")).trim();
    if (!query) return;
    setSearch({ busy: true });
    try {
      const response = await getSupabaseClient()?.rpc("search_school_people", { p_organization_id: organizationId, p_query: query });
      setSearch(response?.error || !response ? { error: true } : { matches: response.data });
    } catch {
      setSearch({ error: true });
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <h3 className="font-semibold">เตรียมบัญชีผู้ปกครอง</h3>
        <form onSubmit={prepare} className="flex flex-wrap items-end gap-2">
          <label className="min-w-40 flex-1 text-sm">อีเมลผู้ปกครอง<input name="email" className={field} type="email" required maxLength={254} onChange={() => { if (!account.busy) setAccount({}); }} disabled={account.busy} /></label>
          <button className={button} disabled={account.busy}>{account.busy ? "กำลังเตรียม…" : "เตรียมบัญชี / ออกรหัสใหม่"}</button>
        </form>
        {account.text && <p role={account.error ? "alert" : "status"} className="text-sm text-text-muted">{account.text}</p>}
        {account.code && <div className="space-y-2">
          <label className="block text-sm">รหัสเปิดใช้<input className={field + " font-mono"} value={account.code} readOnly onFocus={(event) => event.target.select()} /></label>
          <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary" onClick={async () => {
            try {
              await navigator.clipboard.writeText(account.code!);
              setCopyStatus("คัดลอกรหัสแล้ว");
            } catch {
              setCopyStatus("แตะช่องรหัสเพื่อเลือกและคัดลอก");
            }
          }}>คัดลอกรหัส</button>
          {copyStatus && <p role="status" className="text-xs text-text-muted">{copyStatus}</p>}
        </div>}
      </section>
      <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <h3 className="font-semibold">ค้นหาในโรงเรียน</h3>
        <form onSubmit={find} className="flex flex-wrap items-end gap-2">
          <label className="min-w-40 flex-1 text-sm">ชื่อ รหัสนักเรียน ห้อง หรืออีเมล<input name="query" className={field} type="search" required maxLength={254} /></label>
          <button className={button} disabled={search.busy}>{search.busy ? "กำลังค้นหา…" : "ค้นหา"}</button>
        </form>
        {search.error && <p role="alert" className="text-sm">ค้นหาไม่สำเร็จ กรุณาลองอีกครั้ง</p>}
        {search.matches?.length === 0 && <p role="status" className="text-sm">ไม่พบข้อมูลที่ตรงกับคำค้น</p>}
        {!!search.matches?.length && <ul className="space-y-2">
          {search.matches.map((item) => {
            const classroomId = item.classroom_id;
            return <li key={JSON.stringify(item)} className="break-words rounded-lg border border-border p-2 text-sm">
              <span className="text-xs text-text-muted">{kinds[item.kind]}</span>
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-text-muted">{item.detail}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {classroomId && <button type="button" className="text-xs font-semibold text-primary"
                  onClick={() => onOpenClassroom(classroomId)}>เปิดห้องเรียน</button>}
                {item.child_id && <Link className="text-xs font-semibold text-primary" href={"/report?child=" + item.child_id}>เปิดรายงานนักเรียน</Link>}
              </div>
            </li>;
          })}
        </ul>}
      </section>
    </div>
  );
}
