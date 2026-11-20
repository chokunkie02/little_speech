"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, CalendarRange, CheckCircle2, Undo2 } from "lucide-react";
import { SchoolArea, useSchoolArea } from "@/components/school-admin/SchoolArea";
import { Alert, Button, ButtonLink, Card, CardContent, ConfirmDialog, FormField, Select, toast } from "@/components/ui";
import { latestSchoolPromotion, setAcademicYear, undoSchoolPromotion, type LatestPromotion } from "@/lib/schoolAdmin";
import { formatThaiDate, toBuddhistYear } from "@/lib/thaiDate";

/** Thai academic year starts in May: before May the current year is last year's. */
function currentAcademicYear(today = new Date()) {
  return toBuddhistYear(today.getMonth() < 4 ? today.getFullYear() - 1 : today.getFullYear());
}

/** Undo for the latest promotion (within 14 days). */
function LatestPromotionCard() {
  const { orgId, overview, reload } = useSchoolArea();
  const [latest, setLatest] = useState<{ key: string; value: LatestPromotion }>();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const key = `${orgId}:${overview.school.academic_year}`;

  useEffect(() => {
    let active = true;
    latestSchoolPromotion(orgId).then((value) => { if (active) setLatest({ key, value }); }, () => { if (active) setLatest({ key, value: null }); });
    return () => { active = false; };
  }, [orgId, key]);

  const promotion = latest?.key === key ? latest.value : null;
  if (!promotion) return null;
  return (
    <Alert tone="warning" title={`เลื่อนชั้น ${promotion.from_year} → ${promotion.to_year} เมื่อ ${formatThaiDate(promotion.created_at, "datetime")}`}
      action={<Button size="sm" variant="outline" icon={<Undo2 size={14} aria-hidden="true" />} onClick={() => setConfirming(true)}>ย้อนกลับ</Button>}>
      นักเรียน {promotion.students} คน (จบการศึกษา {promotion.graduated} คน) · ย้อนกลับได้ภายใน 14 วัน
      <ConfirmDialog
        open={confirming}
        tone="danger"
        title={`ย้อนกลับไปปีการศึกษา ${promotion.from_year}?`}
        description="นักเรียนกลับไปห้องเดิมพร้อมเลขที่เดิม ห้องปีใหม่ที่ระบบสร้างและยังว่างจะถูกลบ ถ้าห้องปีใหม่มีนักเรียนที่เพิ่มทีหลัง ต้องย้ายออกก่อน"
        confirmLabel="ย้อนกลับ"
        loading={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            const restored = await undoSchoolPromotion(promotion.id);
            toast.success(`ย้อนกลับแล้ว ${restored} คน`, `ปีการศึกษาปัจจุบัน ${promotion.from_year}`);
            setConfirming(false);
            reload();
          } catch (cause) {
            toast.error("ย้อนกลับไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
          } finally {
            setBusy(false);
          }
        }}
      />
    </Alert>
  );
}

function Settings() {
  const { overview, orgId, reload } = useSchoolArea();
  const suggested = currentAcademicYear();
  const [year, setYear] = useState(overview.school.academic_year ?? String(suggested));
  const [busy, setBusy] = useState(false);
  const options = Array.from({ length: 5 }, (_, index) => String(suggested - 2 + index));

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <Card className="overflow-hidden">
        <div className="hero-night relative flex items-center gap-4 px-5 py-5">
          <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-[0.9rem] bg-white/15 ring-1 ring-inset ring-white/20"><CalendarDays size={22} /></span>
          <div className="min-w-0">
            <p className="text-caption text-white/70">ปีการศึกษาปัจจุบัน</p>
            <p className="font-display text-[2.25rem] font-semibold leading-none tabular-nums">{overview.school.academic_year ?? "ยังไม่ได้ตั้ง"}</p>
          </div>
        </div>
        <CardContent className="space-y-3 pt-4">
          <p className="text-sm text-text-muted">ห้องเรียนที่สร้างใหม่จะอยู่ในปีการศึกษานี้ ปกติเปลี่ยนเองผ่านการเลื่อนชั้นตอนขึ้นปีใหม่</p>
          <form className="flex flex-wrap items-end gap-3" onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              await setAcademicYear(orgId, year);
              toast.success(`ตั้งปีการศึกษา ${year} แล้ว`);
              reload();
            } catch (cause) {
              toast.error("บันทึกไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
            } finally {
              setBusy(false);
            }
          }}>
            <FormField label="ปีการศึกษา (พ.ศ.)" className="min-w-40">
              <Select value={year} onChange={(event) => setYear(event.target.value)}>
                {options.map((option) => <option key={option}>{option}</option>)}
              </Select>
            </FormField>
            <Button type="submit" loading={busy} disabled={year === overview.school.academic_year}>บันทึก</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-medium text-text">เลื่อนชั้นขึ้นปีการศึกษาใหม่</h2>
            <p className="mt-1 text-sm text-text-muted">ทำครั้งเดียวตอนขึ้นปีใหม่</p>
          </div>
          {overview.school.academic_year && (
            <div className="flex items-center justify-center gap-3 rounded-[1rem] bg-surface-muted px-4 py-4">
              <span className="rounded-[0.8rem] border border-border bg-surface px-4 py-2 font-display text-xl font-semibold tabular-nums text-text-muted">{overview.school.academic_year}</span>
              <ArrowRight size={20} className="text-primary-text" aria-hidden="true" />
              <span className="btn-primary rounded-[0.8rem] px-4 py-2 font-display text-xl font-semibold tabular-nums text-primary-foreground">{Number(overview.school.academic_year) + 1}</span>
            </div>
          )}
          <ul className="space-y-2 text-sm text-text">
            {["ทุกห้องเลื่อนไปชั้นถัดไป พร้อมเลขที่เดิม", "ชั้นสุดท้ายบันทึกว่าจบการศึกษา", "ผู้ปกครองและผลการฝึกยังอยู่ครบ", "ย้อนกลับได้ภายใน 14 วัน"].map((item) => (
              <li key={item} className="flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success-text" aria-hidden="true" />{item}</li>
            ))}
          </ul>
          {overview.school.academic_year && (
            <ButtonLink href="/school/promote" block icon={<CalendarRange size={16} aria-hidden="true" />}>
              ตรวจปลายทางและเลื่อนชั้น
            </ButtonLink>
          )}
          <LatestPromotionCard />
        </CardContent>
      </Card>
    </div>
  );
}

export default function SchoolSettingsPage() {
  return <SchoolArea title="ตั้งค่าโรงเรียน"><Settings /></SchoolArea>;
}
