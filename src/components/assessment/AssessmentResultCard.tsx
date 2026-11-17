import { OUTCOME_LABELS, type AssessmentResult } from "@/lib/assessment/policy";

export default function AssessmentResultCard({
  result,
}: {
  result: AssessmentResult;
}) {
  return (
    <div className="assessment-result" role="status">
      <strong>{OUTCOME_LABELS[result.outcome]}</strong>
      <p>{result.feedback}</p>
      {result.source === "azure" && (
        <p>
          คะแนนรวม {result.score?.toFixed(0)} · ความถูกต้องของเสียง{" "}
          {result.accuracy?.toFixed(0)} · ความครบของข้อความ{" "}
          {result.completeness?.toFixed(0)}
        </p>
      )}
      <small>
        {
          {
            azure: "ผลจาก Azure Speech",
            rules: "ตรวจตามเฉลย",
            adult: "ผู้ใหญ่ช่วยตรวจ",
            unavailable: "ยังไม่ได้ผลประเมินเสียง",
          }[result.source]
        }{" "}
        · เกณฑ์เวอร์ชัน {result.policyVersion}
      </small>
      {result.transcript && <p>ข้อความที่ระบบได้ยิน · {result.transcript}</p>}
      {result.source === "azure" && (
        <small>คำแนะนำตามเกณฑ์ต้นแบบ · ผู้ใหญ่ตรวจยืนยันได้ในสรุปรอบ</small>
      )}
    </div>
  );
}
