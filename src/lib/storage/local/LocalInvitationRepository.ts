import * as storage from "@/lib/storage/invitationStorage";
import type { IInvitationRepository } from "@/lib/repositories/IInvitationRepository";
import type { Invitation, CreateInvitationInput } from "@/types/invitations";
import { getProfiles } from "@/lib/child-profile/childProfileListStorage";

const EMPTY_INVITATIONS: Invitation[] = [];

/**
 * localStorage-backed implementation of IInvitationRepository.
 *
 * Invitations are scoped per user (same pattern as profile/observations),
 * so every row in the current scope is a "sent" invitation owned by the
 * authenticated user. Cross-account "received" invites are not supported
 * in local mode (storage is per-user); listReceivedInvitations() returns
 * an empty list unless the scoped email is recorded and matches.
 *
 * The token is embedded in accept links: /invite/accept?token=
 */
export class LocalInvitationRepository implements IInvitationRepository {
  private _scopeUserId: string | null = null;
  private _scopeEmail: string | null = null;

  // ── useSyncExternalStore plumbing ────────────────────────────────────────────

  listSentInvitations(): Invitation[] {
    return storage.getInvitations();
  }

  getServerSentInvitations(): Invitation[] {
    return storage.getServerInvitations();
  }

  listReceivedInvitations(): Invitation[] {
    if (!this._scopeEmail) return EMPTY_INVITATIONS;
    const target = this._scopeEmail.toLowerCase();
    return storage.getInvitations().filter((i) => i.email.toLowerCase() === target);
  }

  getServerReceivedInvitations(): Invitation[] {
    return EMPTY_INVITATIONS;
  }

  subscribe(callback: () => void): () => void {
    return storage.subscribeToInvitations(callback);
  }

  // ── Token lookup ─────────────────────────────────────────────────────────────

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    return storage.findByToken(token);
  }

  // ── Write operations ─────────────────────────────────────────────────────────

  async createInvitation(
    input: CreateInvitationInput,
    invitedBy: string,
    inviterEmail?: string,
  ): Promise<Invitation> {
    const now = new Date().toISOString();
    const childSnapshot = input.childId
      ? getProfiles().find((p) => p.id === input.childId)
      : undefined;
    const invitation: Invitation = {
      id: storage.generateToken(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      childId: input.childId,
      invitedBy,
      status: "pending",
      token: storage.generateToken(),
      expiresAt: storage.makeExpiresAt(),
      createdAt: now,
      inviterEmail,
      childSnapshot,
    };
    storage.addInvitation(invitation);
    return invitation;
  }

  async acceptInvitation(token: string): Promise<void> {
    const inv = storage.findByToken(token);
    if (!inv) return;
    if (inv.status !== "pending") return;
    storage.updateInvitation({
      ...inv,
      status: "accepted",
      acceptedAt: new Date().toISOString(),
      acceptedBy: this._scopeUserId ?? undefined,
    });
  }

  async revokeInvitation(id: string): Promise<void> {
    const invitations = storage.getInvitations();
    const inv = invitations.find((i) => i.id === id);
    if (!inv) return;
    storage.updateInvitation({ ...inv, status: "revoked" });
  }

  setScope(userId: string | null, email?: string | null): void {
    storage.setScope(userId);
    this._scopeUserId = userId;
    this._scopeEmail = email ?? null;
  }
}
