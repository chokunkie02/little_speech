"use client";

import { useMemo } from "react";
import { Calendar, Compass, Ear, Flag, Flame, KeyRound, Lock, Play, Repeat, Star, Trophy, User, type LucideIcon } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Badge, ButtonLink, Card, CardContent, EmptyState, LoadingState, Page, PageHeader, Section } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useCurrentChildAccess } from "@/hooks/useCurrentChildAccess";
import { useLearningResults } from "@/hooks/useLearningResults";
import { summarize, type LearningSummary } from "@/lib/learning/results";
import { milestones, nextMilestone, type Milestone, type MilestoneIcon } from "@/lib/learning/milestones";
import { cn } from "@/lib/cn";

const ICONS: Record<MilestoneIcon, LucideIcon> = {
  flag: Flag, repeat: Repeat, calendar: Calendar, flame: Flame, star: Star, compass: Compass, ear: Ear,
};

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}
      className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(value / max) * 100}%` }} />
    </div>
  );
}

function MilestoneCard({ item }: { item: Milestone }) {
  const Icon = ICONS[item.icon];
  return (
    <li className={cn("flex gap-3 rounded-card border p-4", item.earned ? "border-secondary/50 bg-surface shadow-card" : "border-dashed border-border bg-surface")}>
      <span aria-hidden="true" className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-control",
        item.earned ? "bg-warning-soft text-warning-text" : "bg-surface-muted text-text-muted")}>
        <Icon size={22} />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("text-sm font-semibold", item.earned ? "text-text" : "text-text-muted")}>{item.title}</p>
          {item.earned && <Badge tone="success" dot>ได้แล้ว</Badge>}
        </div>
        <p className="text-caption text-text-muted">{item.description}</p>
        {!item.earned && (
          <>
            <ProgressBar value={item.current} max={item.target} label={`${item.title}: ${item.current} จาก ${item.target}`} />
            <p className="text-caption tabular-nums text-text-muted">{item.current}/{item.target}</p>
          </>
        )}
      </div>
    </li>
  );
}

function RewardsContent({ summary, canPractice }: { summary: LearningSummary; canPractice: boolean }) {
  const list = useMemo(() => milestones(summary), [summary]);
  const earned = list.filter((item) => item.earned);
  const next = nextMilestone(list);
  const thisWeek = summary.weeks[summary.weeks.length - 1]?.activities ?? 0;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-4 bg-warning-soft/60">
            <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <Star size={28} className="fill-current" />
            </span>
            <div>
              <p className="text-caption font-semibold text-warning-text">ดาวความพยายาม</p>
              <p className="text-3xl font-bold tabular-nums text-text">{summary.activities}</p>
              <p className="text-caption text-text-muted">สัปดาห์นี้ +{thisWeek} · ได้ 1 ดวงทุกครั้งที่ลองทำกิจกรรม</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-text">ตราที่ได้ <span className="tabular-nums">{earned.length}/{list.length}</span></p>
              {canPractice && <ButtonLink href="/training" size="sm" icon={<Play size={14} className="fill-current" aria-hidden="true" />}>ไปฝึก</ButtonLink>}
            </div>
            <ProgressBar value={earned.length} max={list.length} label={`ได้ตรา ${earned.length} จาก ${list.length}`} />
            {next ? (
              <p className="text-sm text-text-muted">
                ใกล้ได้ตรา <span className="font-semibold text-text">{next.title}</span> · {next.description} (อีก {next.target - next.current})
              </p>
            ) : <p className="text-sm font-semibold text-success-text">ได้ครบทุกตราแล้ว เก่งมาก!</p>}
          </CardContent>
        </Card>
      </div>

      {earned.length > 0 && (
        <Section title="ตราที่ได้แล้ว">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{earned.map((item) => <MilestoneCard key={item.id} item={item} />)}</ul>
        </Section>
      )}
      <Section title="ตราถัดไป" description="นับจากความพยายาม ไม่ได้นับจากคะแนน">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.filter((item) => !item.earned).map((item) => <MilestoneCard key={item.id} item={item} />)}
        </ul>
      </Section>
    </>
  );
}

function Rewards() {
  const { user } = useAuth();
  const { profile, isHydrated } = useChildProfile();
  const { canViewProgress, canStartPractice } = useCurrentChildAccess();
  const { results, status } = useLearningResults(profile?.id);
  const summary = useMemo(() => summarize(results), [results]);

  if (!isHydrated) return <LoadingState variant="cards" rows={3} />;
  if (!profile) {
    return (
      <EmptyState icon={<User size={22} />} title="ยังไม่ได้เลือกเด็ก"
        action={user
          ? <ButtonLink href="/join" icon={<KeyRound size={16} aria-hidden="true" />}>ใช้รหัสเข้าร่วม</ButtonLink>
          : <ButtonLink href="/onboarding">สร้างโปรไฟล์เด็ก</ButtonLink>} />
    );
  }
  if (!canViewProgress) return <EmptyState icon={<Lock size={22} />} title="บัญชีนี้ยังไม่มีสิทธิ์ดูผลการฝึก" />;
  if (status === "loading" && !results.length) return <LoadingState variant="cards" rows={3} />;
  return <RewardsContent summary={summary} canPractice={canStartPractice} />;
}

export default function RewardsPage() {
  const { profile } = useChildProfile();
  return (
    <AppShell>
      <Page>
        <PageHeader icon={<Trophy size={20} />} title="รางวัล"
          description={profile ? `ดาวและตราของ${profile.nickname || profile.name.split(" ")[0]} ได้จากการฝึกสม่ำเสมอ` : "ดาวและตราได้จากการฝึกสม่ำเสมอ"} />
        <Rewards />
      </Page>
    </AppShell>
  );
}
