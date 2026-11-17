"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, Lock, LogIn, User } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { ProgressReport } from "@/components/report/ProgressReport";
import { useSchoolChildRecord } from "@/components/progress/LegacyHistory";
import { ButtonLink, EmptyState, LoadingState, Page } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useCurrentChildAccess } from "@/hooks/useCurrentChildAccess";
import { useObservationNotes } from "@/hooks/useObservationNotes";
import { isSupabaseProviderRequested } from "@/lib/config/storageProvider";
import { isSupabaseConfigured } from "@/lib/supabase/client";

function Loading() {
  return <Page width="narrow"><LoadingState variant="cards" rows={2} /></Page>;
}

function SchoolChildReport({ childId, canPrint, fromStaff }: { childId: string; canPrint: boolean; fromStaff: boolean }) {
  const record = useSchoolChildRecord(childId);
  const progressHref = fromStaff ? `/progress?child=${encodeURIComponent(childId)}` : "/progress";
  if (!record) return <Loading />;
  if (!record.data) {
    return (
      <Page width="narrow">
        <EmptyState icon={<Lock size={22} />} title={record.error ? "โหลดข้อมูลนักเรียนไม่สำเร็จ" : "ยังไม่มีสิทธิ์ดูรายงานของนักเรียนคนนี้"} />
      </Page>
    );
  }
  const { child } = record.data;
  return (
    <ProgressReport childId={childId} childName={child.name} subtitle={child.nickname ?? undefined}
      back={{ href: progressHref, label: "ความก้าวหน้า" }} canPrint={canPrint} />
  );
}

function FamilyReport() {
  const { user } = useAuth();
  const { profile, isHydrated } = useChildProfile();
  const { canViewProgress, canExportReport } = useCurrentChildAccess();
  const { notes } = useObservationNotes();
  if (!isHydrated) return <Loading />;
  if (!profile) {
    return (
      <Page width="narrow">
        <EmptyState icon={<User size={22} />} title="ยังไม่ได้เลือกเด็ก"
          action={user
            ? <ButtonLink href="/join" icon={<KeyRound size={16} aria-hidden="true" />}>ใช้รหัสเข้าร่วม</ButtonLink>
            : <ButtonLink href="/onboarding">สร้างโปรไฟล์เด็ก</ButtonLink>} />
      </Page>
    );
  }
  if (!canViewProgress) {
    return <Page width="narrow"><EmptyState icon={<Lock size={22} />} title="บัญชีนี้ยังไม่มีสิทธิ์ดูผลการฝึก" /></Page>;
  }
  return (
    <ProgressReport key={profile.id} childId={profile.id} childName={profile.name}
      subtitle={profile.nickname || undefined} back={{ href: "/progress", label: "ความก้าวหน้า" }}
      canPrint={canExportReport} notes={notes} />
  );
}

function ReportEntry() {
  const requestedChild = useSearchParams().get("child");
  const { user, isLoading } = useAuth();
  const { profile, isOwner } = useChildProfile();
  const { canExportReport } = useCurrentChildAccess();
  const online = isSupabaseProviderRequested() && isSupabaseConfigured();
  const staff = user?.role === "teacher" || user?.role === "school_admin";

  if (online && isLoading) return <Loading />;
  if (online && requestedChild && !user) {
    return (
      <Page width="narrow">
        <EmptyState icon={<LogIn size={22} />} title="เข้าสู่ระบบเพื่อดูรายงาน"
          action={<ButtonLink href={`/auth/signin?redirect=${encodeURIComponent(`/report?child=${requestedChild}`)}`}>เข้าสู่ระบบ</ButtonLink>} />
      </Page>
    );
  }
  const schoolChildId = online && user
    ? (staff && requestedChild) || (!isOwner && profile?.organizationId ? profile.id : null)
    : null;
  if (schoolChildId) {
    return <SchoolChildReport key={schoolChildId} childId={schoolChildId} fromStaff={staff} canPrint={staff || canExportReport} />;
  }
  return <FamilyReport />;
}

export default function ReportPage() {
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <ReportEntry />
      </Suspense>
    </AppShell>
  );
}
