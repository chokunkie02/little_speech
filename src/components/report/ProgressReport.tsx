"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Activity, CalendarCheck, FileText, Mic, Printer, Sparkles, Target } from "lucide-react";
import AssessmentHistory from "@/components/assessment/AssessmentHistory";
import { Alert, Button, DataLoadError, Input, Label, LoadingState, Page, PageHeader } from "@/components/ui";
import { useLearningResults } from "@/hooks/useLearningResults";
import { formatThaiDate } from "@/lib/thaiDate";
import { dayKey, filterByDays, summarize, suggestNextStep, TRACK_LABELS, type GroupSummary } from "@/lib/learning/results";
import { accuracyText } from "@/components/progress/ProgressOverview";
import { CATEGORY_META, type ObservationNote } from "@/types/observations";

type Preset = "30" | "90" | "180" | "all" | "custom";
const PRESETS: { value: Preset; label: string }[] = [
  { value: "30", label: "30 วันล่าสุด" },
  { value: "90", label: "3 เดือนล่าสุด" },
  { value: "180", label: "6 เดือนล่าสุด" },
  { value: "all", label: "ทั้งหมด" },
  { value: "custom", label: "กำหนดช่วงเอง" },
];
const MAX_ROWS = 40;

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));
  return dayKey(date);
}

function longDate(key: string) {
  return formatThaiDate(`${key}T12:00:00+07:00`, "long");
}

function Metric({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon: ReactNode }) {
  return (
    <div className="flex flex-col rounded-[1rem] border border-border bg-surface p-4 print:break-inside-avoid">
      <p className="flex items-center gap-2 text-caption text-text-muted">
        <span aria-hidden="true" className="grid size-7 place-items-center rounded-[0.6rem] bg-primary-soft text-primary-text print:hidden">{icon}</span>{label}
      </p>
      <p className="mt-auto pt-3 font-display text-[1.875rem] font-semibold leading-none tabular-nums text-text">{value}</p>
      {hint && <p className="mt-1 text-caption text-text-muted">{hint}</p>}
    </div>
  );
}

