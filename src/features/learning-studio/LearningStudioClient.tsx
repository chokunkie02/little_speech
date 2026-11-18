"use client";
import dynamic from "next/dynamic";
import { KeyRound, Lock, UserRound } from "lucide-react";
import { ButtonLink, EmptyState, LoadingState, Page } from "@/components/ui";
import { isSupabaseProviderRequested } from "@/lib/config/storageProvider";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useStudioContext } from "./useStudioContext";

const Studio = dynamic(
  () => import("./LearningStudio").then((m) => m.LearningStudio),
  { ssr: false, loading: () => <StudioLoading label="กำลังเปิดห้องฝึก…" /> },
);

function StudioLoading({ label }: { label: string }) {
  return (
    <Page>
      <span className="sr-only" role="status">{label}</span>
      <LoadingState variant="cards" rows={2} />
    </Page>
  );
}

export function LearningStudioClient() {
  const context = useStudioContext();
  const { theme } = useTheme();
  if (!context.ready) return <StudioLoading label="กำลังเตรียมข้อมูลผู้เรียน…" />;
  if (!context.canPractice)
    return (
      <Page width="narrow">
        <EmptyState icon={<Lock size={22} />}
          title={context.staffHome ? "ห้องฝึกใช้กับบัญชีผู้ปกครอง" : "ยังไม่มีสิทธิ์เริ่มฝึกกับเด็กคนนี้"}
          description={context.staffHome
            ? "บัญชีของคุณดูผลการฝึกของนักเรียนได้จากหน้าหลักของบทบาท"
            : "บัญชีนี้ดูผลได้อย่างเดียว ขอให้เจ้าของโปรไฟล์เปิดสิทธิ์เริ่มฝึกให้ก่อน"}
          action={<ButtonLink href={context.staffHome ?? "/dashboard"} variant="outline">กลับหน้าหลัก</ButtonLink>} />
      </Page>
    );
  const child = context.profile;
  if (context.user && !child)
    return (
      <Page width="narrow">
        <EmptyState icon={<UserRound size={22} />} title="เลือกเด็กก่อนเริ่มฝึก"
          description="เลือกเด็กจากเมนูด้านซ้าย หรือใช้รหัสจากใบเชิญของโรงเรียนเพื่อเชื่อมกับบุตรหลาน"
          action={<>
            <ButtonLink href="/join" icon={<KeyRound size={16} aria-hidden="true" />}>ใช้รหัสเข้าร่วม</ButtonLink>
            <ButtonLink href="/profile" variant="outline">เปิดข้อมูลลูก</ButtonLink>
          </>} />
      </Page>
    );
  return (
    <div className={`learning-studio-scope ${theme === "dark" ? "dark" : ""}`}>
      <Studio
        key={`${context.user?.id || "anonymous"}:${child?.id || "demo"}`}
        accountId={context.user?.id}
        allowExport={context.canExport}
        syncToSchool={!!context.user && !!child && isSupabaseProviderRequested() && isSupabaseConfigured()}
        child={
          child
            ? {
                id: child.id,
                // Same name the child picker shows, so a school child reads "น้องฟ้า", not the full name.
                name: child.nickname || child.name,
                age: child.age,
                targetSound: child.targetSound,
                initialTrack: child.trainingMode === "kindergarten_phonics" ? "phonics" : "speech",
              }
            : undefined
        }
      />
    </div>
  );
}
