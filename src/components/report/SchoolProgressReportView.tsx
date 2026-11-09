"use client";

import { useEffect, useState } from "react";
import PrintActions from "@/components/report/PrintActions";
import ReportMetricCard from "@/components/report/ReportMetricCard";
import LearningResults from "@/components/speech-adventure/LearningResults";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { SchoolProgressReport } from "@/types/database";

interface DateRange { from: string; to: string }

const thailandDate = new Intl.DateTimeFormat("en-CA", {
  year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Bangkok",
});
const reportDate = new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" });

function recentRange(): DateRange {
  const to = thailandDate.format(new Date());
  const start = new Date(`${to}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 29);
  return { from: start.toISOString().slice(0, 10), to };
}

export default function SchoolProgressReportView({ childId, backHref }: { childId: string; backHref: string }) {
  const [applied, setApplied] = useState(recentRange);
  const [draft, setDraft] = useState(applied);
  const [result, setResult] = useState<{ range: DateRange; data: SchoolProgressReport | null; error: boolean }>();

  useEffect(() => {
    const client = getSupabaseClient();
    let active = true;
    let generation = 0;

    async function load() {
      const request = ++generation;
      try {
        const response = await client?.rpc("get_school_progress_report", {
          p_child_id: childId, p_from: applied.from, p_to: applied.to,
        });
        if (active && request === generation) {
          setResult({ range: applied, data: response?.error ? null : response?.data ?? null, error: !response || !!response.error });
        }
      } catch {
        if (active && request === generation) setResult({ range: applied, data: null, error: true });
      }
    }

    void load();
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
    };
  }, [applied, childId]);

  const current = result?.range === applied ? result : undefined;
  const report = current?.data;
  const dirty = draft.from !== applied.from || draft.to !== applied.to;

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6 print:max-w-none print:p-0">
        <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4 print:hidden"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.from && draft.to && draft.from <= draft.to) setApplied({ ...draft });
          }}>
          <label className="text-sm font-semibold">ตั้งแต่วันที่
            <input type="date" required min="0001-01-01" max={draft.to || "9999-12-31"}
              className="block rounded-lg border border-border bg-bg px-3 py-2 font-normal"
              value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} />
          </label>
          <label className="text-sm font-semibold">ถึงวันที่
            <input type="date" required min={draft.from || "0001-01-01"} max="9999-12-31"
              className="block rounded-lg border border-border bg-bg px-3 py-2 font-normal"
              value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} />
          </label>
          <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">แสดงรายงาน</button>
        </form>

        {!current ? (
          <p role="status" className="text-sm text-text-muted print:hidden">กำลังโหลดรายงาน…</p>
        ) : !report ? (
          <p role="alert" className="rounded-xl border border-border bg-surface p-4 text-sm text-text-muted print:hidden">
            {current.error ? "โหลดรายงานไม่สำเร็จ กรุณากดแสดงรายงานอีกครั้ง" : "บัญชีนี้ไม่มีสิทธิ์เปิดรายงานของนักเรียนที่เลือก"}
          </p>
        ) : (
          <article className="space-y-5 print:text-black">
            <header className="space-y-1 rounded-2xl border border-border bg-surface p-4 print:bg-white">
              <p className="text-xs font-semibold text-primary print:text-gray-600">Speech Adventure</p>
              <h1 className="text-xl font-bold">รายงานความก้าวหน้า</h1>
              <p className="text-sm font-semibold">{report.child.name}{report.child.nickname ? ` · ${report.child.nickname}` : ""}</p>
              <p className="text-sm text-text-muted print:text-gray-600">
                {reportDate.format(new Date(applied.from))} ถึง {reportDate.format(new Date(applied.to))}
              </p>
            </header>
            <p className="text-sm font-semibold text-text-muted">สรุปจากระบบฝึกเดิม</p>
            <div className="grid grid-cols-3 gap-2 print:break-inside-avoid">
              <ReportMetricCard label="ครั้งที่ฝึก" value={report.attempt_count} />
              <ReportMetricCard label="คะแนนเฉลี่ย" value={report.average_score === null ? "—" : `${report.average_score}%`} />
              <ReportMetricCard label="เซสชันที่จบแล้ว" value={report.completed_sessions} />
            </div>
            <LearningResults key={applied.from + ":" + applied.to} childId={childId} from={applied.from} to={applied.to} />
            <section className="rounded-xl border border-border bg-surface p-4 print:bg-white">
              <h2 className="mb-3 font-semibold">ผลฝึกแยกตามเสียง</h2>
              {report.sounds.length ? (
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b border-border">
                    <th scope="col" className="py-2">เสียง</th>
                    <th scope="col" className="py-2">จำนวนครั้ง</th>
                    <th scope="col" className="py-2">คะแนนเฉลี่ย</th>
                  </tr></thead>
                  <tbody>
                    {report.sounds.map((sound) => (
                      <tr key={sound.target_sound} className="border-b border-border last:border-0 print:break-inside-avoid">
                        <th scope="row" className="py-2 font-medium">{sound.target_sound}</th>
                        <td className="py-2">{sound.attempts}</td>
                        <td className="py-2">{sound.average_score}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-sm text-text-muted print:text-gray-600">ไม่มีผลฝึกในช่วงวันที่เลือก</p>}
            </section>
            {report.shared_notes.length > 0 && (
              <section className="space-y-3 rounded-xl border border-border bg-surface p-4 print:bg-white">
                <h2 className="font-semibold">ข้อสังเกตที่ครูแชร์</h2>
                {report.shared_notes.map((note) => (
                  <div key={note.id} className="space-y-1 border-b border-border pb-2 text-sm last:border-0">
                    <p className="break-words font-semibold">{note.title}</p>
                    <p className="text-xs text-text-muted print:text-gray-600">{reportDate.format(new Date(note.created_at))}</p>
                    <p className="whitespace-pre-wrap break-words">{note.content}</p>
                  </div>
                ))}
              </section>
            )}
          </article>
        )}
      </div>
      {report && !dirty && <PrintActions backHref={backHref} onPrint={() => window.print()} />}
    </>
  );
}
