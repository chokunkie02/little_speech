import "../kid/kid.css";
import "./guide.css";
import { useEffect, useState } from "react";
import { BookOpen, Hand, Mic, Pause, Play, RotateCcw, SkipForward, Smile } from "lucide-react";
import { StonesScene } from "../kid/games/Scenes";
import { Sticker } from "../kid/StickerBook";

const SCENES = [
  { title: "กดค้างที่ไมค์ แล้วพูด", body: "เด็กกดปุ่มไมค์สีทองค้างไว้ระหว่างพูด ปล่อยเมื่อพูดจบ (บนคอมกด Space ค้างได้)" },
  { title: "ได้ยินเสียง พี่ปูก็ขยับ", body: "ได้ยินเสียง 1 ช่วง พี่ปูกระโดด 1 ก้าว หรือต่อรถไฟ 1 ตู้ ระบบดูแค่ว่ามีเสียง ไม่ตัดสินว่าถูกผิด" },
  { title: "ผู้ใหญ่แตะผล 1 ครั้ง", body: "เล่นด้วยกัน: ผู้ใหญ่ฟังแล้วแตะ ทำได้ / ฝึกอีก / ข้าม · เล่นเอง: ข้อพูดรอผู้ใหญ่ฟังในหน้าผลการฝึก" },
  { title: "ได้สติกเกอร์ เก็บในสมุด", body: "ทุกภาพที่ได้ฝึกกลายเป็นสติกเกอร์ พิมพ์ออกมาให้น้องติดจริงได้ที่ “พิมพ์ให้น้อง”" },
];
const SCENE_MS = 4200;
const STONES = ["ปา", "ปี", "ปู"];

/**
 * "ดูพี่ปูสอนเล่น": four short scenes drawn with the real game parts (the stepping stones are the game's
 * own scene), so the guide always matches the screens. Plays by itself; chapters jump to a scene.
 */
