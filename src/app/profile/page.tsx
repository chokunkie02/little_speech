"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import AddChildModal from "@/components/layout/AddChildModal";
import ProfileMark from "@/components/ui/ProfileMark";
import SharedGuardianSettings from "@/components/layout/SharedGuardianSettings";
import { ChildAccessSection, InviteNewMemberSection, SentInvitesSection } from "@/components/layout/InviteSection";
import { useAuth, isParent } from "@/hooks/useAuth";
import { useChildAccess } from "@/hooks/useChildAccess";
import { useChildProfile } from "@/hooks/useChildProfile";

const card = "rounded-2xl border border-border bg-surface p-4 sm:p-5";
const secondary = "inline-flex items-center rounded-xl border border-border px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10";
const primary = "inline-flex items-center rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90";
const goals: Record<string, string> = { daily: "ทุกวัน", "3x-week": "3 วันต่อสัปดาห์", casual: "เมื่อมีเวลา" };

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const { profile, isOwner, isHydrated } = useChildProfile();
  const { receivedGrants } = useChildAccess();
  const [adding, setAdding] = useState(false);
  const parent = !user || (isParent(user) && !user.isPlatformAdmin);
  const schoolGuardian = !!profile?.organizationId && receivedGrants.some(
    (grant) => grant.childId === profile.id && grant.role === "guardian" && !grant.revokedAt,
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-5 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-text">ข้อมูลลูก</h1>
            <p className="mt-1 text-sm text-text-muted">ข้อมูลเด็กที่เลือก แผนฝึก และคนที่เชื่อมกับโปรไฟล์นี้</p>
          </div>
          {!user && !isLoading && parent && profile && <button type="button" className={secondary} onClick={() => setAdding(true)}>เพิ่มเด็ก</button>}
        </header>
        {!isHydrated || isLoading ? <p role="status" className="text-sm text-text-muted">กำลังโหลดข้อมูลลูก…</p>
          : !parent ? <p className={card + " text-sm"}>เปิดข้อมูลนักเรียนจากหน้าจัดการของบัญชีคุณ</p>
          : !profile ? (
            <section className={card + " space-y-3"}>
              <h2 className="font-semibold">ยังไม่ได้เลือกโปรไฟล์เด็ก</h2>
              <p className="text-sm text-text-muted">สร้างโปรไฟล์สำหรับฝึกที่บ้าน หรือเปิดคำเชิญที่ได้รับจากครู</p>
              <div className="flex flex-wrap gap-2">
                {!user && <Link href="/onboarding" className={primary}>สร้างโปรไฟล์เด็ก</Link>}
                <Link href={user ? "/inbox" : "/settings#invitations"} className={secondary}>เปิดคำเชิญ</Link>
              </div>
            </section>
          ) : (
            <div className={`grid items-start gap-4 ${schoolGuardian || (isOwner && !profile.organizationId) ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : ""}`}>
              <section className={card + " space-y-4"} aria-label="ข้อมูลเด็กที่เลือก">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 font-bold text-primary">
                    <ProfileMark name={profile.nickname || profile.name} avatar={profile.avatarEmoji} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words font-bold text-text">{profile.name}</h2>
                    <p className="text-xs text-text-muted">{profile.organizationId ? "โปรไฟล์จากโรงเรียน" : isOwner ? "โปรไฟล์ครอบครัว" : "โปรไฟล์ที่แชร์ให้คุณ"}</p>
                  </div>
                  {isOwner && !profile.organizationId && <Link href="/onboarding?edit=true" className={secondary}>แก้ไขข้อมูลลูก</Link>}
                </div>
                <dl className="grid grid-cols-2 gap-3 rounded-xl bg-bg p-3 text-sm">
                  {[
                    ["ชื่อเล่น", profile.nickname || "ยังไม่ได้ระบุ"],
                    ["อายุ", profile.age + " ปี"],
                    ["โหมดฝึก", profile.trainingMode === "kindergarten_phonics" ? "เรียนเสียงไทย" : "ฝึกออกเสียง"],
                    ["เป้าหมาย", goals[profile.trainingGoal] || profile.trainingGoal || "ยังไม่ได้กำหนด"],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-xs text-text-muted">{label}</dt>
                      <dd className="mt-1 break-words font-medium text-text">{value}</dd>
                    </div>
                  ))}
                </dl>
                {profile.organizationId && <p className="text-xs text-text-muted">ติดต่อครูประจำห้องเมื่อต้องการแก้ชื่อจริงหรืออายุของนักเรียน</p>}
                <div className="flex flex-wrap gap-2">
                  <Link href="/training" className={primary}>ไปหน้าฝึกและเรียน</Link>
                  <Link href="/progress" className={secondary}>ดูความก้าวหน้า</Link>
                </div>
              </section>

              {schoolGuardian ? (
                <section aria-labelledby="co-guardians" className="space-y-2">
                  <h2 id="co-guardians" className="font-semibold">ผู้ปกครองร่วม</h2>
                  <SharedGuardianSettings key={user?.id + ":" + profile.id} child={profile} />
                </section>
              ) : isOwner && !profile.organizationId ? (
                <section className={card + " space-y-4"} aria-label="ผู้ที่เข้าถึงข้อมูลลูก">
                  <h2 className="font-semibold">ผู้ที่เข้าถึงข้อมูลลูก</h2>
                  <InviteNewMemberSection />
                  <ChildAccessSection />
                  <details className="border-t border-border pt-3 text-sm">
                    <summary className="cursor-pointer font-medium">ประวัติคำเชิญ</summary>
                    <div className="mt-3"><SentInvitesSection /></div>
                  </details>
                </section>
              ) : null}
            </div>
          )}
        <AddChildModal open={adding} onClose={() => setAdding(false)} />
      </div>
    </AppShell>
  );
}
