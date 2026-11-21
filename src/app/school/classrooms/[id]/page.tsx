"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Activity, Link2, Printer, Star, Users } from "lucide-react";
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
            <li key={teacher.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
              <Avatar name={teacher.name} />
              <span className="min-w-0 flex-1">
                <span className="block break-words font-display text-[0.9375rem] font-medium text-text">{teacher.name}</span>
                <span className="block break-all text-caption text-text-muted">{overview.teachers.find((item) => item.user_id === teacher.user_id)?.email ?? ""}</span>
              </span>
              {teacher.is_primary
                ? <span className="btn-primary inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-display text-xs font-medium text-primary-foreground"><Star size={11} className="fill-current" aria-hidden="true" />ครูหลัก</span>
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
      <dl className="grid grid-cols-3 gap-3">
        {[
          { label: "นักเรียน", value: room.student_count, max: undefined, icon: <Users size={16} />, bar: "" },
          { label: "ผู้ปกครองเชื่อมแล้ว", value: room.linked_count, max: room.student_count, icon: <Link2 size={16} />, bar: "from-[#3FBF8C] to-success" },
          { label: "ฝึกใน 7 วัน", value: room.practiced_7d, max: room.student_count, icon: <Activity size={16} />, bar: "from-[#7FC8EE] to-info" },
        ].map((item) => (
          <div key={item.label} className="rounded-card border border-border bg-surface px-4 py-3.5 shadow-card">
            <dt className="flex items-center gap-1.5 text-caption text-text-muted"><span aria-hidden="true" className="text-primary-text">{item.icon}</span>{item.label}</dt>
            <dd className="mt-1 font-display text-[1.75rem] font-semibold leading-none tabular-nums text-text">
              {item.value}{item.max !== undefined && <span className="text-base font-normal text-text-muted">/{item.max}</span>}
            </dd>
            {item.max !== undefined && (
              <div aria-hidden="true" className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <div className={`h-full rounded-full bg-gradient-to-r ${item.bar}`} style={{ width: `${item.max ? (item.value / item.max) * 100 : 0}%` }} />
              </div>
            )}
          </div>
        ))}
      </dl>
      <Tabs label="ข้อมูลห้องเรียน" value={tab} onValueChange={setTab} items={[
        { value: "students", label: "นักเรียน", count: room.student_count },
        { value: "teachers", label: "ครู", count: room.teachers.length },
        { value: "invites", label: "ใบเชิญผู้ปกครอง" },
      ]}>
        {tab === "students" && <StudentsTab room={room} />}
        {tab === "teachers" && <TeachersTab room={room} />}
        {tab === "invites" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="relative overflow-hidden">
              <span className="absolute right-4 top-4 rounded-full bg-[linear-gradient(180deg,#FFD58A,#F2B23A)] px-2.5 py-0.5 text-[0.6875rem] font-semibold text-[#3A2300]">แนะนำ</span>
              <CardContent className="flex h-full flex-col gap-4">
                <span aria-hidden="true" className="btn-primary grid size-12 place-items-center rounded-[0.9rem] text-primary-foreground"><Printer size={22} /></span>
                <div>
                  <h3 className="font-display text-lg font-medium text-text">ใบเชิญรายคน</h3>
                  <p className="mt-1 text-sm text-text-muted">พิมพ์ใบละคน มี QR และรหัสของเด็กคนนั้น ให้นักเรียนถือกลับบ้าน ผู้ปกครองสแกนแล้วเชื่อมกับลูกได้ทันที</p>
                </div>
                <ul className="grid grid-cols-3 gap-2 text-center">
                  {[["30 วัน", "ใช้ได้"], ["4 บัญชี", "ต่อเด็ก 1 คน"], ["ทันที", "ไม่ต้องอนุมัติ"]].map(([value, label]) => (
                    <li key={label} className="rounded-control bg-surface-muted px-2 py-2">
                      <span className="block font-display text-sm font-medium text-text">{value}</span>
                      <span className="block text-[0.6875rem] text-text-muted">{label}</span>
                    </li>
                  ))}
                </ul>
                <ButtonLink href={`/classrooms/${room.id}/slips`} className="mt-auto" icon={<Printer size={16} aria-hidden="true" />}>พิมพ์ใบเชิญทั้งห้อง</ButtonLink>
              </CardContent>
            </Card>
            <div className="flex flex-col gap-3">
              <Card>
                <CardContent className="space-y-3">
                  <h3 className="font-display text-lg font-medium text-text">QR ของห้อง</h3>
                  <p className="text-sm text-text-muted">สำหรับวันประชุมผู้ปกครองหรือกลุ่ม LINE ห้อง ผู้ปกครองเลือกชื่อลูกเอง แล้วคำขอเข้ากล่องข้อความให้ครูหรือผู้ดูแลอนุมัติ</p>
                  <ul className="grid grid-cols-3 gap-2 text-center">
                    {[["7 วัน", "ใช้ได้"], ["ทั้งห้อง", "QR เดียว"], ["อนุมัติ", "ก่อนเชื่อม"]].map(([value, label]) => (
                      <li key={label} className="rounded-control bg-surface-muted px-2 py-2">
                        <span className="block font-display text-sm font-medium text-text">{value}</span>
                        <span className="block text-[0.6875rem] text-text-muted">{label}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <JoinCodeCard kind="classroom_guardian" classroomId={room.id} title={`QR ของห้อง ${room.name}`}
                description="กดเพื่อแสดง QR และรหัส แล้วให้ผู้ปกครองสแกนจากหน้าจอนี้ได้เลย"
                revealLabel="แสดง QR ของห้อง" />
            </div>
          </div>
        )}
      </Tabs>
    </div>
  );
}

export default function ClassroomPage() {
  const params = useParams<{ id: string }>();
  return (
    <SchoolArea title="ห้องเรียน" bare back={{ href: "/school/classrooms", label: "ห้องเรียนทั้งหมด" }}>
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
    <div className="-mt-1 flex flex-wrap items-end gap-x-4 gap-y-2">
      <div className="min-w-0">
        <p className="text-caption font-semibold tracking-wide text-primary-text">{[overview.school.name, room.grade_level, room.academic_year && `ปีการศึกษา ${room.academic_year}`].filter(Boolean).join(" · ")}</p>
        <h1 className="mt-1 font-display text-[2.5rem] font-semibold leading-none tracking-tight text-text">{room.name}</h1>
      </div>
      {primary ? (
        <span className="mb-1 inline-flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-sm shadow-card">
          <Avatar name={primary.name} size="sm" /><span className="text-text-muted">ครูหลัก</span><span className="font-medium text-text">{primary.name}</span>
        </span>
      ) : <Badge tone="warning" dot className="mb-1">ยังไม่มีครูประจำ</Badge>}
    </div>
  );
}
