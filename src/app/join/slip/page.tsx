"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { Alert, Button, LoadingState } from "@/components/ui";
import { joinUrl, previewJoinCode } from "@/lib/joinCodes";
import { formatThaiDate } from "@/lib/thaiDate";
import { formatJoinCode, normalizeJoinCode, type JoinCodePreview } from "@/types/joinCodes";

const STEPS: Record<string, string[]> = {
  guardian: ["สแกน QR ด้วยกล้องมือถือ หรือเปิดเว็บ Speech Adventure แล้วกด “ใช้รหัสเข้าร่วม”", "สมัครด้วยอีเมลและรหัสผ่าน (หรือเข้าสู่ระบบถ้ามีบัญชีแล้ว)", "ยืนยันว่าเป็นผู้ปกครอง แล้วเริ่มฝึกกับบุตรหลานได้ทันที"],
  classroom_guardian: ["สแกน QR ด้วยกล้องมือถือ", "สมัครหรือเข้าสู่ระบบ แล้วเลือกชื่อบุตรหลาน", "รอครูประจำห้องอนุมัติ จะมีแจ้งเตือนในกล่องข้อความ"],
  teacher: ["สแกน QR หรือกรอกรหัสที่หน้า “ใช้รหัสเข้าร่วม”", "สมัครหรือเข้าสู่ระบบ แล้วกรอกชื่อ-นามสกุล", "รอผู้ดูแลโรงเรียนอนุมัติและจัดห้อง"],
  school_admin: ["สแกน QR หรือกรอกรหัสที่หน้า “ใช้รหัสเข้าร่วม”", "สมัครหรือเข้าสู่ระบบด้วยบัญชีของผู้ดูแล", "ยืนยันแล้วเริ่มตั้งค่าโรงเรียนได้ทันที (รหัสใช้ได้ครั้งเดียว)"],
};

const TITLES: Record<string, string> = {
  guardian: "ใบเชิญผู้ปกครอง",
  classroom_guardian: "QR สำหรับผู้ปกครองของห้อง",
  teacher: "รหัสเข้าร่วมสำหรับครู",
  school_admin: "รหัสผู้ดูแลโรงเรียน",
};

function Slip() {
  const code = normalizeJoinCode(useSearchParams().get("code") ?? "");
  const [preview, setPreview] = useState<JoinCodePreview | null>();

  useEffect(() => {
    let active = true;
    previewJoinCode(code).then((value) => { if (active) setPreview(value); }).catch(() => { if (active) setPreview(null); });
    return () => { active = false; };
  }, [code]);

  if (preview === undefined) return <div className="p-8"><LoadingState variant="list" rows={1} label="กำลังเตรียมใบเชิญ…" /></div>;
  if (!preview || preview.status !== "valid" || !preview.kind) {
    return <div className="p-8"><Alert tone="warning">รหัสนี้ใช้ไม่ได้แล้ว กรุณาออกรหัสใหม่ก่อนพิมพ์</Alert></div>;
  }

  return (
    <main className="mx-auto max-w-xl space-y-4 p-6 print:max-w-none print:p-0">
      <div className="flex justify-end print:hidden">
        <Button icon={<Printer size={16} aria-hidden="true" />} onClick={() => window.print()}>พิมพ์</Button>
      </div>
      <article className="space-y-5 rounded-card border-2 border-dashed border-border bg-white p-6 text-slate-900 print:break-inside-avoid">
        <header className="space-y-1">
          <p className="text-sm font-semibold text-[#5548D4]">Speech Adventure · {preview.school_name}</p>
          <h1 className="text-2xl font-bold">{TITLES[preview.kind]}</h1>
          {preview.child_name && <p className="text-lg">ของ <strong>{preview.child_name}</strong>{preview.classroom_name && ` · ห้อง ${preview.classroom_name}`}</p>}
          {!preview.child_name && preview.classroom_name && <p className="text-lg">ห้อง {preview.classroom_name}</p>}
        </header>
        <div className="flex flex-wrap items-center gap-6">
          <QRCodeSVG value={joinUrl(preview.code ?? code)} size={168} level="M" role="img" aria-label="QR สำหรับเข้าร่วม" />
          <div className="space-y-1">
            <p className="text-sm text-slate-600">หรือกรอกรหัส</p>
            <p className="font-mono text-3xl font-bold tracking-[0.2em]">{formatJoinCode(preview.code ?? code)}</p>
            <p className="text-sm text-slate-600">ใช้ได้ถึง {formatThaiDate(preview.expires_at ?? "", "long")}</p>
          </div>
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {(STEPS[preview.kind] ?? []).map((step) => <li key={step}>{step}</li>)}
        </ol>
        <p className="text-xs text-slate-500">เก็บใบนี้ไว้กับตัว อย่าโพสต์รหัสในที่สาธารณะ ถ้าใบหาย แจ้งครูเพื่อออกรหัสใหม่</p>
      </article>
    </main>
  );
}

export default function JoinSlipPage() {
  return <Suspense fallback={null}><Slip /></Suspense>;
}
