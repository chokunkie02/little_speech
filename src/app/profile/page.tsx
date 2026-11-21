"use client";

import { useState } from "react";
import { Cake, CalendarCheck, ChartColumn, KeyRound, Pencil, Play, Plus, Smile, Target, User } from "lucide-react";
import { Art } from "@/features/learning-studio/Art";
import AppShell from "@/components/layout/AppShell";
import AddChildModal from "@/components/layout/AddChildModal";
import SharedGuardianSettings from "@/components/layout/SharedGuardianSettings";
import { ChildAccessSection } from "@/components/layout/InviteSection";
import { JoinCodeCard } from "@/components/join/JoinCodeCard";
import {
  Alert, Avatar, Button, ButtonLink, Card, CardContent, CardHeader, EmptyState, LoadingState, Page, PageHeader,
} from "@/components/ui";
import { useAuth, isParent } from "@/hooks/useAuth";
import { useChildAccess } from "@/hooks/useChildAccess";
import { useChildProfile } from "@/hooks/useChildProfile";

const GOALS: Record<string, string> = { daily: "ทุกวัน", "3x-week": "3 วันต่อสัปดาห์", casual: "เมื่อมีเวลา" };
const SOUND_ART: Record<string, string> = { "ก": "chicken", "ป": "fish", "ม": "horse", "ง": "snake", "ข": "rice", "ค": "crow", "ต": "eye", "ห": "snake", "ล": "ball", "บ": "ball", "ท": "box", "จ": "cup" };

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
            <Card className="overflow-hidden">
              <div className="hero-night relative px-5 pb-6 pt-5">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgb(255_255_255/0.18)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(120deg,transparent_35%,#000_90%)]" />
                <div className="relative flex items-start gap-4">
                  <span aria-hidden="true" className="grid size-20 shrink-0 place-items-center rounded-full bg-gradient-to-b from-white/95 to-[#E9E6FF] p-2 shadow-[0_12px_28px_-14px_rgb(0_0_0/0.6)] ring-4 ring-white/15 [&_svg]:h-auto [&_svg]:w-full">
                    {profile.targetSound && SOUND_ART[profile.targetSound]
                      ? <Art kind={SOUND_ART[profile.targetSound]} label="" />
                      : <Avatar name={profile.nickname || profile.name} size="lg" />}
                  </span>
                  <div className="min-w-0 flex-1 pt-1">
                    <h2 className="break-words font-display text-[1.75rem] font-semibold leading-tight">{profile.name}</h2>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
                      <span className="rounded-full bg-white/15 px-2.5 py-0.5 ring-1 ring-inset ring-white/15">{source}</span>
                      {profile.targetSound && <span className="rounded-full bg-[linear-gradient(180deg,#FFD58A,#F2B23A)] px-2.5 py-0.5 text-[#3A2300]">เสียง {profile.targetSound}</span>}
                    </div>
                  </div>
                  {familyOwner && (
                    <ButtonLink href="/onboarding?edit=true" variant="inverse-outline" size="icon" className="border-white/25 bg-white/10" aria-label="แก้ไขข้อมูลลูก"><Pencil size={16} aria-hidden="true" /></ButtonLink>
                  )}
                </div>
              </div>
              <CardContent className="space-y-4 pt-4">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: "ชื่อเล่น", value: profile.nickname || "ยังไม่ได้ระบุ", icon: <Smile size={15} /> },
                    { label: "อายุ", value: `${profile.age} ปี`, icon: <Cake size={15} /> },
                    { label: "โหมดฝึก", value: profile.trainingMode === "kindergarten_phonics" ? "เรียนเสียงไทย" : "ฝึกออกเสียง", icon: <Target size={15} /> },
                    { label: "เป้าหมาย", value: GOALS[profile.trainingGoal] || profile.trainingGoal || "ยังไม่ได้กำหนด", icon: <CalendarCheck size={15} /> },
                  ].map((item) => (
                    <div key={item.label} className="min-w-0 rounded-[0.9rem] border border-border bg-surface-muted/50 p-3">
                      <dt className="flex items-center gap-1.5 text-caption text-text-muted"><span aria-hidden="true" className="text-primary-text">{item.icon}</span>{item.label}</dt>
                      <dd className="mt-1 break-words font-display text-[0.9375rem] font-medium text-text">{item.value}</dd>
                    </div>
                  ))}
                </dl>
                {profile.organizationId && <p className="text-caption text-text-muted">ต้องการแก้ชื่อจริงหรือวันเกิด ติดต่อครูประจำห้อง</p>}
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href="/training" className="btn-gold px-6" icon={<Play size={16} className="fill-current" aria-hidden="true" />}>ไปฝึก</ButtonLink>
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
