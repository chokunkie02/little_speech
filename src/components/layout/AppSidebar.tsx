"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Mic, Play, Star, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOverlayFocus } from "./useOverlayFocus";
import { useGuardianWorkspace } from "./GuardianWorkspace";
import { useInboxBadge } from "@/components/inbox/useInboxBadge";
import NavIcon from "./NavIcon";
import { useSidebar } from "./SidebarContext";
import ChildSelector from "./ChildSelector";
import { useSpeechProgress } from "@/hooks/useSpeechProgress";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useAuth } from "@/hooks/useAuth";
import { mockTrainingStages } from "@/data/speechAdventureMockData";
import { ROLE_LABELS, appRole, isNavActive, navGroups, type NavGroup } from "./navigation";

function Logo({ withText }: { withText: boolean }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="หน้าแรก Speech Adventure">
      <span className="grid size-8 shrink-0 place-items-center rounded-control bg-primary text-primary-foreground">
        <Mic size={16} strokeWidth={2.5} aria-hidden="true" />
      </span>
      {withText && (
        <span className="min-w-0">
          <span className="block text-sm font-bold leading-tight text-text">Speech</span>
          <span className="block text-xs font-semibold leading-tight text-primary">Adventure</span>
        </span>
      )}
    </Link>
  );
}

function NavList({ groups, collapsed, pending, onNavigate }: {
  groups: NavGroup[];
  collapsed: boolean;
  pending: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label} className="space-y-0.5">
          {collapsed
            ? <div aria-hidden="true" className="mx-3 mb-1.5 border-t border-border first:hidden" />
            : <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">{group.label}</p>}
          <ul className="space-y-0.5" aria-label={collapsed ? group.label : undefined}>
            {group.items.map((item) => {
              const active = isNavActive(item, pathname);
              const badge = item.href === "/inbox" && pending > 0 ? (pending > 9 ? "9+" : String(pending)) : null;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-control px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-primary-soft font-semibold text-primary-text"
                        : "font-medium text-text-muted hover:bg-surface-muted hover:text-text",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary" />}
                    <span className="relative flex w-5 shrink-0 items-center justify-center">
                      <NavIcon name={item.icon} active={active} size={18} />
                      {badge && collapsed && (
                        <span aria-hidden="true" className="absolute -right-2 -top-2 rounded-full bg-error px-1 text-[9px] font-bold leading-4 text-error-foreground">{badge}</span>
                      )}
                    </span>
                    <span className={cn("flex-1 truncate", collapsed && "sr-only")}>{item.label}</span>
                    {badge && !collapsed && (
                      <span className="rounded-full bg-error px-1.5 text-[11px] font-bold leading-5 text-error-foreground" aria-label={`${pending} รายการใหม่`}>{badge}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Child switcher, target sound, stars and "continue" — parents with a linked child only. */
function ChildContext({ compact, onNavigate }: { compact: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { summary, isHydrated, selectedSoundId } = useSpeechProgress();
  const { profile } = useChildProfile();
  const isSpeechMode = !isHydrated || profile?.trainingMode !== "kindergarten_phonics";
  const stars = isHydrated ? summary.starsEarned : 0;
  const currentStage = mockTrainingStages.find((stage) => stage.id === (isHydrated ? summary.currentStageId : null));

  if (compact) return <div className="flex justify-center border-b border-border px-3 py-3"><ChildSelector collapsed /></div>;

  const showContinue = pathname !== "/dashboard" && isHydrated && (isSpeechMode ? Boolean(currentStage) : true);
  return (
    <div className="shrink-0 space-y-2.5 border-b border-border px-3 py-3">
      <ChildSelector />
      {isHydrated && isSpeechMode && (selectedSoundId || stars > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedSoundId && (
            <span className="inline-flex items-center rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary-text">เสียง {selectedSoundId}</span>
          )}
          {stars > 0 && (
            <Link href="/rewards" onClick={onNavigate} aria-label={`ดาวสะสม ${stars} ดาว`}
              className="inline-flex items-center gap-1 text-xs font-bold text-text hover:text-primary">
              <Star size={13} className="fill-secondary text-secondary" aria-hidden="true" />
              {stars}
            </Link>
          )}
        </div>
      )}
      {showContinue && (
        <Link href="/training" onClick={onNavigate}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-control px-3 py-2 text-xs font-semibold transition-colors active:scale-[0.98]",
            isSpeechMode ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-secondary-foreground hover:bg-secondary/85",
          )}>
          <Play size={12} className="fill-current" aria-hidden="true" />
          {isSpeechMode ? "ฝึกต่อ" : "เรียนต่อ"}
        </Link>
      )}
    </div>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { collapsed, toggle, mounted, mobileOpen, setMobileOpen } = useSidebar();
  const drawerRef = useRef<HTMLElement>(null);
  useOverlayFocus(mobileOpen, drawerRef, () => setMobileOpen(false));
  const { user } = useAuth();
  const { restricted } = useGuardianWorkspace();
  const { available: inboxAvailable, count: pending } = useInboxBadge();

  const role = appRole(user);
  const groups = navGroups(role, { restricted, parentInbox: inboxAvailable });
  const showChild = role === "parent" && !restricted;
  const isCollapsed = collapsed && mounted;

  // Close mobile drawer on navigation
  useEffect(() => { setMobileOpen(false); }, [pathname, setMobileOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const roleBadge = user && role !== "parent" && (
    <p className="mx-3 w-fit rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-text">{ROLE_LABELS[role]}</p>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed bottom-0 left-0 top-0 z-20 hidden flex-col border-r border-border bg-surface transition-[width] duration-200 ease-in-out print:hidden lg:flex"
        style={{ width: isCollapsed ? 72 : 240 }}
        aria-label="เมนูหลัก"
      >
        <div className={cn("flex h-14 shrink-0 items-center gap-3 border-b border-border px-3", isCollapsed && "justify-center")}>
          <button
            type="button"
            onClick={toggle}
            aria-label={isCollapsed ? "ขยายเมนู" : "ย่อเมนู"}
            aria-expanded={!isCollapsed}
            aria-controls="desktop-sidebar-navigation"
            title={isCollapsed ? "ขยายเมนู" : "ย่อเมนู"}
            className="grid size-9 shrink-0 place-items-center rounded-control text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
          >
            <Menu size={19} aria-hidden="true" />
          </button>
          {!isCollapsed && <Logo withText />}
        </div>

        {showChild && <ChildContext compact={isCollapsed} />}

        <nav id="desktop-sidebar-navigation" className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-3 py-4" aria-label="เมนูหลัก">
          {/* Role badge is in the top bar on desktop. */}
          <NavList groups={groups} collapsed={isCollapsed} pending={pending} />
        </nav>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-x-0 bottom-16 top-0 z-40 bg-slate-950/40 backdrop-blur-sm print:hidden lg:hidden"
          onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed bottom-16 left-0 top-0 z-50 flex w-[280px] flex-col border-r border-border bg-surface shadow-overlay transition-transform duration-200 ease-in-out print:hidden lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="เมนูหลัก"
        id="mobile-sidebar"
        ref={drawerRef}
        role="dialog"
        aria-modal={mobileOpen || undefined}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <Logo withText />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="ปิดเมนู"
            data-overlay-focus
            className="grid size-8 place-items-center rounded-control text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {showChild && <ChildContext compact={false} onNavigate={() => setMobileOpen(false)} />}

        <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4" aria-label="เมนูทั้งหมด">
          {roleBadge}
          <NavList groups={groups} collapsed={false} pending={pending} onNavigate={() => setMobileOpen(false)} />
        </nav>
      </aside>
    </>
  );
}
