"use client";

import { useState, type FormEvent } from "react";
import { UserRound } from "lucide-react";
import { AccountFields, ConsentField } from "@/components/auth/AccountFields";
import { Alert, Button, Card, CardContent, Page } from "@/components/ui";
import { focusFirstError, readAccountDetails, validateAccountDetails, type DetailErrors } from "@/lib/auth/accountDetails";
import { useAccountProfile } from "./AccountProfileProvider";

/**
 * Shown once to accounts created before names were asked at sign-up: staff see "ชื่อ นามสกุล"
 * instead of an email prefix, and consent is recorded.
 */
export function CompleteProfile() {
  const { profile, save } = useAccountProfile();
  const [errors, setErrors] = useState<DetailErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const needsConsent = !profile?.termsAcceptedAt;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const details = readAccountDetails(form);
    const accepted = form.get("acceptedTerms") === "yes";
    const next: DetailErrors = {
      ...validateAccountDetails(details),
      ...(needsConsent && !accepted ? { acceptedTerms: "ต้องยอมรับข้อตกลงก่อนใช้งาน" } : {}),
    };
    setErrors(next);
    setError("");
    if (Object.keys(next).length) {
      focusFirstError(element, next);
      return;
    }
    setBusy(true);
    const result = await save(details, accepted);
    setBusy(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <Page width="narrow">
      <Card className="mx-auto max-w-md">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="space-y-2 text-center">
            <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary-text">
              <UserRound size={24} />
            </span>
            <h1 className="text-section-title text-text">กรอกชื่อของคุณก่อนใช้งาน</h1>
            <p className="text-sm text-text-muted">ครูและผู้ดูแลโรงเรียนจะเห็นชื่อนี้แทนอีเมล กรอกครั้งเดียว แก้ไขได้ที่หน้าตั้งค่า</p>
          </div>
          <form className="space-y-4" onSubmit={submit} noValidate>
            <AccountFields errors={errors} defaults={profile ?? undefined} />
            {needsConsent && <ConsentField error={errors.acceptedTerms} />}
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" block size="lg" loading={busy}>บันทึกและใช้งานต่อ</Button>
          </form>
        </CardContent>
      </Card>
    </Page>
  );
}
