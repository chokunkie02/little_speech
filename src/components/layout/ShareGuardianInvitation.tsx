"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { DbInvitation } from "@/types/database";

const inputClass = "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm";
const secondaryClass = "rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary";

export default function ShareGuardianInvitation({ invitation }: { invitation: Pick<DbInvitation, "email" | "token"> }) {
  const [showQr, setShowQr] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const link = new URL("/invite/accept", window.location.origin);
  link.searchParams.set("token", invitation.token);
  const url = link.toString();

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(label);
    } catch {
      setCopyStatus("คัดลอกไม่สำเร็จ กรุณาคัดลอกลิงก์จากช่องด้านบน");
    }
  }

  const mail = `mailto:${encodeURIComponent(invitation.email)}?subject=${encodeURIComponent("คำเชิญเชื่อมผู้ปกครอง Speech Adventure")}&body=${encodeURIComponent(url)}`;
  return (
    <div className="space-y-2">
      <input aria-label="ลิงก์เชิญผู้ปกครอง" readOnly value={url} className={inputClass} />
      <div className="flex flex-wrap gap-2">
        <button className={secondaryClass} onClick={() => void copy(url, "คัดลอกลิงก์แล้ว")}>คัดลอกลิงก์</button>
        <button className={secondaryClass} onClick={() => void copy(invitation.token, "คัดลอกรหัสแล้ว")}>คัดลอกรหัส</button>
        <button className={secondaryClass} onClick={() => setShowQr(!showQr)} aria-expanded={showQr}>
          {showQr ? "ซ่อน QR" : "แสดง QR"}
        </button>
        {invitation.email && <a className={secondaryClass} href={mail}>เปิดแอปอีเมล</a>}
      </div>
      {showQr && <QRCodeSVG value={url} size={160} marginSize={4} title="สแกนเพื่อส่งคำขอเชื่อม" />}
      <p role="status" className="text-xs text-text-muted">{copyStatus}</p>
    </div>
  );
}
