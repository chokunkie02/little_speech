"use client";

import { usePathname } from "next/navigation";
import { NoLinkedStudent, useGuardianWorkspace } from "./GuardianWorkspace";
import AppTopBar from "./AppTopBar";
import AppSidebar from "./AppSidebar";
import MobileNav from "./MobileNav";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import { DataLoadError, LoadingState, Page } from "@/components/ui";
import { useAccountProfile } from "@/components/account/AccountProfileProvider";
import { CompleteProfile } from "@/components/account/CompleteProfile";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { collapsed, mounted } = useSidebar();
  const path = usePathname();
  const { restricted, childStatus, retryChildren } = useGuardianWorkspace();
  const waitingForStudent = restricted && !["/inbox", "/settings"].includes(path);
  const account = useAccountProfile();
  // Older accounts were created without a name or consent: ask once before anything else.
  const needsName = account.status === "ready" && (!account.profile || !account.profile.termsAcceptedAt);
  const desktopPadding = mounted && collapsed ? "lg:pl-[72px]" : "lg:pl-[240px]";

  return (
    <div className="min-h-screen bg-bg print:bg-white">
      <a href="#main-content"
        className="sr-only rounded-control bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60]">
        ข้ามไปเนื้อหาหลัก
      </a>
      <AppSidebar />
      {/* Bottom padding: room for the phone bottom bar (plus the iPhone home indicator); the sidebar offset applies from lg up. */}
      <main id="main-content" tabIndex={-1} className={`pb-[calc(5rem+env(safe-area-inset-bottom))] focus:outline-none transition-[padding-left] duration-200 ease-in-out print:!pl-0 print:pb-0 lg:pb-0 ${desktopPadding}`}>
        <AppTopBar />
        {needsName ? <CompleteProfile /> : !waitingForStudent ? children : childStatus === "loading" ? (
          <Page width="narrow"><LoadingState variant="list" rows={2} label="กำลังโหลดข้อมูลนักเรียน…" /></Page>
        ) : childStatus === "error" ? (
          <Page width="narrow">
            <DataLoadError message="โหลดข้อมูลนักเรียนไม่สำเร็จ" onRetry={retryChildren} />
          </Page>
        ) : <NoLinkedStudent />}
      </main>
      <MobileNav />
    </div>
  );
}

interface Props {
  children: React.ReactNode;
}

export default function AppShell({ children }: Props) {
  return (
    <SidebarProvider>
      <AppShellInner>{children}</AppShellInner>
    </SidebarProvider>
  );
}
