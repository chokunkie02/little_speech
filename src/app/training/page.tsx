import AppShell from "@/components/layout/AppShell";
import type { Metadata } from "next";
import { LearningStudioClient } from "@/features/learning-studio/LearningStudioClient";
export const metadata: Metadata = {
  title: "ห้องผจญภัยฝึกพูด | Speech Adventure",
  description: "ฝึกฟัง พูด และสื่อสาร พร้อมเสียงตัวอย่างและภาพสาธิตรูปปาก",
};
export default function TrainingPage() {
  return <AppShell><LearningStudioClient /></AppShell>;
}
