"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import { Badge, Button, Card, DataLoadError, EmptyState, LoadingState, Section, toast } from "@/components/ui";
import { assessmentRequest } from "@/lib/assessment/client";
import { OUTCOME_LABELS, STAGE_DEFINITIONS, type AssessmentResult } from "@/lib/assessment/policy";
import { formatThaiDate } from "@/lib/thaiDate";

interface PendingItem {
  id: string;
  childId: string;
  childName: string;
  studentNumber: number | null;
  stageId: string;
  referenceText: string;
  result: AssessmentResult;
  createdAt: string;
}

type Review = "achieved" | "practice" | "unavailable";
const REVIEWS: { value: Review; label: string; variant: "primary" | "outline" | "ghost" }[] = [
  { value: "achieved", label: "ทำได้", variant: "primary" },
  { value: "practice", label: "ฝึกต่อ", variant: "outline" },
  { value: "unavailable", label: "ประเมินไม่ได้", variant: "ghost" },
];

/** Classroom teacher's list of results that wait for an adult to confirm. */
export function TeacherReviewQueue({ classroomId, onCount }: { classroomId: string; onCount?: (count: number) => void }) {
  const [items, setItems] = useState<PendingItem[]>();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    assessmentRequest<PendingItem[]>(`/api/assessment/pending?classroomId=${classroomId}`)
      .then((rows) => {
        if (!active) return;
        setItems(rows);
        setFailed(false);
        onCount?.(rows.length);
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [classroomId, revision, onCount]);

  async function confirm(item: PendingItem, review: Review) {
    setBusy(item.id);
    try {
      await assessmentRequest("/api/assessment/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: item.childId, items: [{ id: item.id, review }] }),
      });
      setItems((rows) => {
        const next = rows?.filter((row) => row.id !== item.id);
        onCount?.(next?.length ?? 0);
        return next;
      });
      toast.success(`บันทึกผลของ ${item.childName} แล้ว`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกผลไม่สำเร็จ");
    } finally {
      setBusy(undefined);
    }
  }

  if (failed && !items) return <DataLoadError message="โหลดรายการรอตรวจไม่สำเร็จ" onRetry={() => setRevision((value) => value + 1)} />;
  if (!items) return <LoadingState variant="list" rows={3} />;
  if (!items.length) {
    return (
      <EmptyState icon={<ClipboardCheck size={22} />} title="ไม่มีข้อที่รอตรวจ"
        description="ข้อที่ผู้ใหญ่ต้องฟังเอง และผลจาก AI ที่ยังไม่มีคนยืนยัน จะขึ้นที่นี่" />
    );
  }

  return (
    <Section title={`รอตรวจ ${items.length} ข้อ`} description="ดูคำที่เด็กฝึก แล้วเลือกผลที่ตรงกับที่เด็กทำได้จริง"
      action={<Button variant="ghost" size="sm" icon={<RefreshCw size={14} aria-hidden="true" />} onClick={() => setRevision((value) => value + 1)}>โหลดล่าสุด</Button>}>
      <Card>
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-text">
                    {item.studentNumber ? `${item.studentNumber}. ` : ""}{item.childName}
                  </p>
                  <Badge tone={item.result.source === "azure" ? "info" : "neutral"}>
                    {item.result.source === "azure" ? "AI แนะนำ" : OUTCOME_LABELS[item.result.outcome]}
                  </Badge>
                </div>
                <p className="text-sm text-text">“{item.referenceText}”</p>
                <p className="text-caption text-text-muted">
                  {STAGE_DEFINITIONS.find((stage) => stage.id === item.stageId)?.label} · {formatThaiDate(item.createdAt, "datetime")}
                  {item.result.source === "azure" && ` · AI: ${OUTCOME_LABELS[item.result.outcome]} (คะแนน ${item.result.score?.toFixed(0) ?? "—"})`}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 lg:flex">
                {REVIEWS.map((review) => (
                  <Button key={review.value} variant={review.variant} size="sm" disabled={!!busy}
                    onClick={() => void confirm(item, review.value)}>
                    {review.label}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  );
}
