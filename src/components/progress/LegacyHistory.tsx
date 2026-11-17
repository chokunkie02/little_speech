"use client";

// History from the practice screens that came before Learning Studio. Shown folded away, and only
// for children who actually have such records; nothing new is written to it any more.

import { useEffect, useState } from "react";
import { Archive, ChevronRight } from "lucide-react";
import SessionDetailDrawer from "@/components/details/SessionDetailDrawer";
import AttemptDetailDrawer from "@/components/details/AttemptDetailDrawer";
import SchoolAttemptAudio from "@/components/details/SchoolAttemptAudio";
import { useSpeechProgress } from "@/hooks/useSpeechProgress";
import { usePhonicsProgress } from "@/hooks/usePhonicsProgress";
import { getSupabaseClient } from "@/lib/supabase/client";
import { plainFeedback } from "@/lib/speech-evaluation/plainFeedback";
import { formatThaiDate } from "@/lib/thaiDate";
import type { PracticeAttempt, PracticeSession } from "@/types/speechAdventure";
import type { SchoolChildProgress } from "@/types/database";

function LegacyShell({ count, children }: { count: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-card border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <Archive size={18} aria-hidden="true" className="shrink-0 text-text-muted" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-text">ประวัติจากแบบฝึกเดิม</span>
          <span className="block text-caption text-text-muted">{count} · ก่อนเปลี่ยนมาใช้ห้องฝึกปัจจุบัน</span>
        </span>
        <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-text-muted transition-transform group-open:rotate-90" />
      </summary>
      <div className="space-y-4 border-t border-border p-4">{children}</div>
    </details>
  );
}

function Facts({ items }: { items: [string, string | number][] }) {
  return (
    <dl className="grid grid-cols-3 gap-3 rounded-control bg-surface-muted p-3 text-sm">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-caption text-text-muted">{label}</dt>
          <dd className="font-semibold tabular-nums text-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** This browser's records for the selected family child. */
export function FamilyLegacyHistory() {
  const { attempts, sessions, progress, summary, isHydrated } = useSpeechProgress();
  const { progress: phonics, completedLessonIds, isHydrated: phonicsHydrated } = usePhonicsProgress();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [attempt, setAttempt] = useState<PracticeAttempt | null>(null);
  const phonicsAttempts = phonics?.attempts.length ?? 0;
  if (!isHydrated || !phonicsHydrated || (attempts.length === 0 && phonicsAttempts === 0)) return null;

  const finished = [...sessions].filter((item) => item.status !== "active")
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  return (
    <LegacyShell count={`${attempts.length + phonicsAttempts} ครั้ง`}>
      {attempts.length > 0 && (
        <>
          <Facts items={[["ครั้งที่ฝึก", attempts.length], ["คะแนนเฉลี่ย", `${summary.averageScore}%`], ["ระดับที่ผ่าน", `${summary.completedStages}/7`]]} />
          {finished.length > 0 && (
            <ul className="divide-y divide-border rounded-control border border-border">
              {finished.slice(0, 20).map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => setSession(item)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-surface-muted">
                    <span>
                      <span className="font-medium text-text">เสียง {item.targetSound} · {item.completedMissions}/{item.totalMissions} ภารกิจ</span>
                      <span className="block text-caption text-text-muted">{formatThaiDate(item.startedAt, "datetime")}</span>
                    </span>
                    <span className="tabular-nums text-text-muted">{item.status === "completed" ? `${item.averageScore}%` : "ฝึกไม่จบ"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {phonicsAttempts > 0 && (
        <p className="text-sm text-text-muted">บทเรียนเสียงไทยแบบเดิม: เรียนจบ {completedLessonIds.size} บท จากการลอง {phonicsAttempts} ครั้ง</p>
      )}
      <SessionDetailDrawer session={session} allAttempts={attempts} onClose={() => setSession(null)} onAttemptClick={setAttempt} />
      <AttemptDetailDrawer attempt={attempt}
        linkedSession={attempt?.sessionId ? progress.sessions.find((item) => item.id === attempt.sessionId) ?? null : null}
        onClose={() => setAttempt(null)}
        onSessionClick={(item) => { setAttempt(null); setSession(item); }} />
    </LegacyShell>
  );
}

/** Online records of a school child (teachers can play back saved recordings). */
export function SchoolLegacyHistory({ data, teacher }: { data: SchoolChildProgress; teacher: boolean }) {
  const [audioId, setAudioId] = useState<string | null>(null);
  const [visible, setVisible] = useState(20);
  const attempts = data.attempts ?? [];
  const sessions = data.sessions ?? [];
  if (!attempts.length) return null;
  const average = Math.round(attempts.reduce((sum, item) => sum + item.score, 0) / attempts.length);

  return (
    <LegacyShell count={`${attempts.length} ครั้ง`}>
      <Facts items={[["ครั้งที่ฝึก", attempts.length], ["คะแนนเฉลี่ย", `${average}%`], ["รอบที่จบ", sessions.filter((item) => item.status === "completed").length]]} />
      {!teacher && <p className="text-caption text-text-muted">ครูประจำห้องฟังเสียงที่บันทึกไว้ได้</p>}
      <ul className="divide-y divide-border rounded-control border border-border">
        {attempts.slice(0, visible).map((item) => (
          <li key={item.id} className="px-3 py-2.5 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-text">{item.prompt_text}</span>
              <span className="tabular-nums text-text-muted">{item.score}%</span>
            </div>
            <p className="text-caption text-text-muted">เสียง {item.target_sound} · {formatThaiDate(item.created_at, "datetime")}</p>
            {item.feedback && <p className="mt-1 text-caption text-text-muted">{plainFeedback(item.feedback)}</p>}
            {item.has_audio && teacher && (
              <div className="mt-1.5">
                <button type="button" className="text-caption font-semibold text-primary-text hover:underline" aria-expanded={audioId === item.id}
                  onClick={() => setAudioId((current) => (current === item.id ? null : item.id))}>
                  {audioId === item.id ? "ปิดเสียงบันทึก" : "เปิดเสียงบันทึก"}
                </button>
                {audioId === item.id && <SchoolAttemptAudio attemptId={item.id} />}
              </div>
            )}
          </li>
        ))}
      </ul>
      {visible < attempts.length && (
        <button type="button" className="text-sm font-semibold text-primary-text hover:underline" onClick={() => setVisible((count) => count + 20)}>ดูเพิ่มเติม</button>
      )}
    </LegacyShell>
  );
}

/** Loads a school child's record: name for the header, access check, and the old history. */
export function useSchoolChildRecord(childId: string) {
  const [state, setState] = useState<{ id: string; data: SchoolChildProgress | null; error: boolean }>();
  useEffect(() => {
    const client = getSupabaseClient();
    let active = true;
    (async () => {
      try {
        if (!client) throw new Error("no client");
        const { data, error } = await client.rpc("get_school_child_progress", { p_child_id: childId });
        if (active) setState({ id: childId, data: error ? null : data, error: !!error });
      } catch {
        if (active) setState({ id: childId, data: null, error: true });
      }
    })();
    return () => { active = false; };
  }, [childId]);
  return state?.id === childId ? state : undefined;
}
