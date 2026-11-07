import type { IInvitationRepository } from "@/lib/repositories/IInvitationRepository";
import type { Invitation, CreateInvitationInput } from "@/types/invitations";
import { INVITATION_EXPIRY_DAYS } from "@/types/invitations";
import type { SupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import { dbToDomainInvitation } from "./mappers";
import { QueryError, warnRepo, isNetworkError } from "./errors";

const SERVER_INVITATIONS: Invitation[] = [];

/**
 * Supabase-backed implementation of IInvitationRepository.
 *
 * Cache strategy:
 *  • _sent[]     — invitations the current user created (invited_by = auth.uid())
 *  • _received[] — invitations addressed to the current user's email
 *
 * Sent and received MUST stay separate so the UI never displays an invite
 * addressed to the user under their own "sent history" list.
 *
 * RLS note:
 *  • listSent / createInvitation / revokeInvitation use direct table access.
 *    Owner RLS policies filter by invited_by = auth.uid().
 *  • listReceived uses the "invitee select" policy which matches by email
 *    against auth.jwt() ->> 'email' (no auth.users select).
 *  • getInvitationByToken uses the get_invitation_by_token SECURITY DEFINER
 *    RPC so it works for unauthenticated visitors on the accept page.
 *  • acceptInvitation calls accept_invitation_with_access SECURITY DEFINER
 *    RPC which atomically marks accepted AND creates child_access.
 */
export class SupabaseInvitationRepository implements IInvitationRepository {
  private _sent: Invitation[] = SERVER_INVITATIONS;
  private _received: Invitation[] = SERVER_INVITATIONS;
  private readonly _listeners = new Set<() => void>();
  private _hydrated = false;
  private _hydratePromise: Promise<void> | null = null;
  private _hydrateGen = 0;

  constructor(private readonly client: SupabaseClient<Database>) {}

  // ── useSyncExternalStore plumbing ──────────────────────────────────────────

  listSentInvitations(): Invitation[] {
    return this._sent;
  }

  getServerSentInvitations(): Invitation[] {
    return SERVER_INVITATIONS;
  }

  listReceivedInvitations(): Invitation[] {
    return this._received;
  }

  getServerReceivedInvitations(): Invitation[] {
    return SERVER_INVITATIONS;
  }

  subscribe(callback: () => void): () => void {
    this._listeners.add(callback);
    this._triggerHydrate();
    return () => {
      this._listeners.delete(callback);
    };
  }

  // ── Token lookup ─────────────────────────────────────────────────────────────

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    const { data, error } = await this.client.rpc("get_invitation_by_token", { p_token: token });
    if (error) throw new Error(error.message);
    return data?.[0] ? dbToDomainInvitation(data[0]) : null;
  }

  // ── Write operations ──────────────────────────────────────────────────────────

  async createInvitation(
    input: CreateInvitationInput,
    invitedBy: string,
    inviterEmail?: string,
  ): Promise<Invitation> {
    if (process.env.NODE_ENV !== "production") {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      console.log("[createInvitation] table=invitations", {
        supabaseUrlPresent: Boolean(url),
        supabaseUrlPrefix: url ? url.slice(0, 30) : "(missing)",
        clientExists: Boolean(this.client),
      });
    }

    const token = crypto.randomUUID();
    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const invitation: Invitation = {
      id: crypto.randomUUID(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      childId: input.childId,
      invitedBy,
      inviterEmail,
      status: "pending",
      token,
      expiresAt,
      createdAt: now,
    };

    // Optimistic update to sent list only — never to received.
    this._setSent([...this._sent, invitation]);

    const { error } = await this.client.from("invitations").insert({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      child_id: invitation.childId ?? null,
      invited_by: invitedBy,
      inviter_email: inviterEmail ?? null,
      token: invitation.token,
      status: invitation.status,
      expires_at: invitation.expiresAt,
    });

    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[createInvitation] insert error:", {
          name: (error as { name?: string }).name,
          message: error.message,
          details: (error as { details?: string }).details,
          code: (error as { code?: string }).code,
        });
      }
      warnRepo("SupabaseInvitationRepository.createInvitation", new QueryError("invitations", "insert", error));
      this._setSent(this._sent.filter((i) => i.id !== invitation.id));
      if (isNetworkError(error)) {
        throw new Error("ไม่สามารถเชื่อมต่อ Supabase ได้ กรุณาตรวจสอบการตั้งค่า/เครือข่าย");
      }
      throw new Error(error.message);
    }

    return invitation;
  }

  async acceptInvitation(token: string): Promise<void> {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    if (process.env.NODE_ENV !== "production") {
      console.log("[acceptInvitation]", {
        tokenPrefix: token.slice(0, 8),
        userId: user.id,
        emailPresent: Boolean(user.email),
      });
    }

    const { error } = await this.client.rpc("accept_invitation_with_access", {
      p_token: token,
      p_user_id: user.id,
    });

    if (error) {
      warnRepo("SupabaseInvitationRepository.acceptInvitation", new QueryError("invitations", "rpc:accept", error));
      throw new Error(error.message);
    }

    this.rehydrate();
  }

  async submitGuardianRequest(token: string, name: string, relationship: string): Promise<void> {
    const { error } = await this.client.rpc("submit_first_guardian_request", {
      p_token: token,
      p_name: name,
      p_relationship: relationship,
    });
    if (error) throw new Error(error.message);
    this.rehydrate();
  }

  async revokeInvitation(id: string): Promise<void> {
    const prevSent = this._sent;
    this._setSent(
      this._sent.map((i) => (i.id === id ? { ...i, status: "revoked" } : i)),
    );

    const { error } = await this.client
      .from("invitations")
      .update({ status: "revoked" })
      .eq("id", id);

    if (error) {
      warnRepo("SupabaseInvitationRepository.revokeInvitation", new QueryError("invitations", "update", error));
      this._setSent(prevSent);
      throw new Error(error.message);
    }
  }

  // ── Session boundary ─────────────────────────────────────────────────────────

  public reset(): void {
    this._hydrateGen++;
    this._hydrated = false;
    this._hydratePromise = null;
    this._sent = SERVER_INVITATIONS;
    this._received = SERVER_INVITATIONS;
    this._notify();
  }

  public rehydrate(): void {
    this._hydrated = false;
    this._hydratePromise = null;
    this._hydrateGen++;
    this._triggerHydrate();
  }

  public setScope(_userId: string | null): void {
    // Scope is handled via RLS (auth.uid()); no local filter needed.
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private _setSent(invitations: Invitation[]): void {
    this._sent = invitations;
    this._notify();
  }

  private _notify(): void {
    this._listeners.forEach((cb) => cb());
  }

  private _triggerHydrate(): void {
    if (this._hydratePromise) return;
    this._hydratePromise = this._hydrate().catch((err) => {
      warnRepo("SupabaseInvitationRepository._hydrate", err);
    });
  }

  private async _hydrate(): Promise<void> {
    const myGen = this._hydrateGen;

    const { data: { user } } = await this.client.auth.getUser();
    if (!user || this._hydrateGen !== myGen) return;

    const userEmail = user.email?.toLowerCase() ?? null;

    // Two strict queries — each side is filtered explicitly so RLS does not
    // accidentally fold the OTHER set into the result.
    const sentP = this.client
      .from("invitations")
      .select("*")
      .eq("invited_by", user.id)
      .order("created_at", { ascending: false });

    const receivedP = userEmail
      ? this.client
          .from("invitations")
          .select("*")
          .eq("email", userEmail)
          .eq("requires_teacher_approval", false)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[], error: null });

    const [sentRes, receivedRes, guardianRes] = await Promise.all([
      sentP, receivedP, this.client.rpc("list_received_guardian_invites"),
    ]);

    if (this._hydrateGen !== myGen) return;

    if (sentRes.error) {
      warnRepo("SupabaseInvitationRepository._hydrate:sent",
        new QueryError("invitations", "select", sentRes.error));
    } else {
      this._sent = (sentRes.data ?? []).map(dbToDomainInvitation);
    }

    if (receivedRes.error) {
      warnRepo("SupabaseInvitationRepository._hydrate:received",
        new QueryError("invitations", "select", receivedRes.error));
    }
    if (guardianRes.error) {
      warnRepo("SupabaseInvitationRepository._hydrate:guardian",
        new QueryError("invitations", "rpc:list_received_guardian_invites", guardianRes.error));
    }
    this._received = [...(receivedRes.data ?? []), ...(guardianRes.data ?? [])]
      .map(dbToDomainInvitation)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    this._hydrated = true;
    this._notify();
  }

}
