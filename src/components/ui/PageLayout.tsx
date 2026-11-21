"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Select } from "./Form";

// ── Page ─────────────────────────────────────────────────────────────────────
// The one content container for pages inside AppShell: same gutters, width and vertical rhythm.
// narrow = a single document or form read top to bottom (report, one-step forms);
// default = most pages, laid out in columns on desktop; wide = tables and dashboards.

const pageWidths = { narrow: "max-w-3xl", default: "max-w-6xl", wide: "max-w-7xl" } as const;

export function Page({ width = "default", className, children }: {
  width?: keyof typeof pageWidths;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8", pageWidths[width], className)}>
      {children}
    </div>
  );
}

// ── PageHeader ───────────────────────────────────────────────────────────────

export type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Icon in a tinted square before the title. */
  icon?: ReactNode;
  /** Back link shown above the title, e.g. { href: "/school", label: "ห้องเรียนทั้งหมด" }. */
  back?: { href: string; label: string };
  /** Buttons on the right (wrap under the title on phones). */
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, icon, back, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("space-y-2", className)}>
      {back && (
        <Link href={back.href}
          className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-text-muted transition-colors hover:text-primary">
          <ChevronLeft size={16} aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <span aria-hidden="true" className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-primary-soft text-primary-text ring-1 ring-inset ring-primary/10">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-page-title break-words text-text">{title}</h1>
            {description && <p className="mt-1.5 text-[0.9375rem] text-text-muted">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

// ── Section ──────────────────────────────────────────────────────────────────

export function Section({ id, title, description, action, children, className }: {
  /** Anchor id, e.g. for links like /settings#invitations. */
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-20 space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-section-title text-text">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      {children}
    </section>
  );
}

// ── FilterBar ────────────────────────────────────────────────────────────────

export type FilterOption = { value: string; label: string };
export type FilterDef = {
  key: string;
  /** Accessible name + first option text, e.g. "ทุกชั้น". */
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
};

export type FilterBarProps = {
  search?: { value: string; onChange: (value: string) => void; placeholder?: string; label?: string };
  filters?: FilterDef[];
  /** Shown when any filter or search is active. */
  onClear?: () => void;
  /** e.g. "12 ห้อง" — announced politely when it changes. */
  resultText?: ReactNode;
  className?: string;
};

export function FilterBar({ search, filters = [], onClear, resultText, className }: FilterBarProps) {
  const active = Boolean(search?.value) || filters.some((filter) => filter.value);
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {search && (
          <div className="relative min-w-0 flex-[1_1_16rem]">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder={search.placeholder ?? "ค้นหา"}
              aria-label={search.label ?? search.placeholder ?? "ค้นหา"}
              className="h-10 w-full rounded-control border border-border bg-surface pl-9 pr-9 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 [&::-webkit-search-cancel-button]:hidden"
            />
            {search.value && (
              <button type="button" onClick={() => search.onChange("")} aria-label="ล้างคำค้นหา"
                className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text">
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        {filters.map((filter) => (
          <div key={filter.key} className="min-w-36 flex-[0_1_12rem]">
            <Select aria-label={filter.label} value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
              <option value="">{filter.label}</option>
              {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </div>
        ))}
        {active && onClear && (
          <button type="button" onClick={onClear} className="h-10 rounded-control px-3 text-sm font-semibold text-primary hover:bg-primary-soft">
            ล้างตัวกรอง
          </button>
        )}
      </div>
      {resultText && <p aria-live="polite" className="text-caption text-text-muted">{resultText}</p>}
    </div>
  );
}
