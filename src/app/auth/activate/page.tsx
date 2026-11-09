"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function ActivatePage() {
  const { signIn, user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    if (password !== form.get("confirmation")) {
      setMessage("รหัสผ่านทั้งสองช่องต้องตรงกัน");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/parent-activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate", email, code: form.get("code"), password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const login = await signIn(email, password);
      router.replace(login.success ? "/dashboard" : "/auth/signin");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "เปิดใช้บัญชีไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1 block w-full rounded-xl border border-border bg-bg px-3 py-2";
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-8">
      <section className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-xl font-bold">เข้าใช้บัญชีผู้ปกครองครั้งแรก</h1>
        <p className="text-sm text-text-muted">ใช้อีเมลและรหัสเปิดใช้ที่ได้รับจากโรงเรียน แล้วตั้งรหัสผ่านของคุณ</p>
        {user ? <Link href="/dashboard" className="font-semibold text-primary">ไปหน้าหลัก</Link> :
          <form className="space-y-3" onSubmit={submit}>
            <label className="block text-sm">อีเมล<input className={field} name="email" type="email" autoComplete="email" required /></label>
            <label className="block text-sm">รหัสเปิดใช้<input className={field} name="code" autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} required /></label>
            <label className="block text-sm">ตั้งรหัสผ่าน<input className={field} name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
            <label className="block text-sm">ยืนยันรหัสผ่าน<input className={field} name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
            {message && <p role="alert" className="text-sm text-error">{message}</p>}
            <button className="w-full rounded-xl bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={busy}>{busy ? "กำลังเปิดใช้…" : "เปิดใช้บัญชี"}</button>
          </form>}
        <Link href="/auth/signin" className="block text-sm text-primary">กลับหน้าเข้าสู่ระบบ</Link>
      </section>
    </main>
  );
}
