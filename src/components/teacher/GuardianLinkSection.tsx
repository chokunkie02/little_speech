"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ShareGuardianInvitation from "@/components/layout/ShareGuardianInvitation";
import SchoolGuardianMembers from "@/components/layout/SchoolGuardianMembers";
import { useRepositories } from "@/lib/providers/RepositoryProvider";
import { isSupabaseProviderRequested } from "@/lib/config/storageProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { DbInvitation } from "@/types/database";

const inputClass = "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm";
const primaryClass = "rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";
const secondaryClass = "rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary disabled:opacity-40";

interface Student {
  id: string;
  name: string;
  student_code: string | null;
}

interface RoomData {
  students: Student[];
  invitations: DbInvitation[];
  linkedStudentIds: Set<string>;
}

async function loadRoom(classroomId: string): Promise<RoomData> {
  const client = getSupabaseClient();
  if (!client) throw new Error("กรุณาเชื่อมต่อบัญชีออนไลน์");
  const { data: members, error } = await client.from("classroom_students")
    .select("child_id").eq("classroom_id", classroomId);
  if (error) throw new Error(error.message);
  const ids = members.map((member) => member.child_id);
  if (!ids.length) return { students: [], invitations: [], linkedStudentIds: new Set() };

  const [students, invites, guardians] = await Promise.all([
    client.from("child_profiles").select("id,name,student_code").in("id", ids)
      .is("archived_at", null).order("name"),
    client.from("invitations").select("*").in("child_id", ids)
      .eq("requires_teacher_approval", true).order("created_at", { ascending: false }),
    client.from("child_access").select("child_id").in("child_id", ids)
      .eq("role", "guardian").is("revoked_at", null),
  ]);
  const loadError = students.error ?? invites.error ?? guardians.error;
  if (loadError) throw new Error(loadError.message);
  const now = Date.now();
  return {
    students: students.data ?? [],
    invitations: (invites.data ?? []).filter((invite) =>
      invite.status !== "pending" || invite.requested_at || Date.parse(invite.expires_at) > now,
    ),
    linkedStudentIds: new Set(guardians.data?.map((guardian) => guardian.child_id)),
  };
}

