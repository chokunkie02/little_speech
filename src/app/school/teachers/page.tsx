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
      cell: (teacher) => <span className="flex items-center gap-2"><Avatar name={teacher.name} size="sm" /><span className="font-medium">{teacher.name}</span></span>,
    },
    { key: "email", header: "อีเมล", cell: (teacher) => <span className="break-all text-text-muted">{teacher.email}</span> },
    {
      key: "rooms", header: "ห้องที่ดูแล",
      cell: (teacher) => teacher.classrooms.length ? (
        <span className="flex flex-wrap gap-1">{teacher.classrooms.map((room) => (
          <Link key={room.id} href={`/school/classrooms/${room.id}`}>
            <Badge tone={room.is_primary ? "primary" : "neutral"} icon={room.is_primary ? <Star size={11} /> : undefined}>{room.name}</Badge>
          </Link>
        ))}</span>
      ) : <Badge tone="warning">ยังไม่มีห้อง</Badge>,
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
      <Section className="lg:col-start-1 lg:row-start-1" title={`ครูในโรงเรียน (${overview.teachers.length})`} description="จัดครูเข้าห้องได้ที่หน้าของแต่ละห้อง ★ คือครูหลักของห้อง">
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
              mobileTitle={(teacher) => teacher.name}
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
