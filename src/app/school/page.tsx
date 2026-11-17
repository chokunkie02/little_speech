"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, CheckCircle2, Circle, GraduationCap, Link2, School, Users } from "lucide-react";
import { SchoolArea, useSchoolArea } from "@/components/school-admin/SchoolArea";
import SchoolGuardianTools from "@/components/school/SchoolGuardianTools";
import { Alert, Badge, ButtonLink, Card, CardContent, CardHeader, ResponsiveDataView, Section, StatCard, type DataColumn } from "@/components/ui";
import { cn } from "@/lib/cn";
import { compareClassrooms, type OverviewClassroom } from "@/lib/schoolAdmin";

function SetupChecklist() {
  const { overview } = useSchoolArea();
  const { totals, school } = overview;
  const steps = [
    { done: Boolean(school.academic_year), label: "ตั้งปีการศึกษาปัจจุบัน", href: "/school/settings" },
    { done: totals.classrooms > 0, label: "สร้างห้องเรียน", href: "/school/classrooms" },
    { done: totals.teachers > 0, label: "ให้ครูเข้าร่วมด้วยรหัสโรงเรียน แล้วจัดเข้าห้อง", href: "/school/teachers" },
    { done: totals.students > 0, label: "เพิ่มนักเรียนในแต่ละห้อง (พิมพ์ วาง หรือนำเข้าไฟล์)", href: "/school/classrooms" },
    { done: totals.linked_students > 0, label: "พิมพ์ใบเชิญผู้ปกครองให้นักเรียนนำกลับบ้าน", href: "/school/classrooms" },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  if (doneCount === steps.length) return null;
  return (
    <Card>
      <CardHeader title="เริ่มต้นใช้งานโรงเรียน" description={`ทำแล้ว ${doneCount} จาก ${steps.length} ขั้น`}
        action={<div className="h-2 w-28 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
          <div className="h-full rounded-full bg-primary" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>} />
      <CardContent>
        <ol className="space-y-1">
          {steps.map((step, index) => (
            <li key={step.label}>
              <Link href={step.href} className="flex items-center gap-3 rounded-control px-2 py-2 transition-colors hover:bg-surface-muted">
                {step.done
                  ? <CheckCircle2 size={20} className="shrink-0 text-success-text" aria-hidden="true" />
                  : <Circle size={20} className="shrink-0 text-text-muted" aria-hidden="true" />}
                <span className={cn("text-sm", step.done ? "text-text-muted line-through" : "font-medium text-text")}>
                  {index + 1}. {step.label}
                </span>
                <span className="sr-only">{step.done ? "(เสร็จแล้ว)" : "(ยังไม่ได้ทำ)"}</span>
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function Overview() {
  const router = useRouter();
  const { overview, orgId } = useSchoolArea();
  const { totals } = overview;
  const rooms = overview.classrooms.filter((room) => !room.archived_at).sort(compareClassrooms);
  const columns: DataColumn<OverviewClassroom>[] = [
    { key: "name", header: "ห้อง", hideOnMobile: true, cell: (room) => <span className="font-semibold">{room.name}</span> },
    {
      key: "teacher", header: "ครูประจำห้อง",
      cell: (room) => room.teachers.length ? room.teachers.map((teacher) => teacher.name).join(", ") : <Badge tone="warning">ยังไม่มีครู</Badge>,
    },
    { key: "students", mobileStat: true, header: "นักเรียน", align: "right", cell: (room) => <span className="tabular-nums">{room.student_count}</span> },
    {
      key: "linked", mobileStat: true, header: "ผู้ปกครองเชื่อมแล้ว", align: "right",
      cell: (room) => <span className={cn("tabular-nums", room.student_count > 0 && room.linked_count < room.student_count && "text-warning-text")}>
        {room.linked_count}/{room.student_count}</span>,
    },
    { key: "practiced", mobileStat: true, header: "ฝึกใน 7 วัน", align: "right", cell: (room) => <span className="tabular-nums">{room.practiced_7d}</span> },
  ];

  return (
    <div className="space-y-6">
      {totals.pending_teachers > 0 && (
        <Alert tone="warning" title={`มีครูรออนุมัติ ${totals.pending_teachers} คน`} action={<ButtonLink href="/inbox" size="sm">ไปอนุมัติ</ButtonLink>}>
          อนุมัติและเลือกห้องประจำได้จากกล่องข้อความ
        </Alert>
      )}
      <SetupChecklist />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="ห้องเรียน" value={totals.classrooms} icon={<School size={20} />} />
        <StatCard label="ครู" value={totals.teachers} icon={<GraduationCap size={20} />} tone="info" />
        <StatCard label="นักเรียน" value={totals.students} icon={<Users size={20} />} tone="success"
          hint={totals.unassigned_students > 0 ? `${totals.unassigned_students} คนยังไม่มีห้อง` : undefined} />
        <StatCard label="ผู้ปกครองเชื่อมแล้ว" value={`${totals.linked_students}/${totals.students}`} icon={<Link2 size={20} />} tone="warning"
          hint={<span className="inline-flex items-center gap-1"><Activity size={12} aria-hidden="true" />ฝึกใน 7 วัน {totals.practiced_7d} คน</span>} />
      </div>
      <Section title="ห้องเรียน" action={<ButtonLink href="/school/classrooms" size="sm" variant="outline">จัดการห้องเรียน</ButtonLink>}>
        <ResponsiveDataView
          caption="ห้องเรียนทั้งหมด"
          rows={rooms}
          columns={columns}
          rowKey={(room) => room.id}
          mobileTitle={(room) => room.name}
          onRowClick={(room) => router.push(`/school/classrooms/${room.id}`)}
          empty={<Card dashed><CardContent className="text-center text-sm text-text-muted">ยังไม่มีห้องเรียน เริ่มจากสร้างห้องเรียนก่อน</CardContent></Card>}
        />
      </Section>
      <Section title="ค้นหาในโรงเรียน" description="หานักเรียน ครู หรือผู้ปกครองด้วยชื่อ รหัส ห้อง หรืออีเมล">
        <SchoolGuardianTools organizationId={orgId} onOpenClassroom={(id) => router.push(`/school/classrooms/${id}`)} />
      </Section>
    </div>
  );
}

export default function SchoolAdminPage() {
  return <SchoolArea><Overview /></SchoolArea>;
}
