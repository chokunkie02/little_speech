import type { ChildAccess, GrantChildAccessInput, ChildPermissions } from "@/types/childAccess";

/**
 * Contract for managing child access grants.
 *
 * Follows the same useSyncExternalStore-compatible subscribe/snapshot
 * pattern as IProfileRepository and IInvitationRepository.
 *
 * Scope is set via setScope(userId) — grants are filtered by the scoped user.
 * Storage is intentionally unscoped (shared key) so both grantor and grantee
 * on the same device can read/mutate the same grants array in local/demo mode.
 */
export interface IChildAccessRepository {
  rehydrate?(): Promise<void>;
  subscribe(callback: () => void): () => void;

  /** Active (non-revoked) grants received by the scoped user. */
  listReceivedGrants(): ChildAccess[];
  getServerReceivedGrants(): ChildAccess[];

  /** All grants (including revoked) issued by the scoped user. */
  listIssuedGrants(): ChildAccess[];

  grantChildAccess(input: GrantChildAccessInput): Promise<ChildAccess>;
  revokeChildAccess(grantId: string): Promise<void>;
  updateChildPermissions(grantId: string, permissions: Partial<ChildPermissions>): Promise<void>;

  /** Filter scope — only updates the userId used for filtering, not the storage key. */
  setScope(userId: string | null): void;
}
