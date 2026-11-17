"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export type SectionNavItem = { id: string; label: string };

/**
 * "On this page" menu for long pages made of <Section id>. Phones: a row of chips that scrolls
 * sideways above the content. Desktop (lg): a sticky list in a left column that follows the scroll.
 */
export function SectionNav({ items, label = "หมวดในหน้านี้", className }: {
  items: SectionNavItem[];
  label?: string;
  className?: string;
}) {
  const ids = items.map((item) => item.id).join(",");
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const elements = ids.split(",").map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0 || typeof IntersectionObserver === "undefined") return;
    // A section counts as current once its top passes just under the sticky top bar.
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: "-80px 0px -55% 0px" });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [ids]);

  return (
    <nav aria-label={label} className={cn("print:hidden lg:sticky lg:top-20 lg:self-start", className)}>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((item) => {
          const current = item.id === active;
          return (
            <li key={item.id} className="shrink-0">
              <a href={`#${item.id}`} onClick={() => setActive(item.id)} aria-current={current ? "location" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors",
                  "lg:flex lg:min-h-9 lg:w-full lg:rounded-control lg:border-0 lg:px-3",
                  current
                    ? "border-primary/30 bg-primary-soft font-semibold text-primary-text"
                    : "border-border bg-surface text-text-muted hover:bg-surface-muted hover:text-text lg:bg-transparent",
                )}>
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
