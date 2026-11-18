import {
  AI_SOURCE_LABELS,
  OUTCOME_LABELS,
  isAiSource,
  type AssessmentResult,
} from "@/lib/assessment/policy";

/** Azure scored pronunciation; OpenAI results only say how closely what was heard matches the target. */
export function aiScoreSummary(result: AssessmentResult) {
  if (result.source === "openai")
    return `คะแนนรวม ${result.score?.toFixed(0)} · ตรงกับคำเป้าหมาย ${result.accuracy?.toFixed(0)} · ความครบของข้อความ ${result.completeness?.toFixed(0)}`;
  return `คะแนนรวม ${result.score?.toFixed(0)} · ความถูกต้องของเสียง ${result.accuracy?.toFixed(0)} · ความครบของข้อความ ${result.completeness?.toFixed(0)}`;
}

export default function AssessmentResultCard({
  result,
}: {
  result: AssessmentResult;
}) {
  const ai = isAiSource(result.source);
  return (
    <div className="assessment-result" role="status">
      <strong>{OUTCOME_LABELS[result.outcome]}</strong>
      <p>{result.feedback}</p>
      {ai && <p>{aiScoreSummary(result)}</p>}
      <small>
        {isAiSource(result.source)
          ? `ผลจาก ${AI_SOURCE_LABELS[result.source]}`
          : {
              rules: "ตรวจตามเฉลย",
              adult: "ผู้ใหญ่ช่วยตรวจ",
              unavailable: "ยังไม่ได้ผลประเมินเสียง",
            }[result.source]}{" "}
        · เกณฑ์เวอร์ชัน {result.policyVersion}
      </small>
      {result.transcript && <p>ข้อความที่ระบบได้ยิน · {result.transcript}</p>}
      {ai && (
        <small>คำแนะนำตามเกณฑ์ต้นแบบ · ผู้ใหญ่ตรวจยืนยันได้ในสรุปรอบ</small>
      )}
    </div>
  );
}
