import { useEffect, useEffectEvent, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, Award, BookOpen, ChartColumn, Check, LogOut, Map as MapIcon, Mic, Play, RotateCcw, Star } from "lucide-react";
import { Art } from "../Art";
import type { Attempt, Session, Stage } from "../types";
import { VOICE_CUES, useSpeaker } from "../useSpeaker";
import { GAME_INFO, gameFor, type KidGame } from "./games";
import { AdultBar, KidShell, Mascot } from "./KidShell";
import { MouthCartoon } from "./mouths";
import { useSay } from "./useSay";
import { useTapMode } from "./preferences";
import { Basket, Burst } from "./games/Scenes";
import { RoundStickers } from "./StickerBook";
import { sfx, unlockSfx } from "./sfx";

/** Small picture for a station on the map and on the start screen. */
export function GameIcon({ game }: { game: KidGame }) {
  switch (game) {
    case "feed":
      return <Basket />;
    case "mirror":
      return <MouthCartoon pose="open" title="" />;
    case "stones":
      return (
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <ellipse cx="9" cy="28" rx="8" ry="5" fill="#7DDBB0" />
          <ellipse cx="22" cy="21" rx="8" ry="5" fill="#E1E4F2" />
          <ellipse cx="33" cy="13" rx="6" ry="4" fill="#F5C77A" />
        </svg>
      );
    case "card":
      return (
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <rect x="8" y="5" width="24" height="30" rx="5" fill="#5548D4" stroke="#C3BBFF" strokeWidth="2" />
          <polygon points="20 12 22.4 17 27.8 17.6 23.8 21.2 24.9 26.6 20 23.9 15.1 26.6 16.2 21.2 12.2 17.6 17.6 17" fill="#FFD58A" />
        </svg>
      );
    case "train":
      return (
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <rect x="3" y="14" width="16" height="12" rx="3" fill="#E8735A" />
          <rect x="11" y="8" width="8" height="10" rx="2" fill="#D35F48" />
          <rect x="21" y="16" width="16" height="10" rx="3" fill="#FFD58A" />
          <circle cx="8" cy="28" r="3" fill="#C3BBFF" />
          <circle cx="16" cy="28" r="3" fill="#C3BBFF" />
          <circle cx="26" cy="28" r="3" fill="#C3BBFF" />
          <circle cx="33" cy="28" r="3" fill="#C3BBFF" />
        </svg>
      );
    default:
      return <Art kind="crab-box" label="" />;
  }
}
const stageGame = (stage: Stage): KidGame => (stage.items[0] ? gameFor(stage.items[0]) : "card");

/** Station positions: a zigzag up the phone screen, left to right across a wide screen. */
const place = (i: number, n: number) => {
  const t = n > 1 ? i / (n - 1) : 0.5;
  return {
    "--x-p": `${i % 2 ? 72 : 27}%`,
    "--y-p": `${90 - t * 82}%`,
    "--x-d": `${7 + t * 86}%`,
    "--y-d": `${i % 2 ? 30 : 72}%`,
  } as CSSProperties;
};
const trail = (n: number, wide: boolean) =>
  Array.from({ length: n }, (_, i) => {
    const t = n > 1 ? i / (n - 1) : 0.5;
    const [x, y] = wide ? [7 + t * 86, i % 2 ? 30 : 72] : [i % 2 ? 72 : 27, 90 - t * 82];
    if (!i) return `M${x} ${y}`;
    const tp = (i - 1) / (n - 1);
    const [px, py] = wide ? [7 + tp * 86, (i - 1) % 2 ? 30 : 72] : [(i - 1) % 2 ? 72 : 27, 90 - tp * 82];
    return wide ? ` C${(px + x) / 2} ${py} ${(px + x) / 2} ${y} ${x} ${y}` : ` C${px} ${(py + y) / 2} ${x} ${(py + y) / 2} ${x} ${y}`;
  }).join("");

