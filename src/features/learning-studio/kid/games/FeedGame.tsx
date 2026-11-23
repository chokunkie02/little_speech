import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ArrowRight, Star } from "lucide-react";
import { Art } from "../../Art";
import type { Item } from "../../types";
import { VOICE_CUES } from "../../useSpeaker";
import type { PracticeItem } from "../../usePracticeItem";
import { Mascot } from "../KidShell";
import type { Say } from "../useSay";

/** How long the child sees พี่ปู's reaction before the next item opens by itself. */
const NEXT_AFTER_MS = 1600;

/**
 * Listen and choose (stage 1, picture and letter choices): tap the picture you heard and พี่ปู eats it.
 * A first wrong tap only replays the sound; the second is saved as "still practising" and play moves on.
 * The saved attempt is the same as the classic screen's "บันทึกคำตอบ".
 */
export function FeedGame({ item, practice, say, onNext }: { item: Item; practice: PracticeItem; say: Say; onNext: () => void }) {
  const letters = item.choices?.every((c) => c.art === "letter") ?? false;
  const [picked, setPicked] = useState<string | null>(practice.saved?.choiceId ?? null);
  const [shaking, setShaking] = useState<string | null>(null);
  const [wrong, setWrong] = useState(0);
  const [line, setLine] = useState(letters ? "ฟังให้ดี แล้วแตะตัวอักษรที่ได้ยินนะ" : "ฟังให้ดี แล้วป้อนภาพที่ได้ยินให้พี่ปูนะ");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const speakOnOpen = useEffectEvent(() => {
    if (!practice.saved) say.say(item.sample);
  });
  useEffect(() => {
    speakOnOpen();
    return () => clearTimeout(timer.current);
  }, []);
  const correct = picked !== null && picked === item.answer;
  /** Reopened after a pause on an item that was already answered: let the child move on by hand. */
  const [resumed] = useState(!!practice.saved);

  const tap = async (id: string) => {
    if (practice.saved || picked !== null || practice.assessmentBusy) return;
    if (id === item.answer) {
      setPicked(id);
      setLine("อร่อยจัง! ใช่เลย");
      say.say(VOICE_CUES.success);
      await practice.save({ choice: id });
      timer.current = setTimeout(onNext, NEXT_AFTER_MS);
    } else if (wrong === 0) {
      setWrong(1);
      setShaking(id);
      practice.setRetries((r) => r + 1);
      setLine("ฟังอีกทีนะ");
      say.say(VOICE_CUES.retry, item.sample);
      timer.current = setTimeout(() => setShaking(null), 450);
    } else {
      setWrong(2);
      setPicked(id);
      setLine("ไม่เป็นไรนะ ไปข้อต่อไปกัน");
      await practice.save({ choice: id });
      timer.current = setTimeout(onNext, NEXT_AFTER_MS + 300);
    }
  };

  return (
    <div className="kw-stage">
      <Mascot text={line} onReplay={() => say.say(item.sample)} />
      <div className="kw-pics">
        {item.choices?.map((opt) => {
          const state =
            picked === null
              ? shaking === opt.id ? "miss" : ""
              : opt.id === item.answer ? "hit" : "dim";
          return (
            <button
              key={opt.id}
              type="button"
              className={`kw-pic ${state}`}
              onClick={() => void tap(opt.id)}
              aria-label={`เลือก ${opt.label}`}
              disabled={picked !== null && opt.id !== picked}
            >
              {opt.art === "letter" ? (
                <span className="kw-letter">{opt.label}</span>
              ) : (
                <>
                  <Art kind={opt.art} label={opt.label} />
                  <span className="kw-label">{opt.label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
      {correct && (
        <div className="kw-stars" aria-label="ได้ดาว 1 ดวง">
          <Star />
        </div>
      )}
      {resumed ? (
        <button type="button" className="kw-btn go big" onClick={onNext}>
          ไปต่อ
          <ArrowRight />
        </button>
      ) : (
        <div className="kw-sub">
          {picked !== null ? "ไปข้อต่อไปเอง…" : letters ? "แตะตัวอักษรที่ได้ยิน" : "แตะภาพที่ได้ยิน"}
        </div>
      )}
    </div>
  );
}
