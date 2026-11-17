"use client";

import { JoinCodeCard } from "@/components/join/JoinCodeCard";
import { useInbox } from "@/components/inbox/InboxProvider";
import { Alert, ButtonLink } from "@/components/ui";

/**
 * Teachers join with the school's code and wait for approval in the admin's inbox
 * (replaces typing each teacher's email and copying invitation links).
 */
export default function SchoolTeacherInvitations({ organizationId }: { organizationId: string }) {
  const { inbox } = useInbox();
  const waiting = inbox?.to_review.filter((request) => request.kind === "teacher" && request.organization_id === organizationId).length ?? 0;

  return (
    <section className="space-y-3 rounded-card border border-border bg-surface p-4 shadow-card sm:p-5">
      <div>
        <h2 className="text-section-title">เพิ่มครูเข้าโรงเรียน</h2>
        <p className="mt-1 text-sm text-text-muted">ให้ครูสมัครเองด้วยรหัสของโรงเรียน ไม่ต้องพิมพ์อีเมลของครูทีละคน</p>
      </div>
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
    </section>
  );
}
