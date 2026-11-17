"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

// Built on the native <dialog> element: showModal() gives focus trapping, Escape,
// an inert page behind it and focus return to the trigger, without extra libraries.

type Placement = "center" | "right";

const sizes = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" } as const;

const placements: Record<Placement, string> = {
  // Bottom sheet on phones, centered card from sm up.
  center:
    "mb-0 mt-auto w-full max-w-full rounded-t-overlay sm:m-auto sm:rounded-overlay open:animate-slide-up sm:open:animate-scale-in",
  // Full-height side panel (details drawers).
  right:
    "ml-auto mr-0 h-dvh max-h-dvh w-full max-w-full rounded-none sm:rounded-l-overlay open:animate-fade-in",
};

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons row at the bottom (right aligned). */
  footer?: ReactNode;
  size?: keyof typeof sizes;
  placement?: Placement;
  /** Prevent closing by Escape / backdrop while something is saving. */
  dismissible?: boolean;
  className?: string;
};

export function Dialog({
  open, onClose, title, description, children, footer, size = "md", placement = "center", dismissible = true, className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && dismissible) onClose();
      }}
      className={cn(
        "flex-col overflow-hidden border border-border bg-surface p-0 text-text shadow-overlay backdrop:bg-slate-950/50 open:flex",
        placement === "center" && "max-h-[90dvh]",
        placements[placement],
        placement === "right" ? "sm:max-w-md" : sizes[size],
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0 space-y-1">
          <h2 id={titleId} className="text-section-title break-words">{title}</h2>
          {description && <p id={descriptionId} className="text-sm text-text-muted">{description}</p>}
        </div>
        {dismissible && (
          <button type="button" onClick={onClose} aria-label="ปิด"
            className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-muted hover:text-text">
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </header>
      {children !== undefined && children !== null && (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      )}
      {footer && (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-muted/50 px-5 py-3">
          {footer}
        </footer>
      )}
    </dialog>
  );
}

/** Side panel for details (attempts, sessions, students). */
export function Sheet(props: Omit<DialogProps, "placement" | "size">) {
  return <Dialog {...props} placement="right" />;
}

export type ConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  /** Say exactly what will happen, e.g. "นักเรียน 3 คนจะถูกย้ายไป ป.2/1". */
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for delete / remove / revoke. */
  tone?: "primary" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

/** Asks before a consequential action. Keep the page's own error display for failures. */
export function ConfirmDialog({
  open, title, description, confirmLabel = "ยืนยัน", cancelLabel = "ยกเลิก", tone = "primary", loading = false,
  onConfirm, onCancel, children,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      size="sm"
      dismissible={!loading}
      title={
        <span className="flex items-center gap-2">
          {tone === "danger" && <AlertTriangle size={18} className="shrink-0 text-error" aria-hidden="true" />}
          {title}
        </span>
      }
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
