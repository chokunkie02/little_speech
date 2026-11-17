"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Checkbox, FormField, Input, Select } from "@/components/ui";
import { suggestEmail, TITLES, type AccountDetails, type DetailErrors } from "@/lib/auth/accountDetails";

/** Title, first name, last name and phone. Field names match readAccountDetails(). */
export function AccountFields({ errors = {}, defaults }: { errors?: DetailErrors; defaults?: Partial<AccountDetails> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)]">
      <FormField label="คำนำหน้า" className="col-span-2 sm:col-span-1">
        <Select name="title" defaultValue={defaults?.title ?? ""}>
          <option value="">ไม่ระบุ</option>
          {TITLES.map((title) => <option key={title} value={title}>{title}</option>)}
        </Select>
      </FormField>
      <FormField label="ชื่อ" required error={errors.firstName}>
        <Input name="firstName" autoComplete="given-name" maxLength={60} defaultValue={defaults?.firstName} />
      </FormField>
      <FormField label="นามสกุล" required error={errors.lastName}>
        <Input name="lastName" autoComplete="family-name" maxLength={60} defaultValue={defaults?.lastName} />
      </FormField>
      <FormField label="เบอร์โทร" className="col-span-2 sm:col-span-3" error={errors.phone}
        hint="ไม่บังคับ ให้ครูหรือผู้ดูแลโรงเรียนติดต่อได้ เห็นเฉพาะคนที่อนุมัติคำขอของคุณ">
        <Input name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={14} placeholder="081-234-5678"
          defaultValue={defaults?.phone ?? ""} />
      </FormField>
    </div>
  );
}

export function EmailField({ error }: { error?: string }) {
  const [value, setValue] = useState("");
  const suggestion = suggestEmail(value);
  return (
    <div className="space-y-1">
      <FormField label="อีเมล" required error={error}>
        <Input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com"
          value={value} onChange={(event) => setValue(event.target.value)} />
      </FormField>
      {suggestion && (
        <p className="text-caption text-warning-text" aria-live="polite">
          หมายถึง{" "}
          <button type="button" className="font-semibold underline" onClick={() => setValue(suggestion)}>{suggestion}</button>
          {" "}ใช่ไหม?
        </p>
      )}
    </div>
  );
}

export function PasswordField({ mode, error, label = "รหัสผ่าน", name = "password" }: {
  mode: "signin" | "signup"; error?: string; label?: string; name?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <FormField label={label} required error={error} hint={mode === "signup" ? "อย่างน้อย 8 ตัวอักษร" : undefined}>
      <div className="relative">
        <Input name={name} type={show ? "text" : "password"} maxLength={72}
          autoComplete={mode === "signup" ? "new-password" : "current-password"} className="pr-11" />
        <button type="button" onClick={() => setShow((current) => !current)} aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          aria-pressed={show}
          className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text">
          {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
    </FormField>
  );
}

export function ConsentField({ error }: { error?: string }) {
  return (
    <FormField inline error={error} label={
      <span className="text-sm font-normal text-text-muted">
        ยอมรับ{" "}
        <Link href="/terms" target="_blank" className="font-semibold text-primary-text underline">ข้อตกลงการใช้งาน</Link>
        {" "}และ{" "}
        <Link href="/privacy" target="_blank" className="font-semibold text-primary-text underline">นโยบายความเป็นส่วนตัว</Link>
      </span>
    }>
      <Checkbox name="acceptedTerms" value="yes" />
    </FormField>
  );
}
