"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { recordingToWav } from "@/lib/assessment/audio-client";
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
    fetch("/api/assessment/policy", { cache: "no-store", signal: abort.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("ยังโหลดเกณฑ์กลางไม่ได้ ให้ผู้ใหญ่ช่วยตรวจรอบนี้ได้");
        return response.json() as Promise<PolicySnapshot>;
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
  }, []);
  const rule = policy?.config.rules.find(
    (rule) => rule.stageId === session.stageId,
  );
  const useAzure =
    !!policy?.config.enabled && rule?.mode === "azure" && !item.hidePrompt;
  async function evaluate() {
    if (busy || !policy || (useAzure && !consent)) return;
    setBusy(true);
    onBusy(true);
    setError("");
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 25000);
    try {
      const audio = useAzure ? await recordingToWav(blob) : undefined;
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
        {useAzure
          ? "ส่งคลิปเสียงและข้อความเป้าหมายไปประเมิน แล้วรับคำแนะนำหลังตรวจเสร็จ"
          : "รอบนี้ใช้ผู้ใหญ่ตรวจ บันทึกสถานะเข้าประวัติกลางได้"}
      </p>
      {useAzure && !result && (
        <label className="assessment-consent">
          <input
            type="checkbox"
            checked={consent}
            disabled={busy}
            onChange={(event) => setConsent(event.target.checked)}
          />
          ยินยอมส่งคลิปนี้ไปให้ Azure Speech ประเมิน
        </label>
      )}
      {!result && (
        <button
          type="button"
          className="button secondary"
          disabled={busy || !policy || (useAzure && !consent)}
          onClick={() => void evaluate()}
        >
          {busy
            ? "กำลังตรวจและบันทึกผล…"
            : useAzure
              ? "ส่งเสียงให้ AI ตรวจ"
              : "บันทึกสถานะรอผู้ใหญ่ตรวจ"}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {result && <AssessmentResultCard result={result} />}
    </section>
  );
}
