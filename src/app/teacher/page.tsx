"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, GraduationCap, KeyRound, Link2, Star, Users } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import TeacherChildProgressCard from "@/components/teacher/TeacherChildProgressCard";
import {
  Alert, Badge, ButtonLink, Card, DataLoadError, EmptyState, LoadingState, Page, PageHeader, Section, StatCard,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useSpeechProgress } from "@/hooks/useSpeechProgress";
import { useTeacherChildren } from "@/hooks/useTeacherChildren";
import { compareClassrooms, getTeacherOverview, type TeacherClassroom, type TeacherOverview } from "@/lib/schoolAdmin";

function RoomCard({ room }: { room: TeacherClassroom }) {
  const missing = room.student_count - room.linked_count;
  return (
    <Link href={`/teacher/classrooms/${room.id}`} className="block rounded-card">
      <Card interactive className="h-full space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-card-title break-words">{room.name}</p>
            <p className="text-caption text-text-muted">{[room.school_name, room.academic_year && `ปี ${room.academic_year}`].filter(Boolean).join(" · ")}</p>
          </div>
          {room.is_primary && <Badge tone="primary" icon={<Star size={11} />}>ครูหลัก</Badge>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge icon={<Users size={12} />}>{room.student_count} คน</Badge>
          {room.student_count > 0 && (
            <Badge tone={missing === 0 ? "success" : "warning"}>ผู้ปกครอง {room.linked_count}/{room.student_count}</Badge>
          )}
          <Badge tone="info">ฝึกใน 7 วัน {room.practiced_7d}</Badge>
          {room.pending_requests > 0 && <Badge tone="error" dot>รออนุมัติ {room.pending_requests}</Badge>}
        </div>
        {room.co_teachers.length > 0 && <p className="text-caption text-text-muted">ร่วมกับ {room.co_teachers.join(", ")}</p>}
      </Card>
    </Link>
  );
}

/** Children a family shared with this teacher account directly (outside a school classroom). */
function SharedChildren() {
  const { children, isHydrated } = useTeacherChildren();
  const { selectChild } = useChildProfile();
  const { switchChildProgress } = useSpeechProgress();
  if (!isHydrated || children.length === 0) return null;
  return (
    <Section title="เด็กที่ผู้ปกครองแชร์ให้" description="นอกห้องเรียนของโรงเรียน">
      <div className="space-y-3">
        {children.map((data) => (
          <TeacherChildProgressCard key={data.grant.id} data={data} onSelect={(childId) => { selectChild(childId); switchChildProgress(childId); }} />
        ))}
      </div>
    </Section>
  );
}

export default function TeacherHomePage() {
  const { user, isLoading } = useAuth();
  const [state, setState] = useState<{ revision: number; data?: TeacherOverview; failed?: boolean }>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getTeacherOverview().then(
      (data) => { if (active) setState({ revision, data }); },
      () => { if (active) setState({ revision, failed: true }); },
    );
    return () => { active = false; };
  }, [user, revision]);

  const data = state?.data;
  const rooms = data ? [...data.classrooms].sort(compareClassrooms) : [];
  const pending = rooms.reduce((sum, room) => sum + room.pending_requests, 0);

  return (
    <AppShell>
      <Page>
        <PageHeader icon={<GraduationCap size={20} />} title="ห้องเรียนของฉัน" description="นักเรียน ผู้ปกครองที่เชื่อมแล้ว และการฝึกล่าสุด" />
        {isLoading || (user && !state) ? <LoadingState variant="cards" rows={3} /> : !user ? (
          <EmptyState title="กรุณาเข้าสู่ระบบ" action={<ButtonLink href="/auth/signin?redirect=%2Fteacher">เข้าสู่ระบบ</ButtonLink>} />
        ) : state?.failed ? (
          <DataLoadError message="โหลดห้องเรียนไม่สำเร็จ" onRetry={() => setRevision((value) => value + 1)} />
        ) : (
          <>
            {pending > 0 && (
              <Alert tone="warning" title={`มีผู้ปกครองรออนุมัติ ${pending} คน`} action={<ButtonLink href="/inbox" size="sm">ไปอนุมัติ</ButtonLink>}>
                ผู้ปกครองที่สแกน QR ของห้องและเลือกชื่อลูก รอให้คุณยืนยัน
              </Alert>
            )}
            {rooms.length === 0 ? (
              <EmptyState icon={<GraduationCap size={22} />} title="ยังไม่ได้อยู่ในห้องเรียนไหน"
                description="ถ้ายังไม่ได้เข้าร่วมโรงเรียน ขอรหัสครูจากผู้ดูแลโรงเรียน ถ้าเข้าร่วมแล้ว รอผู้ดูแลจัดห้องให้"
                action={<ButtonLink href="/join" icon={<KeyRound size={16} aria-hidden="true" />}>ใช้รหัสเข้าร่วม</ButtonLink>} />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="นักเรียน" value={data!.totals.students} icon={<Users size={20} />} />
                  <StatCard label="ผู้ปกครองเชื่อมแล้ว" value={`${data!.totals.linked}/${data!.totals.students}`} icon={<Link2 size={20} />} tone="success" />
                  <StatCard label="ฝึกใน 7 วัน" value={data!.totals.practiced_7d} icon={<Activity size={20} />} tone="info" />
                </div>
                <Section title={`ห้องเรียน (${rooms.length})`}>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {rooms.map((room) => <RoomCard key={room.id} room={room} />)}
                  </div>
                </Section>
              </>
            )}
            <SharedChildren />
          </>
        )}
      </Page>
    </AppShell>
  );
}
