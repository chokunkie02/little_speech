"use client";

import { useState } from "react";
import { ChartColumn, KeyRound, Pencil, Play, Plus, User } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import AddChildModal from "@/components/layout/AddChildModal";
import SharedGuardianSettings from "@/components/layout/SharedGuardianSettings";
import { ChildAccessSection } from "@/components/layout/InviteSection";
import { JoinCodeCard } from "@/components/join/JoinCodeCard";
import {
  Alert, Avatar, Badge, Button, ButtonLink, Card, CardContent, CardHeader, EmptyState, LoadingState, Page, PageHeader,
} from "@/components/ui";
import { useAuth, isParent } from "@/hooks/useAuth";
import { useChildAccess } from "@/hooks/useChildAccess";
import { useChildProfile } from "@/hooks/useChildProfile";

const GOALS: Record<string, string> = { daily: "ทุกวัน", "3x-week": "3 วันต่อสัปดาห์", casual: "เมื่อมีเวลา" };

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const { profile, isOwner, isHydrated } = useChildProfile();
  const { receivedGrants } = useChildAccess();
  const [adding, setAdding] = useState(false);
  const parent = !user || (isParent(user) && !user.isPlatformAdmin);
  const schoolGuardian = !!profile?.organizationId && receivedGrants.some(
    (grant) => grant.childId === profile.id && grant.role === "guardian" && !grant.revokedAt,
  );
  const familyOwner = isOwner && !profile?.organizationId;
  const source = profile?.organizationId ? "จากโรงเรียน" : isOwner ? "ครอบครัว" : "แชร์ให้คุณ";

  return (
    <AppShell>
      <Page>
        <PageHeader icon={<User size={20} />} title="ข้อมูลลูก" description="ข้อมูลเด็กที่เลือก แผนฝึก และคนที่ดูผลร่วมกับคุณ"
          actions={!user && !isLoading && parent && profile && (
            <Button variant="outline" icon={<Plus size={16} aria-hidden="true" />} onClick={() => setAdding(true)}>เพิ่มเด็ก</Button>
          )} />

        {!isHydrated || isLoading ? <LoadingState variant="cards" rows={2} /> : !parent ? (
          <Alert tone="info">เปิดข้อมูลนักเรียนจากหน้าห้องเรียนของบัญชีคุณ</Alert>
        ) : !profile ? (
          <EmptyState icon={<User size={22} />} title="ยังไม่ได้เลือกเด็ก"
            description={user ? "ใช้รหัสจากใบเชิญของโรงเรียนเพื่อเชื่อมกับบุตรหลาน" : "สร้างโปรไฟล์สำหรับฝึกที่บ้าน"}
            action={user
              ? <ButtonLink href="/join" icon={<KeyRound size={16} aria-hidden="true" />}>ใช้รหัสเข้าร่วม</ButtonLink>
              : <ButtonLink href="/onboarding">สร้างโปรไฟล์เด็ก</ButtonLink>} />
        ) : (
          <div className={`grid items-start gap-5 ${schoolGuardian || familyOwner ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : ""}`}>
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar name={profile.nickname || profile.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-section-title break-words">{profile.name}</h2>
                    <Badge tone={profile.organizationId ? "info" : "neutral"}>{source}</Badge>
                  </div>
                  {familyOwner && (
                    <ButtonLink href="/onboarding?edit=true" variant="ghost" size="icon" aria-label="แก้ไขข้อมูลลูก"><Pencil size={16} aria-hidden="true" /></ButtonLink>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-3 rounded-control bg-surface-muted p-3 text-sm">
                  {[
                    ["ชื่อเล่น", profile.nickname || "ยังไม่ได้ระบุ"],
                    ["อายุ", `${profile.age} ปี`],
                    ["โหมดฝึก", profile.trainingMode === "kindergarten_phonics" ? "เรียนเสียงไทย" : "ฝึกออกเสียง"],
                    ["เป้าหมาย", GOALS[profile.trainingGoal] || profile.trainingGoal || "ยังไม่ได้กำหนด"],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-caption text-text-muted">{label}</dt>
                      <dd className="mt-0.5 break-words font-medium text-text">{value}</dd>
                    </div>
                  ))}
                </dl>
                {profile.organizationId && <p className="text-caption text-text-muted">ต้องการแก้ชื่อจริงหรือวันเกิด ติดต่อครูประจำห้อง</p>}
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href="/training" icon={<Play size={16} className="fill-current" aria-hidden="true" />}>ไปฝึก</ButtonLink>
                  <ButtonLink href="/progress" variant="outline" icon={<ChartColumn size={16} aria-hidden="true" />}>ความก้าวหน้า</ButtonLink>
                </div>
              </CardContent>
            </Card>

            {schoolGuardian ? (
              <Card>
                <CardHeader title="ผู้ปกครองร่วม" description="คนในครอบครัวที่ดูผลและช่วยฝึกกับบุตรหลานได้" />
                <CardContent><SharedGuardianSettings key={user?.id + ":" + profile.id} child={profile} /></CardContent>
              </Card>
            ) : familyOwner ? (
              <Card>
                <CardHeader title="ผู้ที่เข้าถึงข้อมูลลูก" />
                <CardContent className="space-y-4">
                  <JoinCodeCard key={profile.id} kind="guardian" childId={profile.id} title="ชวนผู้ปกครองร่วม"
                    description="ให้พ่อ แม่ หรือญาติสแกน QR หรือกรอกรหัสนี้ เขาจะดูผลและช่วยฝึกได้ทันที ไม่ต้องรู้อีเมลของกันและกัน (ใช้ได้ 4 บัญชี 30 วัน)"
                    revealLabel="แสดงรหัสชวน" />
                  <ChildAccessSection />
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
        <AddChildModal open={adding} onClose={() => setAdding(false)} />
      </Page>
    </AppShell>
  );
}
