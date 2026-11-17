// Thai date helpers. Dates show the Buddhist year (พ.ศ.) everywhere in the UI;
// values stay ISO "YYYY-MM-DD" / Date in code and in the database.

const BUDDHIST = "th-TH-u-ca-buddhist";

export const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
] as const;

export const toBuddhistYear = (year: number) => year + 543;
export const fromBuddhistYear = (year: number) => year - 543;

function toDate(value: Date | string | number) {
  return value instanceof Date ? value : new Date(value);
}

/** "16 พ.ย. 2569" (short) · "16 พฤศจิกายน 2569" (long) · "16 พ.ย. 2569 14:05" (datetime). */
export function formatThaiDate(value: Date | string | number, style: "short" | "long" | "datetime" = "short") {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "";
  if (style === "datetime") {
    return new Intl.DateTimeFormat(BUDDHIST, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat(BUDDHIST, { day: "numeric", month: style === "long" ? "long" : "short", year: "numeric" }).format(date);
}

const relative = new Intl.RelativeTimeFormat("th", { numeric: "auto" });
const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60],
];

/** "เมื่อสักครู่" · "5 นาทีที่ผ่านมา" · "เมื่อวาน" · "อีก 3 วัน". Falls back to a date after 4 weeks. */
export function formatRelativeTime(value: Date | string | number, now: Date = new Date()) {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  if (Math.abs(seconds) < 45) return "เมื่อสักครู่";
  if (Math.abs(seconds) > 2419200) return formatThaiDate(date);
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return relative.format(Math.round(seconds / 60), "minute");
}

/** Whole years between a birth date and today. */
export function ageFromBirthDate(birthDate: string, today: Date = new Date()) {
  const [year, month, day] = birthDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return age;
}
