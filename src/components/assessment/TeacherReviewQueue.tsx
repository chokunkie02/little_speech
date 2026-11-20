"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import { Avatar, Badge, Button, Card, DataLoadError, EmptyState, LoadingState, Section, toast } from "@/components/ui";
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
const REVIEWS: { value: Review; label: string; variant: "success" | "outline" | "ghost" }[] = [
  { value: "achieved", label: "ทำได้", variant: "success" },
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
      <ul className="grid gap-3">
        {items.map((item) => {
          const stage = STAGE_DEFINITIONS.find((entry) => entry.id === item.stageId)?.label;
          return (
            <li key={item.id}>
              <Card className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
                <div className="flex items-center gap-3 lg:w-52">
                  <Avatar name={item.childName} size="md" />
                  <div className="min-w-0">
                    <p className="truncate font-display font-medium text-text">{item.studentNumber ? `${item.studentNumber}. ` : ""}{item.childName}</p>
                    <p className="text-caption text-text-muted">{formatThaiDate(item.createdAt, "datetime")}</p>
                  </div>
                </div>
                <div className="flex min-w-0 items-center gap-4 rounded-[1rem] bg-surface-muted/70 px-4 py-3">
                  <p className="shrink-0 font-display text-[1.75rem] font-semibold leading-none text-text">“{item.referenceText}”</p>
                  <div className="min-w-0 space-y-1">
                    <p className="text-caption text-text-muted">{stage}</p>
                    <Badge tone={item.result.source === "azure" ? "info" : "neutral"}>
                      {item.result.source === "azure"
                        ? `AI แนะนำ: ${OUTCOME_LABELS[item.result.outcome]} · ${item.result.score?.toFixed(0) ?? "—"} คะแนน`
                        : OUTCOME_LABELS[item.result.outcome]}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 lg:flex" role="group" aria-label={`ผลของ ${item.childName}`}>
                  {REVIEWS.map((review) => (
                    <Button key={review.value} variant={review.variant} size="sm" disabled={!!busy}
                      className={review.value === "practice" ? "border-warning/50 text-warning-text hover:bg-warning-soft" : undefined}
                      onClick={() => void confirm(item, review.value)}>
                      {review.label}
                    </Button>
                  ))}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
