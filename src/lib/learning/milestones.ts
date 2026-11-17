// Rewards for effort, not for scores: every milestone counts practice the child has done
// (rounds, days, activities tried, things explored). Nothing here ranks children.

import type { LearningSummary } from "./results";

export type MilestoneIcon = "flag" | "repeat" | "calendar" | "flame" | "star" | "compass" | "ear";

export type Milestone = {
  id: string;
  title: string;
  description: string;
  icon: MilestoneIcon;
  target: number;
  current: number;
  earned: boolean;
};

type Definition = Omit<Milestone, "current" | "earned"> & { measure: (summary: LearningSummary) => number };

const DEFINITIONS: Definition[] = [
  { id: "first-round", title: "ก้าวแรก", description: "ฝึกจบรอบแรก", icon: "flag", target: 1, measure: (s) => s.sessions },
  { id: "rounds-5", title: "นักฝึกตัวน้อย", description: "ฝึกจบ 5 รอบ", icon: "repeat", target: 5, measure: (s) => s.sessions },
  { id: "rounds-15", title: "ฝึกจนคล่อง", description: "ฝึกจบ 15 รอบ", icon: "repeat", target: 15, measure: (s) => s.sessions },
  { id: "rounds-40", title: "นักผจญภัยเสียง", description: "ฝึกจบ 40 รอบ", icon: "repeat", target: 40, measure: (s) => s.sessions },
  { id: "streak-3", title: "สามวันติด", description: "ฝึกติดต่อกัน 3 วัน", icon: "flame", target: 3, measure: (s) => s.bestStreak },
  { id: "streak-7", title: "ครบสัปดาห์", description: "ฝึกติดต่อกัน 7 วัน", icon: "flame", target: 7, measure: (s) => s.bestStreak },
  { id: "days-10", title: "สิบวันแห่งความตั้งใจ", description: "ฝึกรวม 10 วัน", icon: "calendar", target: 10, measure: (s) => s.practiceDays },
  { id: "days-30", title: "เพื่อนซี้ห้องฝึก", description: "ฝึกรวม 30 วัน", icon: "calendar", target: 30, measure: (s) => s.practiceDays },
  { id: "stars-50", title: "ดาว 50 ดวง", description: "ลองทำกิจกรรมครบ 50 ครั้ง", icon: "star", target: 50, measure: (s) => s.activities },
  { id: "stars-150", title: "ดาว 150 ดวง", description: "ลองทำกิจกรรมครบ 150 ครั้ง", icon: "star", target: 150, measure: (s) => s.activities },
  { id: "listener", title: "หูไว", description: "ฟังแล้วเลือกตรงเสียง 20 ข้อ", icon: "ear", target: 20, measure: (s) => s.accuracy?.correct ?? 0 },
  { id: "tracks", title: "นักสำรวจ", description: "ลองครบทั้ง 3 แนวทาง", icon: "compass", target: 3, measure: (s) => s.tracksTried },
  { id: "sounds", title: "รู้จักหลายเสียง", description: "ฝึกครบ 3 เสียง", icon: "compass", target: 3, measure: (s) => s.soundsTried },
];

export function milestones(summary: LearningSummary): Milestone[] {
  return DEFINITIONS.map(({ measure, ...definition }) => {
    const current = Math.min(measure(summary), definition.target);
    return { ...definition, current, earned: current >= definition.target };
  });
}

/** The unearned milestone closest to done (by share of its target). */
export function nextMilestone(list: Milestone[]): Milestone | undefined {
  return list.filter((item) => !item.earned)
    .sort((a, b) => b.current / b.target - a.current / a.target || a.target - b.target)[0];
}