/**
 * The trail and its stations. `here` is where พี่ปู stands (left out while the cutscene moves him);
 * `onPick` makes stations tappable.
 */
function MapBoard({
  stages,
  done,
  here,
  glow,
  onPick,
  children,
}: {
  stages: Stage[];
  done: Set<string>;
  here?: string;
  /** Station to light up as the next one. */
  glow?: string;
  onPick?: (stage: Stage) => void;
  children?: ReactNode;
}) {
  return (
    <div className="kw-map">
      <svg className="kw-trail kw-trail-p" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={trail(stages.length, false)} />
      </svg>
      <svg className="kw-trail kw-trail-d" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={trail(stages.length, true)} />
      </svg>
      {stages.map((stage, i) => {
        const isNext = stage.id === glow;
        const finished = done.has(stage.id);
        const name = GAME_INFO[stageGame(stage)].name;
        const inner = (
          <>
            {stage.id === here && <Art kind="crab" className="kw-here" label="" />}
            <span className="kw-disc">
              <GameIcon game={stageGame(stage)} />
              {finished && (
                <span className="kw-badge">
                  <Star />
                </span>
              )}
            </span>
            <span className="kw-node-name">{name}</span>
          </>
        );
        const className = `kw-node${finished ? " done" : ""}${isNext ? " now" : ""}`;
        return onPick ? (
          <button
            key={stage.id}
            type="button"
            className={className}
            style={place(i, stages.length)}
            onClick={() => onPick(stage)}
            aria-label={`${name}${finished ? " เล่นแล้ว" : ""}${isNext ? " ด่านต่อไป" : ""}`}
          >
            {inner}
          </button>
        ) : (
          <span key={stage.id} className={className} style={place(i, stages.length)}>
            {inner}
          </span>
        );
      })}
      {children}
    </div>
  );
}

/** The welcome plays once per visit, not every time the child comes back to the map. */
const GREETED_KEY = "speech-adventure:map-greeted";
function firstVisit() {
  try {
    if (sessionStorage.getItem(GREETED_KEY) === "1") return false;
    sessionStorage.setItem(GREETED_KEY, "1");
  } catch {
    // Storage blocked: greet every time, as before.
  }
  return true;
}

/**
 * Adventure map: the kid's home. Stations already played carry a star, พี่ปู stands on the next one.
 * Every station can be played (adults skip ahead as before); the gold button goes to the next one.
 */
export function KidMap({
  stages,
  done,
  next,
  stars,
  sound,
  newStickers = false,
  onPick,
  onGo,
  onBook,
  onExit,
}: {
  stages: Stage[];
  /** Stage ids finished in the current plan. */
  done: Set<string>;
  next: Stage;
  stars: number;
  sound: string;
  /** Stickers the child has not seen in the book yet: a dot on the book button. */
  newStickers?: boolean;
  onPick: (stage: Stage) => void;
  onGo: () => void;
  onBook: () => void;
  onExit: () => void;
}) {
  const speaker = useSpeaker();
  const say = useSay(speaker);
  const greet = useEffectEvent(() => {
    if (firstVisit()) void say.say(VOICE_CUES.welcome);
  });
  useEffect(() => greet(), []);
  const nextGame = GAME_INFO[stageGame(next)];
  return (
    <KidShell
      label="แผนที่ผจญภัย"
      right={
        <>
          <span className="kw-count" aria-label={`ดาวสะสม ${stars} ดวง`}>
            <Star />
            {stars}
          </span>
          <button type="button" className="kw-ibtn kw-book-btn" onClick={onBook} aria-label={newStickers ? "สมุดสติกเกอร์ มีสติกเกอร์ใหม่" : "สมุดสติกเกอร์"}>
            <BookOpen />
            {newStickers && <i className="kw-dot" />}
          </button>
        </>
      }
      adultActions={[{ label: "กลับหน้าหลักของผู้ใหญ่", icon: <LogOut />, onSelect: onExit }]}
      adultNote={<p>ทุกด่านกดเล่นได้ ด่านที่เล่นจบแล้วมีดาว · ปรับระดับและชุดฝึกได้ที่หน้าหลักของผู้ใหญ่</p>}
    >
      <div className="kw-map-wrap">
        <div className="kw-sound" aria-label={`เสียงที่ฝึก ${sound}`}>
          {sound}
          <small>เสียงที่ฝึก</small>
        </div>
        <Mascot text={`วันนี้ไป${nextGame.name}กัน!`} onReplay={() => say.say(VOICE_CUES.welcome)} replayLabel="พี่ปูพูดให้ฟัง" />
        <MapBoard stages={stages} done={done} here={next.id} glow={next.id} onPick={onPick} />
        <button type="button" className="kw-btn gold big" onClick={onGo}>
          <Play />
          ไปต่อ
        </button>
      </div>
    </KidShell>
  );
}

