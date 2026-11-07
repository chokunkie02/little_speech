import type { IChildAccessRepository } from "@/lib/repositories/IChildAccessRepository";
import type { ChildAccess, GrantChildAccessInput, ChildPermissions } from "@/types/childAccess";
import { ROLE_DEFAULT_PERMISSIONS } from "@/types/childAccess";
import type { SupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import { dbToDomainChildAccess, dbPermissions, dbToDomainProfile } from "./mappers";
import { QueryError, warnRepo } from "./errors";

const SERVER_GRANTS: ChildAccess[] = [];

/**
 * Supabase-backed implementation of IChildAccessRepository.
 *
 * Cache strategy:
 *  • On subscribe(), hydrates both received and issued grants for the current user.
 *  • All writes do optimistic cache updates followed by Supabase queries.
 *  • RLS policies:
 *      - "grantee can read own grant" → listReceivedGrants (user_id = auth.uid())
 *      - "child owner can manage grants" → listIssuedGrants (child owner)
 *
 * Note: grantChildAccess normally runs via accept_invitation_with_access RPC
 * (which creates the DB row atomically). This method provides a direct-insert
 * fallback for programmatic use.
 */
export class SupabaseChildAccessRepository implements IChildAccessRepository {
  private _received: ChildAccess[] = SERVER_GRANTS;
  private _issued: ChildAccess[] = SERVER_GRANTS;
  private readonly _listeners = new Set<() => void>();
  private _hydrated = false;
  private _hydratePromise: Promise<void> | null = null;
  private _hydrateGen = 0;

  constructor(private readonly client: SupabaseClient<Database>) {}

  // ── useSyncExternalStore plumbing ──────────────────────────────────────────

  listReceivedGrants(): ChildAccess[] {
    return this._received;
  }

  getServerReceivedGrants(): ChildAccess[] {
    return SERVER_GRANTS;
  }

  listIssuedGrants(): ChildAccess[] {
    return this._issued;
  }

  subscribe(callback: () => void): () => void {
    this._listeners.add(callback);
    this._triggerHydrate();
    return () => {
      this._listeners.delete(callback);
    };
  }

  // ── Write operations ──────────────────────────────────────────────────────────

  async grantChildAccess(input: GrantChildAccessInput): Promise<ChildAccess> {
    const permissions = { ...ROLE_DEFAULT_PERMISSIONS[input.role], ...input.permissions };
    const grant: ChildAccess = {
      id: crypto.randomUUID(),
      childId: input.childId,
      userId: input.userId,
      role: input.role,
      permissions,
      grantedBy: input.grantedBy,
      createdAt: new Date().toISOString(),
      childSnapshot: input.childSnapshot,
    };

    // Optimistic update to received list if userId matches; otherwise to issued
    const { data: { user } } = await this.client.auth.getUser();
    if (user?.id === input.userId) {
      this._received = [...this._received.filter((g) => !(g.childId === grant.childId && g.userId === grant.userId)), grant];
    }
    this._issued = [...this._issued.filter((g) => !(g.childId === grant.childId && g.userId === grant.userId)), grant];
    this._notify();

    const { error } = await this.client.from("child_access").upsert(
      {
        id: grant.id,
        child_id: grant.childId,
        user_id: grant.userId,
        role: grant.role,
        granted_by: grant.grantedBy,
        can_view_progress:   permissions.canViewProgress,
        can_view_audio:      permissions.canViewAudio,
        can_assign_practice: permissions.canAssignPractice,
        can_edit_child:      permissions.canEditChild,
        can_export_report:   permissions.canExportReport,
      },
      { onConflict: "child_id,user_id", ignoreDuplicates: false },
    );

    if (error) {
      warnRepo("SupabaseChildAccessRepository.grantChildAccess", new QueryError("child_access", "upsert", error));
      // Don't throw — the accept_invitation_with_access RPC already created the row
    }

    return grant;
  }

  async revokeChildAccess(grantId: string): Promise<void> {
    const { error } = await this.client.rpc("revoke_child_access", { p_access_id: grantId });
    if (error) {
      warnRepo("SupabaseChildAccessRepository.revokeChildAccess", new QueryError("child_access", "rpc:revoke", error));
      throw new Error(error.message);
    }

    const revokedAt = new Date().toISOString();
    this._received = this._received.filter((grant) => grant.id !== grantId);
    this._issued = this._issued.map((grant) =>
      grant.id === grantId ? { ...grant, revokedAt } : grant,
    );
    this._notify();
    void this.rehydrate();
  }

  async updateChildPermissions(
    grantId: string,
    permissions: Partial<ChildPermissions>,
  ): Promise<void> {
    const update: {
      can_view_progress?:   boolean;
      can_view_audio?:      boolean;
      can_assign_practice?: boolean;
      can_edit_child?:      boolean;
      can_export_report?:   boolean;
    } = {};
    if (permissions.canViewProgress   !== undefined) update.can_view_progress   = permissions.canViewProgress;
    if (permissions.canViewAudio      !== undefined) update.can_view_audio      = permissions.canViewAudio;
    if (permissions.canAssignPractice !== undefined) update.can_assign_practice = permissions.canAssignPractice;
    if (permissions.canEditChild      !== undefined) update.can_edit_child      = permissions.canEditChild;
    if (permissions.canExportReport   !== undefined) update.can_export_report   = permissions.canExportReport;

    const applyToGrant = (g: ChildAccess): ChildAccess =>
      g.id === grantId ? { ...g, permissions: { ...g.permissions, ...permissions } } : g;
    this._received = this._received.map(applyToGrant);
    this._issued = this._issued.map(applyToGrant);
    this._notify();

    const { error } = await this.client
      .from("child_access")
      .update(update)
      .eq("id", grantId);

    if (error) {
      warnRepo("SupabaseChildAccessRepository.updateChildPermissions", new QueryError("child_access", "update", error));
      throw new Error(error.message);
    }
  }

  // ── Session boundary ─────────────────────────────────────────────────────────

  public reset(): void {
    this._hydrateGen++;
    this._hydrated = false;
    this._hydratePromise = null;
    this._received = SERVER_GRANTS;
    this._issued = SERVER_GRANTS;
    this._notify();
  }

  public rehydrate(): Promise<void> {
    this._hydrated = false;
    this._hydratePromise = null;
    this._hydrateGen++;
    return this._triggerHydrate();
  }

  public setScope(_userId: string | null): void {
    // Scope handled via RLS
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private _notify(): void {
    this._listeners.forEach((cb) => cb());
  }

  private _triggerHydrate(): Promise<void> {
    if (this._hydratePromise) return this._hydratePromise;
    this._hydratePromise = this._hydrate().catch((err) => {
      warnRepo("SupabaseChildAccessRepository._hydrate", err);
    });
    return this._hydratePromise;
  }

  private async _hydrate(): Promise<void> {
    const myGen = this._hydrateGen;

    const { data: { user } } = await this.client.auth.getUser();
    if (!user || this._hydrateGen !== myGen) return;

    // Fetch grants received by current user (active only)
    const { data: received, error: recErr } = await this.client
      .from("child_access")
      .select("*")
      .eq("user_id", user.id)
      .is("revoked_at", null);

    // Fetch grants issued by current user (all)
    const { data: issued, error: issErr } = await this.client
      .from("child_access")
      .select("*")
      .eq("granted_by", user.id);

    if (this._hydrateGen !== myGen) return;

    if (recErr) warnRepo("SupabaseChildAccessRepository._hydrate:received", new QueryError("child_access", "select", recErr));
    if (issErr) warnRepo("SupabaseChildAccessRepository._hydrate:issued",   new QueryError("child_access", "select", issErr));

    const receivedBase = (received ?? []).map((row) => ({
      ...dbToDomainChildAccess(row),
      permissions: dbPermissions(row),
    }));
    const issuedBase = (issued ?? []).map((row) => ({
      ...dbToDomainChildAccess(row),
      permissions: dbPermissions(row),
    }));

    // Hydrate childSnapshot for received grants so shared children appear in
    // ChildSelector. The "child_profiles: grantee select" RLS policy permits
    // this fetch via the is_child_grantee() helper.
    const childIds = Array.from(
      new Set(
        receivedBase
          .filter((g) => !g.revokedAt)
          .map((g) => g.childId),
      ),
    );

    if (childIds.length > 0) {
      const { data: profileRows, error: profErr } = await this.client
        .from("child_profiles")
        .select("*")
        .in("id", childIds);

      if (this._hydrateGen !== myGen) return;

      if (profErr) {
        warnRepo("SupabaseChildAccessRepository._hydrate:childProfiles",
          new QueryError("child_profiles", "select", profErr));
      } else {
        const snapshots = new Map(
          (profileRows ?? []).map((row) => [row.id, dbToDomainProfile(row)]),
        );
        for (let i = 0; i < receivedBase.length; i++) {
          const snap = snapshots.get(receivedBase[i].childId);
          if (snap) receivedBase[i] = { ...receivedBase[i], childSnapshot: snap };
        }
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.debug("[SupabaseChildAccessRepository._hydrate]", {
        receivedCount: receivedBase.length,
        receivedWithSnapshot: receivedBase.filter((g) => g.childSnapshot).length,
        issuedCount: issuedBase.length,
      });
    }

    this._received = receivedBase;
    this._issued = issuedBase;
    this._hydrated = true;
    this._notify();
  }
}
