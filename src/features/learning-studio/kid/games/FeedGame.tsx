import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Star, Volume2 } from "lucide-react";
import { Art } from "../../Art";
import type { Item } from "../../types";
import { VOICE_CUES } from "../../useSpeaker";
import type { PracticeItem } from "../../usePracticeItem";
import { sfx, unlockSfx } from "../sfx";
import type { Say } from "../useSay";
import { Basket, Burst } from "./Scenes";

/** Pause after พี่ปู's praise ends, before the next item opens by itself. */
const BEAT_AFTER_MS = 600;
/** Shortest time the child sees the reaction, even when there is no praise clip. */
const MIN_REACTION_MS = 1500;
/** Longest wait for พี่ปู's line before moving on anyway (a clip that never reports its end). */
const MAX_VOICE_WAIT_MS = 6000;
/** Pictures พี่ปู eats; anything else goes into the basket. */
const FOOD = new Set(["banana", "coconut", "mangosteen", "rice", "fish", "shrimp"]);

type Flight = { art: string; label: string; letter: boolean; x: number; y: number; w: number; h: number; dx: number; dy: number; scale: number };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Listen and choose (picture and letter choices): พี่ปู says a word, the child taps the matching picture
 * and it flies to พี่ปู — food is eaten, anything else drops into the basket. A first wrong tap only
 * replays the sound; the second shows the right picture and is saved as "still practising".
 * The saved attempt is the same as the classic screen's "บันทึกคำตอบ".
 */
