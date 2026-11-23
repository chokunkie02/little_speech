import { useEffect, useEffectEvent, useState, type CSSProperties } from "react";
import { ArrowRight, BookOpen, Check, LogOut, Mic, Play, RotateCcw, Star } from "lucide-react";
import { Art } from "../Art";
import type { Session, Stage } from "../types";
import { VOICE_CUES, useSpeaker } from "../useSpeaker";
import { GAME_INFO, gameFor, type KidGame } from "./games";
import { AdultBar, KidShell, Mascot } from "./KidShell";
import { MouthCartoon } from "./mouths";
import { useSay } from "./useSay";
import { useTapMode } from "./preferences";
import { Basket } from "./games/Scenes";

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
 * Adventure map: the kid's home. Stations already played carry a star, พี่ปู stands on the next one.
 * Every station can be played (adults skip ahead as before); the gold button goes to the next one.
 */
export function KidMap({
  stages,
  done,
  next,
  stars,
  sound,
  onPick,
  onGo,
  onExit,
}: {
  stages: Stage[];
  /** Stage ids finished in the current plan. */
  done: Set<string>;
  next: Stage;
  stars: number;
  sound: string;
  onPick: (stage: Stage) => void;
  onGo: () => void;
  onExit: () => void;
}) {
  const speaker = useSpeaker();
  const say = useSay(speaker);
  const greet = useEffectEvent(() => void say.say(VOICE_CUES.welcome));
  useEffect(() => greet(), []);
  const nextGame = GAME_INFO[stageGame(next)];
  return (
    <KidShell
      label="แผนที่ผจญภัย"
      right={
        <span className="kw-count" aria-label={`ดาวสะสม ${stars} ดวง`}>
          <Star />
          {stars}
        </span>
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
        <div className="kw-map">
          <svg className="kw-trail kw-trail-p" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d={trail(stages.length, false)} />
          </svg>
          <svg className="kw-trail kw-trail-d" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d={trail(stages.length, true)} />
          </svg>
          {stages.map((stage, i) => {
            const isNext = stage.id === next.id;
            const finished = done.has(stage.id);
            return (
              <button
                key={stage.id}
                type="button"
                className={`kw-node${finished ? " done" : ""}${isNext ? " now" : ""}`}
                style={place(i, stages.length)}
                onClick={() => onPick(stage)}
                aria-label={`${GAME_INFO[stageGame(stage)].name}${finished ? " เล่นแล้ว" : ""}${isNext ? " ด่านต่อไป" : ""}`}
              >
                {isNext && <Art kind="crab" className="kw-here" label="" />}
                <span className="kw-disc">
                  <GameIcon game={stageGame(stage)} />
                  {finished && (
                    <span className="kw-badge">
                      <Star />
                    </span>
                  )}
                </span>
                <span className="kw-node-name">{GAME_INFO[stageGame(stage)].name}</span>
              </button>
            );
          })}
        </div>
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
  onAdult,
  onMap,
}: {
  session: Session;
  onAgain: () => void;
  onNext: () => void;
  nextLabel: string;
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
          <Art kind="crab" className="kw-pu big" label="พี่ปูดีใจ" />
          <div className="kw-stars" aria-label={`ได้ดาว ${stars} ดวง`}>
            {Array.from({ length: stars }, (_, i) => (
              <Star key={i} />
            ))}
          </div>
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
