"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useStudioContext } from "./useStudioContext";

const Studio = dynamic(
  () => import("./LearningStudio").then((m) => m.LearningStudio),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="p-8 text-center">
        กำลังเปิดห้องผจญภัย…
      </p>
    ),
  },
);
export function LearningStudioClient() {
  const context = useStudioContext();
  const { theme } = useTheme();
  if (!context.ready)
    return (
      <p role="status" className="p-8 text-center">
        กำลังเตรียมข้อมูลผู้เรียน…
      </p>
    );
  if (!context.canPractice)
    return (
      <section className="mx-auto max-w-xl space-y-4 p-8">
        <h1 className="text-2xl font-bold">
          {context.staffHome
            ? "ห้องฝึกสำหรับบัญชีผู้ปกครอง"
            : "ยังไม่มีสิทธิ์เริ่มฝึกสำหรับเด็กคนนี้"}
        </h1>
        <p>
          {context.staffHome
            ? "บัญชีของคุณดูข้อมูลตามสิทธิ์ได้จากหน้าหลักของบทบาท"
            : "ให้เจ้าของโปรไฟล์เพิ่มสิทธิ์เริ่มฝึกก่อนเปิดห้องการเรียนรู้"}
        </p>
        <Link
          className="text-primary underline"
          href={context.staffHome ?? "/training"}
        >
          กลับระบบหลัก
        </Link>
      </section>
    );
  const child = context.profile;
  return (
    <div className={`learning-studio-scope ${theme === "dark" ? "dark" : ""}`}>
      <Studio
        key={`${context.user?.id || "anonymous"}:${child?.id || "demo"}`}
        accountId={context.user?.id}
        allowExport={context.canExport}
        child={
          child
            ? {
                id: child.id,
                name: child.name,
                age: child.age,
                targetSound: child.targetSound,
                initialTrack:
                  child.trainingMode === "kindergarten_phonics"
                    ? "phonics"
                    : "speech",
              }
            : undefined
        }
      />
    </div>
  );
}
