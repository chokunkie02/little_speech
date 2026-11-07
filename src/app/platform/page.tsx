"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { PlatformSchool, PlatformSchoolAdmins, SchoolTeacherInvitationStatus } from "@/types/school";

const panel = "rounded-2xl border border-border bg-surface p-5";
const button = "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const secondary = "rounded-xl border border-border px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50";
const input = "mt-1 block w-full rounded-xl border border-border bg-bg px-3 py-2 font-normal";
const statusLabels: Record<SchoolTeacherInvitationStatus, string> = {
  pending: "รอตอบรับ",
  accepted: "ตอบรับแล้ว",
  expired: "หมดอายุ · สร้างลิงก์ใหม่ด้วยอีเมลเดิมได้",
};

function SchoolDetails({ school, onChange }: { school: PlatformSchool; onChange: () => void }) {
  const [details, setDetails] = useState<PlatformSchoolAdmins>();
  const [revision, setRevision] = useState(0);
  const [readError, setReadError] = useState("");
  const [name, setName] = useState(school.name);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const schoolId = school.id;

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await getSupabaseClient()?.rpc("get_platform_school_admins", { p_organization_id: schoolId });
        if (!response?.data || response.error) throw new Error("โหลดรายชื่อผู้ดูแลไม่สำเร็จ");
        if (active) {
          setDetails(response.data);
          setReadError("");
        }
      } catch {
        if (active) {
          setDetails(undefined);
          setReadError("โหลดรายชื่อผู้ดูแลไม่สำเร็จ");
        }
      }
    }
    void load();
    return () => { active = false; };
  }, [schoolId, revision]);

  async function submit(event: FormEvent<HTMLFormElement>, action: "rename" | "invite") {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client || busy) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const result = action === "rename"
        ? await client.rpc("rename_platform_school", { p_organization_id: schoolId, p_name: name })
        : await client.rpc("create_school_admin_invitation", { p_organization_id: schoolId, p_email: email });
      if (result.error) throw new Error(result.error.message);
      if (action === "rename") {
        setName(name.trim());
        setNotice("บันทึกชื่อโรงเรียนแล้ว");
      } else {
        setEmail("");
        setRevision((value) => value + 1);
        setNotice("สร้างคำเชิญแล้ว เลือกเปิดแอปอีเมลหรือคัดลอกลิงก์จากรายการ");
      }
      onChange();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(link: string) {
    setError("");
    setNotice("");
    try {
      await navigator.clipboard.writeText(link);
      setNotice("คัดลอกลิงก์คำเชิญแล้ว");
    } catch {
      setError("คัดลอกลิงก์ไม่สำเร็จ กรุณาเปิดแอปอีเมล");
    }
  }

  return (
    <section className={panel + " space-y-5"} aria-label="รายละเอียดโรงเรียน">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{school.name}</h2>
          <p className="text-xs text-text-muted">
            วันที่สมัคร {new Date(school.created_at).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}
          </p>
        </div>
        <button type="button" className={secondary} onClick={() => {
          setRevision((value) => value + 1);
          onChange();
        }}>โหลดสถานะล่าสุด</button>
      </div>
      <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => void submit(event, "rename")}>
        <label className="min-w-48 flex-1 text-sm font-semibold">ชื่อโรงเรียน
          <input className={input} value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
        </label>
        <button className={secondary} disabled={busy || !name.trim() || name.trim() === school.name}>บันทึกชื่อ</button>
      </form>

      <div className="space-y-3 border-t border-border pt-5">
        <h3 className="font-bold">แอดมินโรงเรียน</h3>
        <p className="text-sm text-text-muted">ผู้ดูแลแต่ละบัญชีมีสิทธิ์เท่ากันภายในโรงเรียนนี้</p>
        {readError && <p role="alert" className="text-sm text-error">{readError}</p>}
        {!details && !readError && <p role="status" className="text-sm text-text-muted">กำลังโหลดรายชื่อผู้ดูแล…</p>}
        {details && (details.admins.length > 0
          ? <ul className="space-y-2">{details.admins.map(({ email }) => (
            <li key={email} className="break-all rounded-xl border border-border p-3 text-sm">{email} <span className="text-success">· ใช้งาน</span></li>
          ))}</ul>
          : <p className="text-sm text-text-muted">ยังไม่มีแอดมินที่ใช้งาน</p>)}
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <h3 className="font-bold">เชิญแอดมินโรงเรียนเพิ่ม</h3>
        <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => void submit(event, "invite")}>
          <label className="min-w-48 flex-1 text-sm font-semibold">อีเมลผู้รับคำเชิญ
            <input type="email" className={input} value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} />
          </label>
          <button className={button} disabled={busy}>สร้างคำเชิญ</button>
        </form>
        <p className="text-xs text-text-muted">ผู้รับต้องตอบรับด้วยบัญชีแอดมินโรงเรียนที่ยืนยันอีเมลแล้ว ลิงก์ใช้ได้ 7 วัน</p>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
        {notice && <p role="status" className="text-sm text-success">{notice}</p>}
        {details && (details.invitations.length > 0
          ? <ul className="space-y-2">{details.invitations.map((invitation) => {
            const link = invitation.token ? new URL("/invite/school-admin?token=" + invitation.token, window.location.origin).href : null;
            const mailto = link
              ? "mailto:" + encodeURIComponent(invitation.email) + "?subject=" + encodeURIComponent("คำเชิญแอดมินโรงเรียน Speech Adventure") + "&body=" + encodeURIComponent(link)
              : undefined;
            return (
              <li key={invitation.email} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm">
                <div className="break-all">
                  <p className="font-semibold">{invitation.email}</p>
                  <p className="text-xs text-text-muted">{statusLabels[invitation.status]}</p>
                </div>
                {link && <div className="flex gap-3 text-xs font-semibold text-primary">
                  <button type="button" onClick={() => void copyLink(link)}>คัดลอกลิงก์</button>
                  <a href={mailto}>เปิดแอปอีเมล</a>
                </div>}
              </li>
            );
          })}</ul>
          : <p className="text-sm text-text-muted">ยังไม่มีคำเชิญแอดมินโรงเรียน</p>)}
      </div>
    </section>
  );
}

