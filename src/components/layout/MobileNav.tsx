"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/hooks/useAuth";
import { useGuardianWorkspace } from "./GuardianWorkspace";
import { useInboxBadge } from "@/components/inbox/useInboxBadge";
import { useSidebar } from "./SidebarContext";
import NavIcon from "./NavIcon";
import { appRole, bottomNavItems, isNavActive } from "./navigation";

/** Phone bottom bar: up to four main destinations plus "เมนู" for everything else. */
export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { mobileOpen, setMobileOpen } = useSidebar();
  const { restricted } = useGuardianWorkspace();
  const { available: inboxAvailable, count: pending } = useInboxBadge();
  const items = bottomNavItems(appRole(user), { restricted, parentInbox: inboxAvailable });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 h-[calc(4rem+env(safe-area-inset-bottom))] border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md print:hidden lg:hidden"
      aria-label="แถบนำทางด้านล่าง"
    >
      <ul className="flex h-full">
        {items.map((item) => {
          const active = isNavActive(item, pathname);
          const badge = item.href === "/inbox" && pending > 0;
          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? "page" : undefined}
                aria-label={badge ? `${item.label} ${pending} รายการใหม่` : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                  active ? "font-semibold text-primary" : "font-medium text-text-muted hover:text-text",
                )}
              >
                {active && <span aria-hidden="true" className="absolute inset-x-6 top-0 h-0.5 rounded-b-full bg-primary" />}
                <span className="relative">
                  <NavIcon name={item.icon} active={active} size={21} />
                  {badge && (
                    <span aria-hidden="true" className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-error px-1 text-center text-[9px] font-bold leading-4 text-error-foreground ring-2 ring-surface">
                      {pending > 9 ? "9+" : pending}
                    </span>
                  )}
                </span>
                <span className="leading-none">{item.shortLabel ?? item.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-controls="mobile-sidebar"
            aria-expanded={mobileOpen}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-text-muted hover:text-text aria-expanded:text-primary"
          >
            {mobileOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
            <span className="leading-none">{mobileOpen ? "ปิดเมนู" : "เมนู"}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
