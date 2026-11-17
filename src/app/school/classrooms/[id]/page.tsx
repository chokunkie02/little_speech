"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Printer, Star, Users } from "lucide-react";
import { SchoolArea, useSchoolArea } from "@/components/school-admin/SchoolArea";
import { ClassroomRoster } from "@/components/school-admin/ClassroomRoster";
import { JoinCodeCard } from "@/components/join/JoinCodeCard";
import {
  Alert, Avatar, Badge, Button, ButtonLink, Card, CardContent, ConfirmDialog, EmptyState, FormField, SearchPicker, Tabs, toast,
} from "@/components/ui";
import {
  assignTeacher, compareClassrooms, setPrimaryTeacher, unassignTeacher, type OverviewClassroom,
} from "@/lib/schoolAdmin";

// ── students tab ────────────────────────────────────────────────────────────

function StudentsTab({ room }: { room: OverviewClassroom }) {
  const { overview, reload } = useSchoolArea();
  const otherRooms = overview.classrooms.filter((other) => other.id !== room.id && !other.archived_at).sort(compareClassrooms);
  return (
    <ClassroomRoster mode="admin" classroomId={room.id} classroomName={room.name} archived={Boolean(room.archived_at)}
      otherRooms={otherRooms} onChanged={reload} />
  );
}

// ── teachers tab ────────────────────────────────────────────────────────────