export function FeedGame({ item, practice, say, onNext }: { item: Item; practice: PracticeItem; say: Say; onNext: () => void }) {
  const letters = item.choices?.every((c) => c.art === "letter") ?? false;
  const answer = item.choices?.find((c) => c.id === item.answer);
  const food = !letters && !!answer && FOOD.has(answer.art);
  const [picked, setPicked] = useState<string | null>(practice.saved?.choiceId ?? null);
  const [shaking, setShaking] = useState<string | null>(null);
  const [wrong, setWrong] = useState(0);
  const [flight, setFlight] = useState<Flight | null>(null);
  /** The picture has reached พี่ปู: eaten, or sitting in the basket. */
  const [arrived, setArrived] = useState(!!practice.saved?.choiceCorrect);
  const [line, setLine] = useState(letters ? "ฟังให้ดี แล้วแตะตัวอักษรที่ได้ยินนะ" : "ฟังให้ดี แล้วส่งภาพที่ได้ยินให้พี่ปูนะ");
  const target = useRef<HTMLDivElement>(null);
  const landTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  /** Reopened after a pause on an item that was already answered: let the child move on by hand. */
  const [resumed] = useState(!!practice.saved);

  const speakOnOpen = useEffectEvent(() => {
    if (!practice.saved) say.say(item.sample);
  });
  useEffect(() => {
    alive.current = true;
    speakOnOpen();
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      clearTimeout(landTimer.current);
    };
  }, []);

  const moveOn = (delay: number) => {
    if (!alive.current) return;
    timer.current = setTimeout(() => alive.current && onNext(), delay);
  };

  const launch = (id: string, button: HTMLElement) => {
    const choice = item.choices?.find((c) => c.id === id);
    const pic = button.querySelector("svg, .kw-letter") ?? button;
    const from = pic.getBoundingClientRect();
    const to = target.current?.getBoundingClientRect();
    if (!choice || !to) {
      setArrived(true);
      return;
    }
    const size = Math.min(to.width * 0.55, 90);
    setFlight({
      art: choice.art,
      label: choice.label,
      letter: choice.art === "letter",
      x: from.left,
      y: from.top,
      w: from.width,
      h: from.height,
      dx: to.left + to.width / 2 - (from.left + from.width / 2),
      dy: to.top + to.height * (food ? 0.35 : 0.62) - (from.top + from.height / 2),
      scale: size / Math.max(from.width, 1),
    });
    sfx("whoosh");
    // If the flight animation cannot run (motion turned off somewhere), land anyway.
    landTimer.current = setTimeout(() => alive.current && land(), 1100);
  };

  const land = () => {
    if (!landTimer.current) return;
    clearTimeout(landTimer.current);
    landTimer.current = undefined;
    setFlight(null);
    setArrived(true);
    sfx(food ? "chomp" : "plop");
    setTimeout(() => sfx("twinkle"), 260);
  };

  const tap = async (id: string, button: HTMLElement) => {
    if (practice.saved || picked !== null || practice.assessmentBusy) return;
    unlockSfx();
    if (id === item.answer) {
      setPicked(id);
      setLine(food ? "ง่ำ ง่ำ อร่อยจัง! ใช่เลย" : letters ? "ใช่เลย! เก่งมาก" : "ขอบคุณจ้า ใช่อันนี้เลย!");
      launch(id, button);
      const praise = Promise.race([say.say(VOICE_CUES.success), wait(MAX_VOICE_WAIT_MS)]);
      await Promise.all([practice.save({ choice: id }), praise, wait(MIN_REACTION_MS)]);
      moveOn(BEAT_AFTER_MS);
    } else if (wrong === 0) {
      setWrong(1);
      setShaking(id);
      practice.setRetries((r) => r + 1);
      setLine("ไม่ใช่อันนี้นะ ฟังอีกที");
      sfx("nope");
      say.say(VOICE_CUES.retry, item.sample);
      timer.current = setTimeout(() => alive.current && setShaking(null), 600);
    } else {
      setWrong(2);
      setPicked(id);
      setLine("อันนี้ต่างหาก ฟังอีกทีนะ");
      sfx("nope");
      const listen = Promise.race([say.say(item.sample), wait(MAX_VOICE_WAIT_MS)]);
      await Promise.all([practice.save({ choice: id }), listen, wait(MIN_REACTION_MS + 600)]);
      moveOn(BEAT_AFTER_MS + 300);
    }
  };

  const pu = picked === null ? (shaking ? "no" : "") : picked === item.answer ? (arrived ? (food ? "eat" : "cheer") : "wait") : "show";
  return (
    <div className="kw-stage">
      <div className="kw-feed-top">
        <div ref={target} className={`kw-feed-pu ${pu}`}>
          <span className="kw-feed-crab">
            <Art kind="crab" label="พี่ปู" />
          </span>
          <Basket />
          {arrived && answer && !food && (
            <span className="kw-in-basket" aria-hidden="true">
              {answer.art === "letter" ? <span className="kw-letter">{answer.label}</span> : <Art kind={answer.art} label="" />}
            </span>
          )}
          {arrived && (
            <span className="kw-feed-party">
              <Burst count={food ? 10 : 14} colors={food ? ["#F5C77A", "#E8A34B", "#FFE6A8"] : undefined} spread={food ? 0.6 : 1} />
            </span>
          )}
        </div>
        <button type="button" className="kw-bubble" onClick={() => say.say(item.sample)} aria-label={`${line} แตะเพื่อฟังอีกครั้ง`}>
          <span className="kw-spk">
            <Volume2 /> แตะเพื่อฟังซ้ำ
          </span>
          {line}
        </button>
      </div>
      <div className="kw-pics">
        {item.choices?.map((opt) => {
          const state =
            picked === null
              ? shaking === opt.id ? "miss" : ""
              : opt.id === item.answer ? (picked === item.answer ? "hit sent" : "hit") : "dim";
          return (
            <button
              key={opt.id}
              type="button"
              className={`kw-pic ${state}`}
              onClick={(e) => void tap(opt.id, e.currentTarget)}
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
      {arrived && picked === item.answer && (
        <div className="kw-stars pop" aria-label="ได้ดาว 1 ดวง">
          <Star />
        </div>
      )}
      {resumed ? (
        <button type="button" className="kw-btn go big" onClick={onNext}>
          ไปต่อ
          <ArrowRight />
        </button>
      ) : (
        <div className="kw-sub">{picked !== null ? "ไปข้อต่อไปเอง…" : letters ? "แตะตัวอักษรที่ได้ยิน" : "แตะภาพที่ได้ยิน"}</div>
      )}
      {flight && (
        <span
          className="kw-flight"
          style={
            {
              left: flight.x,
              top: flight.y,
              width: flight.w,
              height: flight.h,
              "--dx": `${flight.dx}px`,
              "--dy": `${flight.dy}px`,
              "--s": flight.scale,
            } as CSSProperties
          }
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) land();
          }}
          aria-hidden="true"
        >
          <span className="kw-flight-y">{flight.letter ? <span className="kw-letter">{flight.label}</span> : <Art kind={flight.art} label="" />}</span>
        </span>
      )}
    </div>
  );
}
