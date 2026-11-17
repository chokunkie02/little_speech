import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "error" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-text-muted border-border",
  primary: "bg-primary-soft text-primary-text border-primary/20",
  success: "bg-success-soft text-success-text border-success/25",
  warning: "bg-warning-soft text-warning-text border-warning/30",
  error: "bg-error-soft text-error-text border-error/25",
  info: "bg-info-soft text-info-text border-info/30",
};

const dots: Record<BadgeTone, string> = {
  neutral: "bg-text-muted",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-info",
};

export type BadgeProps = ComponentProps<"span"> & {
  tone?: BadgeTone;
  /** Small colored dot before the text (status at a glance, not color alone). */
  dot?: boolean;
  icon?: ReactNode;
};

export function Badge({ tone = "neutral", dot = false, icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", dots[tone])} />}
      {icon}
      {children}
    </span>
  );
}

/** Shared wording + tone for invitation / request states used across inbox, school and teacher pages. */
export const requestStatus = {
  pending: { label: "รอตอบรับ", tone: "primary" },
  review: { label: "รออนุมัติ", tone: "warning" },
  accepted: { label: "ตอบรับแล้ว", tone: "success" },
  approved: { label: "อนุมัติแล้ว", tone: "success" },
  rejected: { label: "ไม่อนุมัติ", tone: "error" },
  expired: { label: "หมดอายุ", tone: "neutral" },
  revoked: { label: "ยกเลิกแล้ว", tone: "neutral" },
} as const satisfies Record<string, { label: string; tone: BadgeTone }>;

export type RequestStatus = keyof typeof requestStatus;

export function StatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  const { label, tone } = requestStatus[status];
  return <Badge tone={tone} dot className={className}>{label}</Badge>;
}
