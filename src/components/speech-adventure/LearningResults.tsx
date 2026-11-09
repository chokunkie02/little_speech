"use client";

import { useEffect, useState } from "react";
import { isSupabaseProviderRequested } from "@/lib/config/storageProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { DbLearningSessionResult } from "@/types/database";

const latestLimit = 30;
const date = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
const tracks = { speech: "ฝึกออกเสียง", phonics: "เรียนเสียงไทย", communication: "ฝึกสื่อสาร" };

export default function LearningResults({ childId, from, to, revision }: {
  childId?: string;
  from?: string;
  to?: string;
  revision?: number;
}) {
  const [rows, setRows] = useState<DbLearningSessionResult[]>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!childId || !client || !isSupabaseProviderRequested()) return;
    let active = true;
    let generation = 0;
    async function load() {
      const request = ++generation;
      try {
        if (!client) return;
        let query = client.from("learning_session_results").select("*").eq("child_id", childId ?? "")
          .order("completed_at", { ascending: false }).limit(latestLimit + 1);
        if (from) query = query.gte("completed_at", `${from}T00:00:00+07:00`);
        if (to) {
          const nextDay = new Date(`${to}T00:00:00+07:00`);
          nextDay.setUTCDate(nextDay.getUTCDate() + 1);
          query = query.lt("completed_at", nextDay.toISOString());
        }
        const { data, error } = await query;
        if (error) throw error;
        if (active && request === generation) {
          setRows(data);
          setFailed(false);
        }
      } catch {
        if (active && request === generation) {
          setRows(undefined);
          setFailed(true);
        }
      }
    }
    void load();
    window.addEventListener("focus", load);
    return () => { active = false; window.removeEventListener("focus", load); };
  }, [childId, from, to, revision]);

  if (!childId || !isSupabaseProviderRequested() || (!rows?.length && !failed)) return null;

  return (
    <section aria-label="ผลจากระบบฝึกใหม่" className="space-y-3 rounded-2xl border border-border bg-surface p-4 text-left sm:p-5 print:bg-white">
      <h2 className="font-bold text-text">ผลจากระบบฝึกใหม่</h2>
      <p className="text-xs text-text-muted">แสดงรอบที่ฝึกจบ ผลตอบถูกใช้เฉพาะข้อเลือกตอบ</p>
      {failed ? <p role="alert" className="text-sm text-error">โหลดผลฝึกใหม่ไม่สำเร็จ กรุณาโหลดหน้าอีกครั้ง</p> :
        <ul className="space-y-2">
          {rows?.slice(0, latestLimit).map((row) => (
            <li key={row.recorded_by + ":" + row.session_id} className="rounded-xl border border-border p-3 text-sm print:break-inside-avoid">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <strong>{row.stage_label}</strong>
                <time className="text-xs text-text-muted" dateTime={row.completed_at}>{date.format(new Date(row.completed_at))}</time>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {tracks[row.track]} · เสียง {row.sound} · {row.activities} กิจกรรม
                {row.choice_count > 0 && ` · ตอบถูก ${row.correct_choices}/${row.choice_count} ข้อ`}
              </p>
            </li>
          ))}
        </ul>}
      {(rows?.length ?? 0) > latestLimit && <p className="text-xs text-text-muted">แสดง {latestLimit} รอบล่าสุด</p>}
    </section>
  );
}
