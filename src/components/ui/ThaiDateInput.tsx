"use client";

import { useId } from "react";
import { THAI_MONTHS, toBuddhistYear } from "@/lib/thaiDate";
import { Select } from "./Form";

export type ThaiDateInputProps = {
  /** ISO "YYYY-MM-DD" or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  /** Accessible group name, e.g. "วันเกิด". */
  label: string;
  /** Oldest selectable Christian-era year (default: 20 years ago). */
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Day / month / Buddhist-year selects. Native date pickers show ค.ศ. in many browsers and are
 * hard to scroll back to a birth year, so Thai forms use three selects instead.
 */
export function ThaiDateInput({ value, onChange, label, minYear, maxYear, disabled }: ThaiDateInputProps) {
  const id = useId();
  const now = new Date().getFullYear();
  const max = maxYear ?? now;
  const min = minYear ?? now - 20;
  const [y, m, d] = value ? value.split("-").map(Number) : [0, 0, 0];
  const daysInMonth = y && m ? new Date(y, m, 0).getDate() : 31;

  function update(next: { y?: number; m?: number; d?: number }) {
    const year = next.y ?? y;
    const month = next.m ?? m;
    let day = next.d ?? d;
    if (!year || !month || !day) {
      // Keep partial choices in the selects but report "" until the date is complete.
      onChange(year || month || day ? `${year || 0}-${pad(month || 0)}-${pad(day || 0)}` : "");
      return;
    }
    day = Math.min(day, new Date(year, month, 0).getDate());
    onChange(`${year}-${pad(month)}-${pad(day)}`);
  }

  return (
    <fieldset className="grid grid-cols-[5rem_1fr_6.5rem] gap-2" aria-labelledby={`${id}-legend`} disabled={disabled}>
      <legend id={`${id}-legend`} className="sr-only">{label}</legend>
      <Select aria-label="วัน" value={d || ""} onChange={(event) => update({ d: Number(event.target.value) })}>
        <option value="">วัน</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => <option key={day} value={day}>{day}</option>)}
      </Select>
      <Select aria-label="เดือน" value={m || ""} onChange={(event) => update({ m: Number(event.target.value) })}>
        <option value="">เดือน</option>
        {THAI_MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
      </Select>
      <Select aria-label="ปี พ.ศ." value={y || ""} onChange={(event) => update({ y: Number(event.target.value) })}>
        <option value="">ปี พ.ศ.</option>
        {Array.from({ length: max - min + 1 }, (_, i) => max - i).map((year) => (
          <option key={year} value={year}>{toBuddhistYear(year)}</option>
        ))}
      </Select>
    </fieldset>
  );
}

/** True when a ThaiDateInput value is a complete date. */
export const isCompleteDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.includes("-00") && !value.startsWith("0-");
