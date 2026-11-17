"use client";

import { useEffect, useState } from "react";
import { CalendarRange, Undo2 } from "lucide-react";
import { SchoolArea, useSchoolArea } from "@/components/school-admin/SchoolArea";
import { Alert, Button, ButtonLink, Card, CardContent, CardHeader, ConfirmDialog, FormField, Select, toast } from "@/components/ui";
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
      <Card>
        <CardHeader title="ปีการศึกษาปัจจุบัน" description="ห้องเรียนที่สร้างใหม่จะอยู่ในปีการศึกษานี้" />
        <CardContent>
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
            <FormField label="ปีการศึกษา (พ.ศ.)" className="min-w-40" hint={overview.school.academic_year ? `ตอนนี้: ${overview.school.academic_year}` : `แนะนำ: ${suggested}`}>
              <Select value={year} onChange={(event) => setYear(event.target.value)}>
                {options.map((option) => <option key={option}>{option}</option>)}
              </Select>
            </FormField>
            <Button type="submit" loading={busy} disabled={year === overview.school.academic_year}>บันทึก</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="เลื่อนชั้นขึ้นปีการศึกษาใหม่"
          description="ทำครั้งเดียวตอนขึ้นปีใหม่ ทุกห้องเลื่อนไปชั้นถัดไป ชั้นสุดท้ายบันทึกจบการศึกษา ผู้ปกครองและผลการฝึกยังอยู่ครบ" />
        <CardContent className="space-y-3">
          {overview.school.academic_year && (
            <ButtonLink href="/school/promote" icon={<CalendarRange size={16} aria-hidden="true" />}>
              เลื่อนชั้น {overview.school.academic_year} → {Number(overview.school.academic_year) + 1}
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
