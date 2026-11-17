"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Phone, GraduationCap, Inbox as InboxIcon, KeyRound, RefreshCw, School, Users } from "lucide-react";
import {
  Alert, Avatar, Badge, Button, ButtonLink, Card, CardContent, ConfirmDialog, DataLoadError, EmptyState, FormField,
  Input, LoadingState, Page, PageHeader, Section, Select, StatusBadge, toast,
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
import type { JoinRequestToReview, MyJoinRequest } from "@/types/joinCodes";

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
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary-text">
            <School size={20} />
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="break-words font-semibold text-text">{request.school_name} ขอใช้งาน{request.province ? ` · จ.${request.province}` : ""}</p>
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
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <Avatar name={request.requester_name} />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="break-words font-semibold text-text">
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
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold text-text">
          {request.kind === "school" ? `ขอใช้งานสำหรับ ${request.school_name}` : request.kind === "teacher" ? `ขอเข้าร่วม ${request.school_name}` : `ขอเชื่อมกับ ${request.child_name}`}
        </p>
        <p className="text-caption text-text-muted">
          {[request.kind === "classroom_guardian" && request.school_name, request.classroom_name && `ห้อง ${request.classroom_name}`, formatRelativeTime(request.created_at)]
            .filter(Boolean).join(" · ")}
        </p>
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
      <PageHeader
        icon={<InboxIcon size={20} />}
        title="กล่องข้อความ"
        description="คำขอที่รอคุณอนุมัติ คำขอของคุณ และการแจ้งเตือน"
        actions={user && (
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} aria-hidden="true" />} onClick={refreshAll}>โหลดใหม่</Button>
            {!user?.isPlatformAdmin && <ButtonLink size="sm" href="/join" icon={<KeyRound size={14} aria-hidden="true" />}>ใช้รหัสเข้าร่วม</ButtonLink>}
          </>
        )}
      />

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
                  <Section title={`รอคุณอนุมัติ (${inbox.to_review.length})`} description="คนที่ใช้รหัสของคุณและรอให้ยืนยันตัวตน">
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
                <Card><ul className="divide-y divide-border">
                  {inbox.notifications.map((item) => {
                    const fresh = !item.read_at || justRead.has(item.id);
                    const body = (
                      <div className="flex items-start gap-3 px-4 py-3">
                        <span aria-hidden="true" className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", fresh ? "bg-primary" : "bg-transparent")} />
                        <div className="min-w-0 flex-1">
                          <p className={cn("break-words text-sm text-text", fresh && "font-semibold")}>{item.title}</p>
                          {item.body && <p className="break-words text-sm text-text-muted">{item.body}</p>}
                          <p className="mt-0.5 text-caption text-text-muted">
                            {formatRelativeTime(item.created_at)}{fresh && <span className="sr-only"> · ใหม่</span>}
                          </p>
                        </div>
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
                </ul></Card>
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
