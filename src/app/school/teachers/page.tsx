"use client";

import Link from "next/link";
import { useState } from "react";
import { GraduationCap, MoreHorizontal, Star, UserMinus } from "lucide-react";
import { SchoolArea, useSchoolArea } from "@/components/school-admin/SchoolArea";
import SchoolTeacherInvitations from "@/components/school/SchoolTeacherInvitations";
import {
  Avatar, Badge, ConfirmDialog, DropdownMenu, EmptyState, FilterBar, ResponsiveDataView, Section, toast, type DataColumn,
} from "@/components/ui";
import { compareThai, removeSchoolTeacher, type OverviewTeacher } from "@/lib/schoolAdmin";

function Teachers() {
  const { overview, orgId, reload } = useSchoolArea();
  const [search, setSearch] = useState("");
  const [removing, setRemoving] = useState<OverviewTeacher | null>(null);
  const [busy, setBusy] = useState(false);
  const term = search.trim().toLocaleLowerCase("th");
  const teachers = overview.teachers
    .filter((teacher) => !term || teacher.name.toLocaleLowerCase("th").includes(term) || teacher.email.toLowerCase().includes(term)
      || teacher.classrooms.some((room) => room.name.toLocaleLowerCase("th").includes(term)))
    .sort((a, b) => compareThai(a.name, b.name));

  const columns: DataColumn<OverviewTeacher>[] = [
    {
      key: "name", header: "ครู", hideOnMobile: true,
      cell: (teacher) => (
        <span className="flex items-center gap-3">
          <Avatar name={teacher.name} />
          <span className="min-w-0">
            <span className="block font-display text-[0.9375rem] font-medium text-text">{teacher.name}</span>
            <span className="block break-all text-caption text-text-muted">{teacher.email}</span>
          </span>
        </span>
      ),
    },
    {
      key: "rooms", header: "ห้องที่ดูแล",
      cell: (teacher) => teacher.classrooms.length ? (
        <span className="flex flex-wrap gap-1">{teacher.classrooms.map((room) => (
          <Link key={room.id} href={`/school/classrooms/${room.id}`}
            className={room.is_primary
              ? "btn-primary inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-display text-xs font-medium text-primary-foreground"
              : "inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 font-display text-xs font-medium text-text hover:border-primary/40"}>
            {room.is_primary && <Star size={11} aria-hidden="true" className="fill-current" />}{room.name}
            {room.is_primary && <span className="sr-only">(ครูหลัก)</span>}
          </Link>
        ))}</span>
      ) : <Badge tone="warning" dot>ยังไม่มีห้อง</Badge>,
    },
    {
      key: "actions", header: <span className="sr-only">ตัวเลือก</span>, align: "right", hideOnMobile: true,
      cell: (teacher) => (
        <DropdownMenu label={`ตัวเลือกของ ${teacher.name}`} trigger={<MoreHorizontal size={18} aria-hidden="true" />} items={[
          { label: "นำออกจากโรงเรียน", icon: <UserMinus size={15} />, danger: true, onSelect: () => setRemoving(teacher) },
        ]} />
      ),
    },
  ];

  return (
    // Desktop: the teacher table gets the width, the join code sits in a column on the right.
    // Phones: the join code comes first (it is how teachers get in).
    <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6 lg:space-y-0">
      <div className="lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1">
        <SchoolTeacherInvitations organizationId={orgId} />
      </div>
      <Section className="lg:col-start-1 lg:row-start-1" title={`ครูในโรงเรียน · ${overview.teachers.length}`} description="จัดครูเข้าห้องได้ที่หน้าของแต่ละห้อง ป้ายสีม่วงมีดาวคือห้องที่เป็นครูหลัก">
        {overview.teachers.length > 0 && (
          <dl className="grid grid-cols-3 gap-3">
            {[
              { label: "ครูทั้งหมด", value: overview.teachers.length, tone: "text-text" },
              { label: "เป็นครูหลักแล้ว", value: overview.teachers.filter((teacher) => teacher.classrooms.some((room) => room.is_primary)).length, tone: "text-primary-text" },
              { label: "ยังไม่มีห้อง", value: overview.teachers.filter((teacher) => teacher.classrooms.length === 0).length, tone: "text-warning-text" },
            ].map((item) => (
              <div key={item.label} className="rounded-card border border-border bg-surface px-4 py-3 shadow-card">
                <dt className="text-caption text-text-muted">{item.label}</dt>
                <dd className={`mt-0.5 font-display text-[1.75rem] font-semibold leading-none tabular-nums ${item.tone}`}>{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {overview.teachers.length === 0 ? (
          <EmptyState icon={<GraduationCap size={22} />} title="ยังไม่มีครู" description="ส่งรหัสเข้าร่วมด้านบนให้ครู เมื่อครูสมัครแล้ว คำขอจะเข้ากล่องข้อความให้คุณอนุมัติ" />
        ) : (
          <>
            <FilterBar search={{ value: search, onChange: setSearch, placeholder: "ค้นหาชื่อ อีเมล หรือห้อง" }} resultText={`${teachers.length} คน`} />
            <ResponsiveDataView
              caption="ครูในโรงเรียน"
              rows={teachers}
              columns={columns}
              rowKey={(teacher) => teacher.user_id}
              mobileTitle={(teacher) => <span className="flex items-center gap-2.5"><Avatar name={teacher.name} size="sm" /><span className="min-w-0"><span className="block">{teacher.name}</span><span className="block break-all text-caption font-normal text-text-muted">{teacher.email}</span></span></span>}
              mobileAside={(teacher) => (
                <DropdownMenu label={`ตัวเลือกของ ${teacher.name}`} trigger={<MoreHorizontal size={18} aria-hidden="true" />} items={[
                  { label: "นำออกจากโรงเรียน", icon: <UserMinus size={15} />, danger: true, onSelect: () => setRemoving(teacher) },
                ]} />
              )}
              empty={<EmptyState title="ไม่พบครูที่ตรงกับคำค้น" />}
            />
          </>
        )}
      </Section>
      <ConfirmDialog
        open={Boolean(removing)}
        tone="danger"
        title={`นำ ${removing?.name ?? ""} ออกจากโรงเรียน?`}
        description={`ครูจะออกจากทุกห้อง${removing?.classrooms.length ? ` (${removing.classrooms.map((room) => room.name).join(", ")})` : ""} และไม่เห็นข้อมูลนักเรียนอีก ถ้าจะกลับมา ต้องใช้รหัสโรงเรียนและรออนุมัติใหม่`}
        confirmLabel="นำออก"
        loading={busy}
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          setBusy(true);
          try {
            await removeSchoolTeacher(orgId, removing.user_id);
            toast.success(`นำ ${removing.name} ออกจากโรงเรียนแล้ว`);
            reload();
            setRemoving(null);
          } catch (cause) {
            toast.error("ทำรายการไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

export default function TeachersPage() {
  return <SchoolArea title="ครู"><Teachers /></SchoolArea>;
}
