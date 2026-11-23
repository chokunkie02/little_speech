import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Lightbulb, Play, RotateCcw, SkipForward, Smile, Star } from "lucide-react";
import { Art } from "../../Art";
import type { Item } from "../../types";
import type { PracticeItem } from "../../usePracticeItem";
import { stonesFor, trainCars, type PlayMode } from "../games";
import { AdultBar, Mascot } from "../KidShell";
import { HoldToTalk, SaidItButton } from "../HoldToTalk";
import { unlockSfx } from "../sfx";
import { StickerCard, StonesScene, TrainScene } from "./Scenes";
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
/** Stones and train: a pause this short still splits two syllables or words into two jumps. */
const STEP_RELEASE_MS = 170;
/** Stones and train: after this many tries with some voice, the crossing finishes even if bursts merged. */
const MAX_TAKES = 3;
/** Let the party play before the child's own voice is played back. */
const PARTY_MS = { stones: 1500, train: 3300 } as const;

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
  /* Stones and train move one step per burst of voice (no judging of the words: that stays with the adult). */
  const stepping = kind === "stones" || kind === "train";
  const parts = kind === "stones" ? stonesFor(item) : kind === "train" ? trainCars(item.prompt) : [];
  const [hops, setHops] = useState(practice.saved && stepping ? parts.length : 0);
  const [takes, setTakes] = useState(0);
  const voice = useVoiceActivity(practice.stream, {
    releaseMs: stepping ? STEP_RELEASE_MS : undefined,
    onBurst: stepping ? () => setHops((h) => Math.min(parts.length, h + 1)) : undefined,
  });
  const heard = !voice || voice.voicedMs >= MIN_VOICE_MS;
  const listening = practice.recording || practice.requesting;
  const crossed = stepping && !listening && (hops >= parts.length || (takes >= MAX_TAKES && hops > 0));
  const answered = stepping ? crossed : (!!practice.audio && heard) || tapped;
  const phase: Phase = modelling ? "model" : answered || practice.saved ? "echo" : "turn";
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** Speaks the example and steps the mouth beats; the caller has already shown beat 0. */
  const runModel = () => {
    timers.current.forEach(clearTimeout);
    // Hearing พี่ปู first counts as modelled support, as on the classic screen.
    practice.setSupport((s) => (s === "adult" ? s : "modeled"));
    say.say(item.sample);
    timers.current = [
      setTimeout(() => setBeat(1), BEAT_MS),
      setTimeout(() => setBeat(2), BEAT_MS * 2),
      setTimeout(() => setModelling(false), BEAT_MS * 3),
    ];
  };
  const playModel = () => {
    // พี่ปู must not talk into the child's recording.
    if (practice.recording || practice.requesting) practice.stopRecording();
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
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    openItem();
    const pending = timers.current;
    return () => {
      alive.current = false;
      pending.forEach(clearTimeout);
    };
  }, []);
  // Play the child's own voice back once, right after a good recording (after the party, for stones/train).
  const echoOnce = useEffectEvent(() => practice.playRecording());
  const partyMs = kind === "stones" || kind === "train" ? PARTY_MS[kind] : 0;
  useEffect(() => {
    if (!practice.audio || !heard || !answered) return;
    const wait = setTimeout(echoOnce, partyMs);
    return () => clearTimeout(wait);
  }, [practice.audio, heard, answered, partyMs]);
  /** HoldToTalk's recorder, counting finished tries for the stones and train fallback. */
  const recorder = {
    recording: practice.recording,
    requesting: practice.requesting,
    record: () => {
      unlockSfx();
      return practice.record();
    },
    stopRecording: () => {
      practice.stopRecording();
      if (stepping) setTakes((t) => t + 1);
    },
  };

  const finish = async (review?: "achieved" | "practice") => {
    if (busy) return;
    setBusy(true);
    say.hush();
    await practice.save({ review, demo: tapped || undefined });
    // The child may have paused while the result was being sent: then this item is gone, stay put.
    if (alive.current) onNext();
  };
  const tryAgain = () => {
    practice.resetAudio();
    setTapped(false);
    setHops(0);
    setTakes(0);
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
      <StickerCard won={phase === "echo" && !practice.saved}>
        <Art kind={item.art} label={phase === "echo" ? item.prompt : "ภาพปริศนา"} />
      </StickerCard>
    );
  } else if (kind === "stones") {
    visual = <StonesScene parts={parts} hops={hops} finished={crossed} quiet={listening || !!practice.saved} blend={!!item.segments?.length} />;
  } else {
    visual = <TrainScene parts={parts} cars={hops} finished={crossed} quiet={listening || !!practice.saved} />;
  }
  const left = parts.length - hops;

  const line =
    phase === "model"
      ? kind === "mirror" ? "ดูกระจกพี่ปูนะ แล้วพูดตาม" : kind === "stones" ? "ฟังพี่ปูก่อน แล้วพูดทีละก้อนนะ" : "ฟังพี่ปูก่อน แล้วพูดให้ต่อกันนะ"
      : phase === "turn"
        ? kind === "card"
          ? "นี่คืออะไรเอ่ย? บอกพี่ปูหน่อย"
          : kind === "stones"
            ? hops === 0
              ? "พูดทีละก้อนนะ พี่ปูจะกระโดดตามเสียงหนู!"
              : listening ? "กระโดด!" : `เกือบแล้ว! อีก ${left} ก้อน พูดต่อเลย`
            : kind === "train"
              ? hops === 0
                ? "พูดทีละคำ รถไฟจะต่อตู้ทีละตู้!"
                : listening ? "ต่อตู้แล้ว!" : `อีก ${left} ตู้ พูดต่อเลย`
              : "ถึงตาหนูแล้ว!"
        : kind === "mirror"
          ? "กระจกวิ้ง! เก่งมาก"
          : kind === "stones"
            ? "ข้ามลำธารได้แล้ว! เก่งมาก"
            : kind === "train"
              ? "ปู้น ปู้น! รถไฟออกเดินทางแล้ว"
              : "ใช่เลย! ได้สติกเกอร์ด้วย";

  const actions =
    phase === "model" ? (
      <span className="kw-turn">
        <i />
        ฟังพี่ปูก่อน…
      </span>
    ) : phase === "turn" ? (
      <>
        {!listening && practice.audio && !heard && (!stepping || hops === 0) && <div className="kw-note">ไม่ได้ยินเสียงเลย กดค้างแล้วพูดอีกครั้งนะ</div>}
        {tapOnly ? (
          stepping ? (
            <SaidItButton
              label={`พูดแล้ว (${kind === "stones" ? "ก้อน" : "ตู้"}ที่ ${Math.min(hops + 1, parts.length)})`}
              onSaid={() => {
                unlockSfx();
                setHops((h) => Math.min(parts.length, h + 1));
              }}
            />
          ) : (
            <SaidItButton onSaid={() => setTapped(true)} />
          )
        ) : (
          <HoldToTalk
            recorder={recorder}
            level={voice?.level ?? 0}
            label={
              kind === "card"
                ? "กดค้างแล้วบอกชื่อภาพ"
                : kind === "stones"
                  ? "กดค้างแล้วพูดทีละก้อน"
                  : kind === "train"
                    ? "กดค้างแล้วพูดทีละคำ"
                    : `กดค้างแล้วพูด "${item.prompt}"`
            }
          />
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
          {phase !== "echo" && kind === "mirror" && word}
        </div>
        <div className="kw-col">
          <Mascot text={line} onReplay={() => (showsModel ? playModel() : say.say(item.instruction))} />
          {actions}
          {practice.assessmentMessage && <div className="kw-note">{practice.assessmentMessage}</div>}
          {phase === "turn" && practice.micError && !tapOnly && <div className="kw-note">{practice.micError}</div>}
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
