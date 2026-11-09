import { Check, ArrowRight } from "lucide-react";
import { LEVELS, getLevel, type LearningLevelId } from "./learning-levels";
export function LevelPicker({
  value,
  onChange,
  compact = false,
}: {
  value?: string;
  onChange: (v: LearningLevelId) => void;
  compact?: boolean;
}) {
  return (
    <section className={`level-picker ${compact ? "compact" : ""}`}>
      <div className="level-picker-heading">
        <div>
          <h2>เลือกระดับที่อยากลอง</h2>
          <p>ทุกระดับเลือกได้ ย้อนมาฝึกพื้นฐานได้เสมอ</p>
        </div>
        <span className="level-current">ระดับที่ใช้ · {getLevel(value).label}</span>
      </div>
      <div className="level-options">
        {LEVELS.map((l, i) => (
          <button
            type="button"
            key={l.id}
            aria-pressed={getLevel(value).id === l.id}
            className={getLevel(value).id === l.id ? "selected" : ""}
            onClick={() => onChange(l.id)}
          >
            <span className="level-index">
              0{i + 1}
              {getLevel(value).id === l.id && <Check size={13} />}
            </span>
            <h3>{l.label}</h3>
            <small>{l.ageGuide}</small>
            <p>{l.description}</p>
            <span className="level-example">{l.example}</span>
            <span className="level-select-label">
              {getLevel(value).id === l.id
                ? "กำลังใช้ระดับนี้"
                : "เลือกระดับนี้"}
              <ArrowRight size={13} />
            </span>
          </button>
        ))}
      </div>
      <p className="level-age-note">
        ช่วงวัยเป็นแนวทางของเนื้อหา ไม่ใช่ผลประเมินความสามารถหรือเกณฑ์วินิจฉัย
        {compact && (
          <>
            <br />
            เปลี่ยนระดับจะเริ่มรอบใหม่ ประวัติรอบที่จบยังอยู่
          </>
        )}
      </p>
    </section>
  );
}