/**
 * Round start (replaces the adult dialog on the kid screens): the game's picture and one gold button.
 * Adults can wake the microphone here, so the browser asks before the child's first hold.
 */
export function KidStart({ stage, onStart, onBack }: { stage: Stage; onStart: () => void; onBack: () => void }) {
  const game = stageGame(stage);
  const speaks = stage.items.some((i) => i.kind === "speech");
  const [mic, setMic] = useState<"idle" | "asking" | "ready" | "blocked">("idle");
  const [, setTapOnly] = useTapMode();
  const testMic = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMic("blocked");
      setTapOnly(true);
      return;
    }
    setMic("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMic("ready");
      setTapOnly(false);
    } catch {
      // The screen says the game will use taps instead: make it so for this visit.
      setMic("blocked");
      setTapOnly(true);
    }
  };
  return (
    <KidShell label={`เริ่ม${GAME_INFO[game].name}`} onPause={onBack}>
      <div className="kw-split">
        <div className="kw-col">
          <div className="kw-card kw-card-icon">
            <GameIcon game={game} />
          </div>
        </div>
        <div className="kw-col">
          <div className="kw-title">{GAME_INFO[game].name}</div>
          <Mascot text={GAME_INFO[game].line} />
          <button type="button" className="kw-btn gold big" onClick={onStart}>
            <Play />
            เริ่มเลย
          </button>
        </div>
      </div>
      <AdultBar
        head={
          speaks
            ? mic === "ready"
              ? "ไมค์พร้อมแล้ว · เด็กกดค้างที่ไมค์แล้วพูด เสียงไม่ถูกเก็บถาวร"
              : mic === "blocked"
                ? "เปิดไมค์ไม่ได้ เกมจะใช้แบบแตะจอแทน เปิดสิทธิ์ไมค์ได้ที่การตั้งค่าเบราว์เซอร์"
                : "ผู้ใหญ่: เด็กกดค้างที่ไมค์แล้วพูด ครั้งแรกเบราว์เซอร์จะขออนุญาตใช้ไมค์"
            : `ผู้ใหญ่: ${stage.label} · เด็กแตะภาพตามเสียงที่ได้ยิน`
        }
      >
        {speaks && mic !== "ready" && mic !== "blocked" && (
          <div className="kw-faces">
            <button type="button" onClick={() => void testMic()} disabled={mic === "asking"}>
              <Mic />
              {mic === "asking" ? "กำลังขอสิทธิ์…" : "ทดสอบไมค์ก่อนเริ่ม"}
            </button>
          </div>
        )}
        {mic === "ready" && (
          <div className="kw-faces">
            <button type="button" className="yes" disabled>
              <Check />
              ไมค์พร้อม
            </button>
          </div>
        )}
      </AdultBar>
    </KidShell>
  );
}

