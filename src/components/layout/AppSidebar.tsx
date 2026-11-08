"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon, { type NavIconName } from "./NavIcon";
import { useSidebar } from "./SidebarContext";
import ChildSelector from "./ChildSelector";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useSpeechProgress } from "@/hooks/useSpeechProgress";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useAuth, isTeacher, isSchoolAdmin } from "@/hooks/useAuth";
import { mockTrainingStages } from "@/data/speechAdventureMockData";

type NavItem = { href: string; label: string; icon: NavIconName; exact?: boolean };

const PARENT_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "หน้าหลัก", icon: "home", exact: true },
  { href: "/training", label: "ฝึกและเรียน", icon: "training" },
  { href: "/library", label: "เนื้อหา", icon: "library" },
  { href: "/progress", label: "ความก้าวหน้า", icon: "progress" },
  { href: "/rewards", label: "รางวัล", icon: "rewards" },
  { href: "/report", label: "รายงาน", icon: "report" },
  { href: "/demo", label: "Showcase", icon: "demo" },
  { href: "/onboarding?edit=true", label: "โปรไฟล์", icon: "profile" },
  { href: "/settings", label: "ตั้งค่า", icon: "settings" },
];

const TEACHER_NAV_ITEMS: NavItem[] = [
  { href: "/teacher", label: "แดชบอร์ดครู", icon: "teacher" },
  { href: "/report", label: "รายงาน", icon: "report" },
  { href: "/settings", label: "ตั้งค่า", icon: "settings" },
];

const SCHOOL_ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/school", label: "จัดการโรงเรียน", icon: "school" },
  { href: "/report", label: "รายงาน", icon: "report" },
  { href: "/settings", label: "ตั้งค่า", icon: "settings" },
];

function MicLogoIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function StarFilledIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFB347" stroke="#FFB347" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { collapsed, toggle, mounted, mobileOpen, setMobileOpen } = useSidebar();
  const { summary, isHydrated, selectedSoundId } = useSpeechProgress();
  const { profile } = useChildProfile();
  const { user } = useAuth();

  const isSpeechMode = !isHydrated || profile?.trainingMode !== "kindergarten_phonics";

  const NAV_ITEMS: NavItem[] = isSchoolAdmin(user)
    ? SCHOOL_ADMIN_NAV_ITEMS
    : isTeacher(user)
    ? TEACHER_NAV_ITEMS
    : PARENT_NAV_ITEMS;

  const isActive = (item: (typeof NAV_ITEMS)[0]) =>
    (item.href === "/training" && pathname === "/learning") ||
    (item.exact ? pathname === item.href : (pathname?.startsWith(item.href) ?? false));

  const stars = isHydrated ? summary.starsEarned : 0;
  const currentStageId = isHydrated ? summary.currentStageId : null;
  const currentStage = mockTrainingStages.find((s) => s.id === currentStageId);

  // Close mobile drawer on navigation
  useEffect(() => { setMobileOpen(false); }, [pathname, setMobileOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const expandedWidth = "240px";
  const collapsedWidth = "72px";
  const currentWidth = mounted ? (collapsed ? collapsedWidth : expandedWidth) : expandedWidth;
  const isCollapsed = collapsed && mounted;

  // Collapsible label helper
  const labelCls = isCollapsed
    ? "w-0 opacity-0 overflow-hidden"
    : "w-auto opacity-100";

  // ── Context section (role-aware) ──
  const isProfRole = isSchoolAdmin(user) || isTeacher(user);
  const contextSection = isProfRole ? (
    // Teacher / school_admin: minimal context (no child selector)
    <div className={`px-3 py-3 border-b border-border flex-shrink-0 ${isCollapsed ? "" : ""}`}>
      {!isCollapsed && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-muted">
            {isSchoolAdmin(user) ? "ผู้ดูแลโรงเรียน" : "ครูผู้สอน"}
          </span>
          <ThemeToggle />
        </div>
      )}
    </div>
  ) : (
    // Parent / default: full child context
    <div className={`px-3 py-3 border-b border-border flex-shrink-0 ${isCollapsed ? "flex items-center justify-center" : "space-y-2.5"}`}>
      {isCollapsed ? (
        <ChildSelector collapsed />
      ) : (
        <>
          <ChildSelector />

          {/* Target sound + Stars row — speech_clarity only */}
          <div className="flex items-center gap-2 flex-wrap">
            {isHydrated && isSpeechMode && selectedSoundId && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                เสียง {selectedSoundId}
              </span>
            )}
            {isHydrated && isSpeechMode && stars > 0 && (
              <Link href="/rewards" className="flex items-center gap-1 text-xs font-bold text-secondary hover:text-secondary/80 transition-colors" aria-label={`ดาวสะสม ${stars} ดาว`}>
                <StarFilledIcon size={12} />
                <span>{stars}</span>
              </Link>
            )}
          </div>

          {/* Continue Training CTA — mode-aware */}
          {isHydrated && isSpeechMode && currentStage && (
            <Link
              href={`/training/${currentStage.slug}`}
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all active:scale-[0.97]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
              ฝึกต่อ
            </Link>
          )}
          {isHydrated && !isSpeechMode && (
            <Link
              href="/training"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-all active:scale-[0.97]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
              เรียนต่อ
            </Link>
          )}

          {/* Theme toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">ธีม</span>
            <ThemeToggle />
          </div>
        </>
      )}
    </div>
  );

  // ── Desktop sidebar content ──
  const desktopSidebar = (
    <>
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border flex-shrink-0">
        <Link href="/" className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-colors" aria-label="หน้าแรก">
          <MicLogoIcon size={16} />
        </Link>
        <div className={`min-w-0 overflow-hidden transition-all duration-200 ${labelCls}`}>
          <p className="text-sm font-bold text-text leading-tight whitespace-nowrap">Speech</p>
          <p className="text-xs font-semibold text-primary leading-tight whitespace-nowrap">Adventure</p>
        </div>
      </div>

      {/* Context (child info, actions) */}
      {contextSection}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-text-muted hover:text-text hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              <span className="flex-shrink-0 flex items-center justify-center w-5">
                <NavIcon name={item.icon} active={active} size={17} />
              </span>
              <span className={`truncate whitespace-nowrap transition-all duration-200 ${labelCls}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: Prototype badge */}
      <div className="px-3 py-3 border-t border-border flex-shrink-0">
        <div className={`rounded-xl bg-primary/6 border border-primary/12 px-3 py-2.5 transition-all duration-200 ${isCollapsed ? "flex items-center justify-center" : ""}`}>
          <div className={`flex items-center gap-2 ${isCollapsed ? "" : "mb-1"}`}>
            <div className="w-2 h-2 rounded-full bg-primary/60 flex-shrink-0" aria-hidden="true" />
            <span className={`text-xs font-semibold text-primary whitespace-nowrap transition-all duration-200 ${isCollapsed ? "sr-only" : ""}`}>
              Prototype
            </span>
          </div>
          <p className={`text-xs text-text-muted/60 transition-all duration-200 ${isCollapsed ? "hidden" : ""}`}>
            v0.1 · Demo Mode
          </p>
        </div>
      </div>

      {/* Collapse toggle */}
      <div className="px-3 pb-3 flex-shrink-0 hidden lg:block">
        <button
          onClick={toggle}
          aria-label={isCollapsed ? "ขยายเมนู" : "ย่อเมนู"}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-text-muted hover:text-text hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
        >
          <span className={`transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`}>
            <ChevronLeftIcon />
          </span>
          <span className={`text-xs font-medium whitespace-nowrap transition-all duration-200 ${labelCls}`}>
            ย่อเมนู
          </span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed top-0 left-0 bottom-0 z-20 hidden lg:flex flex-col bg-surface border-r border-border print:hidden transition-[width] duration-200 ease-in-out"
        style={{ width: currentWidth }}
        aria-label="เมนูหลัก"
      >
        {desktopSidebar}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden print:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-[280px] bg-surface border-r border-border flex flex-col transition-transform duration-200 ease-in-out lg:hidden print:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="เมนูหลัก"
        aria-hidden={!mobileOpen}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border flex-shrink-0">
          <Link href="/" className="flex items-center gap-3" aria-label="หน้าแรก">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <MicLogoIcon size={16} />
            </div>
            <p className="text-sm font-bold text-text leading-tight">Speech Adventure</p>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="ปิดเมนู"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Mobile context */}
        <div className="px-4 py-3 border-b border-border flex-shrink-0 space-y-2.5">
          {isProfRole ? (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">
                {isSchoolAdmin(user) ? "ผู้ดูแลโรงเรียน" : "ครูผู้สอน"}
              </span>
              <ThemeToggle />
            </div>
          ) : (
            <>
              <ChildSelector />
              <div className="flex items-center gap-2 flex-wrap">
                {isHydrated && isSpeechMode && selectedSoundId && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    เสียง {selectedSoundId}
                  </span>
                )}
                {isHydrated && isSpeechMode && stars > 0 && (
                  <Link href="/rewards" className="flex items-center gap-1 text-xs font-bold text-secondary hover:text-secondary/80 transition-colors" aria-label={`ดาวสะสม ${stars} ดาว`}>
                    <StarFilledIcon size={12} />
                    <span>{stars}</span>
                  </Link>
                )}
              </div>
              {isHydrated && isSpeechMode && currentStage && (
                <Link
                  href={`/training/${currentStage.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all active:scale-[0.97]"
                >
                  ฝึกต่อ
                </Link>
              )}
              {isHydrated && !isSpeechMode && (
                <Link
                  href="/training"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-all active:scale-[0.97]"
                >
                  เรียนต่อ
                </Link>
              )}
            </>
          )}
        </div>

        {/* Mobile nav items */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted hover:text-text hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <span className="flex-shrink-0 flex items-center justify-center w-5">
                  <NavIcon name={item.icon} active={active} size={17} />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile footer */}
        <div className="px-3 py-3 border-t border-border flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-text-muted">ธีม</span>
            <ThemeToggle />
          </div>
          <div className="rounded-xl bg-primary/6 border border-primary/12 px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-primary/60 flex-shrink-0" aria-hidden="true" />
              <span className="text-xs font-semibold text-primary">Prototype</span>
            </div>
            <p className="text-xs text-text-muted/60">v0.1 · Demo Mode</p>
          </div>
        </div>
      </aside>
    </>
  );
}
