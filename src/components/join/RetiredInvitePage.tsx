import Link from "next/link";
import { KeyRound, Mic } from "lucide-react";
import { ButtonLink, Card, CardContent } from "@/components/ui";

/** Shown for old email-invitation links (/invite/...). Those invitations were retired in favour of join codes. */
export default function RetiredInvitePage() {
  return (
    <main className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-5">
        <Link href="/" className="flex items-center gap-2" aria-label="หน้าแรก Speech Adventure">
          <span className="grid size-9 place-items-center rounded-control bg-primary text-primary-foreground"><Mic size={17} strokeWidth={2.5} aria-hidden="true" /></span>
          <span className="text-sm font-bold text-text">Speech Adventure</span>
        </Link>
        <Card>
          <CardContent className="space-y-4 p-6">
            <KeyRound size={28} className="text-primary" aria-hidden="true" />
            <h1 className="text-section-title">ลิงก์คำเชิญนี้เลิกใช้แล้ว</h1>
            <p className="text-sm text-text-muted">
              ตอนนี้เข้าร่วมด้วยรหัสหรือ QR แทนลิงก์ทางอีเมล ขอใบเชิญหรือรหัสใหม่จากครู ผู้ดูแลโรงเรียน หรือผู้ที่ส่งลิงก์นี้มา
              แล้วกรอกที่หน้า “ใช้รหัสเข้าร่วม”
            </p>
            <ButtonLink href="/join" block icon={<KeyRound size={16} aria-hidden="true" />}>ใช้รหัสเข้าร่วม</ButtonLink>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
