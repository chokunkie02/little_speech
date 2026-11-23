import { useEffect } from "react";
import { Hand, LayoutList, Lightbulb, LogOut, Users, Volume2 } from "lucide-react";
import type { Attempt, Session, Stage } from "../types";
import { usePracticeItem } from "../usePracticeItem";
import { useSpeaker } from "../useSpeaker";
import { gameFor } from "./games";
import { KidShell, Mascot, type AdultAction } from "./KidShell";
import { usePlayMode, useTapMode } from "./preferences";
import { useSay } from "./useSay";
import { FeedGame } from "./games/FeedGame";
import { SpeakGame } from "./games/SpeakGame";
import { TogetherGame } from "./games/TogetherGame";

/**
 * Kid practice screen (approved wireframe). Same props and same saved attempts as the classic Practice;
 * only the way each item is shown and answered changes.
 */
export function KidPractice({
  session,
  stages,
  onSave,
  onNext,
  onPause,
  onSwitchUi,
}: {
  session: Session;
  stages: Stage[];
  onSave: (a: Attempt) => void;
  onNext: () => void;
  onPause: () => void;
  onSwitchUi: () => void;
}) {
  const stage = stages.find((s) => s.id === session.stageId);
  const item = stage?.items.find((i) => i.id === session.itemIds[session.index]);
  const speaker = useSpeaker();
  const say = useSay(speaker);
  const practice = usePracticeItem({ session, item, onSave, stopSpeaker: speaker.stop });
  const [mode, setMode] = usePlayMode(session.level);
  const [tapOnly, setTapOnly] = useTapMode();
  const micProblem = practice.micProblem;
  // Once the mic is refused or missing, stay in tap mode for the rest of the visit.
  useEffect(() => {
    if (micProblem === "denied" || micProblem === "unsupported") setTapOnly(true);
  }, [micProblem, setTapOnly]);

  const actions: AdultAction[] = [
    ...(item ? [{ label: "ฟังวิธีเล่น", icon: <Volume2 />, onSelect: () => say.say(item.instruction) }] : []),
    {
      label: mode === "together" ? "เปลี่ยนเป็น: เด็กเล่นเอง" : "เปลี่ยนเป็น: เล่นด้วยกันกับผู้ใหญ่",
      icon: <Users />,
      onSelect: () => setMode(mode === "together" ? "alone" : "together"),
    },
    ...(item?.kind === "speech"
      ? [
          {
            label: tapOnly ? "กลับไปใช้ไมค์" : "ตอบแบบแตะจอ (ไม่อัดเสียง)",
            icon: <Hand />,
            onSelect: () => setTapOnly(!tapOnly),
          },
        ]
      : []),
    { label: "ใช้หน้าฝึกแบบเดิม", icon: <LayoutList />, onSelect: onSwitchUi },
    { label: "พักรอบนี้ กลับหน้าหลัก", icon: <LogOut />, onSelect: onPause },
  ];
  const note = item && (
    <>
      <p>
        {mode === "together"
          ? "โหมดเล่นด้วยกัน: หลังเด็กพูด แตะผล 1 ครั้งที่แถบด้านล่าง"
          : "โหมดเล่นเอง: ข้อพูดจะรอผู้ใหญ่ตรวจในหน้าผลการฝึก"}
        {practice.micProblem && " · ไมค์ใช้ไม่ได้ในเครื่องนี้ จึงเล่นแบบแตะจอ"}
      </p>
      <div className="kw-hint">
        <Lightbulb size={15} style={{ verticalAlign: "-2px" }} /> คำใบ้สำหรับผู้ใหญ่: {item.hint}
      </div>
    </>
  );

  if (!stage || !item)
    return (
      <KidShell label="ห้องเล่นของเด็ก" onPause={onPause} adultActions={actions}>
        <div className="kw-stage">
          <Mascot text="ไม่พบกิจกรรมนี้ กลับไปเลือกด่านใหม่กันนะ" />
        </div>
      </KidShell>
    );

  const game = gameFor(item);
  const done = session.index + (practice.saved ? 1 : 0);
  return (
    <KidShell
      label={`${stage.label} ข้อที่ ${session.index + 1} จาก ${session.itemIds.length}`}
      progress={{ done, total: session.itemIds.length }}
      onPause={onPause}
      adultActions={actions}
      adultNote={note}
    >
      {game === "feed" ? (
        <FeedGame item={item} practice={practice} say={say} onNext={onNext} />
      ) : game === "together" ? (
        <TogetherGame item={item} practice={practice} say={say} onNext={onNext} />
      ) : (
        <SpeakGame
          kind={game === "mirror" ? "mirror" : game === "stones" ? "stones" : game === "train" ? "train" : "card"}
          item={item}
          sound={session.sound}
          practice={practice}
          say={say}
          mode={mode}
          tapOnly={tapOnly}
          onNext={onNext}
        />
      )}
    </KidShell>
  );
}
