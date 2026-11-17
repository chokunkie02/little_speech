"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Alert, Button, Tabs } from "@/components/ui";
import { AccountFields, ConsentField, EmailField, PasswordField } from "@/components/auth/AccountFields";
import { useAuth } from "@/hooks/useAuth";
import {
  focusFirstError, readAccountDetails, thaiAuthError, validateAccountDetails, validateCredentials, type DetailErrors,
} from "@/lib/auth/accountDetails";

/**
 * Sign up / sign in without leaving the current page (join codes, school registration).
 * The page keeps its own state; once the session arrives `useAuth().user` is set and the page continues.
 */
export function InlineAuth({ beforeSubmit, confirmHint }: {
  /** Save whatever the page needs to resume after an email-confirmation round trip. */
  beforeSubmit?: () => void;
  /** Shown when the project still requires email confirmation. */
  confirmHint: string;
}) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<DetailErrors>({});
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const signup = mode === "signup";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const details = readAccountDetails(form);
    const acceptedTerms = form.get("acceptedTerms") === "yes";
    const errors: DetailErrors = signup
      ? { ...validateAccountDetails(details), ...validateCredentials(email, password, true),
          ...(acceptedTerms ? {} : { acceptedTerms: "ต้องยอมรับข้อตกลงก่อนสมัคร" }) }
      : validateCredentials(email, password, false);
    setFieldErrors(errors);
    setError("");
    if (Object.keys(errors).length) {
      focusFirstError(element, errors);
      return;
    }
    setBusy(true);
    beforeSubmit?.();
    const result = signup ? await signUp(email, password, { ...details, acceptedTerms }) : await signIn(email, password);
    setBusy(false);
    if (!result.success) {
      setError(thaiAuthError(result.error, signup));
      return;
    }
    if (signup && result.needsConfirmation) setNeedsConfirm(true);
  }

  if (needsConfirm) return <Alert tone="info" title="ตรวจอีเมลเพื่อยืนยันบัญชี">{confirmHint}</Alert>;

  return (
    <div className="space-y-4">
      <Tabs
        label="บัญชี"
        value={mode}
        onValueChange={(value) => { setMode(value); setError(""); setFieldErrors({}); }}
        items={[{ value: "signup", label: "สมัครบัญชีใหม่" }, { value: "signin", label: "มีบัญชีแล้ว" }]}
      />
      <form key={mode} className="space-y-3" onSubmit={submit} noValidate>
        {signup && <AccountFields errors={fieldErrors} />}
        <EmailField error={fieldErrors.email} />
        <PasswordField mode={mode} error={fieldErrors.password} />
        {!signup && (
          <p className="-mt-1 text-right text-sm">
            <Link href="/auth/forgot-password" target="_blank" className="font-medium text-primary-text hover:underline">ลืมรหัสผ่าน?</Link>
          </p>
        )}
        {signup && <ConsentField error={fieldErrors.acceptedTerms} />}
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" block loading={busy}>{signup ? "สมัครและไปต่อ" : "เข้าสู่ระบบและไปต่อ"}</Button>
      </form>
    </div>
  );
}
