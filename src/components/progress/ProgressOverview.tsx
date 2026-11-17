"use client";

import { CalendarCheck, CircleCheck, Ear, Lightbulb, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, StatCard } from "@/components/ui";
import { formatRelativeTime } from "@/lib/thaiDate";
import { suggestNextStep, type Accuracy, type GroupSummary, type LearningSummary } from "@/lib/learning/results";
import { WeeklyChart } from "./WeeklyChart";

export function accuracyText(accuracy: Accuracy) {
  return accuracy ? `${accuracy.percent}%` : "—";
}

export function SummaryStats({ summary }: { summary: LearningSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard icon={<CircleCheck size={20} />} label="รอบที่ฝึกจบ" value={summary.sessions}
        hint={summary.lastPracticedAt ? `ล่าสุด ${formatRelativeTime(summary.lastPracticedAt)}` : "ยังไม่ได้ฝึก"} />
      <StatCard icon={<CalendarCheck size={20} />} tone="success" label="วันที่ฝึกใน 7 วัน"
        value={<>{summary.daysThisWeek}<span className="text-sm font-normal text-text-muted">/7</span></>}
        hint={summary.streak > 1 ? `ฝึกต่อเนื่อง ${summary.streak} วัน` : `ฝึกแล้วทั้งหมด ${summary.practiceDays} วัน`} />
      <StatCard icon={<Sparkles size={20} />} tone="warning" label="กิจกรรมที่ได้ลอง" value={summary.activities}
        hint="ทุกครั้งที่ลองได้ 1 ดาวความพยายาม" />
      <StatCard icon={<Ear size={20} />} tone="info" label="ฟังแล้วเลือกตรงเสียง" value={accuracyText(summary.accuracy)}
        hint={summary.accuracy ? `${summary.accuracy.correct} จาก ${summary.accuracy.total} ข้อ` : "ยังไม่มีข้อฟังแล้วเลือก"} />
    </div>
  );
}

export function BreakdownCard({ title, description, groups }: { title: string; description?: string; groups: GroupSummary[] }) {
  const max = Math.max(1, ...groups.map((group) => group.sessions));
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <CardContent>
        {groups.length === 0 ? <p className="text-sm text-text-muted">ยังไม่มีข้อมูล</p> : (
          <ul className="space-y-3">
            {groups.map((group) => (
              <li key={group.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-semibold text-text">{group.label}</span>
                  <span className="shrink-0 tabular-nums text-text-muted">
                    {group.sessions} รอบ{group.accuracy ? ` · เลือกตรง ${group.accuracy.percent}%` : ""}
                  </span>
                </div>
                <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(group.sessions / max) * 100}%` }} />
                </div>
                <p className="text-caption text-text-muted">{group.activities} กิจกรรม · ล่าสุด {formatRelativeTime(group.lastAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function NextStepCard({ summary }: { summary: LearningSummary }) {
  return (
    <div className="flex gap-3 rounded-card border border-primary/25 bg-primary-soft/60 p-4">
      <Lightbulb size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-primary-text" />
      <div>
        <p className="text-caption font-semibold text-primary-text">ขั้นต่อไปที่แนะนำ</p>
        <p className="mt-0.5 text-sm text-text">{suggestNextStep(summary)}</p>
      </div>
    </div>
  );
}

export function ProgressOverview({ summary }: { summary: LearningSummary }) {
  return (
    <div className="space-y-5">
      <SummaryStats summary={summary} />
      <NextStepCard summary={summary} />
      <Card>
        <CardHeader title="รอบที่ฝึกจบในแต่ละสัปดาห์" description="8 สัปดาห์ล่าสุด" />
        <CardContent><WeeklyChart weeks={summary.weeks} /></CardContent>
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        <BreakdownCard title="แยกตามแนวทาง" groups={summary.byTrack} />
        <BreakdownCard title="แยกตามเสียง" groups={summary.bySound} />
      </div>
      <p className="text-caption text-text-muted">
        ตัวเลขนี้บอกว่าฝึกบ่อยแค่ไหนและได้ลองอะไรบ้าง ไม่ใช่ผลประเมินทางการแพทย์ ข้อฟังแล้วเลือกนับเฉพาะคำถามแบบเลือกตอบ
      </p>
    </div>
  );
}
