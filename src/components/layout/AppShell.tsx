"use client";

import { usePathname } from "next/navigation";
import { NoLinkedStudent, useGuardianWorkspace } from "./GuardianWorkspace";
import AppTopBar from "./AppTopBar";
import AppSidebar from "./AppSidebar";
import MobileNav from "./MobileNav";
import { SidebarProvider, useSidebar } from "./SidebarContext";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { collapsed, mounted } = useSidebar();
  const path = usePathname();
  const { restricted, childStatus, retryChildren } = useGuardianWorkspace();
  const waitingForStudent = restricted && !["/inbox", "/settings"].includes(path);
  const desktopPadding = mounted && collapsed ? "lg:pl-[72px]" : "lg:pl-[240px]";

  return (
    <div className="min-h-screen bg-bg print:bg-white">
      {/* Minimal mobile top bar — hidden on desktop */}
      <AppTopBar />
      <AppSidebar />
      {/* pt-11: below thin mobile bar (hidden on desktop) | lg:pt-0: no top bar on desktop | pb-16 lg:pb-0: above mobile bottom nav */}
      <main
        className={`pt-11 lg:pt-0 pb-16 lg:pb-0 print:pt-0 print:!pl-0 print:pb-0 transition-[padding-left] duration-200 ease-in-out ${desktopPadding}`}
      >
        {!waitingForStudent ? children : childStatus === "loading" ? (
          <p className="mx-auto max-w-xl px-4 py-10 text-text-muted" role="status">กำลังโหลดข้อมูลนักเรียน…</p>
        ) : childStatus === "error" ? (
          <div className="mx-auto max-w-xl space-y-3 px-4 py-10">
            <p role="alert">โหลดข้อมูลนักเรียนไม่สำเร็จ</p>
            <button type="button" onClick={retryChildren} className="rounded-xl border border-border px-4 py-2 font-semibold text-primary">ลองอีกครั้ง</button>
          </div>
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
