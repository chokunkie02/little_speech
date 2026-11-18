"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { recordingToWav } from "@/lib/assessment/audio-client";
import { assessmentRequest } from "@/lib/assessment/client";
import type { AssessmentResult, PolicySnapshot } from "@/lib/assessment/policy";
import type { Item, Session } from "@/features/learning-studio/types";
import { submitStudioAssessment } from "@/features/learning-studio/assessment-client";
import AssessmentResultCard from "./AssessmentResultCard";

export default function AssessmentControls({
  session,
  item,
  blob,
  onResult,
  onBusy,
}: {
  session: Session;
  item: Item;
  blob: Blob;
  onResult: (result: AssessmentResult) => void;
  onBusy: (busy: boolean) => void;
}) {
  const { user } = useAuth();
  const [policy, setPolicy] = useState<PolicySnapshot>();
  const [error, setError] = useState("");
  const [result, setResult] = useState<AssessmentResult>();
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    const abort = new AbortController();
    // The child's own criteria: the school's when the child belongs to one, otherwise the central policy.
    assessmentRequest<PolicySnapshot>(`/api/assessment/policy?childId=${encodeURIComponent(session.childId)}`, { signal: abort.signal })
      .catch((error) => {
        if (error.name === "AbortError") throw error;
        throw new Error("ยังโหลดเกณฑ์ไม่ได้ ให้ผู้ใหญ่ช่วยตรวจรอบนี้ได้");
      })
      .then((policy) => {
        if (active.current) setPolicy(policy);
      })
      .catch((error) => {
        if (active.current && error.name !== "AbortError")
          setError(error.message);
      });
    return () => {
      active.current = false;
      abort.abort();
      controller.current?.abort();
    };
  }, [session.childId]);
  const rule = policy?.config.rules.find(
    (rule) => rule.stageId === session.stageId,
  );
  const useAi =
    !!policy?.config.enabled && rule?.mode === "azure" && !item.hidePrompt;
  async function evaluate() {
    if (busy || !policy || (useAi && !consent)) return;
    setBusy(true);
    onBusy(true);
    setError("");
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 25000);
    try {
      const audio = useAi ? await recordingToWav(blob) : undefined;
      if (!active.current) return;
      const next = await submitStudioAssessment(session, item, requestId, {
        audio,
        signal: controller.current.signal,
      });
      if (active.current) {
        setResult(next);
        onResult(next);
      }
    } catch (error) {
      if (active.current)
        setError(
          error instanceof Error && error.name !== "AbortError"
            ? error.message
            : "ยังไม่ได้ผลตรวจ ลองตรวจอีกครั้งหรือให้ผู้ใหญ่ช่วยฟังได้",
        );
    } finally {
      clearTimeout(timeout);
      if (active.current) {
        setBusy(false);
        onBusy(false);
      }
    }
  }
  if (!user)
    return (
      <div className="assessment-result">
        <p>เข้าสู่ระบบเพื่อใช้การประเมินกลาง หรือบันทึกให้ผู้ใหญ่ช่วยฟังได้</p>
        <Link
          href="/auth/signin?redirect=%2Ftraining"
          className="text-primary underline"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  return (
    <section className="assessment-panel" aria-label="ตรวจผลตามเกณฑ์กลาง">
      <strong>ตรวจผลตามเกณฑ์กลาง</strong>
      <p>
        {useAi
          ? "ส่งคลิปเสียงให้ AI ฟัง แล้วเทียบสิ่งที่ได้ยินกับคำเป้าหมาย รับคำแนะนำหลังตรวจเสร็จ"
          : "รอบนี้ใช้ผู้ใหญ่ตรวจ บันทึกสถานะเข้าประวัติกลางได้"}
      </p>
      {useAi && !result && (
        <label className="assessment-consent">
          <input
            type="checkbox"
            checked={consent}
            disabled={busy}
            onChange={(event) => setConsent(event.target.checked)}
          />
          ยินยอมส่งคลิปนี้ไปให้บริการ AI ภายนอก ({policy?.providerLabel ?? "AI"}) ประเมิน
        </label>
      )}
      {!result && (
        <button
          type="button"
          className="button secondary"
          disabled={busy || !policy || (useAi && !consent)}
          onClick={() => void evaluate()}
        >
          {busy
            ? "กำลังตรวจและบันทึกผล…"
            : useAi
              ? "ส่งเสียงให้ AI ตรวจ"
              : "บันทึกสถานะรอผู้ใหญ่ตรวจ"}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {result && <AssessmentResultCard result={result} />}
    </section>
  );
}
