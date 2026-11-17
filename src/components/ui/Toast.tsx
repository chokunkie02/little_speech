"use client";

import { useSyncExternalStore } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

// Usage anywhere (no provider): toast.success("บันทึกแล้ว"), toast.error("บันทึกไม่สำเร็จ", "ลองใหม่อีกครั้ง")
// <Toaster /> is mounted once in the root layout.

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; tone: ToastTone; title: string; description?: string };

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const EMPTY: ToastItem[] = [];

function emit() {
  for (const listener of listeners) listener();
}

function dismiss(id: number) {
  items = items.filter((item) => item.id !== id);
  emit();
}

function show(tone: ToastTone, title: string, description?: string) {
  const id = nextId++;
  items = [...items.slice(-3), { id, tone, title, description }];
  emit();
  // Errors stay a little longer so they can be read.
  setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
  return id;
}

export const toast = {
  success: (title: string, description?: string) => show("success", title, description),
  error: (title: string, description?: string) => show("error", title, description),
  info: (title: string, description?: string) => show("info", title, description),
  dismiss,
};

const icons = { success: CheckCircle2, error: AlertCircle, info: Info } as const;
const accents = { success: "text-success-text", error: "text-error", info: "text-info-text" } as const;

export function Toaster() {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => items,
    () => EMPTY,
  );

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6 md:right-6 md:left-auto md:items-end"
    >
      {current.map((item) => {
        const Icon = icons[item.tone];
        return (
          <div
            key={item.id}
            role={item.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-border bg-surface p-3.5 text-text shadow-overlay animate-slide-up"
          >
            <Icon size={20} className={cn("mt-0.5 shrink-0", accents[item.tone])} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold break-words">{item.title}</p>
              {item.description && <p className="mt-0.5 text-sm text-text-muted break-words">{item.description}</p>}
            </div>
            <button type="button" onClick={() => dismiss(item.id)} aria-label="ปิดข้อความ"
              className="-m-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
