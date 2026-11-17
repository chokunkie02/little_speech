"use client";

import { useState, type FormEvent } from "react";
import { AccountFields, PasswordField } from "@/components/auth/AccountFields";
import { Alert, Button, Card, CardContent, LoadingState, toast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { focusFirstError, readAccountDetails, thaiAuthError, validateAccountDetails, type DetailErrors } from "@/lib/auth/accountDetails";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAccountProfile } from "./AccountProfileProvider";

/** Title, name and phone, as staff see them. */
export function PersonalInfoCard() {
  const { profile, status, save } = useAccountProfile();
  const [errors, setErrors] = useState<DetailErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const details = readAccountDetails(new FormData(element));
    const next = validateAccountDetails(details);
    setErrors(next);
    setError("");
    if (Object.keys(next).length) {
      focusFirstError(element, next);
      return;
    }
    setBusy(true);
    const result = await save(details);
    setBusy(false);
    if (result.ok) toast.success("บันทึกข้อมูลส่วนตัวแล้ว");
    else setError(result.error);
  }

  return (
    <Card>
      <CardContent>
        {status === "loading" ? <LoadingState variant="list" rows={2} /> : (
          <form key={profile ? `${profile.firstName}|${profile.lastName}|${profile.phone}|${profile.title}` : "empty"}
            className="space-y-4" onSubmit={submit} noValidate>
            <AccountFields errors={errors} defaults={profile ?? undefined} />
            {error && <Alert tone="error">{error}</Alert>}
            <div className="flex justify-end">
              <Button type="submit" loading={busy}>บันทึกข้อมูล</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

/** Change password: checks the current one first so an unattended device can't be taken over. */
export function ChangePasswordCard() {
  const { user } = useAuth();
  const [errors, setErrors] = useState<DetailErrors & { current?: string; confirm?: string }>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const current = String(form.get("current") ?? "");
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    const next: typeof errors = {};
    if (!current) next.current = "กรอกรหัสผ่านปัจจุบัน";
    if (password.length < 8) next.password = "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร";
    else if (password === current) next.password = "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม";
    if (confirm !== password) next.confirm = "รหัสผ่านทั้งสองช่องไม่ตรงกัน";
    setErrors(next);
    setError("");
    if (Object.keys(next).length) {
      focusFirstError(element, next as DetailErrors);
      return;
    }
    const client = getSupabaseClient();
    if (!client || !user) return;
    setBusy(true);
    const check = await client.auth.signInWithPassword({ email: user.email, password: current });
    if (check.error) {
      setBusy(false);
      setErrors({ current: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
      return;
    }
    const { error: updateError } = await client.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(thaiAuthError(updateError.message, true));
      return;
    }
    element.reset();
    toast.success("เปลี่ยนรหัสผ่านแล้ว");
  }

  return (
    <Card>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-3" onSubmit={submit} noValidate>
          <PasswordField mode="signin" name="current" label="รหัสผ่านปัจจุบัน" error={errors.current} />
          <PasswordField mode="signup" name="password" label="รหัสผ่านใหม่" error={errors.password} />
          <PasswordField mode="signup" name="confirm" label="ยืนยันรหัสผ่านใหม่" error={errors.confirm} />
          {error && <Alert tone="error" className="sm:col-span-3">{error}</Alert>}
          <div className="flex justify-end sm:col-span-3">
            <Button type="submit" variant="outline" loading={busy}>เปลี่ยนรหัสผ่าน</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
