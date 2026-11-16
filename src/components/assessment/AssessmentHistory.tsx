"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { assessmentRequest } from "@/lib/assessment/client";
import {
  OUTCOME_LABELS,
  STAGE_DEFINITIONS,
  type AssessmentResult,
} from "@/lib/assessment/policy";

interface Row {
  id: string;
  reference_text: string;
  stage_id: string;
  created_at: string;
  result: AssessmentResult;
  adult_review?: {
    review: "achieved" | "practice" | "unavailable";
    reviewed_at: string;
  };
}
export default function AssessmentHistory({
  childId,
  from,
  to,
}: {
  childId?: string;
  from?: string;
  to?: string;
}) {
  const { user } = useAuth();
  const userId = user?.id;
  const isPlatformAdmin = user?.isPlatformAdmin;
  const [rows, setRows] = useState<Row[]>();
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!childId || !userId || isPlatformAdmin) return;
    const abort = new AbortController();
    let active = true;
    const query = new URLSearchParams({ childId });
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    assessmentRequest<Row[]>(`/api/assessment/history?${query}`, {
      signal: abort.signal,
    })
      .then((rows) => {
        if (active) {
          setRows(rows);
          setError("");
        }
      })
      .catch((error) => {
        if (active && error.name !== "AbortError") {
          setRows(undefined);
          setError("โหลดประวัติการประเมินกลางไม่สำเร็จ");
        }
      });
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      abort.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [childId, userId, isPlatformAdmin, from, to, revision, refresh]);
  if (!childId || !user || user.isPlatformAdmin) return null;
  return (
    <section
      className="mb-4 space-y-3 rounded-2xl border border-border bg-surface p-4 text-left text-text sm:p-5 print:bg-white"
      aria-label="ผลประเมินจากศูนย์กลาง"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">ผลประเมินจากศูนย์กลาง</h2>
        <button
          type="button"
          className="text-sm text-primary print:hidden"
          onClick={refresh}
        >
          โหลดล่าสุด
        </button>
      </div>
      <p className="text-xs text-text-muted">
        การลองตรวจล่าสุด 30 ครั้ง · ผล AI เป็นคำแนะนำตามเกณฑ์ต้นแบบ
        และแยกจากการตรวจยืนยันของผู้ใหญ่
      </p>
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : !rows ? (
        <p role="status" className="text-sm">
          กำลังโหลดผล…
        </p>
      ) : !rows.length ? (
        <p className="text-sm text-text-muted">ยังไม่มีผลที่ส่งตรวจในช่วงนี้</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-border p-3 text-sm print:break-inside-avoid"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <strong>{row.reference_text}</strong>
                <span>{OUTCOME_LABELS[row.result.outcome]}</span>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {
                  STAGE_DEFINITIONS.find((stage) => stage.id === row.stage_id)
                    ?.label
                }{" "}
                · {new Date(row.created_at).toLocaleString("th-TH")} · เกณฑ์ v
                {row.result.policyVersion}
              </p>
              <p className="mt-2">{row.result.feedback}</p>
              {row.adult_review && (
                <p className="mt-2 font-semibold">
                  ผู้ใหญ่ตรวจยืนยัน · {OUTCOME_LABELS[row.adult_review.review]}
                </p>
              )}
              <p className="mt-1 text-xs">
                {row.result.source === "azure"
                  ? `Azure Speech · คะแนนรวม ${row.result.score?.toFixed(0)} · ความถูกต้อง ${row.result.accuracy?.toFixed(0)} · ความครบ ${row.result.completeness?.toFixed(0)}`
                  : row.result.source === "rules"
                    ? "ตรวจจากเฉลยข้อเลือกตอบ"
                    : row.result.source === "adult"
                      ? "ผู้ใหญ่ช่วยตรวจ"
                      : "ยังไม่ได้ผลตรวจเสียง"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
