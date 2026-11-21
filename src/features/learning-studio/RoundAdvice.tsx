"use client";

import { useEffect, useState } from "react";
import { Sparkles, Volume2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { assessmentRequest } from "@/lib/assessment/client";
import type { PolicySnapshot } from "@/lib/assessment/policy";
import type { RoundOutcome, RoundSummary } from "@/lib/assessment/round-summary";
import type { Attempt, Session } from "./types";
import { useSpeaker } from "./useSpeaker";

const CENTRAL_CHILD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The outcome an adult sees for one attempt: the answer key for choices, otherwise the adult's review. */
function outcomeOf(attempt: Attempt): RoundOutcome {
  if (attempt.kind === "choice") return attempt.choiceCorrect ? "achieved" : "practice";
  return attempt.review === "pending" ? "needs_review" : attempt.review;
}

/**
 * "คำแนะนำจาก Claude" on the round summary. Shown only when an admin switched round summaries on and
 * the server has a Claude key. Sends ids and outcomes only; the server looks the round up itself.
 */
export default function RoundAdvice({ session }: { session: Session }) {
  const { user } = useAuth();
  const speaker = useSpeaker();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<RoundSummary>();
  // Simulated answers ("ทดลองตอบโดยไม่อัดเสียง") are not real attempts and are left out.
  const attempts = session.attempts.filter((attempt) => attempt.mode !== "demo");
  const eligible = !!user && CENTRAL_CHILD_ID.test(session.childId) && attempts.length > 0;

  useEffect(() => {
    if (!eligible) return;
    const abort = new AbortController();
    assessmentRequest<PolicySnapshot>(`/api/assessment/policy?childId=${encodeURIComponent(session.childId)}`, {
      signal: abort.signal,
    })
      .then((policy) => setReady(!!policy.roundSummaryReady))
      .catch(() => setReady(false));
    return () => abort.abort();
  }, [eligible, session.childId]);

  if (!eligible || !ready) return null;

  async function ask() {
    setBusy(true);
    setError("");
    try {
      const result = await assessmentRequest<{ summary: RoundSummary }>("/api/assessment/round-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: session.childId,
          sessionId: session.id,
          track: session.track,
          sound: session.sound,
          level: session.level ?? "starter",
          stageId: session.stageId,
          attempts: attempts.map((attempt) => ({ itemId: attempt.itemId, outcome: outcomeOf(attempt) })),
        }),
        signal: AbortSignal.timeout(60000),
      });
      setSummary(result.summary);
    } catch (failure) {
      setError(
        failure instanceof Error && failure.name !== "AbortError" && failure.name !== "TimeoutError"
          ? failure.message
          : "ยังได้คำแนะนำไม่ทัน ลองใหม่อีกครั้งได้",
      );
    } finally {
      setBusy(false);
    }
  }

  const pending = attempts.some((attempt) => outcomeOf(attempt) === "needs_review");
  return (
    <section className="panel summary-details" aria-label="คำแนะนำจาก Claude">
      <h2>
        <Sparkles size={18} aria-hidden="true" /> คำแนะนำจาก Claude
      </h2>
      {!summary && (
        <>
          <p>
            ให้ Claude ช่วยสรุปรอบนี้และแนะนำวิธีฝึกที่บ้าน Claude ได้รับเฉพาะขั้น คำเป้าหมาย และผลแต่ละข้อ
            ไม่ได้รับชื่อเด็กหรือเสียง
            {pending && " · ตรวจข้อพูดให้เสร็จก่อน คำแนะนำจะตรงขึ้น"}
          </p>
          <button type="button" className="button secondary" disabled={busy} onClick={() => void ask()}>
            {busy ? "กำลังเขียนคำแนะนำ…" : "ขอคำแนะนำจาก Claude"}
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {summary && (
        <div role="status">
          <p>
            <strong>{summary.childMessage}</strong>
          </p>
          <button type="button" className="button secondary" onClick={() => speaker.speak(summary.childMessage)}>
            <Volume2 size={16} aria-hidden="true" /> อ่านคำชมให้น้องฟัง
          </button>
          {summary.strengths.length > 0 && (
            <>
              <h3>ทำได้ดีในรอบนี้</h3>
              <ul>
                {summary.strengths.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </>
          )}
          {summary.practiceNext.length > 0 && (
            <>
              <h3>ฝึกต่อครั้งหน้า</h3>
              <ul>
                {summary.practiceNext.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </>
          )}
          {summary.homeActivities.length > 0 && (
            <>
              <h3>ลองเล่นที่บ้าน</h3>
              <ul>
                {summary.homeActivities.map((activity) => (
                  <li key={activity.title}>
                    <strong>{activity.title}</strong> · {activity.howTo}
                  </li>
                ))}
              </ul>
            </>
          )}
          <small>คำแนะนำจาก AI เพื่อช่วยฝึก ไม่ใช่การวินิจฉัย ผู้ใหญ่ปรับใช้ตามความเหมาะสมของน้อง</small>
        </div>
      )}
    </section>
  );
}
