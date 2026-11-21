import type { ComponentProps, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

// ── Table primitives ─────────────────────────────────────────────────────────

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("bg-surface-muted/50 text-left", className)} {...props} />;
}

export function TBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("divide-y divide-border", className)} {...props} />;
}

export function TR({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("transition-colors hover:bg-primary-soft/40", className)} {...props} />;
}

export function TH({ className, ...props }: ComponentProps<"th">) {
  return (
    <th scope="col" className={cn("whitespace-nowrap px-4 py-2.5 text-[0.75rem] font-semibold tracking-wide text-text-muted", className)} {...props} />
  );
}

export function TD({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-middle text-text", className)} {...props} />;
}

// ── ResponsiveDataView ───────────────────────────────────────────────────────
// One column definition → a table on md+ screens and stacked cards on phones,
// so list pages never hand-build two layouts (pattern from lubit's ResponsiveDataView).

export type DataColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Cell alignment in the table. */
  align?: "left" | "right" | "center";
  /** Hide this column inside mobile cards (e.g. it is already the card title). */
  hideOnMobile?: boolean;
  /** A short number: shown as a small tile in a row of tiles on mobile cards instead of a label/value line. */
  mobileStat?: boolean;
  className?: string;
};

export type ResponsiveDataViewProps<T> = {
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  /** Card heading on mobile (usually the name). */
  mobileTitle: (row: T) => ReactNode;
  /** Right side of the mobile card heading (usually a badge or actions). */
  mobileAside?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  /** Accessible caption describing the table. */
  caption: string;
  /** Shown instead of the table when there are no rows. */
  empty?: ReactNode;
};

const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;

export function ResponsiveDataView<T>({
  rows, columns, rowKey, mobileTitle, mobileAside, onRowClick, caption, empty,
}: ResponsiveDataViewProps<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  const stats = columns.filter((column) => !column.hideOnMobile && column.mobileStat);
  const lines = columns.filter((column) => !column.hideOnMobile && !column.mobileStat);
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <caption className="sr-only">{caption}</caption>
          <THead>
            <tr>
              {columns.map((column) => (
                <TH key={column.key} className={alignClass[column.align ?? "left"]}>{column.header}</TH>
              ))}
            </tr>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (event) => { if (event.key === "Enter") onRowClick(row); } : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}>
                {columns.map((column) => (
                  <TD key={column.key} className={cn(alignClass[column.align ?? "left"], column.className)}>
                    {column.cell(row)}
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
      <ul className="space-y-2 md:hidden" aria-label={caption}>
        {rows.map((row) => {
          const body = (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 break-words text-card-title">{mobileTitle(row)}</div>
                {mobileAside && <div className="shrink-0">{mobileAside(row)}</div>}
              </div>
              {stats.length > 0 && (
                <dl className={cn("mt-3 grid gap-2", stats.length % 3 === 0 || stats.length > 4 ? "grid-cols-3" : "grid-cols-2")}>
                  {stats.map((column) => (
                    <div key={column.key} className="min-w-0 rounded-control bg-surface-muted px-2.5 py-1.5">
                      <dt className="text-caption leading-tight text-text-muted">{column.header}</dt>
                      <dd className="font-semibold text-text tabular-nums">{column.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm empty:hidden">
                {lines.map((column) => (
                  <div key={column.key} className="contents">
                    <dt className="text-text-muted">{column.header}</dt>
                    <dd className="min-w-0 break-words text-text">{column.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            </>
          );
          return (
            <li key={rowKey(row)}>
              {onRowClick ? (
                <button type="button" onClick={() => onRowClick(row)}
                  className="block w-full rounded-card border border-border bg-surface p-4 text-left shadow-card transition-shadow hover:shadow-raised">
                  {body}
                </button>
              ) : (
                <div className="rounded-card border border-border bg-surface p-4 shadow-card">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ── Pagination ───────────────────────────────────────────────────────────────

export type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function Pagination({ page, pageSize, total, onPageChange, className }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const nav = "inline-flex h-8 w-8 items-center justify-center rounded-control border border-border bg-surface text-text transition-colors hover:bg-surface-muted disabled:opacity-40";
  return (
    <nav aria-label="เปลี่ยนหน้า" className={cn("flex items-center justify-between gap-3 text-sm", className)}>
      <p className="text-text-muted tabular-nums">แสดง {from}–{to} จาก {total} รายการ</p>
      <div className="flex items-center gap-2">
        <button type="button" className={nav} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="หน้าก่อนหน้า">
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <span className="tabular-nums text-text" aria-current="page">{page} / {pages}</span>
        <button type="button" className={nav} onClick={() => onPageChange(page + 1)} disabled={page >= pages} aria-label="หน้าถัดไป">
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
