"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Alert, Badge, Button, Card, Section, type BadgeTone } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { assessmentRequest } from "@/lib/assessment/client";
import { aiScoreSummary } from "@/components/assessment/AssessmentResultCard";
import {
  AI_SOURCE_LABELS,
  OUTCOME_LABELS,
  STAGE_DEFINITIONS,
  isAiSource,
  type AssessmentResult,
  type Outcome,
} from "@/lib/assessment/policy";
import { formatThaiDate } from "@/lib/thaiDate";

interface Row {
  id: string;
  reference_text: string;
  stage_id: string;
  created_at: string;
  result: AssessmentResult;
  adult_review?: { review: "achieved" | "practice" | "unavailable"; reviewed_at: string };
}

const OUTCOME_TONES: Record<Outcome, BadgeTone> = {
  achieved: "success",
  practice: "warning",
  retry: "warning",
  needs_review: "info",
  unavailable: "neutral",
};

function sourceText(result: AssessmentResult) {
  if (isAiSource(result.source)) return `${AI_SOURCE_LABELS[result.source]} · ${aiScoreSummary(result)}`;
  if (result.source === "rules") return "ตรวจจากเฉลยข้อเลือกตอบ";
  if (result.source === "adult") return "ผู้ใหญ่ช่วยตรวจ";
  return "ยังไม่ได้ผลตรวจเสียง";
}

/**
 * Per-item results from the central assessment (latest 30). Renders nothing until there is at least
 * one result, so families who never sent anything for checking see no empty box.
 */
export default function AssessmentHistory({ childId, from, to }: { childId?: string; from?: string; to?: string }) {
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
    assessmentRequest<Row[]>(`/api/assessment/history?${query}`, { signal: abort.signal })
      .then((rows) => {
        if (active) {
          setRows(rows);
          setError("");
        }
      })
      .catch((error) => {
        if (active && error.name !== "AbortError") {
          setRows(undefined);
          setError("โหลดผลตรวจรายข้อไม่สำเร็จ");
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
  if (!error && !rows?.length) return null;

  return (
    <Section title="ผลตรวจรายข้อ" description="การส่งตรวจล่าสุด 30 ครั้ง ผลจาก AI เป็นคำแนะนำตามเกณฑ์ต้นแบบ แยกจากการตรวจของผู้ใหญ่"
      action={<Button variant="ghost" size="sm" className="print:hidden" onClick={refresh} icon={<RefreshCw size={14} aria-hidden="true" />}>โหลดล่าสุด</Button>}>
      {error ? <Alert tone="error">{error}</Alert> : (
        <Card>
          <ul className="divide-y divide-border">
            {rows!.map((row) => (
              <li key={row.id} className="space-y-1.5 p-4 text-sm print:break-inside-avoid">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 font-semibold text-text">{row.reference_text}</p>
                  <Badge tone={OUTCOME_TONES[row.result.outcome]}>{OUTCOME_LABELS[row.result.outcome]}</Badge>
                </div>
                <p className="text-caption text-text-muted">
                  {STAGE_DEFINITIONS.find((stage) => stage.id === row.stage_id)?.label} · {formatThaiDate(row.created_at, "datetime")} · เกณฑ์ v{row.result.policyVersion}
                </p>
                <p className="text-text">{row.result.feedback}</p>
                {row.adult_review && (
                  <p className="font-semibold text-text">ผู้ใหญ่ตรวจยืนยัน · {OUTCOME_LABELS[row.adult_review.review]}</p>
                )}
                <p className="text-caption text-text-muted">{sourceText(row.result)}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Section>
  );
}
