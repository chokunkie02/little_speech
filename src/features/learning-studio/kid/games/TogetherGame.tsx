import { useEffect, useEffectEvent, useState } from "react";
import { ArrowRight, CircleHelp, RotateCcw, Smile } from "lucide-react";
import { Art } from "../../Art";
import type { Item, Review } from "../../types";
import type { PracticeItem } from "../../usePracticeItem";
import { AdultBar, Mascot } from "../KidShell";
import type { Say } from "../useSay";

/**
 * "Try it for real" (observation): the child plays with the adult away from the screen, then the adult
 * records what they saw with one tap. Same three results as the classic screen; "with adult help" is
 * recorded automatically because this game is always played together.
 */
export function TogetherGame({ item, practice, say, onNext }: { item: Item; practice: PracticeItem; say: Say; onNext: () => void }) {
  const [busy, setBusy] = useState(false);
  const speakOnOpen = useEffectEvent(() => {
    if (!practice.saved) say.say(item.instruction);
  });
  useEffect(() => speakOnOpen(), []);
  const finish = async (review: Exclude<Review, "pending">) => {
    if (busy) return;
    setBusy(true);
    say.hush();
    await practice.save({ review, support: "adult" });
    onNext();
  };
  return (
    <>
      <div className="kw-split">
        <div className="kw-col">
          <div className="kw-card">
            <Art kind={item.art} label={item.prompt} />
          </div>
        </div>
        <div className="kw-col">
          <Mascot text={item.instruction} onReplay={() => say.say(item.instruction)} />
          <div className="kw-word" style={{ fontSize: "clamp(30px, 6vw, 52px)" }}>
            “{item.prompt}”
          </div>
          <div className="kw-sub">เล่นกับผู้ใหญ่ แล้วให้ผู้ใหญ่เลือกผลด้านล่าง</div>
          {practice.saved && (
            <button type="button" className="kw-btn go big" onClick={onNext}>
              ไปต่อ
              <ArrowRight />
            </button>
          )}
          {practice.assessmentMessage && <div className="kw-note">{practice.assessmentMessage}</div>}
        </div>
      </div>
      {!practice.saved && (
        <AdultBar head="ผู้ใหญ่: เล่นด้วยกันแล้ว เด็กทำได้แค่ไหน">
          <div className="kw-faces">
            <button type="button" className="yes" onClick={() => void finish("achieved")} disabled={busy}>
              <Smile />
              ทำได้ตามเป้า
            </button>
            <button type="button" onClick={() => void finish("practice")} disabled={busy}>
              <RotateCcw />
              ยังต้องช่วย
            </button>
            <button type="button" onClick={() => void finish("unavailable")} disabled={busy}>
              <CircleHelp />
              ประเมินไม่ได้
            </button>
          </div>
        </AdultBar>
      )}
    </>
  );
}
