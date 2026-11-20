"use client";

import { useMemo, useState } from "react";
import { History, MessageCircle, Mic, Shapes } from "lucide-react";
import { Badge, Card, EmptyState, FilterBar, Pagination } from "@/components/ui";
import { TRACK_LABELS, TRACK_ORDER, type LearningResult } from "@/lib/learning/results";

const PAGE_SIZE = 15;

function choiceText(result: LearningResult) {
  return result.choiceCount ? `${result.correctChoices}/${result.choiceCount}` : "—";
}

const TRACK_LOOK = {
  speech: { color: "#5548D4", icon: Mic },
  communication: { color: "#1F9D6E", icon: MessageCircle },
  phonics: { color: "#D2861B", icon: Shapes },
} as const;

const dayLabel = new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
const timeLabel = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

/** One dot per picture choice: filled when the child chose the right sound. */
function ChoiceDots({ result }: { result: LearningResult }) {
  if (!result.choiceCount) return <span className="text-caption text-text-muted">ไม่มีข้อเลือกภาพ</span>;
  const dots = Math.min(result.choiceCount, 10);
  const filled = Math.round((result.correctChoices / result.choiceCount) * dots);
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="flex gap-1">
        {Array.from({ length: dots }, (_, index) => (
          <span key={index} className={index < filled ? "size-2.5 rounded-full bg-success" : "size-2.5 rounded-full border border-border bg-surface-muted"} />
        ))}
      </span>
      <span className="font-display text-sm font-medium tabular-nums text-text">{choiceText(result)}</span>
      <span className="sr-only">เลือกตรงเสียง {result.correctChoices} จาก {result.choiceCount}</span>
    </span>
  );
}

export function SessionHistory({ results }: { results: LearningResult[] }) {
  const [track, setTrack] = useState("");
  const [sound, setSound] = useState("");
  const [page, setPage] = useState(1);

  const sounds = useMemo(() => [...new Set(results.map((result) => result.sound))].sort((a, b) => a.localeCompare(b, "th")), [results]);
  const tracks = useMemo(() => TRACK_ORDER.filter((key) => results.some((result) => result.track === key)), [results]);
  const filtered = results.filter((result) => (!track || result.track === track) && (!sound || result.sound === sound));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!results.length) {
    return <EmptyState icon={<History size={22} />} title="ยังไม่มีรอบที่ฝึกจบ" description="รอบที่ฝึกจบในห้องฝึกจะแสดงที่นี่" />;
  }

  return (
    <div className="space-y-3">
      <FilterBar
        filters={[
          { key: "track", label: "ทุกแนวทาง", value: track, onChange: (value) => { setTrack(value); setPage(1); },
            options: tracks.map((key) => ({ value: key, label: TRACK_LABELS[key] })) },
          { key: "sound", label: "ทุกเสียง", value: sound, onChange: (value) => { setSound(value); setPage(1); },
            options: sounds.map((key) => ({ value: key, label: `เสียง ${key}` })) },
        ]}
        onClear={() => { setTrack(""); setSound(""); setPage(1); }}
        resultText={`${filtered.length} รอบ`} />
      {rows.length === 0 ? <p className="py-6 text-center text-sm text-text-muted">ไม่มีรอบที่ตรงกับตัวกรอง</p> : (
        <ol className="space-y-5" aria-label="รอบที่ฝึกจบ">
          {groups(rows).map((group) => (
            <li key={group.key}>
              <div className="mb-2 flex items-center gap-3">
                <h3 className="font-display text-base font-medium text-text">{group.label}</h3>
                <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-caption font-medium text-text-muted">{group.rows.length} รอบ</span>
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
              </div>
              <Card className="overflow-hidden">
                <ul className="divide-y divide-border">
                  {group.rows.map((row) => {
                    const look = TRACK_LOOK[row.track];
                    const Icon = look.icon;
                    return (
                      <li key={row.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:grid-cols-[4rem_auto_minmax(0,1fr)_auto] sm:px-5">
                        <time dateTime={row.completedAt} className="hidden font-display text-sm font-medium tabular-nums text-text-muted sm:block">{timeLabel.format(new Date(row.completedAt))}</time>
                        <span aria-hidden="true" className="grid size-11 place-items-center rounded-[0.9rem] text-white" style={{ background: look.color }}><Icon size={19} /></span>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2">
                            <span className="font-display text-[1.0625rem] font-medium text-text">{row.stageLabel}</span>
                            <span className="rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold" style={{ background: `${look.color}1A`, color: `color-mix(in srgb, ${look.color} 65%, var(--color-text))` }}>เสียง {row.sound}</span>
                            {row.savedTo === "device" && <Badge tone="warning" dot>ยังอยู่ในเครื่องนี้</Badge>}
                          </p>
                          <p className="text-caption text-text-muted">
                            <span className="sm:hidden">{timeLabel.format(new Date(row.completedAt))} · </span>{TRACK_LABELS[row.track]} · {row.activities} กิจกรรม
                          </p>
                        </div>
                        <div className="col-span-2 sm:col-span-1 sm:justify-self-end"><ChoiceDots result={row} /></div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </li>
          ))}
        </ol>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
    </div>
  );
}

/** Rows of one page, grouped by Bangkok calendar day (newest first, in the order given). */
function groups(rows: LearningResult[]) {
  const out: { key: string; label: string; rows: LearningResult[] }[] = [];
  for (const row of rows) {
    const key = dayKey(row.completedAt);
    const last = out[out.length - 1];
    if (last?.key === key) last.rows.push(row);
    else out.push({ key, label: dayLabel.format(new Date(row.completedAt)), rows: [row] });
  }
  return out;
}
