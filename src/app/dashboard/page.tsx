"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, type CSSProperties, type ReactNode } from "react";
import {
  BookOpen, CalendarDays, ChartColumn, ChevronRight, Compass, Ear, FileText, Flag, Flame, Mic, MessageCircle,
  Play, Repeat, Sparkles, Star, Target, Trophy, Type,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useAccountProfile } from "@/components/account/AccountProfileProvider";
import { Avatar, ButtonLink, Card, CardContent, EmptyState, LoadingState, Page } from "@/components/ui";
import { Art } from "@/features/learning-studio/Art";
import { useStudioState } from "@/features/learning-studio/useStudioState";
import { useAuth } from "@/hooks/useAuth";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useCurrentChildAccess } from "@/hooks/useCurrentChildAccess";
import { useLearningResults } from "@/hooks/useLearningResults";
import { milestones, nextMilestone, type MilestoneIcon } from "@/lib/learning/milestones";
import {
  dayKey, shiftDay, suggestNextStep, summarize, TRACK_LABELS, type LearningResult, type LearningSummary, type LearningTrack,
} from "@/lib/learning/results";
import { formatRelativeTime } from "@/lib/thaiDate";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MILESTONE_ICONS: Record<MilestoneIcon, ReactNode> = {
  flag: <Flag size={22} />, repeat: <Repeat size={22} />, calendar: <CalendarDays size={22} />, flame: <Flame size={22} />,
  star: <Star size={22} />, compass: <Compass size={22} />, ear: <Ear size={22} />,
};
const TRACK_STYLE: Record<LearningTrack, { icon: ReactNode; tile: string }> = {
  speech: { icon: <Mic size={18} />, tile: "bg-primary-soft text-primary-text" },
  communication: { icon: <MessageCircle size={18} />, tile: "bg-info-soft text-info-text" },
  phonics: { icon: <Type size={18} />, tile: "bg-warning-soft text-warning-text" },
};
/** A picture whose Thai word starts with the child's target sound (ไก่ for ก, ปลา for ป …). */
const SOUND_ART: Record<string, string> = { "ก": "chicken", "ป": "fish", "ม": "horse", "ง": "snake", "ข": "rice", "ค": "crow", "ต": "eye", "ห": "snake", "ล": "ball", "บ": "ball", "ท": "box", "จ": "cup" };
const GOLD = "bg-[radial-gradient(circle_at_35%_30%,#FFE7A8,#FFC861_45%,#E39A1E)] text-[#6B3E00] shadow-[0_3px_0_#B8741A,inset_0_2px_0_rgb(255_255_255/0.55)]";

function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}
      className="h-2 overflow-hidden rounded-full bg-surface-muted">
      <div className="h-full rounded-full bg-gradient-to-r from-[#6B5FEC] to-primary" style={{ width: `${percent}%` }} />
    </div>
  );
}

function greeting(now: Date) {
  const hour = now.getHours();
  return hour < 11 ? "สวัสดีตอนเช้า" : hour < 16 ? "สวัสดีตอนบ่าย" : hour < 19 ? "สวัสดีตอนเย็น" : "สวัสดีตอนค่ำ";
}

