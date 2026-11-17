"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "./Avatar";

export type PickerOption = {
  id: string;
  label: string;
  /** Second line, e.g. email or "ป.1/2 · เลขที่ 5". */
  description?: string;
  /** Show an avatar with initials of this name. */
  avatarName?: string;
  disabled?: boolean;
  /** Why it is disabled, e.g. "อยู่ในห้องนี้แล้ว". */
  disabledReason?: string;
};

export type SearchPickerProps = {
  /** Accessible name, e.g. "ค้นหาครู". */
  label: string;
  placeholder?: string;
  /** Server or local search. Called after the user stops typing (300 ms). */
  search: (query: string) => Promise<PickerOption[]>;
  /** Fired when the user picks an option. */
  onSelect: (option: PickerOption) => void;
  /** Minimum characters before searching (0 = show results for empty query). */
  minChars?: number;
  emptyText?: string;
  className?: string;
};

type Results = { query: string; options: PickerOption[]; failed: boolean };

/**
 * Type-to-search combobox (ARIA 1.2 pattern) for picking a person or student from the
 * user's own organization — replaces "type the exact email" fields.
 */
export function SearchPicker({
  label, placeholder = "พิมพ์ชื่อเพื่อค้นหา", search, onSelect, minChars = 1, emptyText = "ไม่พบรายชื่อที่ตรงกัน", className,
}: SearchPickerProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Results>();
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef(search);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    searchRef.current = search;
  });

  const term = query.trim();
  const ready = term.length >= minChars;

  useEffect(() => {
    if (!open || !ready) return;
    let active = true;
    const timer = setTimeout(() => {
      searchRef.current(term)
        .then((options) => { if (active) setResults({ query: term, options, failed: false }); })
        .catch(() => { if (active) setResults({ query: term, options: [], failed: true }); });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [term, open, ready]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const current = results?.query === term ? results : undefined;
  const loading = open && ready && !current;
  const options = current?.options ?? [];

  function choose(option: PickerOption) {
    if (option.disabled) return;
    onSelect(option);
    setQuery("");
    setResults(undefined);
    setActiveIndex(-1);
    setOpen(false);
  }

  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (!options.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + step + options.length) % options.length);
    } else if (event.key === "Enter" && open && options[activeIndex]) {
      event.preventDefault();
      choose(options[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && ready;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          role="combobox"
          aria-label={label}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(-1);
            setOpen(true);
          }}
          onKeyDown={onKey}
          className="h-10 w-full rounded-control border border-border bg-surface pl-9 pr-9 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
        {loading ? (
          <Loader2 size={16} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-text-muted" />
        ) : query && (
          <button type="button" aria-label="ล้างคำค้นหา" onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted">
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!showList}
        className="absolute z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-control border border-border bg-surface py-1 shadow-raised"
      >
        {loading && <li className="px-3 py-2 text-sm text-text-muted" aria-live="polite">กำลังค้นหา…</li>}
        {current?.failed && <li className="px-3 py-2 text-sm text-error" role="alert">ค้นหาไม่สำเร็จ ลองพิมพ์ใหม่อีกครั้ง</li>}
        {current && !current.failed && options.length === 0 && (
          <li className="px-3 py-2 text-sm text-text-muted" aria-live="polite">{emptyText}</li>
        )}
        {options.map((option, index) => (
          <li
            key={option.id}
            id={`${id}-opt-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            aria-disabled={option.disabled || undefined}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => choose(option)}
            onMouseEnter={() => setActiveIndex(index)}
            className={cn(
              "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm",
              index === activeIndex && "bg-surface-muted",
              option.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {option.avatarName && <Avatar name={option.avatarName} size="sm" />}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-text">{option.label}</p>
              {(option.description || option.disabledReason) && (
                <p className="truncate text-caption text-text-muted">{option.disabled ? option.disabledReason : option.description}</p>
              )}
            </div>
            {option.disabled && <Check size={16} aria-hidden="true" className="shrink-0 text-success-text" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
