"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, Lock, LogIn, User } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { ProgressView } from "@/components/progress/ProgressView";
import { FamilyLegacyHistory, SchoolLegacyHistory, useSchoolChildRecord } from "@/components/progress/LegacyHistory";
import { ButtonLink, EmptyState, LoadingState, Page } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useCurrentChildAccess } from "@/hooks/useCurrentChildAccess";
import { isSupabaseProviderRequested } from "@/lib/config/storageProvider";
import { isSupabaseConfigured } from "@/lib/supabase/client";

function Loading() {
  return <Page><LoadingState variant="stats" rows={4} /></Page>;
}

/** A school student, opened by a teacher or school admin (?child=) or by a linked guardian. */
function SchoolChildProgress({ childId, viewerId, teacher, admin, canPractice }: {
  childId: string; viewerId: string; teacher: boolean; admin: boolean; canPractice: boolean;
}) {
  const record = useSchoolChildRecord(childId);
  const back = teacher ? { href: "/teacher", label: "ห้องเรียนของฉัน" }
    : admin ? { href: "/school/classrooms", label: "ห้องเรียนและนักเรียน" } : undefined;
  if (!record) return <Loading />;
  if (!record.data) {
    return (
      <Page width="narrow">
        <EmptyState icon={<Lock size={22} />} title={record.error ? "โหลดข้อมูลนักเรียนไม่สำเร็จ" : "ยังไม่มีสิทธิ์ดูความก้าวหน้าของนักเรียนคนนี้"}
          description={record.error ? "ลองโหลดหน้าอีกครั้ง" : "ครูประจำห้อง ผู้ดูแลโรงเรียน และผู้ปกครองที่เชื่อมแล้วเท่านั้นที่ดูได้"}
          action={back && <ButtonLink href={back.href} variant="outline">{back.label}</ButtonLink>} />
      </Page>
    );
  }
  const { child } = record.data;
  return (
    <ProgressView childId={childId} mode="school" teacher={teacher} viewerId={viewerId} canPractice={canPractice} back={back}
      childName={child.nickname ? `${child.name} · ${child.nickname}` : child.name}
      reportHref={`/report?child=${encodeURIComponent(childId)}`}
      legacy={<SchoolLegacyHistory data={record.data} teacher={teacher} />} />
  );
}

function FamilyProgress() {
  const { user } = useAuth();
  const { profile, isHydrated } = useChildProfile();
  const { canViewProgress, canStartPractice } = useCurrentChildAccess();
  if (!isHydrated) return <Loading />;
  if (!profile) {
    return (
      <Page width="narrow">
        <EmptyState icon={<User size={22} />} title="ยังไม่ได้เลือกเด็ก"
          description={user ? "ใช้รหัสจากใบเชิญของโรงเรียนเพื่อเชื่อมกับบุตรหลาน" : "สร้างโปรไฟล์เด็กเพื่อเริ่มฝึกและดูความก้าวหน้า"}
          action={user
            ? <ButtonLink href="/join" icon={<KeyRound size={16} aria-hidden="true" />}>ใช้รหัสเข้าร่วม</ButtonLink>
            : <ButtonLink href="/onboarding">สร้างโปรไฟล์เด็ก</ButtonLink>} />
      </Page>
    );
  }
  if (!canViewProgress) {
    return (
      <Page width="narrow">
        <EmptyState icon={<Lock size={22} />} title="บัญชีนี้ยังไม่มีสิทธิ์ดูผลการฝึก" description="ขอให้เจ้าของโปรไฟล์เปิดสิทธิ์ดูผลให้ที่หน้าข้อมูลลูก" />
      </Page>
    );
  }
  return (
    <ProgressView key={profile.id} childId={profile.id} childName={profile.name} mode="family"
      canPractice={canStartPractice} reportHref="/report" legacy={<FamilyLegacyHistory />} />
  );
}

function ProgressEntry() {
  const requestedChild = useSearchParams().get("child");
  const { user, isLoading } = useAuth();
  const { profile, isOwner } = useChildProfile();
  const { canStartPractice } = useCurrentChildAccess();
  const online = isSupabaseProviderRequested() && isSupabaseConfigured();
  const teacher = user?.role === "teacher";
  const admin = user?.role === "school_admin";

  if (online && isLoading) return <Loading />;
  if (online && requestedChild && !user) {
    return (
      <Page width="narrow">
        <EmptyState icon={<LogIn size={22} />} title="เข้าสู่ระบบเพื่อดูผลฝึก"
          action={<ButtonLink href={`/auth/signin?redirect=${encodeURIComponent(`/progress?child=${requestedChild}`)}`}>เข้าสู่ระบบ</ButtonLink>} />
      </Page>
    );
  }
  const schoolChildId = online && user
    ? ((teacher || admin) && requestedChild) || (!isOwner && profile?.organizationId ? profile.id : null)
    : null;
  if (schoolChildId && user) {
    return (
      <SchoolChildProgress key={schoolChildId} childId={schoolChildId} viewerId={user.id} teacher={teacher} admin={admin}
        canPractice={!teacher && !admin && canStartPractice} />
    );
  }
  return <FamilyProgress />;
}

export default function ProgressPage() {
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <ProgressEntry />
      </Suspense>
    </AppShell>
  );
}