/** End of round for the child: celebration and two big choices. The adult result page is one tap away. */
export function KidRoundEnd({
  session,
  onAgain,
  onNext,
  nextLabel,
  roundStickers = [],
  freshStickers = [],
  onBook,
  onAdult,
  onMap,
}: {
  session: Session;
  onAgain: () => void;
  onNext: () => void;
  nextLabel: string;
  /** Stickers this round's pictures give, and which of them are new to the book. */
  roundStickers?: string[];
  freshStickers?: string[];
  onBook: () => void;
  onAdult: () => void;
  onMap: () => void;
}) {
  const speaker = useSpeaker();
  const say = useSay(speaker);
  const cheer = useEffectEvent(() => {
    window.dispatchEvent(new CustomEvent("speech-adventure:chime", { detail: "complete" }));
    say.say(VOICE_CUES.complete);
  });
  useEffect(() => cheer(), []);
  const stars = Math.max(1, Math.min(3, session.attempts.length));
  return (
    <KidShell label="จบภารกิจ" onPause={onMap}>
      <div className="kw-split">
        <div className="kw-col">
          <Art kind="crab" className={`kw-pu ${roundStickers.length ? "mid" : "big"}`} label="พี่ปูดีใจ" />
          {roundStickers.length ? (
            <RoundStickers kinds={roundStickers} fresh={freshStickers} onOpen={onBook} />
          ) : (
            <div className="kw-stars" aria-label={`ได้ดาว ${stars} ดวง`}>
              {Array.from({ length: stars }, (_, i) => (
                <Star key={i} />
              ))}
            </div>
          )}
        </div>
        <div className="kw-col">
          <div className="kw-title">ภารกิจสำเร็จ!</div>
          <div className="kw-sub">ได้ดาว {stars} ดวง</div>
          <div className="kw-row">
            <button type="button" className="kw-btn" onClick={onAgain}>
              <RotateCcw />
              เล่นอีก
            </button>
            <button type="button" className="kw-btn gold" onClick={onNext}>
              {nextLabel}
              <ArrowRight />
            </button>
          </div>
        </div>
      </div>
      <AdultBar head="ผู้ใหญ่: ดูผลรอบนี้และคำแนะนำ">
        <div className="kw-faces">
          <button type="button" onClick={onAdult}>
            <BookOpen />
            ดูผลรอบนี้
          </button>
        </div>
      </AdultBar>
    </KidShell>
  );
}

/* ─────────────── Between stages: พี่ปู hops along the trail ─────────────── */

/** Timings of the cutscene, in ms from the start. */
const TRAVEL = { hop: 500, land: 1700, enter: 3300, done: 3900 };

/**
 * Cutscene between two stages: the map with พี่ปู on the stage just played; he hops along the trail to
 * the next station, the station lights up with its name, the map zooms in and the next game opens.
 * A tap anywhere skips straight in.
 */
