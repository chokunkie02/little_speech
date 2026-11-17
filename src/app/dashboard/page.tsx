"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";
import { BookOpen, ChartColumn, ChevronRight, FileText, Mic, Play, Sparkles, Star, Target, Trophy } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import {
  Avatar, Badge, ButtonLink, Card, CardContent, EmptyState, LoadingState, Page, PageHeader, Section, StatCard,
} from "@/components/ui";
import { useStudioState } from "@/features/learning-studio/useStudioState";
import { useAuth } from "@/hooks/useAuth";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useCurrentChildAccess } from "@/hooks/useCurrentChildAccess";
import { useLearningResults } from "@/hooks/useLearningResults";
import { summarize, TRACK_LABELS, type LearningResult } from "@/lib/learning/results";
import { formatRelativeTime } from "@/lib/thaiDate";

function LatestResult({ latest }: { latest: LearningResult | undefined }) {
  if (!latest) {
    return <Card dashed><CardContent className="text-center text-sm text-text-muted">ยังไม่มีรอบที่ฝึกจบ เริ่มฝึกเพื่อดูผล</CardContent></Card>;
  }
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-caption text-text-muted">{formatRelativeTime(latest.completedAt)} · {TRACK_LABELS[latest.track]} · เสียง {latest.sound}</p>
            <p className="mt-0.5 break-words font-semibold text-text">{latest.stageLabel}</p>
          </div>
          <Badge tone="warning" icon={<Star size={12} className="fill-current" />}><span className="tabular-nums">+{latest.activities}</span></Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
          <span>ลองทำ {latest.activities} กิจกรรม</span>
          {latest.choiceCount > 0 && <span>· ฟังแล้วเลือกตรงเสียง {latest.correctChoices}/{latest.choiceCount} ข้อ</span>}
          <Link href="/progress" className="ml-auto inline-flex items-center gap-0.5 font-semibold text-primary-text hover:underline">
            ดูทั้งหมด <ChevronRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="block rounded-card">
      <Card interactive className="flex h-full items-center gap-3 p-4">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary-text">{icon}</span>
        <span className="text-sm font-semibold text-text">{label}</span>
      </Card>
    </Link>
  );
}