export default function GuardianLinkSection({ classroomId }: { classroomId: string }) {
  const { school } = useRepositories();
  const client = isSupabaseProviderRequested() ? getSupabaseClient() : null;
  const [room, setRoom] = useState<RoomData>();
  const [selectedId, setSelectedId] = useState("");
  const [email, setEmail] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!client) return;
    let active = true;
    void loadRoom(classroomId).then(
      (data) => { if (active) setRoom(data); },
      () => { if (active) setError("โหลดข้อมูลห้องเรียนไม่สำเร็จ กรุณากดโหลดล่าสุด"); },
    );
    return () => { active = false; };
  }, [classroomId, client, refresh]);

  if (!client) return null;

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
      setRefresh((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }

  const childId = room?.students.find((student) => student.id === selectedId)?.id ?? room?.students[0]?.id;
  const currentInvites = room?.invitations.filter((invitation) => invitation.child_id === childId) ?? [];
  const linked = !!childId && room?.linkedStudentIds.has(childId);
  const decided = currentInvites.filter((invite) => invite.requested_at && invite.status !== "pending");
  const names = new Map(room?.students.map((student) => [student.id, student.name]));
  const requests = room?.invitations.filter((invitation) =>
    invitation.status === "pending" && invitation.requested_at && names.has(invitation.child_id ?? ""),
  ) ?? [];

  return (
    <section aria-label="เชื่อมผู้ปกครอง" className="space-y-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">เชื่อมผู้ปกครอง</h3>
        <div className="flex gap-2">
          <button className={secondaryClass} disabled={busy} onClick={() => {
            setError("");
            setRefresh((value) => value + 1);
          }}>โหลดล่าสุด</button>
          <button className={secondaryClass} disabled={busy} onClick={() => setAddingStudent(!addingStudent)}>
            {addingStudent ? "ปิดฟอร์ม" : "เพิ่มนักเรียน"}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg bg-error/10 p-3 text-sm text-error">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-success/10 p-3 text-sm">{notice}</p>}

      {addingStudent && (
        <form className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2" onSubmit={(event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          void run(async () => {
            const { data, error } = await client.rpc("create_teacher_student", {
              p_classroom_id: classroomId,
              p_name: String(fields.get("name")),
              p_student_code: String(fields.get("studentCode")),
              p_age: Number(fields.get("age")),
              p_nickname: String(fields.get("nickname")),
            });
            if (error) throw new Error(error.message);
            school?.rehydrate?.();
            setSelectedId(data);
            setAddingStudent(false);
          }, "เพิ่มนักเรียนแล้ว");
        }}>
          <label className="text-sm">ชื่อและนามสกุล<input required maxLength={120} name="name" className={inputClass} /></label>
          <label className="text-sm">ชื่อเล่น<input maxLength={60} name="nickname" className={inputClass} /></label>
          <label className="text-sm">รหัสนักเรียน<input required maxLength={40} name="studentCode" className={inputClass} /></label>
          <label className="text-sm">อายุ<input required type="number" min={1} max={18} name="age" className={inputClass} /></label>
          <button className={primaryClass} disabled={busy}>บันทึกนักเรียน</button>
        </form>
      )}

      {room && childId && (
        <div className="space-y-3 rounded-xl border border-border p-3">
          <label className="block text-sm">นักเรียน
            <select className={inputClass} value={childId} onChange={(event) => {
              setSelectedId(event.target.value);
              setEmail("");
            }}>
              {room.students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}{student.student_code ? ` · ${student.student_code}` : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Link className={secondaryClass} href={`/progress?child=${encodeURIComponent(childId)}`}>
              ดูความก้าวหน้า
            </Link>
            {linked && <p className="text-sm text-success">เชื่อมผู้ปกครองแล้ว</p>}
          </div>
          <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              const { error } = await client.rpc("create_guardian_invite", { p_child_id: childId, p_email: email });
              if (error) throw new Error(error.message);
            }, "ลิงก์เชิญพร้อมใช้งาน");
          }}>
            <label className="min-w-52 flex-1 text-sm">อีเมลผู้ปกครอง (ไม่บังคับ)
              <input className={inputClass} type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <button className={primaryClass} disabled={busy}>{linked ? "เชิญผู้ปกครองร่วม" : "สร้างลิงก์เชิญ"}</button>
          </form>
          {currentInvites.filter((invite) =>
            invite.status === "pending" && !invite.requested_at && invite.is_additional_guardian === !!linked,
          ).map((invite) => (
            <div key={invite.id} className="space-y-2 border-t border-border pt-3">
              <p className="text-xs text-text-muted">{invite.email || "ลิงก์สำหรับแชร์"} · หมดอายุ {new Date(invite.expires_at).toLocaleDateString("th-TH")}</p>
              <ShareGuardianInvitation invitation={invite} />
            </div>
          ))}
          {decided.length > 0 && (
            <details className="border-t border-border pt-3 text-sm">
              <summary className="cursor-pointer font-semibold">ผลคำขอที่ผ่านมา</summary>
              <ul className="mt-2 space-y-1">
                {decided.map((invite) => (
                  <li key={invite.id}>{invite.requester_name} · {
                    invite.status === "accepted" ? "อนุมัติแล้ว" : invite.accepted_at ? "ยกเลิกการเชื่อมแล้ว" : "ไม่ได้รับอนุมัติ"
                  }</li>
                ))}
              </ul>
            </details>
          )}
          <SchoolGuardianMembers key={childId} childId={childId} mode="staff" revision={refresh} onChanged={() => setRefresh((value) => value + 1)} />
        </div>
      )}
      {room && !childId && <p className="text-sm text-text-muted">เพิ่มนักเรียนในห้องก่อนสร้างลิงก์เชิญ</p>}

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">คำขอรอตรวจ ({requests.length})</h4>
        {requests.map((request) => (
          <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{request.requester_name} · {request.requester_relationship}</p>
              <p className="text-text-muted break-all">{request.email}</p>
              <p>นักเรียน {names.get(request.child_id ?? "")}</p>
              {!request.is_additional_guardian && room?.linkedStudentIds.has(request.child_id ?? "") &&
                <p className="text-text-muted">นักเรียนเชื่อมผู้ปกครองแล้ว</p>}
            </div>
            <div className="flex gap-2">
              {[true, false].map((approve) => (
                <button key={String(approve)} className={approve ? primaryClass : secondaryClass}
                  disabled={busy || (approve && !request.is_additional_guardian && !!room?.linkedStudentIds.has(request.child_id ?? ""))}
                  onClick={() => void run(async () => {
                    const { error } = await client.rpc("review_first_guardian_request", {
                      p_invitation_id: request.id, p_approve: approve,
                    });
                    if (error) throw new Error(error.message);
                  }, approve ? "อนุมัติและเชื่อมผู้ปกครองแล้ว" : "ไม่อนุมัติคำขอแล้ว")}>
                  {approve ? "อนุมัติ" : "ไม่อนุมัติ"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
