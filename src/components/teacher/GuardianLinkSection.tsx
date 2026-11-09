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
  nickname: string | null;
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
    client.from("child_profiles").select("id,name,nickname,student_code").in("id", ids)
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
    invitations: (invites.data ?? []).map((invite) =>
      invite.status === "pending" && !invite.requested_at && Date.parse(invite.expires_at) <= now
        ? { ...invite, status: "expired" }
        : invite,
    ),
    linkedStudentIds: new Set(guardians.data?.map((guardian) => guardian.child_id)),
  };
}

export default function GuardianLinkSection({ classroomId, classroomName }: { classroomId: string; classroomName: string }) {
  const { school } = useRepositories();
  const client = isSupabaseProviderRequested() ? getSupabaseClient() : null;
  const [room, setRoom] = useState<RoomData>();
  const [query, setQuery] = useState("");
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

  const term = query.trim().normalize("NFC").toLocaleLowerCase("th");
  const visibleStudents = (room?.students ?? []).filter((student) =>
    [student.name, student.nickname, student.student_code].some((value) => value?.normalize("NFC").toLocaleLowerCase("th").includes(term)),
  );
  const selectedStudent = visibleStudents.find((student) => student.id === selectedId) ?? (!term ? visibleStudents[0] : undefined);
  const childId = selectedStudent?.id;
  const currentInvites = room?.invitations.filter((invitation) => invitation.child_id === childId) ?? [];
  const linked = !!childId && room?.linkedStudentIds.has(childId);
  const decided = currentInvites.filter((invite) => !invite.inbox_direct && invite.requested_at && invite.status !== "pending");
  const names = new Map(room?.students.map((student) => [student.id, student.name]));
  const requests = room?.invitations.filter((invitation) =>
    invitation.status === "pending" && invitation.requested_at && names.has(invitation.child_id ?? ""),
  ) ?? [];

  return (
    <section aria-label="เชื่อมผู้ปกครอง" className="space-y-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">นักเรียนและคำเชิญผู้ปกครอง</h3>
        <div className="flex gap-2">
          <button className={secondaryClass} disabled={busy} onClick={() => {
            setError("");
            setRefresh((value) => value + 1);
          }}>โหลดล่าสุด</button>
          <button className={addingStudent ? secondaryClass : primaryClass} disabled={busy} onClick={() => setAddingStudent(!addingStudent)}>
            {addingStudent ? "ปิดฟอร์ม" : "เพิ่มนักเรียน"}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg bg-error/10 p-3 text-sm text-error">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-success/10 p-3 text-sm">{notice}</p>}

      {requests.length > 0 && (
      <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/8 p-3">
        <h4 className="text-sm font-semibold">คำขอรอตรวจ ({requests.length})</h4>
        {requests.map((request) => (
          <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
            <div className="space-y-1 text-sm">
              <p className="font-semibold">นักเรียน {names.get(request.child_id ?? "")}</p>
              <p>{request.requester_name} · {request.requester_relationship}</p>
              <p className="text-text-muted break-all">{request.email}</p>
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
      )}

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
          <h4 className="font-semibold sm:col-span-2">ข้อมูลนักเรียนใหม่ · {classroomName}</h4>
          <label className="text-sm">ชื่อและนามสกุล<input required maxLength={120} name="name" className={inputClass} /></label>
          <label className="text-sm">ชื่อเล่น<input maxLength={60} name="nickname" className={inputClass} /></label>
          <label className="text-sm">รหัสนักเรียน<input required maxLength={40} name="studentCode" className={inputClass} /></label>
          <label className="text-sm">อายุ<input required type="number" min={1} max={18} name="age" className={inputClass} /></label>
          <div className="sm:col-span-2"><button className={primaryClass} disabled={busy}>บันทึกนักเรียน</button></div>
        </form>
      )}

      {!!room?.students.length && (
        <div className="space-y-2">
          <label className="block text-sm">ค้นหานักเรียนด้วยชื่อ ชื่อเล่น หรือรหัส
            <input type="search" className={inputClass} value={query} onChange={(event) => {
              setQuery(event.target.value); setSelectedId(""); setEmail("");
            }} />
          </label>
          {visibleStudents.length === 0 ? <p role="status" className="text-sm text-text-muted">ไม่พบนักเรียนที่ตรงกับคำค้น</p> :
            <ul className="max-h-56 space-y-1 overflow-auto">{visibleStudents.map((student) => <li key={student.id}>
              <button type="button" aria-pressed={childId === student.id} className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm aria-pressed:bg-primary/10"
                onClick={() => { setSelectedId(student.id); setEmail(""); setNotice(""); setError(""); }}>
                <span className="block font-semibold">{student.name}</span>
                <span className="text-xs text-text-muted">{[student.student_code, student.nickname, classroomName].filter(Boolean).join(" · ")}</span>
              </button>
            </li>)}</ul>}
        </div>
      )}
      {selectedStudent && childId && (
        <div className="space-y-3 rounded-xl border border-border bg-bg p-4">
          <h4 className="font-semibold">เชิญผู้ปกครองของ {selectedStudent.name}</h4>
          <p className="text-xs text-text-muted">{classroomName} · {selectedStudent.student_code}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link className={secondaryClass} href={`/progress?child=${encodeURIComponent(childId)}`}>
              ดูความก้าวหน้า
            </Link>
            {linked && <p className="text-sm text-success">เชื่อมผู้ปกครองแล้ว</p>}
          </div>
          <form className="flex flex-wrap items-end gap-2 border-t border-border pt-3" onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              const { error } = await client.rpc("send_guardian_inbox_invite", { p_child_id: childId, p_email: email });
              if (error) throw new Error(error.message);
              setEmail("");
            }, "ส่งคำเชิญแล้ว · รอตอบรับ");
          }}>
            <label className="min-w-0 flex-[1_1_13rem] text-sm">อีเมลผู้ปกครอง
              <input className={inputClass} type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <button className={primaryClass} disabled={busy}>ส่งคำเชิญ</button>
          </form>
          {currentInvites.some((invite) => invite.inbox_direct) && <ul className="space-y-2">
            {currentInvites.filter((invite) => invite.inbox_direct).map((invite) => {
              const pending = invite.status === "pending";
              const label = pending ? "รอตอบรับ" : invite.status === "accepted" ? "ตอบรับแล้ว" : invite.status === "revoked" ? "ยกเลิกแล้ว" : "หมดอายุ";
              return <li key={invite.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm">
                <span className="break-all">{invite.email} · {label}</span>
                {pending && <button className={secondaryClass} disabled={busy} onClick={() => void run(async () => {
                  const { error } = await client.rpc("revoke_guardian_inbox_invite", { p_invitation_id: invite.id });
                  if (error) throw new Error(error.message);
                }, "ยกเลิกคำเชิญแล้ว")}>ยกเลิกคำเชิญ</button>}
              </li>;
            })}
          </ul>}
          {currentInvites.filter((invite) =>
            !invite.inbox_direct && invite.status === "pending" && !invite.requested_at,
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
      {room?.students.length === 0 && <p className="text-sm text-text-muted">เพิ่มนักเรียนในห้องก่อนส่งคำเชิญ</p>}

    </section>
  );
}
