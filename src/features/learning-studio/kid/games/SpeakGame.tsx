import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Lightbulb, Play, RotateCcw, SkipForward, Smile, Star } from "lucide-react";
import { Art } from "../../Art";
import type { Item } from "../../types";
import type { PracticeItem } from "../../usePracticeItem";
import { splitWords, stonesFor, type PlayMode } from "../games";
import { AdultBar, Mascot } from "../KidShell";
import { HoldToTalk, SaidItButton } from "../HoldToTalk";
import { MouthCartoon, ModelMouth, mouthSteps, type Pose } from "../mouths";
import { useVoiceActivity } from "../useVoiceActivity";
import type { Say } from "../useSay";

export type SpeakKind = "mirror" | "card" | "stones" | "train";
type Phase = "model" | "turn" | "echo";

/** A recording with less voice than this is treated as "did not hear you" (taps, breath, room noise). */
const MIN_VOICE_MS = 220;
/** How long each mouth beat stays on พี่ปู's mirror while the example plays. */
const BEAT_MS = 900;
/** After this many "ฝึกอีก" the adult's middle button becomes "ยังต้องฝึก" and saves. */
const MAX_RETRIES = 2;

/**
 * Speaking items. One flow for every speaking game: พี่ปู shows or says the target (model), the child
 * holds the mic and speaks (turn), then both voices can be played back (echo). The adult result (play
 * together) or "ไปต่อ" (play alone) saves the attempt through the same save() as the classic screen.
 */
