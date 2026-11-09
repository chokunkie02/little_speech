"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useInvitations } from "@/hooks/useInvitations";
import { useAuth } from "@/hooks/useAuth";
import type { Invitation } from "@/types/invitations";
import { INVITATION_ROLE_LABELS, INVITATION_STATUS_LABELS } from "@/types/invitations";
import { ROLE_DEFAULT_PERMISSIONS, invitationRoleToAccessRole, ACCESS_ROLE_LABELS } from "@/types/childAccess";

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckCircleIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-success">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-primary">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-error">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function CheckSmIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XSmIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Permission row ────────────────────────────────────────────────────────────

function PermRow({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-text-muted">{label}</span>
      <span className={allowed ? "text-success" : "text-text-muted/40"}>
        {allowed ? <CheckSmIcon /> : <XSmIcon />}
      </span>
    </div>
  );
}

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </main>
  );
}

// ── Inner page (needs useSearchParams) ───────────────────────────────────────

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const { getByToken, acceptInvitation, submitGuardianRequest, openLinkedChild } = useInvitations();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [lookup, setLookup] = useState<{ key: string; invitation: Invitation | null; error?: string }>();
  const [refresh, setRefresh] = useState(0);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const lookupKey = JSON.stringify([token, user?.id, refresh]);
  const currentLookup = lookup?.key === lookupKey ? lookup : undefined;
  const invitation = currentLookup?.invitation;
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    const result = token ? getByToken(token) : Promise.resolve(null);
    void result.then(
      (invitation) => { if (active) setLookup({ key: lookupKey, invitation }); },
      () => { if (active) setLookup({ key: lookupKey, invitation: null, error: "โหลดคำเชิญไม่สำเร็จ" }); },
    );
    return () => { active = false; };
  }, [authLoading, token, getByToken, lookupKey]);

  async function handleRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitation || !name.trim() || !relationship.trim()) return;
    setAccepting(true);
    setError(null);
    try {
      await submitGuardianRequest(token, name, relationship);
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ส่งคำขอไม่สำเร็จ");
    } finally {
      setAccepting(false);
    }
  }

  async function handleOpenLinkedChild() {
    if (!invitation?.childId) return;
    setAccepting(true);
    setError(null);
    try {
      await openLinkedChild(invitation.childId);
      router.push("/training");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เปิดโปรไฟล์เด็กไม่สำเร็จ");
    } finally {
      setAccepting(false);
    }
  }

  async function handleAccept() {
    if (!invitation) return;
    setAccepting(true);
    setError(null);
    try {
      await acceptInvitation(token);
      setAccepted(true);
      setTimeout(() => router.push("/training"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setAccepting(false);
    }
  }

  if (authLoading || invitation === undefined) {
    return <LoadingScreen />;
  }

  // Success screen
  if (accepted) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="flex justify-center"><CheckCircleIcon /></div>
          <h1 className="text-xl font-bold text-text">ตอบรับคำเชิญสำเร็จ!</h1>
          <p className="text-text-muted text-sm">กำลังพาคุณไปยังหน้าฝึกพูด…</p>
        </div>
      </main>
    );
  }

  if (currentLookup?.error) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="space-y-4 text-center">
          <p role="alert" className="text-error">{currentLookup.error}</p>
          <button className="rounded-xl bg-primary px-6 py-2.5 text-white" onClick={() => setRefresh((value) => value + 1)}>
            ลองใหม่
          </button>
        </div>
      </main>
    );
  }

  // No token or token not found
  if (!invitation) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="flex justify-center"><AlertIcon /></div>
          <h1 className="text-xl font-bold text-text">ลิงก์คำเชิญไม่ถูกต้อง</h1>
          <p className="text-text-muted text-sm">
            {token ? "ลิงก์นี้หมดอายุ ถูกยกเลิก หรือไม่ถูกต้อง" : "ไม่พบ token ในลิงก์นี้"}
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </main>
    );
  }

  const isExpiredOrRevoked = invitation.status === "expired" || invitation.status === "revoked";
  const isAlreadyAccepted = invitation.status === "accepted";
  const guardianRequest = invitation.requiresTeacherApproval;
  const awaitingReview = guardianRequest && invitation.status === "pending" && !!invitation.requestedAt;
  const rejected = guardianRequest && invitation.status === "revoked" && !!invitation.requestedAt && !invitation.acceptedAt;
  const canAccept = invitation.status === "pending" && isAuthenticated && !awaitingReview;
  const matchingAccount = user?.role === "parent" && !!user.email &&
    (!invitation.email || invitation.email.toLowerCase() === user.email.toLowerCase());
  const statusLabel = awaitingReview ? (invitation.isAdditionalGuardian ? "รออนุมัติ" : "รอครูอนุมัติ")
    : rejected ? "ไม่อนุมัติ"
    : guardianRequest && isAlreadyAccepted ? "อนุมัติแล้ว"
    : INVITATION_STATUS_LABELS[invitation.status];
  const accessRole = invitationRoleToAccessRole(invitation.role);
  const perms = ROLE_DEFAULT_PERMISSIONS[accessRole];
  const redirectParam = encodeURIComponent(`/invite/accept?token=${token}`);

  return (
    <main className="min-h-screen bg-bg flex items-start justify-center px-4 py-9 sm:py-14">
      <div className="w-full max-w-lg space-y-4">

        {/* Header */}
        <div className="space-y-2">
          <div className="flex"><MailIcon /></div>
          <h1 className="text-2xl font-bold text-text">{awaitingReview ? "ส่งคำขอแล้ว · รออนุมัติ" : isAlreadyAccepted ? "เชื่อมบัญชีแล้ว" : guardianRequest ? "ขอเชื่อมบัญชีผู้ปกครอง" : "คำเชิญเข้าร่วม"}</h1>
          <p className="text-text-muted text-sm">Speech Adventure</p>
        </div>

        {/* Invite details card */}
        <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden">
          {invitation.inviterEmail && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-2.5">
              <span className="text-sm text-text-muted">ผู้เชิญ</span>
              <span className="font-semibold text-text min-w-0 break-all text-right">{invitation.inviterEmail}</span>
            </div>
          )}
          {!guardianRequest && invitation.childSnapshot && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-2.5">
              <span className="text-sm text-text-muted">เด็ก</span>
              <span className="font-semibold text-text">{invitation.childSnapshot.name}</span>
            </div>
          )}
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-2.5">
            <span className="text-sm text-text-muted">บทบาท</span>
            <span className="font-semibold text-text">
              {INVITATION_ROLE_LABELS[invitation.role]}
              {" "}
              <span className="text-xs font-normal text-text-muted">({ACCESS_ROLE_LABELS[accessRole]})</span>
            </span>
          </div>
          {invitation.email && <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-2.5">
            <span className="text-sm text-text-muted">อีเมลที่ได้รับเชิญ</span>
            <span className="font-semibold text-text min-w-0 break-all text-right">{invitation.email}</span>
          </div>}
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-2.5">
            <span className="text-sm text-text-muted">สถานะ</span>
            <span className={`text-sm font-semibold ${
              invitation.status === "pending"  ? "text-warning"
              : invitation.status === "accepted" ? "text-success"
              : "text-error"
            }`}>
              {statusLabel}
            </span>
          </div>
          {!invitation.requestedAt && <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-2.5">
            <span className="text-sm text-text-muted">หมดอายุ</span>
            <span className="text-sm font-medium text-text">
              {new Date(invitation.expiresAt).toLocaleDateString("th-TH", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </span>
          </div>}
        </div>

        {/* Permissions panel */}
        {!guardianRequest && <div className="bg-surface border border-border rounded-xl px-5 py-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">สิทธิ์การเข้าถึง</p>
          <div className="divide-y divide-border/60">
            <PermRow label="ดูความก้าวหน้า"    allowed={perms.canViewProgress} />
            <PermRow label="ฟังไฟล์เสียง"       allowed={perms.canViewAudio} />
            <PermRow label="มอบหมายการฝึก"      allowed={perms.canAssignPractice} />
            <PermRow label="แก้ไขข้อมูลเด็ก"    allowed={perms.canEditChild} />
            <PermRow label="ส่งออกรายงาน"       allowed={perms.canExportReport} />
          </div>
        </div>}

        {/* State banners */}
        {isExpiredOrRevoked && (
          <div className="bg-error/8 border border-error/20 rounded-xl px-4 py-3 text-sm text-error">
            {guardianRequest && invitation.status === "revoked" && invitation.acceptedAt
              ? "บัญชีนี้ยกเลิกการเชื่อมกับเด็กแล้ว"
              : rejected ? "คำขอนี้ไม่ได้รับอนุมัติ กรุณาติดต่อครูประจำห้อง" : `คำเชิญนี้${invitation.status === "expired" ? "หมดอายุ" : "ถูกยกเลิก"}แล้ว กรุณาขอคำเชิญใหม่`}
          </div>
        )}

        {isAlreadyAccepted && (
          <div className="bg-success/8 border border-success/20 rounded-xl px-4 py-3 text-sm text-success">
            {guardianRequest ? "คำขอได้รับอนุมัติแล้ว คุณเปิดโปรไฟล์เด็กได้" : "คำเชิญนี้ได้รับการตอบรับแล้ว"}
          </div>
        )}

        {error && (
          <div className="bg-error/8 border border-error/20 rounded-xl px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {/* Auth required */}
        {invitation.status === "pending" && !isAuthenticated && (
          <div className="space-y-3">
            <div className="bg-info/8 border border-info/20 rounded-xl px-4 py-3 text-sm text-info">
              กรุณาเข้าสู่ระบบหรือสมัครสมาชิกก่อนตอบรับคำเชิญ
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={`/auth/signin?redirect=${redirectParam}`}
                className="flex items-center justify-center py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                href={`/auth/signup?redirect=${redirectParam}`}
                className="flex items-center justify-center py-3 rounded-xl border border-border text-sm font-semibold text-text hover:border-primary/40 transition-all"
              >
                สมัครสมาชิก
              </Link>
            </div>
          </div>
        )}

        {awaitingReview && (
          <div className="space-y-3 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm">
            <p>{invitation.isAdditionalGuardian
              ? "ส่งคำขอแล้ว คุณจะเปิดข้อมูลเด็กได้เมื่อครูประจำห้องหรือผู้ปกครองที่เชื่อมอยู่อนุมัติ"
              : "ส่งคำขอแล้ว คุณจะเปิดข้อมูลเด็กได้เมื่อครูประจำห้องอนุมัติ"}</p>
            <button type="button" className="rounded-lg border border-border bg-surface px-3 py-2 font-semibold text-primary" onClick={() => setRefresh((value) => value + 1)}>
              ตรวจสถานะล่าสุด
            </button>
          </div>
        )}

        {canAccept && guardianRequest && (matchingAccount ? (
          <form onSubmit={handleRequest} className="space-y-4 bg-surface border border-border rounded-xl p-5">
            <label className="block space-y-1.5 text-sm font-semibold">
              <span>ชื่อและนามสกุลผู้ปกครอง</span>
              <input className="w-full bg-bg border border-border rounded-lg px-3 py-2" autoComplete="name"
                required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="block space-y-1.5 text-sm font-semibold">
              <span>ความสัมพันธ์กับเด็ก</span>
              <input className="w-full bg-bg border border-border rounded-lg px-3 py-2"
                required maxLength={60} placeholder="เช่น แม่ พ่อ หรือผู้ดูแล" value={relationship}
                onChange={(event) => setRelationship(event.target.value)} />
            </label>
            <p className="break-all text-sm text-text-muted">ส่งจากบัญชี <strong className="text-text">{user.email}</strong></p>
            <button className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-40"
              disabled={accepting || !name.trim() || !relationship.trim()}>
              {accepting ? "กำลังส่ง…" : "ส่งคำขอเชื่อม"}
            </button>
          </form>
        ) : (
          <p role="alert" className="rounded-xl border border-error/20 bg-error/8 px-4 py-3 text-sm text-error">
            กรุณาเข้าสู่ระบบด้วยบัญชีผู้ปกครองที่ตรงกับคำเชิญ
          </p>
        ))}

        {/* Legacy invitation */}
        {canAccept && !guardianRequest && (
          <div className="space-y-3">
            {user && (
              <p className="text-xs text-text-muted text-center">
                เข้าสู่ระบบในฐานะ <span className="font-semibold">{user.email}</span>
              </p>
            )}
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full bg-primary text-white text-sm font-bold py-4 rounded-xl hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-primary/25"
            >
              {accepting ? "กำลังตอบรับ…" : "ตอบรับคำเชิญ"}
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 rounded-xl border border-border text-sm text-text-muted hover:text-text transition-all"
            >
              ไม่ตอบรับ
            </button>
          </div>
        )}

        {/* Back link for terminal states */}
        {guardianRequest && isAlreadyAccepted && invitation.childId && (
          <button type="button" disabled={accepting} onClick={handleOpenLinkedChild}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-40">
            {accepting ? "กำลังโหลด…" : "เปิดโปรไฟล์เด็ก"}
          </button>
        )}
        {(isExpiredOrRevoked || (isAlreadyAccepted && (!guardianRequest || !invitation.childId))) && (
          <Link
            href="/"
            className="block text-center text-sm text-text-muted hover:text-text transition-colors"
          >
            กลับหน้าแรก
          </Link>
        )}

      </div>
    </main>
  );
}

// ── Page export (Suspense for useSearchParams) ────────────────────────────────

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AcceptInviteContent />
    </Suspense>
  );
}
