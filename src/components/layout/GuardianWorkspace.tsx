"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useAuth, isParent } from "@/hooks/useAuth";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useRepositories } from "@/lib/providers/RepositoryProvider";

const Context = createContext({
  parent: false,
  /** A parent account with no linked child yet: only the inbox, /join and settings are useful. */
  restricted: false,
  childStatus: "ready" as "loading" | "ready" | "error",
  retryChildren: () => {},
});

export function GuardianWorkspace({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { sharedProfiles } = useChildProfile();
  const userId = user && isParent(user) && !user.isPlatformAdmin ? user.id : undefined;
  const { childAccess } = useRepositories();
  const childStatus = useSyncExternalStore(
    (notify) => childAccess.subscribe(notify),
    () => userId ? childAccess.getReceivedStatus?.(userId) ?? "ready" : "ready",
    () => "ready" as const,
  );

  return <Context.Provider value={{
    parent: !!userId,
    // Linked through a join code: a school student, or a family child shared by its owner.
    restricted: !!userId && (childStatus !== "ready" || sharedProfiles.length === 0),
    childStatus,
    retryChildren: () => { void childAccess.rehydrate?.(); },
  }}>{children}</Context.Provider>;
}

export const useGuardianWorkspace = () => useContext(Context);

export function NoLinkedStudent() {
  return <section className="mx-auto max-w-xl px-4 py-10 sm:py-16">
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-6">
      <Mail className="text-primary" size={24} aria-hidden="true" />
      <h1 className="text-xl font-bold">ยังไม่มีนักเรียนเชื่อมกับบัญชีนี้</h1>
      <p className="text-sm text-text-muted">สแกน QR หรือกรอกรหัสจากใบเชิญที่ได้รับจากครูประจำห้อง ระบบจะเชื่อมบัญชีกับบุตรหลานให้ทันที</p>
      <p className="text-sm text-text-muted">ยังไม่มีใบเชิญ? ขอจากครูประจำห้องได้เลย ไม่ต้องแจ้งอีเมล</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/join" className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">ใช้รหัสเข้าร่วม</Link>
        <Link href="/inbox" className="inline-flex rounded-xl border border-border px-4 py-2 text-sm font-semibold text-primary">เปิดกล่องข้อความ</Link>
      </div>
    </div>
  </section>;
}