function PlatformOverview() {
  const [schools, setSchools] = useState<PlatformSchool[]>();
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const selected = schools?.find((school) => school.id === selectedId);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await getSupabaseClient()?.rpc("list_platform_schools");
        if (!response?.data || response.error) throw new Error("โหลดข้อมูลโรงเรียนไม่สำเร็จ");
        if (active) {
          setSchools(response.data);
          setError("");
        }
      } catch {
        if (active) {
          setSchools(undefined);
          setError("โหลดข้อมูลโรงเรียนไม่สำเร็จ กรุณาตรวจสอบสิทธิ์แล้วลองอีกครั้ง");
        }
      }
    }
    void load();
    return () => { active = false; };
  }, [revision]);

  const reload = () => setRevision((value) => value + 1);
  if (!schools) {
    return error
      ? <div className={panel}><p role="alert" className="mb-3 text-sm text-error">{error}</p><button className={secondary} onClick={reload}>ลองอีกครั้ง</button></div>
      : <p role="status" className="text-text-muted">กำลังโหลดโรงเรียน…</p>;
  }
  const total = (key: "admin_count" | "teacher_count" | "student_count" | "recent_sessions") =>
    schools.reduce((sum, school) => sum + school[key], 0);
  const stats = [
    { label: "โรงเรียน", value: schools.length },
    { label: "บัญชีผู้ดูแลโรงเรียน", value: total("admin_count") },
    { label: "ครูประจำห้อง", value: total("teacher_count") },
    { label: "นักเรียน", value: total("student_count") },
    { label: "ฝึกเสร็จใน 7 วันที่ผ่านมา", value: total("recent_sessions") },
  ];

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map(({ label, value }) => <div key={label} className={panel}>
          <dt className="text-xs font-medium text-text-muted">{label}</dt>
          <dd className="mt-2 text-2xl font-bold text-primary">{value.toLocaleString("th-TH")}</dd>
        </div>)}
      </dl>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className={panel + " space-y-3"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">โรงเรียนในระบบ</h2>
            <button type="button" onClick={reload} className="text-xs font-semibold text-primary">โหลดรายการล่าสุด</button>
          </div>
          {schools.length === 0 && <p className="text-sm text-text-muted">ยังไม่มีโรงเรียนสมัครใช้งาน</p>}
          <ul className="space-y-2">
            {schools.map((school) => <li key={school.id}>
              <button type="button" aria-pressed={selectedId === school.id} onClick={() => setSelectedId(school.id)}
                className="w-full rounded-xl border border-border p-3 text-left text-sm aria-pressed:border-primary aria-pressed:bg-primary/10">
                <span className="block break-words font-semibold">{school.name}</span>
                <span className="block text-xs text-text-muted">
                  {school.classroom_count} ห้อง · {school.teacher_count} ครู · {school.student_count} นักเรียน · {school.admin_count} ผู้ดูแล
                </span>
              </button>
            </li>)}
          </ul>
        </section>
        {selected
          ? <SchoolDetails key={selected.id} school={selected} onChange={reload} />
          : <p className={panel + " text-sm text-text-muted"}>เลือกโรงเรียนเพื่อดูรายละเอียดและจัดการคำเชิญผู้ดูแล</p>}
      </div>
    </>
  );
}

export default function PlatformAdminPage() {
  const { user, isLoading, signOut } = useAuth();

  return (
    <main className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div><p className="text-xs font-semibold text-primary">Speech Adventure</p><p className="font-bold">แอดมินระบบ</p></div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user && <button type="button" className={secondary} onClick={() => void signOut()}>ออกจากระบบ</button>}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl space-y-5 px-5 py-6">
        <div>
          <h1 className="text-2xl font-bold">ภาพรวมระบบ</h1>
          <p className="mt-1 text-sm text-text-muted">ดูสถิติรวม จัดการข้อมูลโรงเรียน และเชิญผู้ดูแลโรงเรียน</p>
        </div>
        {isLoading ? <p role="status" className="text-text-muted">กำลังตรวจสอบบัญชี…</p>
          : !user ? <Link href="/auth/signin?redirect=%2Fplatform" className={"inline-block " + button}>เข้าสู่ระบบ</Link>
          : !user.isPlatformAdmin ? <p role="alert" className={panel + " text-sm text-error"}>บัญชีนี้ไม่มีสิทธิ์แอดมินระบบ</p>
          : <PlatformOverview key={user.id} />}
      </div>
    </main>
  );
}
