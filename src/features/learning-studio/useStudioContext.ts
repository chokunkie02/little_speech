"use client";
import { useAuth } from "@/hooks/useAuth";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useChildAccess } from "@/hooks/useChildAccess";
import { FULL_PERMISSIONS } from "@/types/childAccess";

/** Resolve shared grants explicitly: a missing/revoked grant must fail closed. */
export function useStudioContext() {
  const { user, isLoading } = useAuth();
  const { profile, isOwner, isHydrated } = useChildProfile();
  const { receivedGrants } = useChildAccess();
  const grant =
    profile && !isOwner
      ? receivedGrants.find((g) => g.childId === profile.id && !g.revokedAt)
      : undefined;
  const permissions =
    isOwner || !profile ? FULL_PERMISSIONS : grant?.permissions;
  const staffHome = user?.isPlatformAdmin ? "/platform"
    : user?.role === "school_admin" ? "/school"
      : user?.role === "teacher" ? "/teacher" : null;
  return {
    user,
    profile,
    ready: isHydrated && !isLoading,
    staffHome,
    canPractice: !staffHome && !!permissions?.canStartPractice,
    canExport: !staffHome && !!permissions?.canExportReport,
  };
}
