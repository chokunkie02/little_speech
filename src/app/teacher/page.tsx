"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, GraduationCap, Inbox, KeyRound, Link2, Star, Users } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import TeacherChildProgressCard from "@/components/teacher/TeacherChildProgressCard";
import { useAccountProfile } from "@/components/account/AccountProfileProvider";
import { Badge, ButtonLink, Card, DataLoadError, EmptyState, LoadingState, Page, Section } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useSpeechProgress } from "@/hooks/useSpeechProgress";
import { useTeacherChildren } from "@/hooks/useTeacherChildren";
import { compareClassrooms, getTeacherOverview, type TeacherClassroom, type TeacherOverview } from "@/lib/schoolAdmin";

function MiniBar({ value, max, label, tone }: { value: number; max: number; label: string; tone: "success" | "info" }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-caption">
        <span className="text-text-muted">{label}</span>
        <span className="font-display font-medium tabular-nums text-text">{value}/{max}</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className={tone === "success" ? "h-full rounded-full bg-gradient-to-r from-[#3FBF8C] to-success" : "h-full rounded-full bg-gradient-to-r from-[#7FC8EE] to-info"}
          style={{ width: `${Math.max(percent ? 4 : 0, percent)}%` }} />
      </div>
    </div>
  );
}

function RoomCard({ room }: { room: TeacherClassroom }) {
  return (
    <Link href={`/teacher/classrooms/${room.id}`} className="group block rounded-card">
      <Card interactive className="flex h-full flex-col overflow-hidden">
        <div className="relative bg-gradient-to-br from-primary-soft to-surface px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display text-[1.75rem] font-semibold leading-none tracking-tight text-text">{room.name}</p>
              <p className="mt-1.5 text-caption text-text-muted">{[room.school_name, room.academic_year && `ปีการศึกษา ${room.academic_year}`].filter(Boolean).join(" · ")}</p>
            </div>
            {room.is_primary && <Badge tone="primary" icon={<Star size={11} />}>ครูหลัก</Badge>}
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 font-display text-sm font-medium text-text"><Users size={15} aria-hidden="true" />{room.student_count} คนในห้อง</p>
        </div>
        <div className="flex flex-1 flex-col gap-3 px-5 pb-4 pt-3.5">
          <MiniBar label="ผู้ปกครองเชื่อมแล้ว" value={room.linked_count} max={room.student_count} tone="success" />
          <MiniBar label="ฝึกใน 7 วัน" value={room.practiced_7d} max={room.student_count} tone="info" />
          {room.pending_requests > 0 && <Badge tone="error" dot>ผู้ปกครองรออนุมัติ {room.pending_requests}</Badge>}
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3 text-caption text-text-muted">
            <span className="min-w-0 truncate">{room.co_teachers.length > 0 ? `ร่วมกับ ${room.co_teachers.join(", ")}` : "สอนห้องนี้คนเดียว"}</span>
            <span className="inline-flex shrink-0 items-center gap-0.5 font-display font-medium text-primary-text">เปิดห้อง<ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function greeting(now: Date) {
  const hour = now.getHours();
  return hour < 11 ? "สวัสดีตอนเช้า" : hour < 16 ? "สวัสดีตอนบ่าย" : hour < 19 ? "สวัสดีตอนเย็น" : "สวัสดีตอนค่ำ";
}
const longDate = new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long" });
const RING_MASK = "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))";

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
  const { displayName } = useAccountProfile();
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
        <header className="space-y-1">
          <p className="text-caption font-semibold tracking-wide text-primary-text">
            {greeting(new Date())}{displayName ? ` ครู${displayName.split(" ")[0]}` : ""} · {longDate.format(new Date())}
          </p>
          <h1 className="text-page-title text-text">ห้องเรียนของฉัน</h1>
          <p className="text-[0.9375rem] text-text-muted">
            {rooms.length > 0 ? `${rooms.length} ห้อง · นักเรียน ${data!.totals.students} คน` : "นักเรียน ผู้ปกครองที่เชื่อมแล้ว และการฝึกล่าสุด"}
          </p>
        </header>
        {isLoading || (user && !state) ? <LoadingState variant="cards" rows={3} /> : !user ? (
          <EmptyState title="กรุณาเข้าสู่ระบบ" action={<ButtonLink href="/auth/signin?redirect=%2Fteacher">เข้าสู่ระบบ</ButtonLink>} />
        ) : state?.failed ? (
          <DataLoadError message="โหลดห้องเรียนไม่สำเร็จ" onRetry={() => setRevision((value) => value + 1)} />
        ) : (
          <>
            {rooms.length === 0 ? (
              <EmptyState icon={<GraduationCap size={22} />} title="ยังไม่ได้อยู่ในห้องเรียนไหน"
                description="ถ้ายังไม่ได้เข้าร่วมโรงเรียน ขอรหัสครูจากผู้ดูแลโรงเรียน ถ้าเข้าร่วมแล้ว รอผู้ดูแลจัดห้องให้"
                action={<ButtonLink href="/join" icon={<KeyRound size={16} aria-hidden="true" />}>ใช้รหัสเข้าร่วม</ButtonLink>} />
            ) : (
              <>
                <section aria-label="ภาพรวมห้องเรียนของฉัน" className="hero-night relative overflow-hidden rounded-[1.5rem] p-5 sm:p-6">
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgb(255_255_255/0.18)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(120deg,transparent_35%,#000_90%)]" />
                  <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-center">
                    <dl className="grid grid-cols-3 divide-x divide-white/15">
                      {[
                        { label: "นักเรียน", value: data!.totals.students, sub: " คน", ring: undefined },
                        { label: "ผู้ปกครองเชื่อมแล้ว", value: data!.totals.linked, sub: `/${data!.totals.students}`, ring: data!.totals.students ? data!.totals.linked / data!.totals.students : 0 },
                        { label: "ฝึกใน 7 วัน", value: data!.totals.practiced_7d, sub: `/${data!.totals.students}`, ring: data!.totals.students ? data!.totals.practiced_7d / data!.totals.students : 0 },
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
                          {pending > 0 ? `ผู้ปกครองรออนุมัติ ${pending} คน` : "ไม่มีผู้ปกครองรออนุมัติ"}</li>
                        <li className="flex items-center gap-2"><Link2 size={15} aria-hidden="true" className="shrink-0 text-[#FFD58A]" />
                          {data!.totals.students - data!.totals.linked > 0 ? `นักเรียน ${data!.totals.students - data!.totals.linked} คนยังไม่มีผู้ปกครองในแอป` : "ทุกคนมีผู้ปกครองในแอปแล้ว"}</li>
                      </ul>
                      {pending > 0 && <ButtonLink href="/inbox" size="sm" block className="btn-gold mt-3">ไปอนุมัติ</ButtonLink>}
                    </div>
                  </div>
                </section>
                <Section title={`ห้องเรียน · ${rooms.length}`}>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
