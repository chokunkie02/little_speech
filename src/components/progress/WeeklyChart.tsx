"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { WeekBucket } from "@/lib/learning/results";

const shortDate = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });

function weekLabel(week: WeekBucket) {
  return week.current ? "สัปดาห์นี้" : shortDate.format(new Date(`${week.start}T00:00:00Z`));
}

function weekRange(week: WeekBucket) {
  const end = new Date(`${week.start}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${shortDate.format(new Date(`${week.start}T00:00:00Z`))} – ${shortDate.format(end)}`;
}

/**
 * Rounds finished per week (single series, magnitude → one hue). Each column is focusable and
 * carries its own tooltip; the same numbers are in the table under "ดูเป็นตาราง".
 */
export function WeeklyChart({ weeks }: { weeks: WeekBucket[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...weeks.map((week) => week.sessions));
  const height = 120;

  return (
    <figure className="space-y-3">
      <div className="relative">
        {/* Recessive guide at the top value */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 border-t border-dashed border-border" />
        <span aria-hidden="true" className="absolute -top-2.5 left-0 bg-surface pr-1 text-caption tabular-nums text-text-muted">{max} รอบ</span>
        <ol className="flex items-end gap-1 border-b border-border" style={{ height }} aria-label="จำนวนรอบที่ฝึกจบในแต่ละสัปดาห์">
          {weeks.map((week, index) => {
            const barHeight = week.sessions ? Math.max(4, Math.round((week.sessions / max) * (height - 18))) : 0;
            const label = `${weekRange(week)}: ${week.sessions} รอบ ${week.activities} กิจกรรม`;
            return (
              <li key={week.start} className="relative flex h-full flex-1 items-end justify-center">
                <button type="button" aria-label={label}
                  onPointerEnter={() => setActive(index)} onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(index)} onBlur={() => setActive(null)}
                  className="flex h-full w-full items-end justify-center rounded-t-md focus-visible:outline-2 focus-visible:outline-primary">
                  <span aria-hidden="true"
                    className={cn("w-full max-w-6 rounded-t-[4px] transition-colors", week.current ? "bg-primary" : "bg-primary/45", active === index && "bg-primary")}
                    style={{ height: barHeight }} />
                </button>
                {week.current && week.sessions > 0 && (
                  <span aria-hidden="true" className="pointer-events-none absolute text-caption font-semibold tabular-nums text-text" style={{ bottom: barHeight + 4 }}>
                    {week.sessions}
                  </span>
                )}
                {active === index && (
                  <span role="tooltip" className="pointer-events-none absolute bottom-full z-10 mb-1 w-max rounded-control border border-border bg-surface px-2.5 py-1.5 text-left shadow-overlay">
                    <strong className="block text-sm tabular-nums text-text">{week.sessions} รอบ · {week.activities} กิจกรรม</strong>
                    <span className="text-caption text-text-muted">{weekRange(week)}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <div aria-hidden="true" className="mt-1.5 flex gap-1">
          {weeks.map((week, index) => (
            <span key={week.start} className={cn("min-w-0 flex-1 text-center text-[11px] text-text-muted",
              week.current ? "whitespace-nowrap font-semibold text-text" : "truncate", index % 2 === 1 && !week.current && "max-sm:invisible")}>
              {week.current ? <><span className="sm:hidden">ล่าสุด</span><span className="max-sm:hidden">สัปดาห์นี้</span></> : weekLabel(week)}
            </span>
          ))}
        </div>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-caption font-semibold text-primary-text">ดูเป็นตาราง</summary>
        <table className="mt-2 w-full text-left text-sm">
          <caption className="sr-only">รอบที่ฝึกจบรายสัปดาห์</caption>
          <thead className="text-caption text-text-muted">
            <tr><th className="py-1 font-medium">สัปดาห์</th><th className="py-1 text-right font-medium">รอบ</th><th className="py-1 text-right font-medium">กิจกรรม</th></tr>
          </thead>
          <tbody>
            {[...weeks].reverse().map((week) => (
              <tr key={week.start} className="border-t border-border">
                <td className="py-1.5">{weekRange(week)}{week.current ? " (สัปดาห์นี้)" : ""}</td>
                <td className="py-1.5 text-right tabular-nums">{week.sessions}</td>
                <td className="py-1.5 text-right tabular-nums">{week.activities}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
