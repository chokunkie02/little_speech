import {
  STORAGE_KEYS,
  getScopedStorageKey,
  getLegacyClaimedFlagKey,
} from "@/lib/storage/storageKeys";
import { localRead, localWrite, localRemove } from "@/lib/storage/local/localStorageClient";
import { ChildProfileDataSchema, parseOrNull } from "@/lib/validation";

const STORAGE_KEY = STORAGE_KEYS.PROFILE;

export type TrainingMode = "speech_clarity" | "kindergarten_phonics";

// ── User scope ────────────────────────────────────────────────────────────────
// null = anonymous scope (reads from STORAGE_KEY:anonymous)
let _scopeUserId: string | null = null;

function getCurrentKey(): string {
  return getScopedStorageKey(STORAGE_KEY, _scopeUserId);
}

/**
 * One-time migration: copy legacy unscoped data to the current user's scoped
 * key. Only runs for authenticated users and only if the legacy key has data
 * that hasn't yet been claimed by another user.
 */
function tryMigrateLegacy(): void {
  if (_scopeUserId === null) return; // anonymous — no migration
  const scopedKey = getCurrentKey();
  if (localRead(scopedKey)) return; // scoped key already has data
  const claimFlagKey = getLegacyClaimedFlagKey(STORAGE_KEY);
  if (localRead(claimFlagKey)) return; // legacy already claimed
  const legacyData = localRead(STORAGE_KEY);
  if (!legacyData) return; // nothing to migrate
  localWrite(scopedKey, legacyData);
  localWrite(claimFlagKey, _scopeUserId);
}

/**
 * Switch the active user scope and re-read from the correct localStorage key.
 * Called by LocalProfileRepository.setScope() on every auth transition.
 */
export function setScope(userId: string | null): void {
  if (userId === _scopeUserId && isClientInitialized) return;
  _scopeUserId = userId;
  isClientInitialized = false;
  tryMigrateLegacy();
  initializeIfNeeded();
  notifyListeners();
}

export interface ChildProfileData {
  id: string;
  organizationId?: string;
  nickname?: string;
  avatarEmoji?: string;
  name: string;
  age: number;
  targetSound: string;
  trainingGoal: string;
  /** Defaults to "speech_clarity" for all existing profiles. */
  trainingMode: TrainingMode;
  createdAt: string;
  updatedAt: string;
}

// ── Stable snapshot pattern (same as speechProgressStorage) ──────────────────
//
// SERVER_PROFILE is always null — the server has no localStorage.
// currentProfile starts as null; after client init it holds the stored object
// or remains null if nothing is saved. Object.is(null, null) === true, so no
// spurious re-renders when the user has no profile.

const SERVER_PROFILE: ChildProfileData | null = null;
let currentProfile: ChildProfileData | null = null;
let isClientInitialized = false;

const listeners = new Set<() => void>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readFromLocalStorage(): ChildProfileData | null {
  try {
    // For anonymous scope fall back to the legacy unscoped key so existing
    // anonymous users don't lose their data after the scoping upgrade.
    const raw = localRead(getCurrentKey()) ?? (_scopeUserId === null ? localRead(STORAGE_KEY) : null);
    if (!raw) return null;
    return parseOrNull(
      ChildProfileDataSchema,
      JSON.parse(raw),
      "profile",
    ) as ChildProfileData | null;
  } catch {
    return null;
  }
}

function initializeIfNeeded(): void {
  if (!isBrowser() || isClientInitialized) return;
  isClientInitialized = true;
  currentProfile = readFromLocalStorage();
}

function notifyListeners(): void {
  listeners.forEach((fn) => fn());
}

export function subscribeToProfile(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getProfile(): ChildProfileData | null {
  initializeIfNeeded();
  return currentProfile;
}

export function getServerProfile(): ChildProfileData | null {
  return SERVER_PROFILE;
}

export function saveProfile(profile: ChildProfileData): void {
  currentProfile = profile;
  localWrite(getCurrentKey(), JSON.stringify(profile));
  notifyListeners();
}

export function clearProfile(): void {
  if (!isBrowser()) return;
  localRemove(getCurrentKey());
  currentProfile = null;
  notifyListeners();
}

export function replaceProfile(profile: ChildProfileData): void {
  currentProfile = profile;
  localWrite(getCurrentKey(), JSON.stringify(profile));
  notifyListeners();
}
