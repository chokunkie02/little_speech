import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { BadgeTone } from "./Badge";

const iconTones: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-text-muted",
  primary: "bg-primary-soft text-primary-text",
  success: "bg-success-soft text-success-text",
  warning: "bg-warning-soft text-warning-text",
  error: "bg-error-soft text-error-text",
  info: "bg-info-soft text-info-text",
};

export type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  /** Small line under the value, e.g. "+3 จากสัปดาห์ก่อน". */
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

/** A single metric. Use several in a grid: `grid grid-cols-2 gap-3 lg:grid-cols-4`. */
export function StatCard({ label, value, hint, icon, tone = "primary", className }: StatCardProps) {
  return (
    // @container: in a tight grid (three across on a phone) the icon steps aside so the label has room.
    <div className={cn("@container flex items-start gap-3 rounded-card border border-border bg-surface p-4 shadow-card", className)}>
      {icon && (
        <span aria-hidden="true" className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-control @max-[11rem]:hidden", iconTones[tone])}>
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-caption text-text-muted">{label}</p>
        <p className="mt-0.5 font-display text-[2rem] font-semibold tabular-nums leading-none tracking-tight text-text">{value}</p>
        {hint && <p className="mt-1 text-caption text-text-muted">{hint}</p>}
      </div>
    </div>
  );
}
