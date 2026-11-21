"use client";

import { useMemo } from "react";
import { Calendar, Compass, Ear, Flag, Flame, KeyRound, Lock, Play, Repeat, Star, Trophy, User, type LucideIcon } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { ButtonLink, EmptyState, LoadingState, Page, PageHeader, Section } from "@/components/ui";
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

const GOLD = "bg-[radial-gradient(circle_at_35%_30%,#FFE7A8,#FFC861_45%,#E39A1E)] text-[#6B3E00] shadow-[0_4px_0_#B8741A,0_14px_24px_-12px_rgb(227_154_30/0.8),inset_0_2px_0_rgb(255_255_255/0.55)]";

function ProgressBar({ value, max, label, onDark = false }: { value: number; max: number; label: string; onDark?: boolean }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}
      className={cn("h-2 overflow-hidden rounded-full", onDark ? "bg-white/20" : "bg-surface-muted")}>
      <div className={cn("h-full rounded-full transition-[width]", onDark ? "bg-gradient-to-r from-[#FFD58A] to-[#F2B23A]" : "bg-gradient-to-r from-[#7B6FF3] to-primary")}
        style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
    </div>
  );
}

/** One medal on the shelf: gold and lit when earned, a flat grey disc with a lock when not yet. */
function MedalTile({ item }: { item: Milestone }) {
  const Icon = ICONS[item.icon];
  return (
    <li className={cn("relative flex flex-col items-center rounded-[1.25rem] border px-4 pb-4 pt-5 text-center transition-transform hover:-translate-y-0.5",
      item.earned ? "border-[#F2B23A]/40 bg-gradient-to-b from-[#FFF6E0] to-surface shadow-[0_18px_34px_-24px_rgb(227_154_30/0.9)] dark:from-[#3A2C0E]" : "border-border bg-surface")}>
      {item.earned && (
        <span className="absolute right-3 top-3 rounded-full bg-success-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-success-text">ได้แล้ว</span>
      )}
      <span aria-hidden="true" className={cn("relative grid size-[4.5rem] place-items-center rounded-full",
        item.earned ? GOLD : "bg-surface-muted text-text-muted ring-1 ring-inset ring-border")}>
        <Icon size={30} strokeWidth={2.2} />
        {!item.earned && (
          <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-surface text-text-muted shadow-card ring-1 ring-border">
            <Lock size={12} />
          </span>
        )}
      </span>
      <p className={cn("mt-3 font-display text-base font-medium", item.earned ? "text-text" : "text-text-muted")}>{item.title}</p>
      <p className="mt-0.5 text-caption text-text-muted">{item.description}</p>
      {!item.earned && (
        <div className="mt-3 w-full space-y-1">
          <ProgressBar value={item.current} max={item.target} label={`${item.title}: ${item.current} จาก ${item.target}`} />
          <p className="text-[0.6875rem] tabular-nums text-text-muted">{item.current}/{item.target}</p>
        </div>
      )}
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
      <section aria-label="สรุปรางวัล" className="hero-night relative overflow-hidden rounded-[1.5rem] p-5 sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgb(255_255_255/0.18)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(120deg,transparent_35%,#000_90%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,20rem)] lg:items-center">
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className={cn("grid size-20 shrink-0 place-items-center rounded-full", GOLD)}>
              <Star size={38} className="fill-current" />
            </span>
            <div>
              <p className="text-caption font-semibold text-[#FFD58A]">ดาวความพยายาม</p>
              <p className="font-display text-[2.75rem] font-semibold leading-none tabular-nums">{summary.activities}</p>
              <p className="mt-1 text-caption text-white/75">สัปดาห์นี้ +{thisWeek} · 1 ดวงต่อ 1 กิจกรรม</p>
            </div>
          </div>

          <div className="min-w-0 lg:border-l lg:border-white/15 lg:pl-6">
            <p className="text-caption font-semibold text-white/75">ตราที่ได้</p>
            <p className="font-display text-[2rem] font-semibold leading-tight tabular-nums">{earned.length}<span className="text-lg font-normal text-white/60">/{list.length}</span></p>
            <ol className="mt-2 flex flex-wrap gap-1.5" aria-label={`ได้ตรา ${earned.length} จาก ${list.length}`}>
              {[...earned, ...list.filter((item) => !item.earned)].map((item) => (
                <li key={item.id} title={item.title}
                  className={cn("h-2.5 w-6 rounded-full", item.earned ? "bg-gradient-to-r from-[#FFD58A] to-[#F2B23A] shadow-[0_0_10px_rgb(255_200_97/0.6)]" : "bg-white/20")} />
              ))}
            </ol>
          </div>

          <div className="rounded-[1.1rem] bg-white/10 p-4 ring-1 ring-inset ring-white/15 backdrop-blur-sm">
            {next ? (
              <>
                <p className="text-caption text-white/70">ใกล้ได้ตราถัดไป</p>
                <p className="font-display text-lg font-medium">{next.title}</p>
                <p className="mb-2 text-caption text-white/70">{next.description} · อีก {next.target - next.current}</p>
                <ProgressBar onDark value={next.current} max={next.target} label={`${next.title}: ${next.current} จาก ${next.target}`} />
              </>
            ) : <p className="font-display text-lg font-medium text-[#FFD58A]">ได้ครบทุกตราแล้ว เก่งมาก!</p>}
            {canPractice && (
              <ButtonLink href="/training" size="md" block className="btn-gold mt-4" icon={<Play size={15} className="fill-current" aria-hidden="true" />}>ไปฝึกต่อ</ButtonLink>
            )}
          </div>
        </div>
      </section>

      {earned.length > 0 && (
        <Section title={`ตราที่ได้แล้ว · ${earned.length}`}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{earned.map((item) => <MedalTile key={item.id} item={item} />)}</ul>
        </Section>
      )}
      <Section title="ตราถัดไป" description="นับจากความพยายาม ไม่ได้นับจากคะแนน">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.filter((item) => !item.earned).map((item) => <MedalTile key={item.id} item={item} />)}
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
