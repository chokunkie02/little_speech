import type { Invitation, CreateInvitationInput } from "@/types/invitations";

/**
 * Contract for creating and managing invitations.
 *
 * Follows the same useSyncExternalStore-compatible subscribe/snapshot
 * pattern as IProfileRepository and IObservationRepository.
 *
 * Sent vs received are kept strictly separate to avoid showing invites
 * addressed to the current user under their own "sent history" list.
 */
export interface IInvitationRepository {
  // ── useSyncExternalStore plumbing ──────────────────────────────────────────
  subscribe(callback: () => void): () => void;

  /** Invitations created BY the current user (invited_by = auth.uid()). */
  listSentInvitations(): Invitation[];
  getServerSentInvitations(): Invitation[];

  /** Invitations sent TO the current user's email (pending or otherwise). */
  listReceivedInvitations(): Invitation[];
  getServerReceivedInvitations(): Invitation[];

  // ── Token lookup (also used by unauthenticated accept page) ───────────────
  /** Returns a single invitation by token, regardless of owner. Null when not found. */
  getInvitationByToken(token: string): Promise<Invitation | null>;

  // ── Write operations ───────────────────────────────────────────────────────
  createInvitation(input: CreateInvitationInput, invitedBy: string, inviterEmail?: string): Promise<Invitation>;
  acceptInvitation(token: string): Promise<void>;
  submitGuardianRequest?(token: string, name: string, relationship: string): Promise<void>;
  revokeInvitation(id: string): Promise<void>;
}
