"use client";

import { useMemo } from "react";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useChildAccess } from "@/hooks/useChildAccess";
import { FULL_PERMISSIONS } from "@/types/childAccess";
import type { ChildPermissions } from "@/types/childAccess";

export interface CurrentChildAccess extends ChildPermissions {
  isOwner: boolean;
  isSharedChild: boolean;
  /** True only for owner/guardian — can invite, revoke, and manage access grants. */
  canManageAccess: boolean;
}

/**
 * Returns permission flags for the currently selected child.
 *
 * - Owner: always gets FULL_PERMISSIONS + canManageAccess=true.
 * - Shared child: permissions come from the active ChildAccess grant.
 *   canManageAccess is always false for shared-child viewers.
 * - No child selected: returns FULL_PERMISSIONS with isOwner=false / isSharedChild=false.
 */
export function useCurrentChildAccess(): CurrentChildAccess {
  const { profile, isOwner } = useChildProfile();
  const { receivedGrants } = useChildAccess();

  const permissions = useMemo<ChildPermissions>(() => {
    if (isOwner || !profile) return FULL_PERMISSIONS;
    const grant = receivedGrants.find(
      (g) => g.childId === profile.id && !g.revokedAt,
    );
    return grant?.permissions ?? FULL_PERMISSIONS;
  }, [isOwner, profile, receivedGrants]);

  return {
    isOwner,
    isSharedChild: !isOwner && profile !== null,
    // Only the owner of a child can invite others or revoke access.
    canManageAccess: isOwner,
    ...permissions,
  };
}