/** The last rounds as a short timeline: what, when, which track, how it went. */
function RecentRounds({ results, loading }: { results: LearningResult[]; loading: boolean }) {
  const rounds = results.slice(0, 3);
  return (
    <Card>
      <CardContent className="space-y-1">
        <div className="flex items-center justify-between gap-3 pb-2">
          <h2 className="text-section-title text-text">ฝึกล่าสุด</h2>
          {rounds.length > 0 && (
            <Link href="/progress" className="inline-flex items-center gap-0.5 text-sm font-semibold text-primary-text hover:underline">
              ดูทั้งหมด <ChevronRight size={15} aria-hidden="true" />
            </Link>
          )}
        </div>
        {loading && !rounds.length ? <LoadingState variant="list" rows={2} /> : !rounds.length ? (
          <p className="rounded-control border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">ยังไม่มีรอบที่ฝึกจบ รอบแรกที่ฝึกจบจะขึ้นที่นี่</p>
        ) : (
          <ol>
            {rounds.map((round) => (
              <li key={round.id} className="flex items-center gap-3.5 border-t border-border py-3.5 first:border-t-0 first:pt-1">
                <span aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-[0.85rem] ${TRACK_STYLE[round.track].tile}`}>
                  {TRACK_STYLE[round.track].icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-medium text-text">{round.stageLabel}</p>
                  <p className="text-caption text-text-muted">{formatRelativeTime(round.completedAt)} · {TRACK_LABELS[round.track]} · เสียง {round.sound}</p>
                </div>
                {round.choiceCount > 0 && (
                  <span className="hidden shrink-0 text-right sm:block">
                    <span className="block font-display text-sm font-medium tabular-nums text-text">{round.correctChoices}/{round.choiceCount}</span>
                    <span className="block text-[0.6875rem] text-text-muted">เลือกตรงเสียง</span>
                  </span>
                )}
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-b from-[#FFE2A3] to-[#FFC861] px-2.5 py-1 font-display text-sm font-semibold text-[#7A4A00] shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_2px_0_#D9962B]">
                  <Star size={13} className="fill-current" aria-hidden="true" />
                  <span className="tabular-nums">+{round.activities}</span><span className="sr-only">ดาว</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/** Last 7 days ending today: a ring for the count and one square per day. */
function WeekCard({ results, daysThisWeek, tip }: { results: LearningResult[]; daysThisWeek: number; tip: string }) {
  const practiced = new Set(results.map((result) => dayKey(result.completedAt)));
  const today = dayKey(new Date());
  const days = Array.from({ length: 7 }, (_, index) => shiftDay(today, index - 6));
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-section-title text-text">7 วันล่าสุด</h2>
          <span className="text-caption text-text-muted">ฝึกแล้ว {daysThisWeek} จาก 7 วัน</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative grid size-[5.5rem] shrink-0 place-items-center" role="img" aria-label={`ฝึกแล้ว ${daysThisWeek} จาก 7 วัน`}>
            <span className="ring-progress absolute inset-0" style={{ "--p": Math.round((daysThisWeek / 7) * 100) } as CSSProperties} />
            <span className="text-center leading-none">
              <span className="block font-display text-[1.75rem] font-semibold tabular-nums text-text">{daysThisWeek}</span>
              <span className="text-[0.6875rem] text-text-muted">/7 วัน</span>
            </span>
          </div>
          <ol className="grid min-w-0 flex-1 grid-cols-7 gap-1">
            {days.map((day) => {
              const done = practiced.has(day), isToday = day === today;
              const label = WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()];
              return (
                <li key={day} className="grid justify-items-center gap-1.5">
                  <span aria-hidden="true" className={
                    done ? "grid size-6 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_4px_10px_-4px_rgb(85_72_212/0.8)]"
                      : isToday ? "size-6 rounded-lg border-2 border-dashed border-primary/60"
                        : "size-6 rounded-lg bg-surface-muted"}>
                    {done && <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m2.5 6.5 2.2 2L9.5 3.5" /></svg>}
                  </span>
                  <span className={isToday ? "text-caption font-semibold text-text" : "text-caption text-text-muted"}>
                    {label}<span className="sr-only">{done ? " ฝึกแล้ว" : " ยังไม่ได้ฝึก"}{isToday ? " (วันนี้)" : ""}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="flex items-start gap-2 rounded-control bg-primary-soft/60 px-3 py-2.5 text-sm text-text">
          <Sparkles size={15} className="mt-0.5 shrink-0 text-primary-text" aria-hidden="true" />{tip}
        </p>
      </CardContent>
    </Card>
  );
}

/** Totals plus rounds per week for the last 8 weeks. */
function OverviewCard({ summary, latest }: { summary: LearningSummary; latest: LearningResult | undefined }) {
  const max = Math.max(1, ...summary.weeks.map((week) => week.sessions));
  const thisWeek = summary.weeks.at(-1)?.activities ?? 0;
  return (
    <Card>
      <CardContent className="space-y-4">
        <h2 className="text-section-title text-text">ภาพรวม</h2>
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="pr-4">
            <p className="text-caption text-text-muted">รอบที่ฝึกจบ</p>
            <p className="font-display text-[2.25rem] font-semibold leading-tight tabular-nums text-text">{summary.sessions}</p>
            <p className="text-caption text-text-muted">{latest ? `ล่าสุด${formatRelativeTime(latest.completedAt)}` : "ยังไม่มี"}</p>
          </div>
          <div className="pl-4">
            <p className="text-caption text-text-muted">ดาวความพยายาม</p>
            <p className="flex items-center gap-1.5 font-display text-[2.25rem] font-semibold leading-tight tabular-nums text-text">
              {summary.activities}<Star size={20} className="fill-[#F2B23A] text-[#F2B23A]" aria-hidden="true" />
            </p>
            <p className="text-caption text-text-muted">สัปดาห์นี้ +{thisWeek}</p>
          </div>
        </div>
        <div>
          <div className="flex h-16 items-end gap-1.5" role="img" aria-label={`รอบที่ฝึกจบรายสัปดาห์ 8 สัปดาห์ล่าสุด สัปดาห์นี้ ${summary.weeks.at(-1)?.sessions ?? 0} รอบ`}>
            {summary.weeks.map((week) => (
              <span key={week.start} title={`${week.sessions} รอบ`}
                className={week.current ? "flex-1 rounded-t-md bg-gradient-to-t from-primary to-[#7B6FF3]" : "flex-1 rounded-t-md bg-primary/15"}
                style={{ height: `${Math.max(6, (week.sessions / max) * 100)}%` }} />
            ))}
          </div>
          <p className="mt-2 flex justify-between text-[0.6875rem] text-text-muted"><span>8 สัปดาห์ก่อน</span><span>รอบที่ฝึกจบรายสัปดาห์</span><span>สัปดาห์นี้</span></p>
        </div>
      </CardContent>
    </Card>
  );
}

const SHORTCUTS = [
  { href: "/progress", icon: <ChartColumn size={19} />, label: "ความก้าวหน้า", note: "กราฟ ประวัติ และบันทึกของผู้ใหญ่" },
  { href: "/rewards", icon: <Trophy size={19} />, label: "รางวัล", note: "ดาวและตราที่ลูกได้" },
  { href: "/report", icon: <FileText size={19} />, label: "รายงาน", note: "สรุปผลการฝึกของลูก" },
  { href: "/training#library", icon: <BookOpen size={19} />, label: "คลังกิจกรรม", note: "เลือกกิจกรรมฝึกเอง" },
];

const longDate = new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long" });

export default function ParentDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { displayName } = useAccountProfile();
  const { profile, hasProfile, isHydrated } = useChildProfile();
  const { canStartPractice } = useCurrentChildAccess();
  const { results, status } = useLearningResults(profile?.id);
  const studio = useStudioState(user?.id, profile?.id);
  const summary = useMemo(() => summarize(results), [results]);
  const badges = useMemo(() => milestones(summary), [summary]);
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

  const now = new Date();
  const firstName = profile.nickname || (profile.name.split(" ")[0] ?? profile.name);
  const parentName = displayName?.split(" ")[0];
  const plan = studio?.plan.childId === profile.id ? studio.plan : undefined;
  const paused = studio?.sessions.find((session) => session.id === studio.activeSessionId && session.status === "active" && session.childId === profile.id);
  const latest = results[0];
  const track = plan?.track ?? (phonics ? "phonics" : "speech");
  const sound = plan?.sound ?? profile.targetSound ?? "ก";
  const earned = badges.filter((badge) => badge.earned).length;
  const next = nextMilestone(badges);

  return (
    <AppShell>
      <Page>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-caption font-semibold tracking-wide text-primary-text">
              {greeting(now)}{parentName ? ` คุณ${parentName}` : ""} · {longDate.format(now)}
            </p>
            <h1 className="text-page-title text-text">วันนี้จะฝึกอะไรกับ<span className="text-primary-text">{firstName}</span>?</h1>
            <p className="text-[0.9375rem] text-text-muted">รอบละไม่กี่นาที ฝึกสม่ำเสมอดีกว่าฝึกนาน ๆ</p>
          </div>
          {summary.streak > 1 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1.5 font-display text-sm font-medium text-warning-text">
              <Flame size={16} aria-hidden="true" />ฝึกต่อเนื่อง {summary.streak} วัน
            </span>
          )}
        </header>

        {/* Desktop: practice on the left, the week, totals and milestones on the right. */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
          <div className="min-w-0 space-y-5">
            <section aria-label="ฝึกต่อ" className="hero-night relative overflow-hidden rounded-[1.5rem] p-5 sm:p-7">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgb(255_255_255/0.18)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(120deg,transparent_35%,#000_90%)]" />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-16 size-80">
                <span className="absolute inset-0 rounded-full border border-white/10" />
                <span className="absolute inset-12 rounded-full border border-white/10" />
              </div>

              <div className="relative grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <Avatar name={profile.name} size="md" className="ring-2 ring-white/30" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display font-medium">{profile.name}</p>
                      <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs font-semibold">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5">
                          {track === "phonics" ? <Sparkles size={12} aria-hidden="true" /> : <Target size={12} aria-hidden="true" />}{TRACK_LABELS[track]}
                        </span>
                        <span className="rounded-full bg-white/15 px-2.5 py-0.5">{profile.age} ปี</span>
                      </div>
                    </div>
                    <span aria-hidden="true" className="relative grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-b from-white/95 to-[#E9E6FF] p-1.5 shadow-[0_10px_24px_-12px_rgb(0_0_0/0.6)] ring-4 ring-white/15 sm:hidden [&_svg]:h-auto [&_svg]:w-full">
                      <Art kind={SOUND_ART[sound] ?? "crab"} label="" />
                    </span>
                  </div>

                  <p className="mt-6 text-caption font-semibold text-[#FFD58A]">{paused ? "มีรอบที่พักไว้" : latest ? "ฝึกต่อจากครั้งก่อน" : "เริ่มรอบแรก"}</p>
                  <p className="mt-1 font-display text-[1.875rem] font-semibold leading-[1.15] sm:text-[2.125rem]">
                    {paused ? paused.stageLabel : latest ? latest.stageLabel : "ฟัง ดูปาก แล้วลองพูดตามทีละขั้น"}
                  </p>
                  <p className="mt-2 text-sm text-white/75">
                    {paused ? `ทำไปแล้ว ${paused.attempts.length} จาก ${paused.itemIds.length} กิจกรรม`
                      : latest ? `ฝึกล่าสุด${formatRelativeTime(latest.completedAt)} · ${TRACK_LABELS[latest.track]} · ${latest.activities} กิจกรรม`
                        : `${TRACK_LABELS[track]} · เสียง ${sound}`}
                  </p>
                  {canStartPractice ? (
                    <div className="mt-6 flex flex-wrap gap-2.5">
                      <ButtonLink href="/training" size="lg" className="btn-gold px-7" icon={<Play size={18} className="fill-current" aria-hidden="true" />}>
                        {paused ? "ทำรอบที่พักไว้ต่อ" : latest ? "ฝึกต่อ" : "เริ่มฝึก"}
                      </ButtonLink>
                      <ButtonLink href="/training#library" size="lg" variant="inverse-outline" className="border-white/25 bg-white/10">เลือกกิจกรรมอื่น</ButtonLink>
                    </div>
                  ) : <p className="mt-6 w-fit rounded-control bg-white/12 px-3 py-2 text-sm text-white/85">บัญชีนี้ดูผลการฝึกได้อย่างเดียว</p>}
                </div>

                {/* The target sound, shown as a word that starts with it. */}
                <div aria-hidden="true" className="relative mx-auto hidden size-48 sm:block lg:size-52">
                  <span className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-inset ring-white/20 backdrop-blur-sm" />
                  <span className="absolute inset-5 rounded-full bg-gradient-to-b from-white/95 to-[#E9E6FF] shadow-[0_18px_40px_-18px_rgb(0_0_0/0.6)]" />
                  <span className="absolute inset-7 grid place-items-center [&_svg]:h-auto [&_svg]:w-full">
                    <Art kind={SOUND_ART[sound] ?? "crab"} label="" />
                  </span>
                  <span className="absolute -bottom-1 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#15103D] px-3 py-1 font-display text-sm font-medium text-white shadow-lg ring-1 ring-white/20">
                    <Mic size={13} />เสียง {sound}
                  </span>
                  {latest && (
                    <span className={`absolute -left-2 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-display text-sm font-semibold ${GOLD}`}>
                      <Star size={13} className="fill-current" />+{latest.activities}
                    </span>
                  )}
                </div>
              </div>
            </section>

            <RecentRounds results={results} loading={status === "loading"} />
            <OverviewCard summary={summary} latest={latest} />
          </div>

          <div className="min-w-0 space-y-5 lg:sticky lg:top-20">
            <WeekCard results={results} daysThisWeek={summary.daysThisWeek} tip={suggestNextStep(summary)} />

            {next && (
              <Link href="/rewards" className="block rounded-card">
                <Card interactive>
                  <CardContent className="flex items-center gap-4">
                    <span aria-hidden="true" className={`grid size-14 shrink-0 place-items-center rounded-full ${GOLD}`}>{MILESTONE_ICONS[next.icon]}</span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-caption text-text-muted">ตราถัดไป · ได้แล้ว {earned} จาก {badges.length} ตรา</p>
                      <p className="font-display text-base font-medium text-text">{next.title}</p>
                      <Meter value={next.current} max={next.target} label={`${next.title}: ${next.current} จาก ${next.target}`} />
                      <p className="text-caption text-text-muted">{next.description} · อีก {next.target - next.current}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            <Card>
              <ul className="divide-y divide-border">
                {SHORTCUTS.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors first:rounded-t-card last:rounded-b-card hover:bg-primary-soft/40">
                      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[0.8rem] bg-primary-soft text-primary-text">{item.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display font-medium text-text">{item.label}</span>
                        <span className="block text-caption text-text-muted">{item.note}</span>
                      </span>
                      <ChevronRight size={17} aria-hidden="true" className="text-text-muted transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </Page>
    </AppShell>
  );
}
