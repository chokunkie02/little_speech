import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Pause,
  Play,
  X,
} from "lucide-react";
const ATLAS = "/learning-studio/images/mouth-atlas-v3.png";
const POSITIONS = [
  "0% 0%",
  "50% 0%",
  "100% 0%",
  "0% 100%",
  "50% 100%",
  "100% 100%",
];
export function MouthCoach({
  sound = "ป",
  sample = "ปา",
  compact = false,
}: {
  sound?: string;
  sample?: string;
  compact?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [large, setLarge] = useState(false);
  const syllable = sample.split(/\s/)[0];
  const vowel = syllable.includes("ู")
    ? 4
    : syllable.includes("ี") || syllable.includes("ิ")
      ? 3
      : 2;
  const steps = [
    {
      pose: sound === "ก" ? 0 : 1,
      title: sound === "ก" ? "เตรียมพูดอย่างสบาย ๆ" : "ริมฝีปากแตะกันเบา ๆ",
      body:
        sound === "ก"
          ? "ฟังผู้ใหญ่สาธิตเสียง ก ตำแหน่งลิ้นด้านหลังมองจากภาพด้านหน้าไม่เห็น"
          : sound === "ม"
            ? "เริ่มคำด้วยเสียง ม อย่างสบาย ไม่ต้องเกร็งปาก"
            : "เตรียมต้นเสียง ป แล้วปล่อยริมฝีปากเมื่อพูด",
    },
    {
      pose: vowel,
      title:
        vowel === 4
          ? "ห่อริมฝีปากช่วงสระ อู"
          : vowel === 3
            ? "ริมฝีปากแผ่ช่วงสระ อี"
            : "เปิดปากช่วงสระ อา",
      body: `ดูช่วงสระของ “${syllable}” แล้วฟังเสียงตัวอย่างก่อนลองพูด`,
    },
    {
      pose: 5,
      title: "พัก แล้วลองในแบบของเรา",
      body: "ไม่ต้องค้างปากให้เหมือนภาพ พูดอย่างสบายและให้ผู้ใหญ่ช่วยสังเกตได้",
    },
  ];
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setStep((i) => (i + 1) % 3), 1800);
    return () => clearInterval(id);
  }, [playing]);
  useEffect(() => {
    if (!large) return;
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = document.querySelector(".mouth-zoom");
    const nodes = () =>
      Array.from(dialog?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    nodes()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLarge(false);
      if (e.key === "Tab") {
        const a = nodes(),
          first = a[0],
          last = a[a.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      if (prev?.isConnected) prev.focus();
      else
        document
          .querySelector<HTMLButtonElement>(".mouth-coach .text-button")
          ?.focus();
    };
  }, [large]);
  const photo = (pose: number, cls = "") => (
    <div
      className={`mouth-photo ${cls}`}
      role="img"
      aria-label={
        pose === 0
          ? "ปากอยู่ท่าสบาย"
          : pose === 1
            ? "ริมฝีปากปิดแตะกัน"
            : pose === 2
              ? "ปากเปิดช่วงสระอา"
              : pose === 3
                ? "ปากแผ่ช่วงสระอี"
                : pose === 4
                  ? "ปากห่อช่วงสระอู"
                  : "ยิ้มหลังพูด"
      }
      style={{
        backgroundImage: `url("${ATLAS}")`,
        backgroundPosition: POSITIONS[pose],
      }}
    />
  );
  if (compact)
    return (
      <div className="mouth-thumb">
        {photo(vowel)}
        <span>ดูปาก · {syllable}</span>
      </div>
    );
  const content = (
    <>
      <div className="mouth-coach-top">
        <span>ดูปากทีละจังหวะ · {syllable}</span>
        <button className="text-button" onClick={() => setLarge(!large)}>
          {large ? <X size={15} /> : <Expand size={15} />}{" "}
          {large ? "ปิดภาพขยาย" : "ขยายภาพปาก"}
        </button>
      </div>
      <div className="mouth-active-photo">
        {photo(steps[step].pose)}
        <span className="mouth-step-number">{step + 1} / 3</span>
      </div>
      <div className="mouth-caption">
        <strong>{steps[step].title}</strong>
        <p>{steps[step].body}</p>
      </div>
      <div className="mouth-filmstrip">
        {steps.map((s, i) => (
          <button
            key={i}
            aria-label={`ดูจังหวะ ${i + 1}: ${s.title}`}
            aria-pressed={i === step}
            className={i === step ? "selected" : ""}
            onClick={() => {
              setPlaying(false);
              setStep(i);
            }}
          >
            {photo(s.pose)}
            <span>
              {i + 1} · {i === 0 ? "เตรียม" : i === 1 ? "ช่วงสระ" : "ผ่อนคลาย"}
            </span>
          </button>
        ))}
      </div>
      <div className="mouth-controls">
        <button
          aria-label="จังหวะปากก่อนหน้า"
          onClick={() => {
            setPlaying(false);
            setStep((i) => (i + 2) % 3);
          }}
        >
          <ChevronLeft size={15} />
        </button>
        <button onClick={() => setPlaying(!playing)}>
          {playing ? <Pause size={15} /> : <Play size={15} />}{" "}
          {playing ? "หยุดสลับภาพ" : "ดูทีละจังหวะอัตโนมัติ"}
        </button>
        <button
          aria-label="จังหวะปากถัดไป"
          onClick={() => {
            setPlaying(false);
            setStep((i) => (i + 1) % 3);
          }}
        >
          <ChevronRight size={15} />
        </button>
      </div>
      <p className="mouth-note">
        ภาพคนสร้างด้วย AI ใช้สังเกตริมฝีปากและช่วงสระ เป็นภาพหลายจังหวะ
        ไม่ใช่วิดีโอการพูดจริง
      </p>
    </>
  );
  return (
    <>
      {!large && <div className="mouth-coach">{content}</div>}
      {large && (
        <div
          className="mouth-zoom"
          role="dialog"
          aria-modal="true"
          aria-label="ภาพปากขนาดใหญ่"
        >
          <div className="mouth-coach">{content}</div>
        </div>
      )}
    </>
  );
}
