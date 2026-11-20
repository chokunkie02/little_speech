"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, CheckCircle2, Clock, Link2, Phone, GraduationCap, Inbox as InboxIcon, KeyRound, RefreshCw, School, Send, Users, XCircle } from "lucide-react";
import {
  Alert, Avatar, Badge, Button, ButtonLink, Card, CardContent, ConfirmDialog, DataLoadError, EmptyState, FormField,
  Input, LoadingState, Page, Section, Select, StatusBadge, toast,
} from "@/components/ui";
import { useInbox } from "@/components/inbox/InboxProvider";
import { useGuardianWorkspace } from "@/components/layout/GuardianWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useSchool } from "@/hooks/useSchool";
import {
  cancelJoinRequest, cancelSchoolApplication, getRequesterPhone, markNotificationsRead, reviewJoinRequest, reviewSchoolApplication,
} from "@/lib/joinCodes";
import { cn } from "@/lib/cn";
import { affiliationLabel } from "@/lib/thaiProvinces";
import { formatRelativeTime } from "@/lib/thaiDate";
import type { AppNotification, JoinRequestToReview, MyJoinRequest } from "@/types/joinCodes";

/** Icon and colour for a notification, from its kind. */
function notificationLook(kind: string) {
  if (/reject/.test(kind)) return { icon: <XCircle size={17} />, tone: "bg-error-soft text-error-text" };
  if (/approv/.test(kind)) return { icon: <CheckCircle2 size={17} />, tone: "bg-success-soft text-success-text" };
  if (/linked|joined/.test(kind)) return { icon: <Link2 size={17} />, tone: "bg-primary-soft text-primary-text" };
  if (/request|application|school/.test(kind)) return { icon: <InboxIcon size={17} />, tone: "bg-warning-soft text-warning-text" };
  return { icon: <Bell size={17} />, tone: "bg-surface-muted text-text-muted" };
}

const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

/** Notifications split into วันนี้ / เมื่อวาน / ก่อนหน้านี้. */
function groupByDay(items: AppNotification[]) {
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86_400_000).toISOString());
  const groups: { label: string; items: AppNotification[] }[] = [
    { label: "วันนี้", items: [] }, { label: "เมื่อวาน", items: [] }, { label: "ก่อนหน้านี้", items: [] },
  ];
  for (const item of items) {
    const key = dayKey(item.created_at);
    groups[key === today ? 0 : key === yesterday ? 1 : 2].items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}

// ── Requests waiting for my decision ────────────────────────────────────────

/** A school asking to use the platform (platform admins). Approving creates the school with the applicant as owner. */
function SchoolApplicationCard({ request, onDone }: { request: JoinRequestToReview; onDone: () => void }) {
  const [name, setName] = useState(request.school_name);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "reject");
    try {
      await reviewSchoolApplication(request.id, approve, approve ? name : undefined);
      toast.success(approve ? "อนุมัติโรงเรียนแล้ว" : "ปฏิเสธคำขอแล้ว",
        approve ? `${request.requester_name} เป็นผู้ดูแล ${name.trim()} แล้ว` : undefined);
      setConfirmReject(false);
      onDone();
    } catch (cause) {
      toast.error("ทำรายการไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="relative overflow-hidden">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-[linear-gradient(180deg,#FFD58A,#F2B23A)]" />
      <CardContent className="space-y-3 sm:p-6">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] text-primary-foreground">
            <School size={20} />
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="break-words font-display text-[1.0625rem] font-medium text-text">{request.school_name} ขอใช้งาน{request.province ? ` · จ.${request.province}` : ""}</p>
            <p className="break-all text-sm text-text-muted">
              {request.requester_name} ({request.relationship}) · {request.phone} · {request.requester_email}
            </p>
            {(request.school_code || request.affiliation) && (
              <p className="text-sm text-text-muted">
                {[request.school_code && `รหัสโรงเรียน ${request.school_code}`, affiliationLabel(request.affiliation)].filter(Boolean).join(" · ")}
              </p>
            )}
            {request.note && <p className="break-words rounded-control bg-surface-muted px-3 py-2 text-sm text-text">{request.note}</p>}
            <p className="text-caption text-text-muted">{formatRelativeTime(request.created_at)}</p>
          </div>
          <Badge tone="warning">โรงเรียน</Badge>
        </div>
        <FormField label="ชื่อโรงเรียนที่จะสร้าง" hint="แก้ตัวสะกดได้ก่อนอนุมัติ">
          <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
        </FormField>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmReject(true)} disabled={busy !== null}>ไม่อนุมัติ</Button>
          <Button onClick={() => void decide(true)} loading={busy === "approve"} disabled={busy !== null || !name.trim()}>อนุมัติและสร้างโรงเรียน</Button>
        </div>
      </CardContent>
      <ConfirmDialog
        open={confirmReject}
        tone="danger"
        title="ไม่อนุมัติคำขอนี้?"
        description={`${request.requester_name} จะได้รับแจ้งว่าคำขอของ ${request.school_name} ไม่ได้รับการอนุมัติ`}
        confirmLabel="ไม่อนุมัติ"
        loading={busy === "reject"}
        onCancel={() => setConfirmReject(false)}
        onConfirm={() => void decide(false)}
      />
    </Card>
  );
}