function TeachersTab({ room }: { room: OverviewClassroom }) {
  const { overview, reload } = useSchoolArea();
  const [removing, setRemoving] = useState<{ user_id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const inRoom = new Set(room.teachers.map((teacher) => teacher.user_id));

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      reload();
    } catch (cause) {
      toast.error("ทำรายการไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-4">
      {room.teachers.length === 0 ? (
        <Alert tone="warning" title="ห้องนี้ยังไม่มีครู">เลือกครูจากช่องค้นหาด้านล่าง ครูคนแรกจะเป็นครูหลักของห้อง</Alert>
      ) : (
        <Card><ul className="divide-y divide-border">
          {room.teachers.map((teacher) => (
            <li key={teacher.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar name={teacher.name} size="sm" />
              <span className="min-w-0 flex-1 break-words font-medium">{teacher.name}</span>
              {teacher.is_primary
                ? <Badge tone="primary" icon={<Star size={12} />}>ครูหลัก</Badge>
                : <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run(() => setPrimaryTeacher(room.id, teacher.user_id), `${teacher.name} เป็นครูหลักแล้ว`)}>ตั้งเป็นครูหลัก</Button>}
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setRemoving(teacher)}>นำออก</Button>
            </li>
          ))}
        </ul></Card>
      )}

      {overview.teachers.length === 0 ? (
        <Alert tone="info" title="โรงเรียนยังไม่มีครู" action={<ButtonLink href="/school/teachers" size="sm">ไปที่หน้าครู</ButtonLink>}>
          ส่งรหัสโรงเรียนให้ครูสมัครเองก่อน แล้วจึงเลือกครูเข้าห้องได้
        </Alert>
      ) : (
        <FormField label="เพิ่มครูเข้าห้อง" hint="ค้นหาจากครูในโรงเรียนด้วยชื่อหรืออีเมล">
          <SearchPicker
            label="ค้นหาครูในโรงเรียน"
            placeholder="พิมพ์ชื่อหรืออีเมลครู"
            minChars={0}
            search={async (query) => {
              const term = query.toLocaleLowerCase("th");
              return overview.teachers
                .filter((teacher) => !term || teacher.name.toLocaleLowerCase("th").includes(term) || teacher.email.toLowerCase().includes(term))
                .map((teacher) => ({
                  id: teacher.user_id, label: teacher.name, avatarName: teacher.name,
                  description: [teacher.email, teacher.classrooms.map((classroom) => classroom.name).join(", ")].filter(Boolean).join(" · "),
                  disabled: inRoom.has(teacher.user_id), disabledReason: "อยู่ในห้องนี้แล้ว",
                }));
            }}
            onSelect={(option) => void run(() => assignTeacher(room.id, option.id), `เพิ่ม ${option.label} เข้าห้อง ${room.name} แล้ว`)}
          />
        </FormField>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        tone="danger"
        title={`นำ ${removing?.name ?? ""} ออกจากห้อง ${room.name}?`}
        description="ครูยังอยู่ในโรงเรียน แค่ไม่เห็นนักเรียนห้องนี้ ถ้าเป็นครูหลัก ครูคนถัดไปจะเป็นครูหลักแทน"
        confirmLabel="นำออก"
        loading={busy}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && void run(() => unassignTeacher(room.id, removing.user_id), `นำ ${removing.name} ออกจากห้องแล้ว`)}
      />
    </div>
  );
}

// ── page ────────────────────────────────────────────────────────────────────

function ClassroomDetail({ id }: { id: string }) {
  const { overview } = useSchoolArea();
  const [tab, setTab] = useState<"students" | "teachers" | "invites">("students");
  const room = overview.classrooms.find((classroom) => classroom.id === id);
  if (!room) return <EmptyState title="ไม่พบห้องเรียนนี้" action={<ButtonLink href="/school/classrooms">กลับไปหน้าห้องเรียน</ButtonLink>} />;

  return (
    <div className="space-y-4">
      {room.archived_at && <Alert tone="info" title="ห้องนี้ถูกเก็บเข้าคลังแล้ว">ดูข้อมูลได้ แต่เพิ่มนักเรียนใหม่ไม่ได้ นำกลับมาใช้ได้จากหน้าห้องเรียน</Alert>}
      <div className="flex flex-wrap gap-1.5">
        <Badge icon={<Users size={12} />}>{room.student_count} คน</Badge>
        <Badge tone={room.linked_count === room.student_count && room.student_count > 0 ? "success" : "warning"}>ผู้ปกครองเชื่อมแล้ว {room.linked_count}/{room.student_count}</Badge>
        <Badge tone="info">ฝึกใน 7 วัน {room.practiced_7d} คน</Badge>
      </div>
      <Tabs label="ข้อมูลห้องเรียน" value={tab} onValueChange={setTab} items={[
        { value: "students", label: "นักเรียน", count: room.student_count },
        { value: "teachers", label: "ครู", count: room.teachers.length },
        { value: "invites", label: "ใบเชิญผู้ปกครอง" },
      ]}>
        {tab === "students" && <StudentsTab room={room} />}
        {tab === "teachers" && <TeachersTab room={room} />}
        {tab === "invites" && (
          <div className="space-y-4">
            <Card><CardContent className="flex flex-wrap items-center gap-3">
              <Printer size={20} className="text-primary" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-sm text-text-muted">ใบเชิญรายคน (QR + รหัส) ให้นักเรียนนำกลับบ้าน ผู้ปกครองสแกนแล้วเชื่อมได้ทันที</p>
              <ButtonLink href={`/classrooms/${room.id}/slips`} icon={<Printer size={16} aria-hidden="true" />}>พิมพ์ใบเชิญทั้งห้อง</ButtonLink>
            </CardContent></Card>
            <JoinCodeCard kind="classroom_guardian" classroomId={room.id} title={`QR ของห้อง ${room.name}`}
              description="สำหรับวันประชุมผู้ปกครองหรือกลุ่ม LINE ห้อง ผู้ปกครองเลือกชื่อลูกเอง แล้วคำขอจะเข้ากล่องข้อความให้ครูหรือผู้ดูแลอนุมัติ (ใช้ได้ 7 วัน)"
              revealLabel="แสดง QR ของห้อง" />
          </div>
        )}
      </Tabs>
    </div>
  );
}

export default function ClassroomPage() {
  const params = useParams<{ id: string }>();
  return (
    <SchoolArea title="ห้องเรียน" back={{ href: "/school/classrooms", label: "ห้องเรียนทั้งหมด" }}>
      <RoomHeading id={params.id} />
      <ClassroomDetail id={params.id} />
    </SchoolArea>
  );
}

/** Room name as the visible heading under the page header. */
function RoomHeading({ id }: { id: string }) {
  const { overview } = useSchoolArea();
  const room = overview.classrooms.find((classroom) => classroom.id === id);
  if (!room) return null;
  const primary = room.teachers.find((teacher) => teacher.is_primary);
  return (
    <div className="-mt-2">
      <h2 className="text-page-title">{room.name}</h2>
      <p className="text-sm text-text-muted">
        {[room.grade_level, room.academic_year && `ปีการศึกษา ${room.academic_year}`, primary && `ครูหลัก ${primary.name}`].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}
