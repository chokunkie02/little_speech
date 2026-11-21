"use client";

import { useEffect, useState } from "react";
import { CircleCheck, House, ShieldCheck, Sparkles, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { assessmentRequest } from "@/lib/assessment/client";
import type { PolicySnapshot } from "@/lib/assessment/policy";
import type { RoundOutcome, RoundSummary } from "@/lib/assessment/round-summary";
import type { Attempt, Session } from "./types";

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
    <section className="panel advice-card" aria-label="คำแนะนำจาก Claude">
      <header className="advice-head">
        <span className="advice-icon" aria-hidden="true">
          <Sparkles size={20} />
        </span>
        <div>
          <h2>คำแนะนำจาก Claude</h2>
          <p>สรุปรอบนี้สำหรับผู้ใหญ่ ใช้ประกอบการฝึกกับน้อง</p>
        </div>
      </header>

      {!summary && (
        <div className="advice-intro">
          <p>
            ให้ Claude ช่วยสรุปว่ารอบนี้ทำอะไรได้ดี ควรฝึกอะไรต่อ และมีกิจกรรมสั้น ๆ ให้เล่นที่บ้าน
            {pending && " ตรวจข้อพูดให้เสร็จก่อน คำแนะนำจะตรงขึ้น"}
          </p>
          <button type="button" className="button primary" disabled={busy} onClick={() => void ask()}>
            <Sparkles size={16} aria-hidden="true" />
            {busy ? "กำลังเขียนคำแนะนำ… (ประมาณ 20 วินาที)" : "ขอคำแนะนำจาก Claude"}
          </button>
          <small>Claude ได้รับเฉพาะขั้น คำเป้าหมาย และผลแต่ละข้อ ไม่ได้รับชื่อเด็กหรือเสียง</small>
        </div>
      )}
      {error && (
        <p className="advice-error" role="alert">
          {error}
        </p>
      )}

      {summary && (
        <div className="advice-body" role="status">
          <div className="advice-praise">
            <span className="advice-praise-label">คำชมสำหรับน้อง · ผู้ใหญ่อ่านให้น้องฟังได้เลย</span>
            <p className="advice-praise-text">“{summary.childMessage}”</p>
            {/* No listen button: every voice in the studio is a pre-made clip, and Claude writes new text
                each round, so useSpeaker has nothing to play. Add one back with a runtime voice service. */}
          </div>

          {(summary.strengths.length > 0 || summary.practiceNext.length > 0) && (
            <div className="advice-grid">
              {summary.strengths.length > 0 && (
                <section className="advice-block good">
                  <h3>
                    <CircleCheck size={18} aria-hidden="true" /> ทำได้ดีในรอบนี้
                  </h3>
                  <ul className="advice-list">
                    {summary.strengths.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                </section>
              )}
              {summary.practiceNext.length > 0 && (
                <section className="advice-block next">
                  <h3>
                    <Target size={18} aria-hidden="true" /> ฝึกต่อครั้งหน้า
                  </h3>
                  <ul className="advice-list">
                    {summary.practiceNext.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {summary.homeActivities.length > 0 && (
            <section className="advice-block home">
              <h3>
                <House size={18} aria-hidden="true" /> ลองเล่นที่บ้าน
              </h3>
              <ol className="advice-activities">
                {summary.homeActivities.map((activity, index) => (
                  <li key={activity.title}>
                    <span className="advice-num" aria-hidden="true">
                      {index + 1}
                    </span>
                    <div>
                      <strong>{activity.title}</strong>
                      <p>{activity.howTo}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <p className="advice-note">
            <ShieldCheck size={15} aria-hidden="true" />
            คำแนะนำจาก AI เพื่อช่วยฝึก ไม่ใช่การวินิจฉัย ผู้ใหญ่ปรับใช้ตามความเหมาะสมของน้อง
          </p>
        </div>
      )}
    </section>
  );
}