export function KidTravel({
  stages,
  done,
  from,
  to,
  onArrive,
  onMap,
}: {
  stages: Stage[];
  done: Set<string>;
  from: Stage;
  to: Stage;
  onArrive: () => void;
  onMap: () => void;
}) {
  const [step, setStep] = useState<"wait" | "hop" | "land" | "enter">("wait");
  const left = useRef(false);
  const enter = () => {
    if (left.current) return;
    left.current = true;
    onArrive();
  };
  const arrive = useEffectEvent(enter);
  useEffect(() => {
    const timers = [
      setTimeout(() => {
        setStep("hop");
        sfx("hop");
        timers.push(setTimeout(() => sfx("hop"), 380), setTimeout(() => sfx("hop"), 760));
      }, TRAVEL.hop),
      setTimeout(() => {
        setStep("land");
        sfx("fanfare");
      }, TRAVEL.land),
      setTimeout(() => setStep("enter"), TRAVEL.enter),
      setTimeout(() => arrive(), TRAVEL.done),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);
  const at = step === "wait" ? from : to;
  const index = Math.max(
    0,
    stages.findIndex((s) => s.id === at.id),
  );
  const target = Math.max(
    0,
    stages.findIndex((s) => s.id === to.id),
  );
  const game = GAME_INFO[stageGame(to)];
  return (
    <KidShell label={`ไปด่านต่อไป ${game.name}`} onPause={onMap}>
      <div
        className={`kw-map-wrap kw-travel ${step}`}
        style={place(target, stages.length)}
        onClick={() => {
          unlockSfx();
          enter();
        }}
      >
        <Mascot text={step === "wait" ? "ไปด่านต่อไปกัน!" : step === "hop" ? "ฮึบ ฮึบ ฮึบ!" : `ถึงแล้ว! ${game.name}`} />
        <MapBoard stages={stages} done={done} glow={step === "land" || step === "enter" ? to.id : undefined}>
          <span className="kw-traveller" style={place(index, stages.length)} aria-hidden="true">
            <span key={step === "hop" ? "hop" : "still"} className={step === "hop" ? "kw-triple-hop" : ""}>
              <Art kind="crab" label="" />
            </span>
            {step === "land" && <Burst count={14} />}
          </span>
        </MapBoard>
        <div className="kw-sub">{step === "land" || step === "enter" ? game.line : "แตะเพื่อเข้าด่านเลย"}</div>
      </div>
    </KidShell>
  );
}

/* ─────────────── End of the whole adventure ─────────────── */

const achieved = (a: Attempt) => a.review === "achieved" || a.choiceCorrect === true;

/** Gold cup for the end of the adventure. */
function Trophy() {
  return (
    <svg className="kw-trophy" viewBox="0 0 160 170" aria-hidden="true">
      <path d="M40 30 H20 Q8 30 10 46 Q14 74 46 80" fill="none" stroke="#E8A325" strokeWidth="9" strokeLinecap="round" />
      <path d="M120 30 H140 Q152 30 150 46 Q146 74 114 80" fill="none" stroke="#E8A325" strokeWidth="9" strokeLinecap="round" />
      <path d="M36 18 H124 V52 Q124 98 80 104 Q36 98 36 52 Z" fill="#FFD25E" stroke="#C98B1C" strokeWidth="4" strokeLinejoin="round" />
      <path d="M50 26 V54 Q50 78 66 88" fill="none" stroke="#FFF1C2" strokeWidth="7" strokeLinecap="round" opacity=".8" />
      <rect x="70" y="102" width="20" height="26" fill="#E8A325" stroke="#C98B1C" strokeWidth="4" />
      <path d="M46 128 H114 L120 154 H40 Z" fill="#7B6CF6" stroke="#4A3DC8" strokeWidth="4" strokeLinejoin="round" />
      <rect x="62" y="136" width="36" height="10" rx="3" fill="#FFD25E" />
      <polygon points="80 36 86 50 101 51 89 61 93 76 80 67 67 76 71 61 59 51 74 50" fill="#FFF6D8" stroke="#E8A325" strokeWidth="2" />
    </svg>
  );
}

/**
 * After the last stage: the whole adventure at a glance. The child sees the trophy and every station
 * with its stars; the adult sees how each stage went (done well / still practising / waiting for review)
 * and can open the full results.
 */
export function KidFinale({
  stages,
  latest,
  stickers,
  onPrint,
  onAgain,
  onPick,
  onMap,
  onAdult,
}: {
  stages: Stage[];
  /** Most recent finished round of each stage in this plan. */
  latest: Map<string, Session>;
  /** Stickers in the book. */
  stickers: number;
  /** Adult: print the certificate. */
  onPrint: () => void;
  onAgain: () => void;
  /** Play a station that was skipped. */
  onPick: (stage: Stage) => void;
  onMap: () => void;
  onAdult: () => void;
}) {
  const speaker = useSpeaker();
  const say = useSay(speaker);
  const cheer = useEffectEvent(() => {
    sfx("fanfare");
    window.dispatchEvent(new CustomEvent("speech-adventure:chime", { detail: "complete" }));
    void say.say(VOICE_CUES.complete);
  });
  useEffect(() => cheer(), []);
  const rows = stages.map((stage) => {
    const round = latest.get(stage.id);
    const attempts = round?.attempts ?? [];
    return {
      stage,
      played: !!round,
      stars: round ? Math.max(1, Math.min(3, attempts.length)) : 0,
      good: attempts.filter(achieved).length,
      waiting: attempts.filter((a) => !achieved(a) && a.review === "pending").length,
      total: attempts.length,
    };
  });
  const missed = rows.filter((r) => !r.played).length;
  const all = [...latest.values()].flatMap((s) => s.attempts);
  const totals = {
    stars: rows.reduce((n, r) => n + r.stars, 0),
    good: all.filter(achieved).length,
    practice: all.filter((a) => !achieved(a) && a.review !== "pending").length,
    pending: all.filter((a) => !achieved(a) && a.review === "pending").length,
    total: all.length,
  };
  return (
    <KidShell label="จบการผจญภัย" onPause={onMap}>
      <div className="kw-split kw-finale">
        <div className="kw-col">
          <div className="kw-trophy-wrap">
            <Trophy />
            <Burst count={20} />
          </div>
          <div className="kw-row">
            <div className="kw-total" aria-label={`ดาวทั้งหมด ${totals.stars} ดวง`}>
              <Star />
              {totals.stars}
            </div>
            <div className="kw-total" aria-label={`สติกเกอร์ ${stickers} ดวง`}>
              <BookOpen />
              {stickers}
            </div>
          </div>
        </div>
        <div className="kw-col">
          <div className="kw-title">{missed ? "ถึงด่านสุดท้ายแล้ว!" : "ผจญภัยครบทุกด่านแล้ว!"}</div>
          {missed > 0 && <div className="kw-sub">ยังมีอีก {missed} ด่านที่ยังไม่ได้เล่น แตะเพื่อไปเล่นได้เลย</div>}
          <ol className="kw-journey">
            {rows.map((r, i) => (
              <li key={r.stage.id} className={r.played ? "" : "skip"} style={{ "--i": i } as CSSProperties}>
                {!r.played && (
                  <button type="button" className="kw-journey-go" onClick={() => onPick(r.stage)} aria-label={`เล่น ${GAME_INFO[stageGame(r.stage)].name}`} />
                )}
                <span className="kw-disc">
                  <GameIcon game={stageGame(r.stage)} />
                </span>
                <span className="kw-journey-name">
                  {GAME_INFO[stageGame(r.stage)].name}
                  <small>
                    {!r.played
                      ? "ยังไม่ได้เล่น · แตะเพื่อเล่น"
                      : r.waiting
                        ? `ทำได้ ${r.good} · รอผู้ใหญ่ฟัง ${r.waiting} (จาก ${r.total} ข้อ)`
                        : `ทำได้ ${r.good} จาก ${r.total} ข้อ`}
                  </small>
                </span>
                <span className="kw-journey-stars" aria-label={`${r.stars} ดาว`}>
                  {Array.from({ length: 3 }, (_, k) => (
                    <Star key={k} className={k < r.stars ? "on" : ""} />
                  ))}
                </span>
              </li>
            ))}
          </ol>
          <div className="kw-row">
            <button type="button" className="kw-btn" onClick={onAgain}>
              <RotateCcw />
              เล่นใหม่
            </button>
            <button type="button" className="kw-btn gold" onClick={onMap}>
              <MapIcon />
              กลับแผนที่
            </button>
          </div>
        </div>
      </div>
      <AdultBar
        head={`ผู้ใหญ่: ทั้งการผจญภัย ทำได้ ${totals.good} · ยังต้องฝึก ${totals.practice} · รอผู้ใหญ่ฟัง ${totals.pending} (จาก ${totals.total} ข้อ)`}
      >
        <div className="kw-faces">
          <button type="button" onClick={onPrint}>
            <Award />
            พิมพ์ใบประกาศ
          </button>
          <button type="button" onClick={onAdult}>
            <ChartColumn />
            ดูผลการฝึกทั้งหมด
          </button>
        </div>
      </AdultBar>
    </KidShell>
  );
}