export default function ParentDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { profile, hasProfile, isHydrated } = useChildProfile();
  const { canStartPractice } = useCurrentChildAccess();
  const { results, status } = useLearningResults(profile?.id);
  const studio = useStudioState(user?.id, profile?.id);
  const summary = useMemo(() => summarize(results), [results]);
  const phonics = profile?.trainingMode === "kindergarten_phonics";

  useEffect(() => {
    if (!isHydrated || isAuthLoading) return;
    if (!isAuthenticated) router.replace("/auth/signin");
  }, [isHydrated, isAuthLoading, isAuthenticated, router]);

  if (!isHydrated || isAuthLoading) {
    return <AppShell><Page width="narrow"><LoadingState variant="cards" rows={3} /></Page></AppShell>;
  }

  if (!hasProfile || !profile) {
    return (
      <AppShell>
        <Page width="narrow">
          <EmptyState icon={<Sparkles size={22} />} title="ยังไม่มีข้อมูลเด็ก"
            description="ใช้รหัสจากใบเชิญของโรงเรียน หรือเพิ่มข้อมูลลูกเองเพื่อเริ่มฝึก"
            action={<><ButtonLink href="/join">ใช้รหัสเข้าร่วม</ButtonLink><ButtonLink href="/profile" variant="outline">เปิดข้อมูลลูก</ButtonLink></>} />
        </Page>
      </AppShell>
    );
  }

  const firstName = profile.nickname || (profile.name.split(" ")[0] ?? profile.name);
  const plan = studio?.plan.childId === profile.id ? studio.plan : undefined;
  const paused = studio?.sessions.find((session) => session.id === studio.activeSessionId && session.status === "active" && session.childId === profile.id);
  const latest = results[0];
  const track = plan?.track ?? (phonics ? "phonics" : "speech");
  const sound = plan?.sound ?? profile.targetSound ?? "ก";

  return (
    <AppShell>
      <Page>
        <PageHeader title={`วันนี้จะฝึกอะไรกับ${firstName}?`} description="รอบละไม่กี่นาที ฝึกสม่ำเสมอดีกว่าฝึกนาน ๆ" />

        {/* Desktop: practice on the left, the at-a-glance numbers and shortcuts on the right. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
          <div className="min-w-0 space-y-6">
            <Card>
              <CardContent className="flex items-center gap-4">
                <Avatar name={profile.name} size="lg" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-card-title break-words">{profile.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={track === "phonics" ? "warning" : "primary"} icon={track === "phonics" ? <Sparkles size={12} /> : <Target size={12} />}>
                      {TRACK_LABELS[track]}
                    </Badge>
                    <Badge>{profile.age} ปี</Badge>
                    <Badge icon={<Mic size={12} />}>เสียง {sound}</Badge>
                  </div>
                </div>
                <ButtonLink href="/profile" variant="ghost" size="sm">ข้อมูลลูก</ButtonLink>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-primary/25">
              <CardContent className="space-y-4 bg-primary-soft/60">
                <div>
                  <p className="text-caption font-semibold text-primary-text">{paused ? "มีรอบที่พักไว้" : latest ? "ฝึกต่อจากครั้งก่อน" : "เริ่มรอบแรก"}</p>
                  <p className="text-section-title text-text">
                    {paused ? paused.stageLabel : latest ? latest.stageLabel : "ฟัง ดูปาก แล้วลองพูดตามทีละขั้น"}
                  </p>
                  <p className="text-sm text-text-muted">
                    {paused ? `ทำไปแล้ว ${paused.attempts.length} จาก ${paused.itemIds.length} กิจกรรม`
                      : latest ? `ฝึกล่าสุด ${formatRelativeTime(latest.completedAt)} · ${TRACK_LABELS[latest.track]}`
                        : `${TRACK_LABELS[track]} · เสียง ${sound}`}
                  </p>
                </div>
                {canStartPractice
                  ? <ButtonLink href="/training" size="lg" block icon={<Play size={18} className="fill-current" aria-hidden="true" />}>{paused ? "ทำรอบที่พักไว้ต่อ" : latest ? "ฝึกต่อ" : "เริ่มฝึก"}</ButtonLink>
                  : <p className="rounded-control bg-surface px-3 py-2 text-center text-sm text-text-muted">บัญชีนี้ดูผลการฝึกได้อย่างเดียว</p>}
              </CardContent>
            </Card>

            <Section title="ผลล่าสุด">
              {status === "loading" && !results.length ? <LoadingState variant="list" rows={1} /> : <LatestResult latest={latest} />}
            </Section>
          </div>

          <div className="min-w-0 space-y-6 lg:sticky lg:top-20">
            <Section title="ภาพรวม">
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="รอบที่ฝึกจบ" value={summary.sessions} />
                <StatCard label="วันที่ฝึกใน 7 วัน" tone="success"
                  value={<>{summary.daysThisWeek}<span className="text-sm font-normal text-text-muted">/7</span></>} />
                <StatCard label="ดาวความพยายาม" tone="warning" value={summary.activities} />
              </div>
            </Section>

            <Section title="ทางลัด">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
                <QuickLink href="/progress" icon={<ChartColumn size={20} />} label="ความก้าวหน้า" />
                <QuickLink href="/rewards" icon={<Trophy size={20} />} label="รางวัล" />
                <QuickLink href="/report" icon={<FileText size={20} />} label="รายงาน" />
                <QuickLink href="/training#library" icon={<BookOpen size={20} />} label="คลังกิจกรรม" />
              </div>
            </Section>
          </div>
        </div>
      </Page>
    </AppShell>
  );
}
