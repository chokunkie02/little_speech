"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TabItem<T extends string> = {
  value: T;
  label: ReactNode;
  /** Optional count shown as a small pill. */
  count?: number;
};

export type TabsProps<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Accessible name for the tab list. */
  label: string;
  /** Renders the panel for the active tab. */
  children?: ReactNode;
  className?: string;
};

/**
 * Accessible tabs (WAI-ARIA tabs pattern): arrow keys / Home / End move between tabs.
 * Controlled — the parent keeps the active value (e.g. in the URL).
 */
export function Tabs<T extends string>({ items, value, onValueChange, label, children, className }: TabsProps<T>) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const index = Math.max(0, items.findIndex((item) => item.value === value));

  function move(event: KeyboardEvent<HTMLDivElement>) {
    const keys: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: items.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = (keys[event.key] + items.length) % items.length;
    onValueChange(items[next].value);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  return (
    <div className={className}>
      <div ref={listRef} role="tablist" aria-label={label} onKeyDown={move}
        className="flex gap-1 overflow-x-auto border-b border-border [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.value}`}
              aria-selected={active}
              aria-controls={`${baseId}-panel`}
              tabIndex={active ? 0 : -1}
              onClick={() => onValueChange(item.value)}
              className={cn(
                "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 font-display text-[0.9375rem] font-medium transition-colors",
                active ? "border-primary text-text" : "border-transparent text-text-muted hover:text-text",
              )}
            >
              {item.label}
              {item.count !== undefined && (
                <span className={cn(
                  "rounded-full px-1.5 py-px text-[11px] tabular-nums",
                  active ? "bg-primary text-primary-foreground" : "bg-surface-muted text-text-muted",
                )}>{item.count}</span>
              )}
            </button>
          );
        })}
      </div>
      {children !== undefined && (
        <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${items[index]?.value}`} className="pt-4">
          {children}
        </div>
      )}
    </div>
  );
}
