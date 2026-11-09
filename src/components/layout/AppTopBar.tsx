"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useSidebar } from "./SidebarContext";
import { useSpeechProgress } from "@/hooks/useSpeechProgress";
import { useChildProfile } from "@/hooks/useChildProfile";

function MicLogoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function StarFilledIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFB347" stroke="#FFB347" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export default function AppTopBar() {
  const { mobileOpen, setMobileOpen } = useSidebar();
  const { summary, isHydrated, selectedSoundId } = useSpeechProgress();
  const { profile, isHydrated: profileHydrated } = useChildProfile();
  const stars = isHydrated ? summary.starsEarned : 0;

  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-11 bg-surface/95 backdrop-blur-md border-b border-border print:hidden lg:hidden">
      <div className="flex items-center h-full gap-2 px-3">
        {/* Hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text hover:bg-gray-100 dark:hover:bg-white/10 transition-all flex-shrink-0"
          aria-label={mobileOpen ? "ปิดเมนู" : "เปิดเมนู"}
          aria-controls="mobile-sidebar"
          aria-expanded={mobileOpen}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Mini logo */}
        <Link href="/" className="flex items-center gap-1.5 flex-shrink-0" aria-label="หน้าแรก">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <MicLogoIcon />
          </div>
          <span className="text-xs font-bold text-text">Speech Adventure</span>
        </Link>

        {/* Child chip — tapping opens drawer where full selector lives */}
        {profileHydrated && profile && (
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center gap-1.5 max-w-[120px] min-w-0 px-2 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all flex-shrink-0"
            aria-label={`เด็ก: ${profile.name} — เปิดเมนู`}
          >
            <div className="w-5 h-5 rounded-full bg-primary/12 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
              {profile.name.charAt(0)}
            </div>
            <span className="text-xs font-semibold text-text truncate">{profile.name}</span>
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1 min-w-0" />

        {/* Target sound */}
        {isHydrated && selectedSoundId && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
            เสียง {selectedSoundId}
          </span>
        )}

        {/* Stars */}
        {isHydrated && stars > 0 && (
          <Link
            href="/rewards"
            className="flex items-center gap-0.5 text-xs font-bold text-secondary hover:text-secondary/80 transition-colors flex-shrink-0"
            aria-label={`ดาวสะสม ${stars} ดาว`}
          >
            <StarFilledIcon />
            <span>{stars}</span>
          </Link>
        )}

        <ThemeToggle />
      </div>
    </header>
  );
}
