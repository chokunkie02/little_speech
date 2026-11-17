"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { GraduationCap, Printer, Star, Users } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { ClassroomRoster } from "@/components/school-admin/ClassroomRoster";
import { JoinCodeCard } from "@/components/join/JoinCodeCard";
import {
  Badge, ButtonLink, Card, CardContent, DataLoadError, EmptyState, LoadingState, Page, PageHeader, Tabs,
} from "@/components/ui";
import { getTeacherOverview, type TeacherOverview } from "@/lib/schoolAdmin";

export default function TeacherClassroomPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<{ revision: number; data?: TeacherOverview; failed?: boolean }>();
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<"students" | "invites">("students");

  useEffect(() => {
    let active = true;
    getTeacherOverview().then(
      (data) => { if (active) setState({ revision, data }); },
      () => { if (active) setState({ revision, failed: true }); },
    );
    return () => { active = false; };
  }, [revision]);

  const room = state?.data?.classrooms.find((classroom) => classroom.id === id);
  const reload = () => setRevision((value) => value + 1);

  return (
    <AppShell>
      <Page>
        <PageHeader
          icon={<GraduationCap size={20} />}
          back={{ href: "/teacher", label: "ห้องเรียนของฉัน" }}
          title={room?.name ?? "ห้องเรียน"}
          description={room ? [room.school_name, room.academic_year && `ปีการศึกษา ${room.academic_year}`].filter(Boolean).join(" · ") : undefined}
        />
        {!state ? <LoadingState variant="table" rows={4} /> : state.failed && !state.data ? (
          <DataLoadError message="โหลดห้องเรียนไม่สำเร็จ" onRetry={reload} />
        ) : !room ? (
          <EmptyState title="ไม่พบห้องนี้ในห้องที่คุณดูแล" action={<ButtonLink href="/teacher">กลับไปห้องเรียนของฉัน</ButtonLink>} />
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {room.is_primary && <Badge tone="primary" icon={<Star size={11} />}>ครูหลัก</Badge>}
              <Badge icon={<Users size={12} />}>{room.student_count} คน</Badge>
              <Badge tone={room.linked_count === room.student_count && room.student_count > 0 ? "success" : "warning"}>
                ผู้ปกครองเชื่อมแล้ว {room.linked_count}/{room.student_count}
              </Badge>
              <Badge tone="info">ฝึกใน 7 วัน {room.practiced_7d} คน</Badge>
            </div>
            <Tabs label="ข้อมูลห้องเรียน" value={tab} onValueChange={setTab} items={[
              { value: "students", label: "นักเรียน", count: room.student_count },
              { value: "invites", label: "ใบเชิญผู้ปกครอง" },
            ]}>
              {tab === "students" ? (
                <ClassroomRoster mode="teacher" classroomId={room.id} classroomName={room.name} onChanged={reload} />
              ) : (
                <div className="space-y-4">
                  <Card><CardContent className="flex flex-wrap items-center gap-3">
                    <Printer size={20} className="text-primary" aria-hidden="true" />
                    <p className="min-w-0 flex-1 text-sm text-text-muted">ใบเชิญรายคน (QR + รหัส) ให้นักเรียนนำกลับบ้าน ผู้ปกครองสแกนแล้วเชื่อมได้ทันที ไม่ต้องแจ้งอีเมล</p>
                    <ButtonLink href={`/classrooms/${room.id}/slips`} icon={<Printer size={16} aria-hidden="true" />}>พิมพ์ใบเชิญทั้งห้อง</ButtonLink>
                  </CardContent></Card>
                  <JoinCodeCard kind="classroom_guardian" classroomId={room.id} title={`QR ของห้อง ${room.name}`}
                    description="สำหรับวันประชุมผู้ปกครองหรือกลุ่ม LINE ห้อง ผู้ปกครองเลือกชื่อลูกเอง แล้วคำขอจะเข้ากล่องข้อความให้คุณอนุมัติ (ใช้ได้ 7 วัน)"
                    revealLabel="แสดง QR ของห้อง" />
                </div>
              )}
            </Tabs>
          </>
        )}
      </Page>
    </AppShell>
  );
}
