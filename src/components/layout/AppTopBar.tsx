"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, ChevronRight, LogOut, Mic, Settings, User } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { Avatar, ButtonLink, DropdownMenu, type MenuItem } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useAccountProfile } from "@/components/account/AccountProfileProvider";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useGuardianWorkspace } from "./GuardianWorkspace";
import { useSidebar } from "./SidebarContext";
import { ROLE_LABELS, appRole, isNavActive, navGroups, type AppRole } from "./navigation";
import { useInboxBadge } from "@/components/inbox/useInboxBadge";

/** Bell with the number of requests and notifications waiting for this account (every role). */
function NotificationBell() {
  const { available, count: pending } = useInboxBadge();
  if (!available) return null;
  const label = pending > 0 ? `กล่องข้อความ มี ${pending} รายการรอดำเนินการ` : "กล่องข้อความ";
  return (
    <Link href="/inbox" aria-label={label} title={label}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-muted hover:text-text">
      <Bell size={19} aria-hidden="true" />
      {pending > 0 && (
        <span aria-hidden="true"
          className="absolute right-1 top-1 min-w-4 rounded-full bg-error px-1 text-center text-[10px] font-bold leading-4 text-error-foreground ring-2 ring-surface">
          {pending > 9 ? "9+" : pending}
        </span>
      )}
    </Link>
  );
}

function ProfileMenu() {
  const { user, signOut } = useAuth();
  const { displayName } = useAccountProfile();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  if (!user) return null;
  const role = appRole(user);

  const items: MenuItem[] = [
    ...(role === "parent" ? [{ label: "ข้อมูลลูก", icon: <User size={15} />, onSelect: () => router.push("/profile") }] : []),
    { label: "ตั้งค่าบัญชี", icon: <Settings size={15} />, onSelect: () => router.push("/settings") },
    {
      label: signingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบ",
      icon: <LogOut size={15} />,
      danger: true,
      disabled: signingOut,
      onSelect: async () => {
        setSigningOut(true);
        try {
          await signOut();
          window.location.replace("/auth/signin");
        } finally {
          setSigningOut(false);
        }
      },
    },
  ];

  return (
    <DropdownMenu
      label="เมนูบัญชี"
      triggerClassName="h-9 px-1 sm:pr-2"
      trigger={
        <>
          <Avatar name={displayName} size="sm" />
          <span className="hidden max-w-36 truncate text-sm font-medium text-text md:inline">{displayName}</span>
        </>
      }
      header={
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text">{displayName}</p>
          <p className="truncate text-caption text-text-muted">{user.email}</p>
          <p className="text-caption text-text-muted">{ROLE_LABELS[role]}</p>
        </div>
      }
      items={items}
    />
  );
}

/** Desktop-only "group › page" trail so a wide screen always says where you are. */
function Breadcrumb({ role, restricted, signedIn }: { role: AppRole; restricted: boolean; signedIn: boolean }) {
  const pathname = usePathname();
  const groups = navGroups(role, { restricted, parentInbox: signedIn });
  for (const group of groups) {
    const item = group.items.find((candidate) => isNavActive(candidate, pathname));
    if (!item) continue;
    return (
      <nav aria-label="ตำแหน่งปัจจุบัน" className="hidden min-w-0 items-center gap-1.5 text-sm lg:flex">
        <span className="text-text-muted">{group.label}</span>
        <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-text-muted" />
        <span aria-current="page" className="truncate font-semibold text-text">{item.label}</span>
      </nav>
    );
  }
  return null;
}

/**
 * Top bar for every signed-in page (phones and desktop). Sticky inside <main>, so on desktop it
 * sits to the right of the sidebar. Account actions (settings, sign out) live in the profile menu.
 */
export default function AppTopBar() {
  const { user, isLoading } = useAuth();
  const { setMobileOpen } = useSidebar();
  const { profile, isHydrated } = useChildProfile();
  const { restricted } = useGuardianWorkspace();
  const role = appRole(user);
  const showChild = role === "parent" && !restricted && isHydrated && profile;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-md print:hidden">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4 lg:px-6">
        <Link href="/" aria-label="หน้าแรก Speech Adventure"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary text-primary-foreground lg:hidden">
          <Mic size={17} strokeWidth={2.5} aria-hidden="true" />
        </Link>

        {showChild && (
          <button type="button" onClick={() => setMobileOpen(true)} aria-label={`เด็กที่เลือก: ${profile.nickname || profile.name} เปิดเมนูเพื่อเปลี่ยน`}
            className="flex min-w-0 max-w-[45vw] items-center gap-2 rounded-control px-2 py-1 transition-colors hover:bg-surface-muted lg:hidden">
            <Avatar name={profile.nickname || profile.name} size="sm" />
            <span className="truncate text-sm font-semibold text-text">{profile.nickname || profile.name}</span>
          </button>
        )}

        {user && role !== "parent" && (
          <span className="hidden rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-text sm:inline-block">
            {ROLE_LABELS[role]}
          </span>
        )}

        {!isLoading && <Breadcrumb role={role} restricted={restricted} signedIn={Boolean(user)} />}

        <div className="flex-1" />

        <ThemeToggle />
        <NotificationBell />
        {user ? <ProfileMenu /> : !isLoading && <ButtonLink href="/auth/signin" size="sm">เข้าสู่ระบบ</ButtonLink>}
      </div>
    </header>
  );
}
