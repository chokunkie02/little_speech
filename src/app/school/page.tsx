"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, GraduationCap, Inbox, School, UserPlus } from "lucide-react";
import { SchoolArea, useSchoolArea } from "@/components/school-admin/SchoolArea";
import SchoolGuardianTools from "@/components/school/SchoolGuardianTools";
import { Avatar, Badge, ButtonLink, Card, CardContent, ResponsiveDataView, Section, StatCard, type DataColumn } from "@/components/ui";
import { cn } from "@/lib/cn";
import { compareClassrooms, type OverviewClassroom } from "@/lib/schoolAdmin";

const RING_MASK = "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))";

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
    <Card className="overflow-hidden">
      <div className="flex items-center gap-4 border-b border-border bg-gradient-to-r from-primary-soft to-surface px-5 py-4">
        <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
          <span className="absolute inset-0 rounded-full"
            style={{ background: `conic-gradient(var(--color-primary) ${Math.round((doneCount / steps.length) * 100)}%, var(--color-surface-muted) 0)`, WebkitMask: RING_MASK, mask: RING_MASK }} />
          <span className="font-display text-base font-semibold text-text">{doneCount}/{steps.length}</span>
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-medium text-text">เริ่มต้นใช้งานโรงเรียน</h2>
          <p className="text-sm text-text-muted">ทำแล้ว {doneCount} จาก {steps.length} ขั้น · ขั้นถัดไป: {steps.find((step) => !step.done)?.label}</p>
        </div>
      </div>
      <CardContent className="pt-3">
        <ol className="space-y-1">
          {steps.map((step, index) => {
            const isNext = !step.done && steps.findIndex((item) => !item.done) === index;
            return (
              <li key={step.label}>
                <Link href={step.href} className={cn("group flex items-center gap-3 rounded-control px-2.5 py-2.5 transition-colors hover:bg-surface-muted", isNext && "bg-primary-soft/60")}>
                  {step.done
                    ? <CheckCircle2 size={22} className="shrink-0 text-success-text" aria-hidden="true" />
                    : <span aria-hidden="true" className={cn("grid size-[22px] shrink-0 place-items-center rounded-full font-display text-xs font-semibold",
                        isNext ? "btn-primary text-primary-foreground" : "border border-border text-text-muted")}>{index + 1}</span>}
                  <span className={cn("min-w-0 flex-1 text-sm", step.done ? "text-text-muted line-through" : "font-medium text-text")}>{step.label}</span>
                  {isNext && <span className="hidden shrink-0 font-display text-caption font-medium text-primary-text sm:inline">ทำขั้นนี้ →</span>}
                  <span className="sr-only">{step.done ? "(เสร็จแล้ว)" : "(ยังไม่ได้ทำ)"}</span>
                </Link>
              </li>
            );
          })}
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
  const roomsWithoutTeacher = rooms.filter((room) => room.teachers.length === 0).length;
  const columns: DataColumn<OverviewClassroom>[] = [
    { key: "name", header: "ห้อง", hideOnMobile: true, cell: (room) => <span className="font-display text-base font-medium">{room.name}</span> },
    {
      key: "teacher", header: "ครูประจำห้อง",
      cell: (room) => room.teachers.length ? (
        <span className="flex items-center gap-2"><Avatar name={room.teachers[0].name} size="sm" /><span className="truncate">{room.teachers.map((teacher) => teacher.name).join(", ")}</span></span>
      ) : <Badge tone="warning" dot>ยังไม่มีครู</Badge>,
    },
    { key: "students", mobileStat: true, header: "นักเรียน", align: "right", cell: (room) => <span className="tabular-nums">{room.student_count}</span> },
    {
      key: "linked", mobileStat: true, header: "ผู้ปกครองเชื่อมแล้ว", align: "right",
      cell: (room) => (
        <span className="inline-flex items-center justify-end gap-2.5">
          <span aria-hidden="true" className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-muted sm:block">
            <span className="block h-full rounded-full bg-success" style={{ width: `${room.student_count ? (room.linked_count / room.student_count) * 100 : 0}%` }} />
          </span>
          <span className={cn("tabular-nums", room.student_count > 0 && room.linked_count < room.student_count && "text-warning-text")}>{room.linked_count}/{room.student_count}</span>
        </span>
      ),
    },
    { key: "practiced", mobileStat: true, header: "ฝึกใน 7 วัน", align: "right", cell: (room) => <span className="tabular-nums">{room.practiced_7d}</span> },
  ];

  return (
    <div className="space-y-6">
      <section aria-label="ภาพรวมโรงเรียน" className="hero-night relative overflow-hidden rounded-[1.5rem] p-5 sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgb(255_255_255/0.18)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(120deg,transparent_35%,#000_90%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-center">
          <dl className="grid grid-cols-3 divide-x divide-white/15">
            {[
              { label: "นักเรียน", value: totals.students, sub: " คน", ring: undefined },
              { label: "ผู้ปกครองเชื่อมแล้ว", value: totals.linked_students, sub: `/${totals.students}`, ring: totals.students ? totals.linked_students / totals.students : 0 },
              { label: "ฝึกใน 7 วัน", value: totals.practiced_7d, sub: `/${totals.students}`, ring: totals.students ? totals.practiced_7d / totals.students : 0 },
            ].map((item) => (
              <div key={item.label} className="px-3 first:pl-0 sm:px-5">
                <dt className="text-caption text-white/70">{item.label}</dt>
                <dd className="mt-1 flex items-center gap-2.5">
                  <span className="font-display text-[2.25rem] font-semibold leading-none tabular-nums">{item.value}<span className="text-base font-normal text-white/60">{item.sub}</span></span>
                  {item.ring !== undefined && (
                    <span aria-hidden="true" className="hidden size-9 rounded-full sm:block"
                      style={{ background: `conic-gradient(#FFD58A ${Math.round(item.ring * 100)}%, rgb(255 255 255 / 0.18) 0)`, WebkitMask: RING_MASK, mask: RING_MASK }} />
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <div className="rounded-[1.1rem] bg-white/10 p-4 ring-1 ring-inset ring-white/15 backdrop-blur-sm">
            <p className="font-display font-medium">สิ่งที่รอคุณ</p>
            <ul className="mt-2 space-y-2 text-sm text-white/85">
              <li className="flex items-center gap-2"><Inbox size={15} aria-hidden="true" className="shrink-0 text-[#FFD58A]" />
                {totals.pending_teachers > 0 ? `ครูรออนุมัติ ${totals.pending_teachers} คน` : "ไม่มีครูรออนุมัติ"}</li>
              <li className="flex items-center gap-2"><GraduationCap size={15} aria-hidden="true" className="shrink-0 text-[#FFD58A]" />
                {roomsWithoutTeacher > 0 ? `${roomsWithoutTeacher} ห้องยังไม่มีครูประจำ` : "ทุกห้องมีครูประจำแล้ว"}</li>
              <li className="flex items-center gap-2"><UserPlus size={15} aria-hidden="true" className="shrink-0 text-[#FFD58A]" />
                {totals.unassigned_students > 0 ? `นักเรียน ${totals.unassigned_students} คนยังไม่มีห้อง` : "นักเรียนทุกคนมีห้องแล้ว"}</li>
            </ul>
            {totals.pending_teachers > 0 && <ButtonLink href="/inbox" size="sm" block className="btn-gold mt-3">ไปอนุมัติครู</ButtonLink>}
          </div>
        </div>
      </section>
      <SetupChecklist />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="ห้องเรียน" value={totals.classrooms} icon={<School size={20} />} hint={`ปีการศึกษา ${overview.school.academic_year ?? "—"}`} />
        <StatCard label="ครู" value={totals.teachers} icon={<GraduationCap size={20} />} tone="info" hint={`ประจำห้องแล้ว ${rooms.length - roomsWithoutTeacher}/${rooms.length} ห้อง`} />
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
      <SchoolGuardianTools organizationId={orgId} onOpenClassroom={(id) => router.push(`/school/classrooms/${id}`)} />
    </div>
  );
}

export default function SchoolAdminPage() {
  return <SchoolArea><Overview /></SchoolArea>;
}