function GroupTable({ caption, groups }: { caption: string; groups: GroupSummary[] }) {
  const maxSessions = Math.max(1, ...groups.map((group) => group.sessions));
  return (
    <table className="w-full text-left text-sm print:break-inside-avoid">
      <caption className="mb-2 text-left font-display text-base font-medium text-text">{caption}</caption>
      <thead className="text-caption text-text-muted">
        <tr className="border-b border-border">
          <th className="py-1.5 font-medium" />
          <th className="py-1.5 text-right font-medium">รอบ</th>
          <th className="py-1.5 text-right font-medium">กิจกรรม</th>
          <th className="py-1.5 text-right font-medium">เลือกตรงเสียง</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((group) => (
          <tr key={group.key} className="border-b border-border last:border-0">
            <th scope="row" className="py-2 font-medium text-text">
              {group.label}
              <span aria-hidden="true" className="mt-1 block h-1.5 w-full max-w-36 overflow-hidden rounded-full bg-surface-muted print:hidden">
                <span className="block h-full rounded-full bg-[linear-gradient(90deg,#8D80FF,#5548D4)]" style={{ width: `${(group.sessions / maxSessions) * 100}%` }} />
              </span>
            </th>
            <td className="py-1.5 text-right tabular-nums">{group.sessions}</td>
            <td className="py-1.5 text-right tabular-nums">{group.activities}</td>
            <td className="py-1.5 text-right tabular-nums">{accuracyText(group.accuracy)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export type ProgressReportProps = {
  childId: string;
  childName: string;
  /** e.g. school and classroom, shown under the name. */
  subtitle?: string;
  back: { href: string; label: string };
  canPrint: boolean;
  /** Family notes to include (school notes stay on the progress page). */
  notes?: ObservationNote[];
};

export function ProgressReport({ childId, childName, subtitle, back, canPrint, notes }: ProgressReportProps) {
  const [preset, setPreset] = useState<Preset>("30");
  const [customFrom, setCustomFrom] = useState(() => daysAgo(30));
  const [customTo, setCustomTo] = useState(() => dayKey(new Date()));
  const { results, status, retry } = useLearningResults(childId);

  const range = preset === "all" ? { from: undefined, to: undefined }
    : preset === "custom" ? { from: customFrom || undefined, to: customTo || undefined }
      : { from: daysAgo(Number(preset)), to: dayKey(new Date()) };
  const inRange = useMemo(() => filterByDays(results, range.from, range.to), [results, range.from, range.to]);
  const summary = useMemo(() => summarize(inRange), [inRange]);
  const notesInRange = (notes ?? []).filter((note) => {
    const day = dayKey(note.createdAt);
    return (!range.from || day >= range.from) && (!range.to || day <= range.to);
  });
  const firstDay = results.length ? dayKey(results[results.length - 1].completedAt) : undefined;
  const periodText = range.from || range.to
    ? `${range.from ? longDate(range.from) : "เริ่มฝึก"} – ${range.to ? longDate(range.to) : "วันนี้"}`
    : firstDay ? `${longDate(firstDay)} – วันนี้` : "ทั้งหมด";

  return (
    <Page width="narrow">
      <PageHeader className="print:hidden" back={back} icon={<FileText size={20} />} title="รายงานความก้าวหน้า"
        description="เลือกช่วงเวลา แล้วพิมพ์หรือบันทึกเป็น PDF เพื่อส่งให้ครูหรือผู้เชี่ยวชาญ"
        actions={canPrint && <Button icon={<Printer size={16} aria-hidden="true" />} onClick={() => window.print()}>พิมพ์ / บันทึก PDF</Button>} />

      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <div role="group" aria-label="ช่วงเวลา" className="flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1 shadow-card">
          {PRESETS.map((item) => (
            <button key={item.value} type="button" aria-pressed={preset === item.value} onClick={() => setPreset(item.value)}
              className={preset === item.value
                ? "btn-primary rounded-full px-3.5 py-1.5 font-display text-sm font-medium text-primary-foreground"
                : "rounded-full px-3.5 py-1.5 font-display text-sm font-medium text-text-muted hover:text-text"}>
              {item.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <>
            <div><Label htmlFor="report-from">ตั้งแต่</Label><Input id="report-from" type="date" value={customFrom} max={customTo} onChange={(event) => setCustomFrom(event.target.value)} /></div>
            <div><Label htmlFor="report-to">ถึง</Label><Input id="report-to" type="date" value={customTo} min={customFrom} onChange={(event) => setCustomTo(event.target.value)} /></div>
          </>
        )}
      </div>
      {!canPrint && <Alert tone="info" className="print:hidden">บัญชีนี้ดูรายงานได้ แต่ยังไม่มีสิทธิ์พิมพ์หรือส่งออก ขอสิทธิ์จากเจ้าของโปรไฟล์ได้</Alert>}
      {status === "error" && <DataLoadError className="print:hidden" message="โหลดผลฝึกจากระบบไม่สำเร็จ" detail="รายงานนี้ใช้เฉพาะผลที่อยู่ในเครื่องนี้" onRetry={retry} />}

      {status === "loading" && !results.length ? <LoadingState variant="cards" rows={2} /> : (
        <article className="overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-[0_30px_60px_-40px_rgb(36_27_102/0.55)] print:overflow-visible print:rounded-none print:border-0 print:shadow-none"
          aria-label="รายงานความก้าวหน้า">
          <header className="hero-night relative flex flex-wrap items-end justify-between gap-4 px-5 py-6 sm:px-8 sm:py-7 print:bg-none print:px-0 print:text-black">
            <div className="flex items-center gap-4">
              <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-[0.9rem] bg-white/15 ring-1 ring-inset ring-white/20 print:hidden"><Mic size={22} /></span>
              <div>
                <p className="text-caption font-semibold text-[#FFD58A] print:text-black">Speech Adventure · รายงานการฝึกพูด</p>
                <h2 className="font-display text-[2rem] font-semibold leading-tight">{childName}</h2>
                {subtitle && <p className="text-sm text-white/75 print:text-black">{subtitle}</p>}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-0.5 text-sm">
              <dt className="text-caption text-white/65 print:text-black">ช่วงเวลา</dt>
              <dt className="text-caption text-white/65 print:text-black">วันที่ออกรายงาน</dt>
              <dd className="font-medium">{periodText}</dd>
              <dd className="font-medium">{formatThaiDate(new Date(), "long")}</dd>
            </dl>
          </header>
          <div className="space-y-7 p-5 sm:p-8 print:px-0">

          {!inRange.length ? (
            <p className="rounded-control bg-surface-muted p-4 text-center text-sm text-text-muted">ไม่มีรอบที่ฝึกจบในช่วงเวลานี้</p>
          ) : (
            <>
              <section className="space-y-3">
                <h3 className="font-display text-xl font-semibold text-text">สรุป</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric icon={<Activity size={15} />} label="รอบที่ฝึกจบ" value={summary.sessions} />
                  <Metric icon={<CalendarCheck size={15} />} label="วันที่ฝึก" value={summary.practiceDays} hint={summary.streak > 1 ? `ต่อเนื่องล่าสุด ${summary.streak} วัน` : undefined} />
                  <Metric icon={<Sparkles size={15} />} label="กิจกรรมที่ได้ลอง" value={summary.activities} />
                  <Metric icon={<Target size={15} />} label="ฟังแล้วเลือกตรงเสียง" value={accuracyText(summary.accuracy)}
                    hint={summary.accuracy ? `${summary.accuracy.correct}/${summary.accuracy.total} ข้อ` : undefined} />
                </div>
                <div className="flex gap-3 rounded-[1rem] bg-gradient-to-r from-primary-soft to-surface p-4 ring-1 ring-inset ring-primary/15 print:border print:border-border print:bg-none">
                  <span aria-hidden="true" className="btn-primary grid size-9 shrink-0 place-items-center rounded-[0.7rem] text-primary-foreground print:hidden"><Sparkles size={17} /></span>
                  <p className="text-sm text-text"><span className="block font-display font-medium text-primary-text">ข้อแนะนำ</span>{suggestNextStep(summary)}</p>
                </div>
              </section>

              <section className="grid gap-6 sm:grid-cols-2">
                <GroupTable caption="แยกตามแนวทาง" groups={summary.byTrack} />
                <GroupTable caption="แยกตามเสียง" groups={summary.bySound} />
              </section>

              <section className="space-y-2">
                <h3 className="font-display text-xl font-semibold text-text">รอบที่ฝึก</h3>
                <table className="w-full text-left text-sm">
                  <thead className="text-caption text-text-muted">
                    <tr className="border-b border-border">
                      <th className="py-1.5 font-medium">วันที่</th>
                      <th className="py-1.5 font-medium">ช่วงที่ฝึก</th>
                      <th className="hidden py-1.5 font-medium sm:table-cell print:table-cell">แนวทาง · เสียง</th>
                      <th className="py-1.5 text-right font-medium">ผล</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inRange.slice(0, MAX_ROWS).map((result) => (
                      <tr key={result.id} className="border-b border-border last:border-0 even:bg-surface-muted/40 print:break-inside-avoid print:even:bg-transparent">
                        <td className="whitespace-nowrap py-2 pl-2 pr-2">{formatThaiDate(result.completedAt)}</td>
                        <td className="py-1.5 pr-2 text-text">{result.stageLabel}</td>
                        <td className="hidden py-1.5 pr-2 text-text-muted sm:table-cell print:table-cell">{TRACK_LABELS[result.track]} · {result.sound}</td>
                        <td className="whitespace-nowrap py-1.5 text-right tabular-nums">
                          {result.activities} กิจกรรม{result.choiceCount ? ` · ${result.correctChoices}/${result.choiceCount}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {inRange.length > MAX_ROWS && <p className="text-caption text-text-muted">แสดง {MAX_ROWS} รอบล่าสุดจาก {inRange.length} รอบ</p>}
              </section>
            </>
          )}

          <AssessmentHistory key={`${range.from}:${range.to}`} childId={childId} from={range.from} to={range.to} />

          {notes && (
            <section className="space-y-2">
              <h3 className="font-display text-xl font-semibold text-text">บันทึกของผู้ใหญ่</h3>
              {notesInRange.length ? (
                <ul className="space-y-2">
                  {notesInRange.slice(0, 10).map((note) => (
                    <li key={note.id} className="rounded-control border border-border p-3 text-sm print:break-inside-avoid">
                      <p className="text-caption text-text-muted">{formatThaiDate(note.createdAt)} · {CATEGORY_META[note.category]?.label}</p>
                      <p className="font-semibold text-text">{note.title}</p>
                      <p className="whitespace-pre-line text-text-muted">{note.content}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-text-muted">ไม่มีบันทึกในช่วงเวลานี้</p>}
            </section>
          )}

          <footer className="border-t border-border pt-3 text-caption text-text-muted">
            รายงานนี้สรุปความสม่ำเสมอและสิ่งที่ได้ลองฝึก ไม่ใช่ผลวินิจฉัยหรือประเมินทางการแพทย์
            หากกังวลเรื่องพัฒนาการด้านการพูด ควรปรึกษานักแก้ไขการพูดหรือแพทย์
          </footer>
          </div>
        </article>
      )}
    </Page>
  );
}
