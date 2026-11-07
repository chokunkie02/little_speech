"use client";

import { useSyncExternalStore, useCallback } from "react";
import { useRepositories } from "@/lib/providers/RepositoryProvider";
import type { ChildAccess, GrantChildAccessInput, ChildPermissions } from "@/types/childAccess";

const EMPTY: ChildAccess[] = [];
const getEmpty = (): ChildAccess[] => EMPTY;

export function useChildAccess() {
  const { childAccess: repo } = useRepositories();

  const receivedGrants = useSyncExternalStore(
    repo.subscribe.bind(repo),
    repo.listReceivedGrants.bind(repo),
    repo.getServerReceivedGrants.bind(repo),
  );

  const issuedGrants = useSyncExternalStore(
    repo.subscribe.bind(repo),
    repo.listIssuedGrants.bind(repo),
    getEmpty,
  );

  const grantChildAccess = useCallback(
    async (input: GrantChildAccessInput): Promise<ChildAccess> => {
      return repo.grantChildAccess(input);
    },
    [repo],
  );

  const revokeChildAccess = useCallback(
    async (grantId: string): Promise<void> => {
      return repo.revokeChildAccess(grantId);
    },
    [repo],
  );

  const updateChildPermissions = useCallback(
    async (grantId: string, permissions: Partial<ChildPermissions>): Promise<void> => {
      return repo.updateChildPermissions(grantId, permissions);
    },
    [repo],
  );

  return {
    refreshChildAccess: repo.rehydrate?.bind(repo),
    receivedGrants,
    issuedGrants,
    grantChildAccess,
    revokeChildAccess,
    updateChildPermissions,
  };
}
