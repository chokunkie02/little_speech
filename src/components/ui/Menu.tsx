"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type MenuItem = {
  label: ReactNode;
  onSelect: () => void;
  icon?: ReactNode;
  /** Red text for destructive items (pair with a ConfirmDialog). */
  danger?: boolean;
  disabled?: boolean;
};

export type DropdownMenuProps = {
  /** Visible content of the trigger button. */
  trigger: ReactNode;
  /** Accessible name when the trigger is icon-only, e.g. "ตัวเลือกเพิ่มเติม". */
  label?: string;
  items: MenuItem[];
  align?: "start" | "end";
  triggerClassName?: string;
  /** Non-interactive block above the items, e.g. the signed-in account. */
  header?: ReactNode;
  /** Extra content under the items (e.g. a theme switch). Must manage its own focus. */
  footer?: ReactNode;
};

/** Button that opens a list of actions. Keyboard: arrows move, Enter selects, Escape closes. */
export function DropdownMenu({ trigger, label, items, align = "end", triggerClassName, header, footer }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onMenuKey(event: KeyboardEvent<HTMLDivElement>) {
    const options = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
    const current = options.indexOf(document.activeElement as HTMLButtonElement);
    const target = { ArrowDown: current + 1, ArrowUp: current - 1, Home: 0, End: options.length - 1 }[event.key];
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      close();
    } else if (target !== undefined && options.length) {
      event.preventDefault();
      options[(target + options.length) % options.length].focus();
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-control px-2 text-sm text-text-muted transition-colors hover:bg-surface-muted hover:text-text",
          triggerClassName,
        )}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={cn(
            "absolute z-40 mt-1 min-w-48 overflow-hidden rounded-control border border-border bg-surface py-1 shadow-raised animate-fade-in",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {header && <div className="border-b border-border px-3 pb-2 pt-1.5">{header}</div>}
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={item.disabled}
              onClick={() => {
                close();
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-muted focus:bg-surface-muted focus:outline-none disabled:opacity-50",
                item.danger ? "text-error" : "text-text",
              )}
            >
              {item.icon && <span aria-hidden="true" className="shrink-0 text-current">{item.icon}</span>}
              {item.label}
            </button>
          ))}
          {footer && <div className="border-t border-border px-3 py-2">{footer}</div>}
        </div>
      )}
    </div>
  );
}

/** Short hint on hover and keyboard focus. Do not hide required information in it. */
export function Tooltip({ content, children, side = "top" }: { content: string; children: ReactNode; side?: "top" | "bottom" }) {
  const id = useId();
  return (
    <span className="group relative inline-flex" aria-describedby={id}>
      {children}
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-60 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-raised transition-opacity",
          "group-hover:opacity-100 group-focus-within:opacity-100",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
        )}
      >
        {content}
      </span>
    </span>
  );
}
