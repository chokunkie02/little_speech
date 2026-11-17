"use client";

import { useState } from "react";
import { ArrowRight, GraduationCap } from "lucide-react";
import { SchoolArea, useSchoolArea } from "@/components/school-admin/SchoolArea";
import {
  Alert, Badge, Button, ButtonLink, Card, CardContent, ConfirmDialog, EmptyState, FormField, Input, Select, Switch,
  Table, TBody, TD, TH, THead, TR, toast,
} from "@/components/ui";
import {
  compareClassrooms, promoteSchoolYear, suggestPromotion, type PromotionAction, type PromotionResult, type PromotionStep,
} from "@/lib/schoolAdmin";

const ACTION_LABELS: Record<PromotionAction, string> = { promote: "เลื่อนชั้น", graduate: "จบการศึกษา", skip: "ไม่เปลี่ยน" };

function Promote() {
  const { overview, orgId, reload } = useSchoolArea();
  const fromYear = overview.school.academic_year;
  const toYear = fromYear ? String(Number(fromYear) + 1) : null;
  const rooms = overview.classrooms.filter((room) => !room.archived_at && room.academic_year === fromYear).sort(compareClassrooms);
  const schoolGrades = new Set(rooms.map((room) => room.grade_level).filter((grade): grade is string => Boolean(grade)));
  const [plan, setPlan] = useState<Record<string, Omit<PromotionStep, "classroom_id">>>(() =>
    Object.fromEntries(rooms.map((room) => [room.id, suggestPromotion(room, schoolGrades)])));
  const [keepTeachers, setKeepTeachers] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PromotionResult>();

  if (!fromYear || !toYear) {
    return <Alert tone="warning" title="ยังไม่ได้ตั้งปีการศึกษา" action={<ButtonLink href="/school/settings" size="sm">ไปตั้งค่า</ButtonLink>} />;
  }
  if (result) {
    return (
      <Card><CardContent className="space-y-4 text-center">
        <GraduationCap size={40} className="mx-auto text-success-text" aria-hidden="true" />
        <div className="space-y-1">
          <h2 className="text-section-title">ขึ้นปีการศึกษา {result.to_year} แล้ว</h2>
          <p className="text-sm text-text-muted">
            เลื่อนชั้น {result.promoted} คน · จบการศึกษา {result.graduated} คน · สร้างห้องใหม่ {result.created_classrooms} ห้อง
          </p>
          <p className="text-caption text-text-muted">ถ้าผิดพลาด ย้อนกลับได้ภายใน 14 วันที่หน้าตั้งค่า</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <ButtonLink href="/school/classrooms">ดูห้องเรียนปีใหม่</ButtonLink>
          <ButtonLink href="/school/settings" variant="outline">ไปหน้าตั้งค่า</ButtonLink>
        </div>
      </CardContent></Card>
    );
  }
  if (rooms.length === 0) {
    return <EmptyState icon={<GraduationCap size={22} />} title={`ไม่มีห้องเรียนของปี ${fromYear}`} description="สร้างห้องเรียนของปีการศึกษาปัจจุบันก่อน" />;
  }

  const steps = rooms.map((room) => ({ room, step: plan[room.id] ?? { action: "skip" as const } }));
  const count = (action: PromotionAction) => steps.filter(({ step }) => step.action === action).reduce((sum, { room }) => sum + room.student_count, 0);
  const missingName = steps.some(({ step }) => step.action === "promote" && !step.target_name?.trim());
  const update = (id: string, change: Partial<Omit<PromotionStep, "classroom_id">>) =>
    setPlan((current) => ({ ...current, [id]: { ...current[id], ...change } }));

  async function run() {
    setBusy(true);
    try {
      const outcome = await promoteSchoolYear(orgId,
        steps.map(({ room, step }) => ({ classroom_id: room.id, ...step, target_name: step.target_name?.trim() })), keepTeachers);
      setResult(outcome);
      toast.success(`ขึ้นปีการศึกษา ${outcome.to_year} แล้ว`);
      reload();
    } catch (cause) {
      toast.error("เลื่อนชั้นไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  // Plain render functions (not components) so the name inputs keep focus while typing.
  type Row = (typeof steps)[number];
  const actionSelect = ({ room, step }: Row) => (
    <Select aria-label={`ปลายทางของ ${room.name}`} value={step.action} className="min-w-36"
      onChange={(event) => {
        const action = event.target.value as PromotionAction;
        const suggested = suggestPromotion(room, schoolGrades);
        update(room.id, action === "promote"
          ? { action, target_name: step.target_name ?? suggested.target_name ?? room.name, target_grade: step.target_grade ?? suggested.target_grade }
          : { action });
      }}>
      {(Object.keys(ACTION_LABELS) as PromotionAction[]).map((action) => <option key={action} value={action}>{ACTION_LABELS[action]}</option>)}
    </Select>
  );
  const targetCell = ({ room, step }: Row) => step.action === "promote" ? (
    <span className="flex items-center gap-2">
      <ArrowRight size={14} className="shrink-0 text-text-muted" aria-hidden="true" />
      <Input aria-label={`ชื่อห้องปีใหม่ของ ${room.name}`} value={step.target_name ?? ""} maxLength={40} className="h-9! min-w-28"
        onChange={(event) => update(room.id, { target_name: event.target.value })} />
    </span>
  ) : step.action === "graduate" ? <Badge tone="success" icon={<GraduationCap size={12} />}>จบการศึกษา</Badge>
    : <span className="text-sm text-text-muted">ห้องอยู่ปีเดิม</span>;

  return (
    <div className="space-y-5">
      <Alert tone="info" title={`ปีการศึกษา ${fromYear} → ${toYear}`}>
        ตรวจปลายทางของแต่ละห้อง ห้องปีเดิมจะถูกเก็บเข้าคลัง นักเรียนย้ายไปห้องปีใหม่พร้อมเลขที่เดิม ผู้ปกครองและผลการฝึกยังอยู่ครบ
      </Alert>

      {/* Same choices twice: a table on desktop, one card per room on phones (four columns do not fit). */}
      <div className="hidden md:block">
        <Table>
          <caption className="sr-only">ปลายทางของแต่ละห้อง</caption>
          <THead><tr><TH>ห้องปี {fromYear}</TH><TH className="text-right">นักเรียน</TH><TH>ทำอะไร</TH><TH>ห้องปี {toYear}</TH></tr></THead>
          <TBody>
            {steps.map(({ room, step }) => (
              <TR key={room.id}>
                <TD className="font-semibold">{room.name}</TD>
                <TD className="text-right tabular-nums">{room.student_count}</TD>
                <TD>{actionSelect({ room, step })}</TD>
                <TD>{targetCell({ room, step })}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
      <ul className="space-y-3 md:hidden" aria-label="ปลายทางของแต่ละห้อง">
        {steps.map(({ room, step }) => (
          <li key={room.id}>
            <Card><CardContent className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-card-title">{room.name}</p>
                <p className="text-sm text-text-muted tabular-nums">{room.student_count} คน</p>
              </div>
              {actionSelect({ room, step })}
              {targetCell({ room, step })}
            </CardContent></Card>
          </li>
        ))}
      </ul>

      <FormField label="ให้ครูประจำห้องเดิมดูแลห้องปีใหม่ต่อ" hint="ปิดไว้ถ้าจะจัดครูใหม่ทั้งหมดหลังเลื่อนชั้น" inline>
        <Switch checked={keepTeachers} onCheckedChange={setKeepTeachers} />
      </FormField>

      <Card><CardContent className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm">
          เลื่อนชั้น <strong className="tabular-nums">{count("promote")}</strong> คน · จบการศึกษา <strong className="tabular-nums">{count("graduate")}</strong> คน
          {count("skip") > 0 && <> · ไม่เปลี่ยน <strong className="tabular-nums">{count("skip")}</strong> คน</>}
        </p>
        <Button onClick={() => setConfirming(true)} disabled={missingName}>{missingName ? "ตั้งชื่อห้องปีใหม่ให้ครบ" : `ขึ้นปีการศึกษา ${toYear}`}</Button>
      </CardContent></Card>

      <ConfirmDialog
        open={confirming}
        title={`ขึ้นปีการศึกษา ${toYear}?`}
        description={`เลื่อนชั้น ${count("promote")} คน และบันทึกจบการศึกษา ${count("graduate")} คน ปีการศึกษาปัจจุบันจะเปลี่ยนเป็น ${toYear} ย้อนกลับได้ภายใน 14 วันที่หน้าตั้งค่า`}
        confirmLabel="ขึ้นปีการศึกษาใหม่"
        loading={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void run()}
      />
    </div>
  );
}

export default function PromotePage() {
  return (
    <SchoolArea title="เลื่อนชั้นขึ้นปีการศึกษาใหม่" back={{ href: "/school/settings", label: "ตั้งค่าโรงเรียน" }}>
      <Promote />
    </SchoolArea>
  );
}