function ReviewCard({ request, onDone }: { request: JoinRequestToReview; onDone: () => void }) {
  const { listClassrooms } = useSchool();
  const rooms = request.kind === "teacher" && request.organization_id ? listClassrooms(request.organization_id) : [];
  const [room, setRoom] = useState(request.classroom_id ?? "");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const teacher = request.kind === "teacher";
  const [phone, setPhone] = useState<string | null | undefined>(undefined);

  async function showPhone() {
    try {
      setPhone(await getRequesterPhone(request.id));
    } catch (cause) {
      toast.error("ดูเบอร์โทรไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
    }
  }

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "reject");
    try {
      await reviewJoinRequest(request.id, approve, teacher && room ? room : undefined);
      toast.success(approve ? "อนุมัติแล้ว" : "ปฏิเสธคำขอแล้ว", approve
        ? (teacher ? `${request.requester_name} เข้าร่วมโรงเรียนแล้ว` : `${request.requester_name} เชื่อมกับ ${request.child_name} แล้ว`)
        : undefined);
      setConfirmReject(false);
      onDone();
    } catch (cause) {
      toast.error("ทำรายการไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="relative overflow-hidden">
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", teacher ? "bg-info" : "bg-primary")} />
      <CardContent className="space-y-3 sm:p-6">
        <div className="flex items-start gap-3">
          <Avatar name={request.requester_name} />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="break-words font-display text-[1.0625rem] font-medium text-text">
              {teacher
                ? <>{request.requester_name} ขอเข้าร่วมโรงเรียนในบทบาทครู</>
                : <>{request.requester_name} ({request.relationship}) ขอเชื่อมกับ {request.child_name}</>}
            </p>
            <p className="break-all text-sm text-text-muted">
              {[request.requester_email, request.school_name, !teacher && request.classroom_name && `ห้อง ${request.classroom_name}`]
                .filter(Boolean).join(" · ")}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 text-caption text-text-muted">
              {formatRelativeTime(request.created_at)}
              {phone === undefined ? (
                <button type="button" onClick={showPhone} className="inline-flex items-center gap-1 font-semibold text-primary-text hover:underline">
                  <Phone size={12} aria-hidden="true" />ดูเบอร์โทร
                </button>
              ) : phone ? (
                <a href={`tel:${phone}`} className="inline-flex items-center gap-1 font-semibold text-primary-text hover:underline">
                  <Phone size={12} aria-hidden="true" />{phone.replace(/^(\d{3})(\d{3})(\d+)$/, "$1-$2-$3")}
                </a>
              ) : <span>ไม่ได้ให้เบอร์โทรไว้</span>}
            </p>
          </div>
          <Badge tone={teacher ? "info" : "primary"} icon={teacher ? <GraduationCap size={12} /> : <Users size={12} />}>
            {teacher ? "ครู" : "ผู้ปกครอง"}
          </Badge>
        </div>
        {teacher && (
          <FormField label="ห้องประจำ" hint={rooms.length ? "เลือกได้ภายหลังในหน้าโรงเรียน" : "ยังไม่มีห้องเรียน จัดห้องได้ภายหลัง"}>
            <Select value={room} onChange={(event) => setRoom(event.target.value)} disabled={!rooms.length}>
              <option value="">ยังไม่จัดห้อง</option>
              {rooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}
            </Select>
          </FormField>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmReject(true)} disabled={busy !== null}>ไม่อนุมัติ</Button>
          <Button onClick={() => void decide(true)} loading={busy === "approve"} disabled={busy !== null}>อนุมัติ</Button>
        </div>
      </CardContent>
      <ConfirmDialog
        open={confirmReject}
        tone="danger"
        title="ไม่อนุมัติคำขอนี้?"
        description={`${request.requester_name} จะได้รับแจ้งว่าคำขอไม่ได้รับการอนุมัติ และขอใหม่ได้ด้วยรหัสเดิมหรือรหัสใหม่`}
        confirmLabel="ไม่อนุมัติ"
        loading={busy === "reject"}
        onCancel={() => setConfirmReject(false)}
        onConfirm={() => void decide(false)}
      />
    </Card>
  );
}

// ── My own requests ─────────────────────────────────────────────────────────

const myStatus = { pending: "review", approved: "approved", rejected: "rejected", cancelled: "revoked" } as const;

function MyRequestRow({ request, onDone }: { request: MyJoinRequest; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[0.8rem] bg-surface-muted text-text-muted"><Send size={17} /></span>
      <div className="min-w-0">
        <p className="break-words font-display text-[0.9375rem] font-medium text-text">
          {request.kind === "school" ? `ขอใช้งานสำหรับ ${request.school_name}` : request.kind === "teacher" ? `ขอเข้าร่วม ${request.school_name}` : `ขอเชื่อมกับ ${request.child_name}`}
        </p>
        <p className="text-caption text-text-muted">
          {[request.kind === "classroom_guardian" && request.school_name, request.classroom_name && `ห้อง ${request.classroom_name}`, formatRelativeTime(request.created_at)]
            .filter(Boolean).join(" · ")}
        </p>
      </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={myStatus[request.status]} />
        {request.status === "pending" && (
          <Button size="sm" variant="ghost" loading={busy} onClick={async () => {
            setBusy(true);
            try { await (request.kind === "school" ? cancelSchoolApplication(request.id) : cancelJoinRequest(request.id)); toast.info("ยกเลิกคำขอแล้ว"); onDone(); }
            catch (cause) { toast.error("ยกเลิกไม่สำเร็จ", cause instanceof Error ? cause.message : undefined); }
            finally { setBusy(false); }
          }}>ยกเลิก</Button>
        )}
      </div>
    </li>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function InboxView() {
  const { user, isLoading } = useAuth();
  const { inbox, loading, error, refresh } = useInbox();
  const guardian = useGuardianWorkspace();
  const [justRead, setJustRead] = useState<Set<string>>(new Set());
  const marked = useRef(false);

  // Opening the inbox reads the notifications; keep this visit's unread ones highlighted.
  useEffect(() => {
    if (!inbox || marked.current || inbox.unread === 0) return;
    marked.current = true;
    const unreadIds = inbox.notifications.filter((item) => !item.read_at).map((item) => item.id);
    void markNotificationsRead().then(() => {
      setJustRead(new Set(unreadIds));
      refresh();
    }).catch(() => { marked.current = false; });
  }, [inbox, refresh]);

  const refreshAll = refresh;
  const nothing = inbox && inbox.to_review.length === 0 && inbox.my_requests.length === 0 && inbox.notifications.length === 0;
  // Desktop: requests (things to act on) on the left, the notification feed in a column on the right.
  const hasRequests = Boolean(inbox && (inbox.to_review.length > 0 || inbox.my_requests.length > 0));
  const twoColumns = hasRequests && Boolean(inbox && inbox.notifications.length > 0);

  return (
    <Page>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-caption font-semibold tracking-wide text-primary-text">บัญชี · ข้อความและคำขอ</p>
          <h1 className="text-page-title text-text">กล่องข้อความ</h1>
          <p className="text-[0.9375rem] text-text-muted">คำขอที่รอคุณอนุมัติ คำขอของคุณ และการแจ้งเตือน</p>
        </div>
        {user && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} aria-hidden="true" />} onClick={refreshAll}>โหลดใหม่</Button>
            {!user?.isPlatformAdmin && <ButtonLink size="sm" href="/join" icon={<KeyRound size={14} aria-hidden="true" />}>ใช้รหัสเข้าร่วม</ButtonLink>}
          </div>
        )}
      </header>

      {inbox && !nothing && (
        <dl className="grid grid-cols-3 gap-3">
          {[
            { label: "รอคุณอนุมัติ", value: inbox.to_review.length, icon: <InboxIcon size={17} />, tone: inbox.to_review.length ? "bg-warning-soft text-warning-text" : "bg-surface-muted text-text-muted" },
            { label: "คำขอของฉันที่รอผล", value: inbox.my_requests.filter((request) => request.status === "pending").length, icon: <Clock size={17} />, tone: "bg-info-soft text-info-text" },
            { label: "แจ้งเตือนใหม่", value: justRead.size || inbox.unread, icon: <Bell size={17} />, tone: "bg-primary-soft text-primary-text" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3.5 shadow-card">
              <span aria-hidden="true" className={cn("hidden size-10 shrink-0 place-items-center rounded-[0.8rem] sm:grid", item.tone)}>{item.icon}</span>
              <div className="min-w-0">
                <dt className="text-caption text-text-muted">{item.label}</dt>
                <dd className="font-display text-[1.75rem] font-semibold leading-none tabular-nums text-text">{item.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      )}

      {isLoading || (user && loading) ? <LoadingState variant="list" rows={3} label="กำลังโหลดกล่องข้อความ…" /> : !user ? (
        <EmptyState icon={<InboxIcon size={22} />} title="เข้าสู่ระบบเพื่อดูกล่องข้อความ"
          action={<ButtonLink href="/auth/signin?redirect=%2Finbox">เข้าสู่ระบบ</ButtonLink>} />
      ) : (
        <>
          {error && <DataLoadError message="โหลดกล่องข้อความไม่สำเร็จ" detail={inbox ? "กำลังแสดงข้อมูลจากครั้งล่าสุด" : undefined} onRetry={refreshAll} />}

          {nothing && (
            <EmptyState icon={<Bell size={22} />} title="ยังไม่มีข้อความ"
              description="เมื่อมีคำขอให้อนุมัติหรือมีความเคลื่อนไหว จะแสดงที่นี่ ถ้าได้รับรหัสหรือใบเชิญ กดใช้รหัสเข้าร่วมได้เลย"
              action={<ButtonLink href="/join" icon={<KeyRound size={16} aria-hidden="true" />}>ใช้รหัสเข้าร่วม</ButtonLink>} />
          )}

          <div className={cn("space-y-6", twoColumns && "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-6 lg:space-y-0 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]")}>
            {hasRequests && (
              <div className="space-y-6">
                {inbox && inbox.to_review.length > 0 && (
                  <Section title={`รอคุณอนุมัติ · ${inbox.to_review.length}`} description="คนที่ใช้รหัสของคุณและรอให้ยืนยันตัวตน">
                    <div className="space-y-3">
                      {inbox.to_review.map((request) => request.kind === "school"
                        ? <SchoolApplicationCard key={request.id} request={request} onDone={refresh} />
                        : <ReviewCard key={request.id} request={request} onDone={refresh} />)}
                    </div>
                  </Section>
                )}

                {inbox && inbox.my_requests.length > 0 && (
                  <Section title="คำขอของฉัน">
                    <Card><ul className="divide-y divide-border">
                      {inbox.my_requests.map((request) => <MyRequestRow key={request.id} request={request} onDone={refresh} />)}
                    </ul></Card>
                  </Section>
                )}
              </div>
            )}

            {inbox && inbox.notifications.length > 0 && (
              <Section className={cn(twoColumns && "lg:sticky lg:top-20")} title="การแจ้งเตือน" action={inbox.unread > 0 && (
                <Button size="sm" variant="ghost" icon={<CheckCheck size={14} aria-hidden="true" />}
                  onClick={() => void markNotificationsRead().then(refresh)}>อ่านแล้วทั้งหมด</Button>
              )}>
                <Card className="overflow-hidden">
                  {groupByDay(inbox.notifications).map((group) => (
                    <div key={group.label}>
                      <p className="border-b border-border bg-surface-muted/60 px-4 py-2 text-caption font-semibold text-text-muted sm:px-5">{group.label}</p>
                      <ul className="divide-y divide-border">
                        {group.items.map((item) => {
                          const fresh = !item.read_at || justRead.has(item.id);
                          const look = notificationLook(item.kind);
                          const body = (
                            <div className={cn("flex items-start gap-3 px-4 py-3.5 sm:px-5", fresh && "bg-primary-soft/35")}>
                              <span aria-hidden="true" className={cn("grid size-9 shrink-0 place-items-center rounded-[0.75rem]", look.tone)}>{look.icon}</span>
                              <div className="min-w-0 flex-1">
                                <p className={cn("break-words text-sm text-text", fresh ? "font-display font-medium" : "font-medium")}>{item.title}</p>
                                {item.body && <p className="break-words text-sm text-text-muted">{item.body}</p>}
                                <p className="mt-0.5 text-caption text-text-muted">
                                  {formatRelativeTime(item.created_at)}{fresh && <span className="sr-only"> · ใหม่</span>}
                                </p>
                              </div>
                              {fresh && <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                            </div>
                          );
                          return (
                            <li key={item.id}>
                              {item.link && item.link !== "/inbox"
                                ? <Link href={item.link} className="block transition-colors hover:bg-surface-muted">{body}</Link>
                                : body}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </Card>
              </Section>
            )}
          </div>

          {guardian.parent && guardian.restricted && (
            <Alert tone="info" title="ยังไม่ได้เชื่อมกับนักเรียน">
              ขอใบเชิญหรือ QR จากครูประจำห้อง แล้วกด <Link href="/join" className="font-semibold underline">ใช้รหัสเข้าร่วม</Link>
            </Alert>
          )}
        </>
      )}
    </Page>
  );
}