export function GuideWalkthrough({ onTry, onShowTips }: { onTry: () => void; onShowTips: () => void }) {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hops, setHops] = useState(0);
  /** Bumped by a chapter click, so picking the scene already showing still restarts it. */
  const [restart, setRestart] = useState(0);

  // Next scene after a while; the stones scene hops once per beat.
  useEffect(() => {
    if (!playing) return;
    const next = setTimeout(() => {
      setHops(0);
      setScene((s) => (s + 1) % SCENES.length);
    }, SCENE_MS);
    const beats = scene === 1 ? [700, 1400, 2100, 2800].map((ms, i) => setTimeout(() => setHops(i + 1), ms)) : [];
    return () => {
      clearTimeout(next);
      beats.forEach(clearTimeout);
    };
  }, [scene, playing, restart]);

  const go = (i: number) => {
    setHops(0);
    setScene(i);
    setRestart((n) => n + 1);
  };

  return (
    <section className="panel guide-walk" aria-label="ดูพี่ปูสอนเล่น">
      <div className="guide-walk-head">
        <h2>ดูพี่ปูสอนเล่น</h2>
        <span>4 ขั้น · ไม่ถึง 1 นาที</span>
      </div>
      <div className="guide-player">
        <div className="kid-world kw-inline guide-stage" aria-live="polite">
          {scene === 0 && (
            <div className="guide-scene">
              <span className="kw-mic live guide-mic">
                <Mic />
              </span>
              <Hand className="guide-finger" />
            </div>
          )}
          {scene === 1 && (
            <div className="guide-scene guide-stones">
              <StonesScene parts={STONES} hops={Math.min(hops, STONES.length)} finished={hops > STONES.length} quiet />
            </div>
          )}
          {scene === 2 && (
            <div className="guide-scene">
              <div className="guide-faces">
                <span className="yes">
                  <Smile />
                  ทำได้
                </span>
                <span>
                  <RotateCcw />
                  ฝึกอีก
                </span>
                <span>
                  <SkipForward />
                  ข้าม
                </span>
              </div>
            </div>
          )}
          {scene === 3 && (
            <div className="guide-scene guide-earn">
              <span className="guide-earn-stk">
                <Sticker kind="banana" owned fresh />
              </span>
              <span className="guide-earn-book">
                <BookOpen />
              </span>
            </div>
          )}
          <p className="guide-caption">
            <b>
              {scene + 1} · {SCENES[scene].title}
            </b>
            {SCENES[scene].body}
          </p>
        </div>
        <div className="guide-bar">
          <button type="button" onClick={() => setPlaying(!playing)} aria-label={playing ? "หยุดชั่วคราว" : "เล่นต่อ"}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div className="guide-chapters" role="tablist" aria-label="ขั้นตอน">
            {SCENES.map((s, i) => (
              <button key={s.title} type="button" role="tab" aria-selected={i === scene} className={i === scene ? "on" : ""} onClick={() => go(i)}>
                <i style={i === scene && playing ? { animationDuration: `${SCENE_MS}ms` } : undefined} className={i === scene && playing ? "run" : i < scene ? "done" : ""} />
                {i + 1}. {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="guide-actions">
        <button type="button" className="guide-try" onClick={onTry}>
          <Play size={18} />
          ลองเล่น 1 ข้อ <small>(ไม่บันทึกผล)</small>
        </button>
        <button type="button" className="guide-link" onClick={onShowTips}>
          ดูป้ายแนะนำบนแผนที่อีกครั้ง
        </button>
      </div>
    </section>
  );
}

const FAQ = [
  {
    q: "ไมค์ไม่ทำงาน ทำอย่างไร",
    a: "กดรูปแม่กุญแจหรือไมค์ที่แถบที่อยู่ของเบราว์เซอร์ แล้วอนุญาตไมค์ จากนั้นเปิดหน้าใหม่ · ถ้ายังใช้ไม่ได้ เปิดเมนูผู้ใหญ่ในเกม แล้วเลือก “ตอบแบบแตะจอ” ให้เด็กพูดกับผู้ใหญ่แล้วแตะปุ่มแทน (ข้อแบบนี้บันทึกเป็นการลองเล่น ไม่ส่งเข้าระบบ)",
  },
  {
    q: "เล่นด้วยกัน กับ เล่นเอง ต่างกันอย่างไร",
    a: "ระดับ 1–2 เริ่มที่เล่นด้วยกัน: ผู้ใหญ่นั่งข้างเด็กและแตะผลหลังเด็กพูด · ระดับ 3–4 เริ่มที่เล่นเอง: เด็กเล่นต่อได้เลย ข้อพูดจะรอผู้ใหญ่ฟังในหน้าผลการฝึก · เปลี่ยนได้ทุกเมื่อจากเมนูผู้ใหญ่ในเกม",
  },
  {
    q: "ผลไปอยู่ไหน ใครเห็นบ้าง",
    a: "ทุกข้อบันทึกในเครื่องนี้ก่อน ถ้าเด็กเชื่อมกับบัญชีแล้ว สรุปแต่ละรอบจะไปอยู่ในความก้าวหน้าและรายงาน · นักเรียนของโรงเรียน: ครูประจำห้องเห็นผล และเป็นผู้ยืนยันผลการพูด (เว้นแต่โรงเรียนอนุญาตให้ผู้ปกครองยืนยันด้วย)",
  },
  {
    q: "เสียงของลูกถูกเก็บไหม",
    a: "ในหน้าเกม เสียงอยู่ในเครื่องเพื่อเล่นให้ฟังซ้ำในข้อนั้นเท่านั้น ไม่ถูกเก็บถาวรและไม่ถูกส่งไปไหน · การส่งเสียงให้ระบบประเมินมีเฉพาะในหน้าฝึกแบบเดิม เมื่อผู้ใหญ่ติ๊กยินยอมและโรงเรียนเปิดใช้เท่านั้น",
  },
];

/** The questions adults ask most, in plain language. */
export function GuideFaq() {
  return (
    <section className="panel guide-faq">
      <h2>คำถามที่พบบ่อย</h2>
      {FAQ.map((item) => (
        <details key={item.q}>
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </section>
  );
}
