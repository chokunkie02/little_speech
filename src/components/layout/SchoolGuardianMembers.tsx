"use client";

import { useEffect, useState } from "react";
import { useRepositories } from "@/lib/providers/RepositoryProvider";
import { useChildAccess } from "@/hooks/useChildAccess";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type Guardian = Database["public"]["Functions"]["list_school_guardian_members"]["Returns"][number];

export default function SchoolGuardianMembers({
  childId, mode, revision = 0, onChanged,
}: {
  childId: string;
  mode: "guardian" | "staff";
  revision?: number;
  onChanged?: () => void;
}) {
  const { revokeChildAccess } = useChildAccess();
  const { invitations } = useRepositories();
  const [members, setMembers] = useState<Guardian[]>();
  const [refresh, setRefresh] = useState(0);
  const [confirmId, setConfirmId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    let active = true;
    void client.rpc("list_school_guardian_members", { p_child_id: childId }).then(({ data, error }) => {
      if (!active) return;
      if (error) setError("โหลดรายชื่อผู้ปกครองไม่สำเร็จ");
      else setMembers(data);
    });
    return () => { active = false; };
  }, [childId, revision, refresh]);

  async function remove(member: Guardian) {
    setBusy(true);
    setError("");
    try {
      await revokeChildAccess(member.id);
      invitations.rehydrate?.();
      setConfirmId(undefined);
      setRefresh((value) => value + 1);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ยกเลิกการเชื่อมไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">ผู้ปกครองที่เชื่อมแล้ว{members ? ` (${members.length})` : ""}</h4>
        <button className="text-xs font-semibold text-primary" disabled={busy} onClick={() => {
          setError("");
          setRefresh((value) => value + 1);
        }}>โหลดรายชื่อล่าสุด</button>
      </div>
      {error && <p role="alert" className="text-xs text-error">{error}</p>}
      {members?.length === 0 && <p className="text-xs text-text-muted">ยังไม่มีผู้ปกครองที่เชื่อม</p>}
      {members?.map((member) => (
        <div key={member.id} className="space-y-2 rounded-lg border border-border px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="break-words font-semibold">{member.name || member.email}{member.is_self ? " (คุณ)" : ""}</p>
              <p className="break-all text-text-muted">{[member.relationship, member.name && member.email].filter(Boolean).join(" · ")}</p>
            </div>
            {(mode === "staff" || member.is_self) && confirmId !== member.id && (
              <button className="font-semibold text-error disabled:opacity-50" disabled={busy}
                onClick={() => setConfirmId(member.id)}>
                {mode === "guardian" ? "ออกจากการเชื่อม" : "ถอดสิทธิ์บัญชีนี้"}
              </button>
            )}
          </div>
          {confirmId === member.id && (
            <div className="space-y-2 rounded-lg bg-error/5 p-2">
              <p>{mode === "guardian"
                ? "บัญชีของคุณจะเปิดโปรไฟล์เด็กคนนี้ไม่ได้ ข้อมูลเด็กและผลฝึกยังอยู่กับโรงเรียน"
                : "บัญชีนี้จะเปิดโปรไฟล์เด็กคนนี้ไม่ได้ ผู้ปกครองคนอื่นยังเชื่อมได้ตามเดิม"}</p>
              <div className="flex gap-2">
                <button className="rounded-lg bg-error px-2.5 py-1.5 font-semibold text-white disabled:opacity-50"
                  disabled={busy} onClick={() => void remove(member)}>ยืนยัน</button>
                <button className="rounded-lg border border-border px-2.5 py-1.5" disabled={busy}
                  onClick={() => setConfirmId(undefined)}>ยกเลิก</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
