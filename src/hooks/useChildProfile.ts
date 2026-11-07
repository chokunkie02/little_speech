"use client";

import { useSyncExternalStore, useMemo } from "react";
import { useRepositories } from "@/lib/providers/RepositoryProvider";
import type { ChildProfileData } from "@/lib/child-profile/childProfileStorage";

export type { ChildProfileData };

// Stable server-side snapshots
// IMPORTANT: server snapshots must return the exact same reference on every call.
// useSyncExternalStore uses Object.is() — a new [] each call causes an infinite loop.
const EMPTY_PROFILES: ChildProfileData[] = [];

const noopSubscribe = () => () => {};
const clientTrue = () => true as const;
const serverFalse = () => false as const;
const getEmptyProfiles = (): ChildProfileData[] => EMPTY_PROFILES;
const serverNullId = (): string | null => null;

export function useChildProfile() {
  const { profile: repo, childAccess: accessRepo } = useRepositories();

  const ownedProfile = useSyncExternalStore(
    repo.subscribe.bind(repo),
    repo.getProfile.bind(repo),
    repo.getServerProfile.bind(repo),
  );

  // List of all child profiles for this user account
  const profiles = useSyncExternalStore(
    repo.subscribe.bind(repo),
    () => repo.listProfiles(),
    getEmptyProfiles,
  );

  // ID of the currently selected child
  const selectedChildId = useSyncExternalStore(
    repo.subscribe.bind(repo),
    () => repo.getSelectedChildId(),
    serverNullId,
  );

  // Active child access grants received by the current user
  const receivedGrants = useSyncExternalStore(
    accessRepo.subscribe.bind(accessRepo),
    accessRepo.listReceivedGrants.bind(accessRepo),
    accessRepo.getServerReceivedGrants.bind(accessRepo),
  );

  // Shared child profiles derived from active received grants
  const sharedProfiles = useMemo<ChildProfileData[]>(
    () => receivedGrants.flatMap((g) => (!g.revokedAt && g.childSnapshot ? [g.childSnapshot] : [])),
    [receivedGrants],
  );

  // Effective profile: resolve by selectedChildId across owned + shared first,
  // then fall back so switching to a shared child actually updates the card.
  const profile = useMemo<ChildProfileData | null>(() => {
    if (selectedChildId) {
      const ownedMatch = profiles.find((p) => p.id === selectedChildId);
      if (ownedMatch) return ownedMatch;
      const sharedMatch = sharedProfiles.find((p) => p.id === selectedChildId);
      if (sharedMatch) return sharedMatch;
    }
    return ownedProfile ?? sharedProfiles[0] ?? null;
  }, [selectedChildId, profiles, sharedProfiles, ownedProfile]);

  // false during SSR + hydration, true right after
  const isHydrated = useSyncExternalStore(noopSubscribe, clientTrue, serverFalse);

  // true when the active profile belongs to this user's owned list
  const isOwner = profile ? profiles.some((p) => p.id === profile.id) : false;

  return {
    profile,
    profiles,
    sharedProfiles,
    selectedChildId,
    hasProfile: profile !== null,
    isOwner,
    isHydrated,
    saveProfile: (data: ChildProfileData) => repo.saveProfile(data),
    clearProfile: () => repo.clearProfile(),
    /** Switch to a different child. Callers should also call setSelectedSound(child.targetSound). */
    selectChild: (id: string) => repo.setSelectedChildId(id),
  };
}
