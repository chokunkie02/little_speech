"use client";

import { useState, useCallback, useEffect, useEffectEvent, useMemo } from "react";
import { useSchool } from "@/hooks/useSchool";
import { useChildAccess } from "@/hooks/useChildAccess";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useAuth } from "@/hooks/useAuth";
import type { ChildAccess, ChildPermissions } from "@/types/childAccess";
import type { UserDisplayInfo } from "@/types/school";
import { ACCESS_ROLE_LABELS } from "@/types/childAccess";
import { Avatar } from "@/components/ui";

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DashIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ── Permission chips ──────────────────────────────────────────────────────────

const PERMISSION_LABELS: Record<keyof ChildPermissions, string> = {
  canViewProgress:   "ดูพัฒนาการ",
  canViewAudio:      "ฟังเสียง",
  canStartPractice:  "เริ่มการฝึก",
  canAssignPractice: "มอบหมายฝึก",
  canEditChild:      "แก้ไขโปรไฟล์",
  canExportReport:   "ส่งออกรายงาน",
};

interface PermissionChipsProps {
  permissions: ChildPermissions;
  editable: boolean;
  onToggle?: (key: keyof ChildPermissions, value: boolean) => void;
}

function PermissionChips({ permissions, editable, onToggle }: PermissionChipsProps) {
  const entries = Object.keys(PERMISSION_LABELS) as (keyof ChildPermissions)[];
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map((key) => {
        const on = permissions[key];
        const baseClass = "inline-flex min-h-7 items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors";
        const stateClass = on
          ? "bg-success/10 text-success-text border-success/20"
          : "bg-border/40 text-text-muted border-border";
        const clickableClass = editable ? " hover:scale-[1.02] cursor-pointer" : "";
        return (
          <button
            key={key}
            type="button"
            disabled={!editable}
            onClick={() => editable && onToggle?.(key, !on)}
            className={`${baseClass} ${stateClass}${clickableClass} disabled:cursor-default`}
            aria-pressed={on}
          >
            <span className="flex-shrink-0">{on ? <CheckIcon /> : <DashIcon />}</span>
            {PERMISSION_LABELS[key]}
          </button>
        );
      })}
    </div>
  );
}

// ── Section 3: Active Child Access (grouped by child) ─────────────────────────

interface MemberCardProps {
  grant: ChildAccess;
  email: string;
  onRevoke: () => Promise<void>;
  onUpdatePermission: (key: keyof ChildPermissions, value: boolean) => Promise<void>;
}

function MemberCard({ grant, email, onRevoke, onUpdatePermission }: MemberCardProps) {
  const [editing, setEditing] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevokeClick() {
    setBusy(true);
    setError(null);
    try {
      await onRevoke();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ถอนสิทธิ์ไม่สำเร็จ");
    } finally {
      setBusy(false);
      setConfirmRevoke(false);
    }
  }

  async function handleToggle(key: keyof ChildPermissions, value: boolean) {
    setError(null);
    try {
      await onUpdatePermission(key, value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกสิทธิ์ไม่สำเร็จ");
    }
  }

  return (
    <div className="bg-surface border border-border rounded-[1rem] p-4 space-y-3 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 min-w-0 items-center gap-3">
          <Avatar name={email} />
          <div className="min-w-0 space-y-0.5">
            <p className="font-display text-[0.9375rem] font-medium text-text truncate">{email}</p>
            <p className="text-xs text-text-muted">{ACCESS_ROLE_LABELS[grant.role]}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {confirmRevoke ? (
            <>
              <button
                onClick={() => void handleRevokeClick()}
                disabled={busy}
                className="px-2.5 py-1.5 rounded-lg bg-error text-error-foreground text-xs font-semibold hover:bg-error/90 disabled:opacity-40 transition-all"
              >
                {busy ? "…" : "ยืนยัน"}
              </button>
              <button
                onClick={() => setConfirmRevoke(false)}
                className="px-2.5 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:text-text transition-all"
              >
                ยกเลิก
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing((v) => !v)}
                className="px-2.5 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:text-text hover:border-primary/30 transition-all"
              >
                {editing ? "เสร็จ" : "แก้สิทธิ์"}
              </button>
              <button
                onClick={() => setConfirmRevoke(true)}
                className="px-2.5 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:text-error hover:border-error/30 transition-all"
              >
                ถอนสิทธิ์
              </button>
            </>
          )}
        </div>
      </div>

      <PermissionChips permissions={grant.permissions} editable={editing} onToggle={handleToggle} />

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

export function ChildAccessSection() {
  const { profiles } = useChildProfile();
  const { issuedGrants, revokeChildAccess, updateChildPermissions } = useChildAccess();
  const { resolveUserDisplays } = useSchool();
  const [people, setPeople] = useState<Map<string, UserDisplayInfo>>(new Map());
  const { isAuthenticated } = useAuth();

  const active = useMemo(() => issuedGrants.filter((g) => !g.revokedAt), [issuedGrants]);

  // Group active grants by childId
  const grouped = useMemo(() => {
    const map = new Map<string, ChildAccess[]>();
    for (const g of active) {
      const list = map.get(g.childId);
      if (list) list.push(g);
      else map.set(g.childId, [g]);
    }
    return map;
  }, [active]);

  // Names of the people who joined with the family code (account_profiles → user_display_profiles).
  const userIds = useMemo(() => [...new Set(active.map((grant) => grant.userId))].sort().join(","), [active]);
  const resolve = useEffectEvent((ids: string[]) => resolveUserDisplays(ids));
  useEffect(() => {
    if (!userIds) return;
    let current = true;
    resolve(userIds.split(",")).then((map) => { if (current) setPeople(map); }).catch(() => {});
    return () => { current = false; };
  }, [userIds]);
  const memberEmail = useCallback(
    (grant: ChildAccess): string => {
      const person = people.get(grant.userId);
      return person?.displayName || person?.email || "ผู้ใช้ที่เข้าร่วมด้วยรหัสชวน";
    },
    [people],
  );

  // Child name lookup: prefer owned profile, fall back to snapshot, else id prefix.
  const childName = useCallback(
    (childId: string): string => {
      const owned = profiles.find((p) => p.id === childId);
      if (owned) return owned.name;
      const snap = active.find((g) => g.childId === childId)?.childSnapshot;
      return snap?.name ?? `เด็ก ${childId.slice(0, 6)}`;
    },
    [profiles, active],
  );

  if (!isAuthenticated) return null;

  if (active.length === 0) {
    return (
      <p className="text-sm text-text-muted text-center py-4">
        ยังไม่มีสมาชิกที่เข้าถึงเด็ก — เริ่มต้นด้วยการส่งคำเชิญ
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {[...grouped.entries()].map(([childId, grants]) => (
        <div key={childId} className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="font-display text-base font-medium text-text">{childName(childId)}</h4>
            <span className="text-xs text-text-muted">
              {grants.length} คน
            </span>
          </div>
          <div className="space-y-2">
            {grants.map((g) => (
              <MemberCard
                key={g.id}
                grant={g}
                email={memberEmail(g)}
                onRevoke={() => revokeChildAccess(g.id)}
                onUpdatePermission={(k, v) => updateChildPermissions(g.id, { [k]: v })}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
