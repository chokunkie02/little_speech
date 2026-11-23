import { useState } from "react";
import { CircleHelp, Ear, RotateCcw, Smile } from "lucide-react";
import { Art } from "./Art";
import { getStages } from "./curriculum";
import type { Item, Review, Session } from "./types";

const SHOW = 8;

/**
 * Results page, top: recorded speech items that still wait for an adult, each answered with one tap
 * (the same three results as the review dialog). Recordings are not kept, so the adult answers from what
 * they heard while the child played. For school children whose school leaves confirming to the class
 * teacher, the adult's taps stay on this device and the list says so.
 */
export function WaitingReviews({
  sessions,
  teacherConfirms,
  onReview,
}: {
  sessions: Session[];
  teacherConfirms: boolean;
  onReview: (sessionId: string, attemptId: string, review: Exclude<Review, "pending">) => void;
}) {
  const [all, setAll] = useState(false);
  const items = new Map<string, Item>();
  const findItem = (session: Session, itemId: string) => {
    const key = `${session.track}|${session.sound}|${session.level ?? ""}|${itemId}`;
    if (!items.has(key)) {
      const item = getStages(session.track, session.sound, session.level)
        .flatMap((s) => s.items)
        .find((i) => i.id === itemId);
      if (item) items.set(key, item);
    }
    return items.get(key);
  };
  const waiting = sessions
    .flatMap((session) =>
      session.attempts
        // Same rule as the results stats (metrics): every non-choice item still pending, tap-mode tries too.
        .filter((a) => a.kind !== "choice" && a.review === "pending")
        .map((attempt) => ({ session, attempt, item: findItem(session, attempt.itemId) })),
    )
    .sort((a, b) => b.attempt.createdAt.localeCompare(a.attempt.createdAt));
  if (!waiting.length) return null;
  const shown = all ? waiting : waiting.slice(0, SHOW);

  return (
    <section className="panel waiting" aria-label="รอผู้ใหญ่ฟัง">
      <div className="waiting-head">
        <span className="today-card-icon">
          <Ear size={20} />
        </span>
        <div>
          <h2>รอผู้ใหญ่ฟัง {waiting.length} ข้อ</h2>
          <p>
            {teacherConfirms
              ? "ครูประจำห้องเป็นผู้ยืนยันผลการพูดของโรงเรียน · ผลที่แตะตรงนี้ใช้ดูในเครื่องนี้"
              : "เสียงของน้องไม่ถูกเก็บไว้ ให้ผลจากที่ได้ยินตอนเล่น หรือให้น้องพูดคำนั้นให้ฟังอีกครั้ง"}
          </p>
        </div>
      </div>
      <ul className="waiting-list">
        {shown.map(({ session, attempt, item }) => (
          <li key={attempt.id}>
            <span className="waiting-pic">{item && <Art kind={item.art} label="" />}</span>
            <span className="waiting-word">
              <b>{item?.prompt ?? "ข้อพูด"}</b>
              <small>
                {session.stageLabel} · {new Date(attempt.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
              </small>
            </span>
            <span className="waiting-actions" role="group" aria-label={`ผลของ ${item?.prompt ?? "ข้อนี้"}`}>
              <button type="button" className="yes" onClick={() => onReview(session.id, attempt.id, "achieved")}>
                <Smile size={16} />
                ทำได้
              </button>
              <button type="button" onClick={() => onReview(session.id, attempt.id, "practice")}>
                <RotateCcw size={16} />
                ยังต้องฝึก
              </button>
              <button type="button" onClick={() => onReview(session.id, attempt.id, "unavailable")} title="ประเมินไม่ได้">
                <CircleHelp size={16} />
                <span className="sr-only">ประเมินไม่ได้</span>
              </button>
            </span>
          </li>
        ))}
      </ul>
      {waiting.length > SHOW && (
        <button type="button" className="text-button" onClick={() => setAll(!all)}>
          {all ? "แสดงน้อยลง" : `แสดงทั้งหมด ${waiting.length} ข้อ`}
        </button>
      )}
    </section>
  );
}
