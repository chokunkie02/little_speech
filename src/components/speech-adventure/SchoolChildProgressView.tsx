"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DetailMetricCard from "@/components/details/DetailMetricCard";
import SchoolObservations from "@/components/observations/SchoolObservations";
import SchoolAttemptAudio from "@/components/details/SchoolAttemptAudio";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { SchoolChildProgress } from "@/types/database";

const dateFormat = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok",
});

const pageSize = 20;

export default function SchoolChildProgressView({
  childId, teacher, viewerId,
}: {
  childId: string;
  teacher: boolean;
  viewerId: string;
}) {
  const [result, setResult] = useState<{
    data: SchoolChildProgress | null;
    error: boolean;
  }>();
  const [tab, setTab] = useState<"attempts" | "sessions" | "notes">("attempts");
  const [visible, setVisible] = useState(pageSize);
  const [revision, setRevision] = useState(0);
  const [audioAttemptId, setAudioAttemptId] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    let active = true;
    let generation = 0;

    async function load() {
      const current = ++generation;
      if (!client) {
        setResult({ data: null, error: true });
        return;
      }
      try {
        const { data, error } = await client.rpc("get_school_child_progress", { p_child_id: childId });
        if (active && current === generation) setResult({ data: error ? null : data, error: !!error });
      } catch {
        if (active && current === generation) setResult({ data: null, error: true });
      }
    }

    void load();
    function recheckAccess() {
      setAudioAttemptId(null);
      void load();
    }
    window.addEventListener("focus", recheckAccess);
    return () => {
      active = false;
      window.removeEventListener("focus", recheckAccess);
    };
  }, [childId, revision]);

  const data = result?.data;
  const attempts = data?.attempts ?? [];
  const sessions = data?.sessions ?? [];
  const average = attempts.length
    ? `${Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length)}%`
    : "—";

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
      {teacher && <Link className="text-sm font-semibold text-primary" href="/teacher">← กลับแดชบอร์ดครู</Link>}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">ความก้าวหน้า</h1>
          {data && <p className="mt-1 text-sm text-text-muted">
            {data.child.name}{data.child.nickname ? ` · ${data.child.nickname}` : ""}
          </p>}
        </div>
        <button type="button" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-primary"
          onClick={() => { setAudioAttemptId(null); setResult(undefined); setRevision((value) => value + 1); }}>
          โหลดผลล่าสุด
        </button>
      </header>

      {!result ? (
        <p role="status" className="rounded-xl border border-border bg-surface p-5 text-sm text-text-muted">กำลังโหลดผลฝึก…</p>
      ) : !data || result.error ? (
        <p role="alert" className="rounded-xl border border-border bg-surface p-5 text-sm text-text-muted">
          {result.error ? "โหลดผลฝึกไม่สำเร็จ กรุณาลองใหม่" : "บัญชีนี้ยังไม่มีสิทธิ์ดูผลฝึกของนักเรียนที่เลือก"}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <DetailMetricCard label="ครั้งที่ฝึก" value={attempts.length} />
            <DetailMetricCard label="คะแนนเฉลี่ย" value={average} valueColor="var(--color-primary)" />
            <DetailMetricCard label="เซสชันที่จบแล้ว" value={sessions.filter((session) => session.status === "completed").length} />
          </div>
          {!teacher && <p className="text-xs text-text-muted">
            ครูประจำห้องสามารถฟังเสียงการฝึกที่บันทึกไว้ของนักเรียนคนนี้ได้
          </p>}
          <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex gap-2" aria-label="เลือกประวัติการฝึก">
              {(["attempts", "sessions", "notes"] as const).map((choice) => (
                <button key={choice} type="button" aria-pressed={tab === choice}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === choice ? "bg-primary text-white" : "text-text-muted hover:bg-bg"}`}
                  onClick={() => { setAudioAttemptId(null); setTab(choice); setVisible(pageSize); }}>
                  {choice === "attempts" ? "ประวัติ" : choice === "sessions" ? "เซสชัน" : "ข้อสังเกต"}
                </button>
              ))}
            </div>
            {tab === "notes" ? (
              <SchoolObservations childId={childId} teacher={teacher} viewerId={viewerId} />
            ) : tab === "attempts" ? (
              attempts.length ? (
                <ul className="space-y-2">
                  {attempts.slice(0, visible).map((attempt) => (
                    <li key={attempt.id} className="rounded-xl border border-border p-3">
                      <details onToggle={(event) => {
                        if (!event.currentTarget.open) {
                          setAudioAttemptId((current) => current === attempt.id ? null : current);
                        }
                      }}>
                        <summary className="cursor-pointer text-sm font-semibold">
                          {attempt.prompt_text} · {attempt.score}%
                          <span className="ml-2 text-xs font-normal text-text-muted">
                            เสียง {attempt.target_sound} · {dateFormat.format(new Date(attempt.created_at))}
                          </span>
                        </summary>
                        <div className="mt-2 space-y-1 text-sm text-text-muted">
                          <p>{attempt.feedback || "ไม่มีคำแนะนำสำหรับครั้งนี้"}</p>
                          {attempt.recommendation && <p>{attempt.recommendation}</p>}
                          {attempt.has_audio && (
                            <div className="pt-2">
                              <button type="button" className="text-sm font-semibold text-primary"
                                aria-expanded={audioAttemptId === attempt.id}
                                onClick={() => setAudioAttemptId((current) => current === attempt.id ? null : attempt.id)}>
                                {audioAttemptId === attempt.id ? "ปิดเครื่องเล่นเสียง" : "เปิดเสียงบันทึก"}
                              </button>
                              {audioAttemptId === attempt.id && <SchoolAttemptAudio attemptId={attempt.id} />}
                            </div>
                          )}
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              ) : <p className="py-3 text-sm text-text-muted">ยังไม่มีผลฝึกของนักเรียนคนนี้</p>
            ) : (
              sessions.length ? (
                <ul className="space-y-2">
                  {sessions.slice(0, visible).map((session) => (
                    <li key={session.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-border p-3 text-sm">
                      <div>
                        <p className="font-semibold">เสียง {session.target_sound} · {session.completed_missions}/{session.total_missions} กิจกรรม</p>
                        <p className="text-xs text-text-muted">{dateFormat.format(new Date(session.started_at))}</p>
                      </div>
                      <p className="text-text-muted">{session.status === "completed" ? `${session.average_score}%` : "ฝึกไม่จบ"}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="py-3 text-sm text-text-muted">ยังไม่มีเซสชันที่จบแล้ว</p>
            )}
            {tab !== "notes" && visible < (tab === "attempts" ? attempts.length : sessions.length) &&
              <button type="button" className="text-sm font-semibold text-primary"
                onClick={() => setVisible((count) => count + pageSize)}>ดูเพิ่มเติม</button>}
          </section>
        </>
      )}
    </div>
  );
}
