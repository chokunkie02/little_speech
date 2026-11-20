"use client";

import { JoinCodeCard } from "@/components/join/JoinCodeCard";
import { useInbox } from "@/components/inbox/InboxProvider";
import { UserPlus } from "lucide-react";
import { Alert, ButtonLink } from "@/components/ui";

/**
 * Teachers join with the school's code and wait for approval in the admin's inbox
 * (replaces typing each teacher's email and copying invitation links).
 */
export default function SchoolTeacherInvitations({ organizationId }: { organizationId: string }) {
  const { inbox } = useInbox();
  const waiting = inbox?.to_review.filter((request) => request.kind === "teacher" && request.organization_id === organizationId).length ?? 0;

  return (
    <section className="space-y-4 overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <div className="hero-night relative px-4 pb-4 pt-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[0.8rem] bg-white/15 ring-1 ring-inset ring-white/20"><UserPlus size={19} /></span>
          <div>
            <h2 className="font-display text-lg font-medium">เพิ่มครูเข้าโรงเรียน</h2>
            <p className="text-caption text-white/75">ครูสมัครเองด้วยรหัสของโรงเรียน ไม่ต้องพิมพ์อีเมลทีละคน</p>
          </div>
        </div>
        <ol className="mt-4 grid grid-cols-3 gap-2 text-center">
          {["ส่งรหัสให้ครู", "ครูสแกนแล้วสมัคร", "คุณอนุมัติ"].map((label, index) => (
            <li key={label} className="rounded-[0.8rem] bg-white/10 px-2 py-2 ring-1 ring-inset ring-white/10">
              <span className="mx-auto grid size-6 place-items-center rounded-full bg-[linear-gradient(180deg,#FFD58A,#F2B23A)] font-display text-xs font-semibold text-[#3A2300]">{index + 1}</span>
              <span className="mt-1 block text-[0.6875rem] leading-tight text-white/85">{label}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
      {waiting > 0 && (
        <Alert tone="warning" title={`มีครูรออนุมัติ ${waiting} คน`}
          action={<ButtonLink href="/inbox" size="sm">ไปอนุมัติ</ButtonLink>}>
          อนุมัติและเลือกห้องประจำได้จากกล่องข้อความ
        </Alert>
      )}
      <JoinCodeCard
        kind="teacher"
        organizationId={organizationId}
        title="รหัสเข้าร่วมสำหรับครู"
        description="ส่งในกลุ่ม LINE ครูหรือติดไว้ที่ห้องพักครู ครูสแกนแล้วสมัครเอง คำขอจะเข้ากล่องข้อความให้คุณอนุมัติ (ใช้ได้ 14 วัน สูงสุด 50 คน)"
      />
      </div>
    </section>
  );
}
