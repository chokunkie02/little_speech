export const demoSchools = [
  { id: "north", name: "โรงเรียนตัวอย่างเหนือ" },
  { id: "central", name: "โรงเรียนตัวอย่างกลาง" },
  { id: "south", name: "โรงเรียนตัวอย่างใต้" },
];

export const demoPeriods = {
  current: { label: "2–8 พ.ย. 2569", startDay: 2, month: "พ.ย." },
  previous: { label: "26 ต.ค.–1 พ.ย. 2569", startDay: 26, month: "ต.ค." },
};

export type DemoPeriod = keyof typeof demoPeriods;

export const openingTimeLabels = ["00:00–05:59", "06:00–11:59", "12:00–17:59", "18:00–23:59"];

export const demoEngagement = {
  current: [
    { users: 148, minutes: 2050, opens: [5, 76, 92, 157] },
    { users: 106, minutes: 1380, opens: [3, 62, 75, 100] },
    { users: 65, minutes: 780, opens: [2, 31, 39, 58] },
  ],
  previous: [
    { users: 122, minutes: 1700, opens: [4, 64, 81, 121] },
    { users: 93, minutes: 1130, opens: [2, 51, 68, 79] },
    { users: 54, minutes: 635, opens: [1, 26, 34, 49] },
  ],
};

type SchoolUsage = {
  opened: number;
  started: number;
  finished: number;
  dailyStarts: number[];
  dailyFinishes: number[];
  activities: number[];
  firstTime: number;
  day1: number;
  day7: number;
};

export const activityLabels = ["กล้ามเนื้อปาก", "พยางค์", "คำ", "ประโยค"];

export const demoUsage: Record<DemoPeriod, SchoolUsage[]> = {
  current: [
    { opened: 110, started: 88, finished: 73, dailyStarts: [16, 23, 21, 31, 35, 26, 20], dailyFinishes: [12, 18, 16, 24, 28, 21, 16], activities: [36, 44, 61, 31], firstTime: 36, day1: 16, day7: 10 },
    { opened: 82, started: 63, finished: 49, dailyStarts: [12, 17, 14, 21, 23, 17, 14], dailyFinishes: [9, 13, 10, 16, 17, 13, 10], activities: [24, 31, 43, 20], firstTime: 28, day1: 12, day7: 7 },
    { opened: 48, started: 33, finished: 24, dailyStarts: [8, 9, 8, 10, 12, 10, 7], dailyFinishes: [5, 6, 5, 7, 8, 7, 5], activities: [18, 18, 18, 10], firstTime: 16, day1: 5, day7: 3 },
  ],
  previous: [
    { opened: 96, started: 74, finished: 57, dailyStarts: [13, 20, 19, 26, 28, 23, 17], dailyFinishes: [9, 15, 14, 19, 21, 16, 12], activities: [33, 38, 49, 26], firstTime: 31, day1: 12, day7: 8 },
    { opened: 71, started: 53, finished: 38, dailyStarts: [10, 13, 12, 17, 19, 15, 11], dailyFinishes: [7, 9, 9, 12, 14, 10, 8], activities: [22, 27, 32, 16], firstTime: 23, day1: 8, day7: 5 },
    { opened: 42, started: 27, finished: 18, dailyStarts: [6, 8, 7, 9, 10, 8, 6], dailyFinishes: [4, 5, 4, 6, 7, 5, 4], activities: [15, 15, 16, 8], firstTime: 13, day1: 4, day7: 2 },
  ],
};

export const count = (value: number) => value.toLocaleString("th-TH");
export const rate = (value: number, base: number) => base ? Math.round(value / base * 100) : 0;
export const totalRounds = (days: number[]) => days.reduce((sum, value) => sum + value, 0);

export function demoTotals(rows: SchoolUsage[]) {
  const total = (key: "opened" | "started" | "finished" | "firstTime" | "day1" | "day7") =>
    rows.reduce((sum, row) => sum + row[key], 0);
  const series = (key: "dailyStarts" | "dailyFinishes" | "activities", length: number) =>
    Array.from({ length }, (_, index) => rows.reduce((sum, row) => sum + row[key][index], 0));
  return {
    opened: total("opened"), started: total("started"), finished: total("finished"),
    firstTime: total("firstTime"), day1: total("day1"), day7: total("day7"),
    dailyStarts: series("dailyStarts", 7), dailyFinishes: series("dailyFinishes", 7),
    activities: series("activities", activityLabels.length),
  };
}
