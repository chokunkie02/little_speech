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
  const [search, setSearch] = useState<{ busy?: boolean; matches?: SchoolPersonMatch[]; error?: boolean }>({});

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
    <div>
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