export function SpeakGame({
  kind,
  item,
  sound,
  practice,
  say,
  mode,
  tapOnly,
  onNext,
}: {
  kind: SpeakKind;
  item: Item;
  sound: string;
  practice: PracticeItem;
  say: Say;
  mode: PlayMode;
  /** Adult chose tap mode, or the microphone could not be used. */
  tapOnly: boolean;
  onNext: () => void;
}) {
  const steps = mouthSteps(sound, item.sample);
  const vowel = steps[1].pose;
  const showsModel = kind !== "card";
  const [modelling, setModelling] = useState(showsModel && !practice.saved);
  const [beat, setBeat] = useState(0);
  const [tapped, setTapped] = useState(false);
  const [busy, setBusy] = useState(false);
  // Kept apart from `practice`: an object whose callback is used as a ref cannot be read while rendering.
  const { attachPlayer } = practice;
  const voice = useVoiceActivity(practice.stream);
  const heard = !voice || voice.voicedMs >= MIN_VOICE_MS;
  const answered = (!!practice.audio && heard) || tapped;
  const phase: Phase = modelling ? "model" : answered || practice.saved ? "echo" : "turn";
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** Speaks the example and steps the mouth beats; the caller has already shown beat 0. */
  const runModel = () => {
    timers.current.forEach(clearTimeout);
    say.say(item.sample);
    timers.current = [
      setTimeout(() => setBeat(1), BEAT_MS),
      setTimeout(() => setBeat(2), BEAT_MS * 2),
      setTimeout(() => setModelling(false), BEAT_MS * 3),
    ];
  };
  const playModel = () => {
    setBeat(0);
    setModelling(true);
    runModel();
  };
  // Initial state already shows the first beat, so opening only starts the voice and timers.
  const openItem = useEffectEvent(() => {
    if (practice.saved) return;
    if (showsModel) runModel();
    else say.say(item.instruction);
  });
  useEffect(() => {
    openItem();
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);
  // Play the child's own voice back once, right after a good recording.
  const echoOnce = useEffectEvent(() => practice.playRecording());
  useEffect(() => {
    if (practice.audio && heard) echoOnce();
  }, [practice.audio, heard]);

  const finish = async (review?: "achieved" | "practice") => {
    if (busy) return;
    setBusy(true);
    say.hush();
    await practice.save({ review, demo: tapped || undefined });
    onNext();
  };
  const tryAgain = () => {
    practice.resetAudio();
    setTapped(false);
    if (showsModel) playModel();
  };

  const kidMouth: Pose = phase === "echo" ? vowel : voice?.speaking ? vowel : "closed";
  const word = <div className="kw-word">{item.prompt}</div>;

  /* ── Picture area for each game ── */
  let visual: ReactNode;
  if (kind === "mirror") {
    const modelOn = phase !== "turn";
    visual = (
      <>
        <div className="kw-mirrors">
          <div className={`kw-mirror ${modelOn ? "on" : "off"}`}>
            <div className="kw-glass">
              <ModelMouth pose={phase === "model" ? steps[beat].pose : phase === "echo" ? vowel : "smile"} />
            </div>
            <span className="kw-name">พี่ปู</span>
          </div>
          <div className={`kw-mirror ${phase === "model" ? "off" : "on"}`}>
            <div className="kw-glass">
              {phase === "model" ? <span className="kw-q">?</span> : <MouthCartoon pose={kidMouth} title="เพื่อนในกระจกขยับปากตามเสียงหนู" fill />}
            </div>
            <span className="kw-name">หนู</span>
          </div>
        </div>
        {phase === "model" && (
          <div className="kw-strip" aria-label="จังหวะปาก">
            {steps.map((s, i) => (
              <span key={s.label} style={{ display: "contents" }}>
                {i > 0 && <span className="kw-arr">›</span>}
                <figure className={i === beat ? "on" : ""}>
                  <MouthCartoon pose={s.pose} title={s.label} />
                  {s.label}
                </figure>
              </span>
            ))}
          </div>
        )}
      </>
    );
  } else if (kind === "card") {
    visual = (
      <div className="kw-card">
        <Art kind={item.art} label={phase === "echo" ? item.prompt : "ภาพปริศนา"} />
      </div>
    );
  } else {
    const parts = kind === "stones" ? stonesFor(item) : splitWords(item.prompt);
    visual = (
      <div className="kw-chips" aria-label={item.prompt}>
        {parts.map((p, i) => (
          <span key={`${p}-${i}`} className={`kw-chip-word${phase === "echo" || (kind === "stones" && !!item.segments?.length && i === parts.length - 1) ? " on" : ""}`}>
            {p}
          </span>
        ))}
      </div>
    );
  }

  const line =
    phase === "model"
      ? kind === "mirror" ? "ดูกระจกพี่ปูนะ แล้วพูดตาม" : kind === "stones" ? "ฟังพี่ปูก่อน แล้วพูดทีละก้อนนะ" : "ฟังพี่ปูก่อน แล้วพูดให้ต่อกันนะ"
      : phase === "turn"
        ? kind === "card" ? "นี่คืออะไรเอ่ย? บอกพี่ปูหน่อย" : "ถึงตาหนูแล้ว!"
        : kind === "mirror" ? "กระจกวิ้ง! เก่งมาก" : "เก่งมาก!";

  const actions =
    phase === "model" ? (
      <span className="kw-turn">
        <i />
        ฟังพี่ปูก่อน…
      </span>
    ) : phase === "turn" ? (
      <>
        {!practice.recording && practice.audio && !heard && <div className="kw-note">ไม่ได้ยินเสียงเลย กดค้างแล้วพูดอีกครั้งนะ</div>}
        {tapOnly ? (
          <SaidItButton onSaid={() => setTapped(true)} />
        ) : (
          <HoldToTalk recorder={practice} level={voice?.level ?? 0} label={kind === "card" ? "กดค้างแล้วบอกชื่อภาพ" : `กดค้างแล้วพูด "${item.prompt}"`} />
        )}
        {kind === "card" && (
          <button type="button" className="kw-link" onClick={() => { practice.setSupport("modeled"); say.say(item.sample); }}>
            <Lightbulb size={15} style={{ verticalAlign: "-2px" }} /> นึกไม่ออก? ให้พี่ปูใบ้
          </button>
        )}
      </>
    ) : (
      <>
        <div className="kw-stars" aria-label="ได้ดาว 1 ดวง">
          <Star />
        </div>
        {kind === "card" && word}
        <div className="kw-row">
          <button type="button" className="kw-btn" onClick={() => say.say(item.sample)}>
            <Play />
            ฟังพี่ปู
          </button>
          {practice.audio && (
            <button type="button" className="kw-btn" onClick={practice.playRecording}>
              <Play />
              ฟังหนู
            </button>
          )}
        </div>
        {(mode === "alone" || practice.saved) && (
          <button type="button" className="kw-btn go big" onClick={() => (practice.saved ? onNext() : void finish())} disabled={busy}>
            ไปต่อ
            <ArrowRight />
          </button>
        )}
      </>
    );

  return (
    <>
      <div className="kw-split">
        <div className="kw-col">
          {visual}
          {phase !== "echo" && kind !== "card" && word}
        </div>
        <div className="kw-col">
          <Mascot text={line} onReplay={() => (showsModel ? playModel() : say.say(item.instruction))} />
          {actions}
          {practice.assessmentMessage && <div className="kw-note">{practice.assessmentMessage}</div>}
        </div>
      </div>
      {practice.audio && (
        <audio ref={attachPlayer} src={practice.audio} preload="auto" aria-label="เสียงของหนู" />
      )}
      {phase === "echo" && mode === "together" && !practice.saved && (
        <AdultBar head="ผู้ใหญ่ฟังแล้ว เด็กพูดเป็นอย่างไร">
          <div className="kw-faces">
            <button type="button" className="yes" onClick={() => void finish("achieved")} disabled={busy}>
              <Smile />
              ทำได้
            </button>
            {practice.retries < MAX_RETRIES ? (
              <button type="button" onClick={tryAgain} disabled={busy}>
                <RotateCcw />
                ฝึกอีก
              </button>
            ) : (
              <button type="button" onClick={() => void finish("practice")} disabled={busy}>
                <RotateCcw />
                ยังต้องฝึก
              </button>
            )}
            <button type="button" onClick={() => void finish()} disabled={busy} title="บันทึกไว้ตรวจทีหลัง">
              <SkipForward />
              ข้าม
            </button>
          </div>
        </AdultBar>
      )}
    </>
  );
}
