"use client";

import { useEffect, useState } from "react";
import { useChildAccess } from "@/hooks/useChildAccess";
import type { ChildProfileData } from "@/lib/child-profile/childProfileStorage";
import { getSupabaseClient } from "@/lib/supabase/client";
import ShareGuardianInvitation from "@/components/layout/ShareGuardianInvitation";
import SchoolGuardianMembers from "@/components/layout/SchoolGuardianMembers";
import type { Database } from "@/types/supabase";
import type { DbInvitation } from "@/types/database";

type Review = Database["public"]["Functions"]["list_guardian_review_requests"]["Returns"][number];

const avatars = ["🧒", "🐱", "🐻", "🐰", "🦊", "🐼"];

export default function SharedGuardianSettings({ child }: { child: ChildProfileData }) {
  const childId = child.id;
  const { refreshChildAccess } = useChildAccess();
  const client = getSupabaseClient();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [invitation, setInvitation] = useState<Pick<DbInvitation, "id" | "email" | "token">>();
  const [email, setEmail] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!client) return;
    let active = true;
    void client.rpc("list_guardian_review_requests", { p_child_id: childId }).then(({ data, error }) => {
      if (!active) return;
      if (error) setError("โหลดคำขอไม่สำเร็จ");
      else setReviews(data);
    });
    return () => { active = false; };
  }, [client, childId, refresh]);

  if (!client) return null;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setRefresh((value) => value + 1);
      setBusy(false);
    }
  }

  const pending = reviews.filter((review) => review.status === "pending");
  const decided = reviews.filter((review) => review.status !== "pending");

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <p className="text-sm font-semibold">{child.avatarEmoji} {child.name}</p>
      <details className="space-y-2 text-sm">
        <summary className="cursor-pointer font-semibold">แก้ชื่อเล่นและรูปประจำตัว</summary>
        <form key={`${child.nickname}:${child.avatarEmoji}`} className="flex flex-wrap items-end gap-2 pt-2"
          onSubmit={(event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            void run(async () => {
              const { error } = await client.rpc("update_guardian_child_display", {
                p_child_id: childId,
                p_nickname: String(values.get("nickname")),
                p_avatar: String(values.get("avatar")),
              });
              if (error) throw new Error(error.message);
              await refreshChildAccess?.();
            });
          }}>
          <label className="min-w-44 flex-1">ชื่อเล่น
            <input name="nickname" maxLength={60} defaultValue={child.nickname ?? ""}
              className="block w-full rounded-lg border border-border bg-bg px-3 py-2" />
          </label>
          <label>รูปประจำตัว
            <select name="avatar" defaultValue={child.avatarEmoji || avatars[0]}
              className="block rounded-lg border border-border bg-bg px-3 py-2">
              {[...new Set([child.avatarEmoji || avatars[0], ...avatars])].map((avatar) => (
                <option key={avatar} value={avatar}>{avatar}</option>
              ))}
            </select>
          </label>
          <button disabled={busy} className="rounded-lg border border-border px-3 py-2 font-semibold text-primary disabled:opacity-50">
            บันทึก
          </button>
        </form>
      </details>
      <SchoolGuardianMembers childId={childId} mode="guardian" revision={refresh} />
      <form className="flex flex-wrap items-end gap-2 border-t border-border pt-4" onSubmit={(event) => {
        event.preventDefault();
        void run(async () => {
          const { data, error } = await client.rpc("create_guardian_invite", { p_child_id: childId, p_email: email });
          if (error) throw new Error(error.message);
          setInvitation(data);
        });
      }}>
        <label className="min-w-48 flex-1 text-sm">อีเมลผู้ปกครองร่วม (ไม่บังคับ)
          <input type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2" />
        </label>
        <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          สร้างลิงก์เชิญ
        </button>
      </form>
      {invitation && !reviews.some((review) => review.id === invitation.id) &&
        <ShareGuardianInvitation key={invitation.id} invitation={invitation} />}

      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">คำขอรอตรวจ ({pending.length})</h4>
          <button disabled={busy} className="text-xs font-semibold text-primary" onClick={() => {
            setError("");
            setRefresh((value) => value + 1);
          }}>โหลดคำขอล่าสุด</button>
        </div>
        {error && <p role="alert" className="rounded-lg bg-error/10 p-3 text-sm text-error">{error}</p>}
        {pending.map((request) => (
          <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
            <div>
              <p className="font-semibold">{request.requester_name} · {request.requester_relationship}</p>
              <p className="break-all text-xs text-text-muted">{request.email}</p>
            </div>
            <div className="flex gap-2">
              {[true, false].map((approve) => (
                <button key={String(approve)} disabled={busy}
                  className={approve ? "rounded-lg bg-primary px-3 py-1.5 text-white disabled:opacity-50" : "rounded-lg border border-border px-3 py-1.5 disabled:opacity-50"}
                  onClick={() => void run(async () => {
                    const { error } = await client.rpc("review_first_guardian_request", {
                      p_invitation_id: request.id, p_approve: approve,
                    });
                    if (error) throw new Error(error.message);
                  })}>{approve ? "อนุมัติ" : "ไม่อนุมัติ"}</button>
              ))}
            </div>
          </div>
        ))}
        {decided.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold">ผลคำขอที่ผ่านมา</summary>
            <ul className="mt-2 space-y-2">
              {decided.map((request) => (
                <li key={request.id} className="rounded-lg border border-border px-3 py-2">
                  {request.requester_name} · {request.status === "accepted" ? "อนุมัติแล้ว" : request.accepted_at ? "ยกเลิกการเชื่อมแล้ว" : "ไม่ได้รับอนุมัติ"}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
