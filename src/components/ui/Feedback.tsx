import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

// ── Skeleton ─────────────────────────────────────────────────────────────────
// Use instead of "กำลังโหลด…" text so the page keeps its shape while loading.

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-surface-muted", className)} />;
}

/** Ready-made loading layouts. Wrap with role="status" so screen readers hear one message. */
export function LoadingState({ variant = "list", rows = 4, label = "กำลังโหลด…" }: {
  variant?: "list" | "cards" | "stats" | "table";
  rows?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {variant === "stats" && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-20 rounded-card" />)}
        </div>
      )}
      {variant === "cards" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-36 rounded-card" />)}
        </div>
      )}
      {variant === "table" && (
        <div className="space-y-2 rounded-card border border-border bg-surface p-4">
          <Skeleton className="h-4 w-1/3" />
          {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-9" />)}
        </div>
      )}
      {variant === "list" &&
        Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-card border border-border bg-surface p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
        ))}
    </div>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────────

export type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** The next step, e.g. a "เพิ่มห้องเรียน" button. */
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center", className)}>
      {icon && (
        <span aria-hidden="true" className="mb-3 flex h-12 w-12 items-center justify-center rounded-card bg-primary-soft text-primary-text">
          {icon}
        </span>
      )}
      <h3 className="text-card-title">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

// ── Alert ────────────────────────────────────────────────────────────────────

type AlertTone = "info" | "success" | "warning" | "error";

const alertTones: Record<AlertTone, { box: string; icon: typeof Info }> = {
  info: { box: "border-info/30 bg-info-soft text-info-text", icon: Info },
  success: { box: "border-success/30 bg-success-soft text-success-text", icon: CheckCircle2 },
  warning: { box: "border-warning/40 bg-warning-soft text-warning-text", icon: AlertTriangle },
  error: { box: "border-error/30 bg-error-soft text-error-text", icon: AlertCircle },
};

export type AlertProps = {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Message that stays on the page (unlike a toast). Errors are announced to screen readers. */
export function Alert({ tone = "info", title, children, action, className }: AlertProps) {
  const { box, icon: Icon } = alertTones[tone];
  return (
    <div role={tone === "error" ? "alert" : "note"} className={cn("flex items-start gap-3 rounded-card border p-3.5 text-sm", box, className)}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="break-words">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Load failure with a retry button; keep showing stale data above it when there is some. */
export function DataLoadError({ message = "โหลดข้อมูลไม่สำเร็จ", detail, onRetry, retrying = false, className }: {
  message?: string;
  detail?: ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <Alert
      tone="error"
      title={message}
      className={className}
      action={onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} loading={retrying} icon={<RefreshCw size={14} aria-hidden="true" />}>
          ลองใหม่
        </Button>
      )}
    >
      {detail ?? "ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้วกดลองใหม่"}
    </Alert>
  );
}
