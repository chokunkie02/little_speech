"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { ChevronLeft, Clock, Link2, Printer, Star } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { ClassroomRoster } from "@/components/school-admin/ClassroomRoster";
import { JoinCodeCard } from "@/components/join/JoinCodeCard";
import { TeacherReviewQueue } from "@/components/assessment/TeacherReviewQueue";
import {
  Button, ButtonLink, Card, CardContent, DataLoadError, EmptyState, LoadingState, Page, PageHeader, StatCard, Tabs,
} from "@/components/ui";
import { assessmentRequest } from "@/lib/assessment/client";
import { getTeacherOverview, type TeacherOverview } from "@/lib/schoolAdmin";

export default function TeacherClassroomPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<{ revision: number; data?: TeacherOverview; failed?: boolean }>();
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<"students" | "review" | "invites">("students");
  const [pending, setPending] = useState<number>();

  useEffect(() => {
    let active = true;
    getTeacherOverview().then(
      (data) => { if (active) setState({ revision, data }); },
      () => { if (active) setState({ revision, failed: true }); },
    );
    return () => { active = false; };
  }, [revision]);

  // Count for the "รอตรวจ" tab before it is opened; the tab keeps it current afterwards.
  useEffect(() => {
    let active = true;
    assessmentRequest<unknown[]>(`/api/assessment/pending?classroomId=${id}`)
      .then((rows) => { if (active) setPending(rows.length); }, () => {});
    return () => { active = false; };
  }, [id]);

  const room = state?.data?.classrooms.find((classroom) => classroom.id === id);
  const reload = () => setRevision((value) => value + 1);
  const unlinked = room ? Math.max(0, room.student_count - room.linked_count) : 0;

  return (
    <AppShell>
      <Page>
        {!room ? (
          <PageHeader back={{ href: "/teacher", label: "ห้องเรียนของฉัน" }} title="ห้องเรียน" />
        ) : (
          <header className="space-y-3">
            <Link href="/teacher" className="inline-flex items-center gap-1 text-sm font-medium text-text-muted transition-colors hover:text-primary">
              <ChevronLeft size={16} aria-hidden="true" />ห้องเรียนของฉัน
            </Link>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-caption font-semibold tracking-wide text-primary-text">
                  {[room.school_name, room.academic_year && `ปีการศึกษา ${room.academic_year}`].filter(Boolean).join(" · ")}
                </p>
                <h1 className="mt-1 flex flex-wrap items-center gap-3 font-display text-[2.5rem] font-semibold leading-none tracking-tight text-text">
                  {room.name}
                  {room.is_primary && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 font-sans text-xs font-semibold tracking-normal text-primary-text">
                      <Star size={12} aria-hidden="true" />ครูหลัก
                    </span>
                  )}
                </h1>
              </div>
            </div>
          </header>
        )}
        {!state ? <LoadingState variant="table" rows={4} /> : state.failed && !state.data ? (
          <DataLoadError message="โหลดห้องเรียนไม่สำเร็จ" onRetry={reload} />
        ) : !room ? (
          <EmptyState title="ไม่พบห้องนี้ในห้องที่คุณดูแล" action={<ButtonLink href="/teacher">กลับไปห้องเรียนของฉัน</ButtonLink>} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="นักเรียน" value={room.student_count} hint="คนในห้อง" />
              <StatCard label="ผู้ปกครองเชื่อมแล้ว" tone="success"
                value={<span className="inline-flex items-center gap-3">{room.linked_count}<span className="text-lg font-normal text-text-muted">/{room.student_count}</span>
                  <span aria-hidden="true" className="ring-progress size-9" style={{ "--p": room.student_count ? Math.round((room.linked_count / room.student_count) * 100) : 0 } as CSSProperties} /></span>}
                hint={unlinked > 0 ? `ขาดอีก ${unlinked} คน` : "ครบทุกคน"} />
              <StatCard label="ฝึกใน 7 วัน" tone="info" value={room.practiced_7d} hint="คน" />
              <button type="button" onClick={() => setTab("review")}
                className="hero-night flex flex-col items-start gap-0.5 rounded-card p-4 text-left transition-transform hover:-translate-y-0.5">
                <span className="text-caption text-white/75">รอตรวจ</span>
                <span className="font-display text-[2rem] font-semibold leading-none tabular-nums">{pending ?? "–"}</span>
                <span className="mt-1 text-caption text-white/75">ข้อที่รอคุณยืนยัน</span>
              </button>
            </div>

            {(Boolean(pending) || unlinked > 0) && (
              <Card>
                <CardContent className="space-y-1 py-3">
                  <h2 className="pb-1 font-display text-base font-medium text-text">สิ่งที่รอคุณ</h2>
                  {Boolean(pending) && (
                    <div className="flex items-center gap-3.5 border-t border-border pt-3">
                      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[0.8rem] bg-warning-soft text-warning-text"><Clock size={19} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text">ตรวจผลฝึก {pending} ข้อ</p>
                        <p className="text-caption text-text-muted">ข้อที่ระบบตัดสินเองไม่ได้ รอคุณเลือก ทำได้ / ฝึกต่อ / ประเมินไม่ได้</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setTab("review")}>ไปตรวจ</Button>
                    </div>
                  )}
                  {unlinked > 0 && (
                    <div className="flex items-center gap-3.5 border-t border-border pt-3">
                      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[0.8rem] bg-primary-soft text-primary-text"><Link2 size={19} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text">นักเรียน {unlinked} คนยังไม่มีผู้ปกครองในแอป</p>
                        <p className="text-caption text-text-muted">ส่งใบเชิญรายคนให้ผู้ปกครอง สแกนแล้วเชื่อมได้ทันที</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setTab("invites")}>ส่งใบเชิญ</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Tabs label="ข้อมูลห้องเรียน" value={tab} onValueChange={setTab} items={[
              { value: "students", label: "นักเรียน", count: room.student_count },
              { value: "review", label: "รอตรวจ", count: pending || undefined },
              { value: "invites", label: "ใบเชิญผู้ปกครอง" },
            ]}>
              {tab === "students" ? (
                <ClassroomRoster mode="teacher" classroomId={room.id} classroomName={room.name} onChanged={reload} />
              ) : tab === "review" ? (
                <TeacherReviewQueue classroomId={room.id} onCount={setPending} />
              ) : (
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
                        <p className="text-sm text-text-muted">สำหรับวันประชุมผู้ปกครองหรือกลุ่ม LINE ห้อง ผู้ปกครองเลือกชื่อลูกเอง แล้วคำขอเข้ากล่องข้อความให้คุณอนุมัติ</p>
                        <ul className="grid grid-cols-3 gap-2 text-center">
                          {[["7 วัน", "ใช้ได้"], ["ทั้งห้อง", "QR เดียว"], ["ครูอนุมัติ", "ก่อนเชื่อม"]].map(([value, label]) => (
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
          </>
        )}
      </Page>
    </AppShell>
  );
}
