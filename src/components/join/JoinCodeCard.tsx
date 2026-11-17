"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { KeyRound, Printer, RefreshCw, Share2 } from "lucide-react";
import { Badge, Button, ConfirmDialog, toast } from "@/components/ui";
import { issueJoinCode, joinUrl } from "@/lib/joinCodes";
import { formatThaiDate } from "@/lib/thaiDate";
import { cn } from "@/lib/cn";
import { formatJoinCode, type JoinCode, type JoinCodeKind } from "@/types/joinCodes";

export type JoinCodeCardProps = {
  kind: JoinCodeKind;
  organizationId?: string;
  classroomId?: string;
  childId?: string;
  title: string;
  /** What the person receiving the code should do / what happens after. */
  description: string;
  /** Button text before a code is shown. */
  revealLabel?: string;
  className?: string;
};

/**
 * Shows (and on first use creates) a join code with its QR. Replaces every "copy invitation link"
 * button: the code is printed, shown on screen to scan, or shared to LINE as text.
 */
export function JoinCodeCard({
  kind, organizationId, classroomId, childId, title, description, revealLabel = "แสดงรหัสและ QR", className,
}: JoinCodeCardProps) {
  const [code, setCode] = useState<JoinCode>();
  const [busy, setBusy] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  async function load(rotate: boolean) {
    setBusy(true);
    try {
      const next = await issueJoinCode({ kind, organizationId, classroomId, childId, rotate });
      setCode(next);
      if (rotate) toast.success("ออกรหัสใหม่แล้ว", "รหัสเดิมใช้ไม่ได้แล้ว");
    } catch (cause) {
      toast.error("ออกรหัสไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
      setConfirmRotate(false);
    }
  }

  const url = code ? joinUrl(code.code) : "";
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className={cn("space-y-3 rounded-card border border-border bg-surface p-4", className)}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary-text">
          <KeyRound size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-card-title text-text">{title}</p>
          <p className="text-sm text-text-muted">{description}</p>
        </div>
      </div>

      {!code ? (
        <Button variant="outline" onClick={() => void load(false)} loading={busy}>{revealLabel}</Button>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-control border border-border bg-white p-2">
            <QRCodeSVG value={url} size={112} level="M" aria-label={`QR สำหรับรหัส ${formatJoinCode(code.code)}`} role="img" />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="font-mono text-2xl font-bold tracking-[0.2em] text-text" aria-label={`รหัส ${code.code.split("").join(" ")}`}>
              {formatJoinCode(code.code)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="neutral">ใช้ได้ถึง {formatThaiDate(code.expires_at)}</Badge>
              {code.max_uses > 1 && <Badge tone="neutral">ใช้แล้ว {code.uses}/{code.max_uses}</Badge>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" icon={<Printer size={14} aria-hidden="true" />}
                onClick={() => window.open(`/join/slip?code=${encodeURIComponent(code.code)}`, "_blank", "noopener")}>
                พิมพ์ใบเชิญ
              </Button>
              {canShare && (
                <Button size="sm" variant="outline" icon={<Share2 size={14} aria-hidden="true" />}
                  onClick={() => void navigator.share({ title, text: `รหัสเข้าร่วม Speech Adventure: ${formatJoinCode(code.code)}`, url }).catch(() => undefined)}>
                  แชร์
                </Button>
              )}
              <Button size="sm" variant="ghost" icon={<RefreshCw size={14} aria-hidden="true" />} onClick={() => setConfirmRotate(true)}>
                ออกรหัสใหม่
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmRotate}
        title="ออกรหัสใหม่?"
        description="รหัสและ QR เดิมจะใช้ไม่ได้ทันที ใช้เมื่อใบเชิญหายหรือรหัสหลุดไปถึงคนที่ไม่เกี่ยวข้อง คนที่เชื่อมแล้วยังใช้งานได้ตามเดิม"
        confirmLabel="ออกรหัสใหม่"
        loading={busy}
        onCancel={() => setConfirmRotate(false)}
        onConfirm={() => void load(true)}
      />
    </div>
  );
}
