"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CheckCircle2, School } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthScreen";
import { RegisterSchoolAside } from "@/components/auth/authAsides";
import { Alert, Button, ButtonLink, Card, CardContent, FormField, Input, LoadingState, Select, Textarea } from "@/components/ui";
import { useAccountProfile } from "@/components/account/AccountProfileProvider";
import { normalizePhone } from "@/lib/auth/accountDetails";
import { SCHOOL_AFFILIATIONS, THAI_PROVINCES } from "@/lib/thaiProvinces";
import { InlineAuth } from "@/components/auth/InlineAuth";
import { useInbox } from "@/components/inbox/InboxProvider";
import { useAuth } from "@/hooks/useAuth";
import { submitSchoolApplication } from "@/lib/joinCodes";

const STEPS = [
  "สมัครบัญชีของผู้ดูแลโรงเรียน (หรือเข้าสู่ระบบ)",
  "กรอกข้อมูลโรงเรียนและผู้ติดต่อ",
  "ทีมงานตรวจและอนุมัติ แล้วแจ้งในกล่องข้อความ จากนั้นเพิ่มครูด้วยรหัสโรงเรียนได้ทันที",
];

/** A school asks to use the platform; a platform admin approves it from the inbox. */
export default function RegisterSchoolPage() {
  const { user, isLoading, signOut } = useAuth();
  const { inbox, refresh } = useInbox();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { profile, displayName } = useAccountProfile();
  const contactName = profile ? [profile.title, displayName].filter(Boolean).join(" ") : "";
  const pending = inbox?.my_requests.find((request) => request.kind === "school" && request.status === "pending");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const contact = contactName || value("contactName");
    const phone = normalizePhone(value("phone"));
    const schoolCode = value("schoolCode").replace(/[^0-9]/g, "");
    const next: Record<string, string> = {};
    if (!value("schoolName")) next.schoolName = "กรอกชื่อโรงเรียนเต็มตามใบอนุญาต";
    if (schoolCode && schoolCode.length !== 10) next.schoolCode = "รหัสโรงเรียนเป็นตัวเลข 10 หลัก";
    if (!value("province")) next.province = "เลือกจังหวัด";
    if (!contact) next.contactName = "กรอกชื่อผู้ติดต่อ";
    if (!value("position")) next.position = "กรอกตำแหน่ง";
    if (!/^0[0-9]{8,9}$/.test(phone)) next.phone = "ใช้เบอร์ไทย 9–10 หลัก เช่น 081-234-5678";
    setErrors(next);
    setError("");
    if (Object.keys(next).length) {
      const first = [...element.elements].find((item) => (item as HTMLInputElement).name in next) as HTMLElement | undefined;
      first?.focus();
      return;
    }
    setBusy(true);
    try {
      const id = await submitSchoolApplication({
        schoolName: value("schoolName"),
        province: value("province"),
        contactName: contact,
        position: value("position"),
        phone,
        note: value("note"),
        schoolCode,
        affiliation: value("affiliation"),
      });
      setSent(id);
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ส่งคำขอไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout aside={<RegisterSchoolAside steps={STEPS} />} formWidth="lg">
        <Card className="shadow-[0_28px_56px_-36px_rgb(36_27_102/0.5)]">
          <CardContent className="space-y-5 p-5 sm:p-7">
            <div className="space-y-2">
              <h1 className="flex items-center gap-3 font-display text-[2rem] font-semibold leading-tight tracking-tight text-text"><span aria-hidden="true" className="btn-primary grid size-11 shrink-0 place-items-center rounded-[0.9rem] text-primary-foreground"><School size={21} /></span>ลงทะเบียนโรงเรียน</h1>
              <ol className="list-decimal space-y-0.5 pl-5 text-sm text-text-muted lg:hidden">
                {STEPS.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </div>

            {isLoading ? <LoadingState variant="list" rows={1} /> : !user ? (
              <InlineAuth confirmHint="กดลิงก์ในอีเมลแล้วกลับมาที่หน้านี้เพื่อกรอกข้อมูลโรงเรียน" />
            ) : sent || pending ? (
              <div className="space-y-4 text-center">
                <CheckCircle2 size={40} className="mx-auto text-success-text" aria-hidden="true" />
                <div className="space-y-1">
                  <h2 className="text-section-title">ส่งคำขอแล้ว</h2>
                  <p className="text-sm text-text-muted">
                    {pending ? `${pending.school_name} · ` : ""}ทีมงานจะตรวจและแจ้งผลในกล่องข้อความ โดยปกติภายใน 1–2 วันทำการ
                  </p>
                  {(sent || pending?.id) && (
                    <p className="text-sm text-text-muted">
                      เลขที่คำขอ <strong className="font-mono text-text">SA-{(sent || pending?.id || "").slice(0, 8).toUpperCase()}</strong> ใช้อ้างอิงเมื่อติดต่อทีมงาน
                    </p>
                  )}
                </div>
                <ButtonLink href="/inbox" block>ไปที่กล่องข้อความ</ButtonLink>
              </div>
            ) : (
              <>
                <p className="text-caption text-text-muted">
                  ใช้บัญชี <strong className="text-text">{user.email}</strong> ·{" "}
                  <button type="button" className="font-semibold text-primary hover:underline" onClick={() => void signOut()}>ใช้บัญชีอื่น</button>
                </p>
                <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit} noValidate>
                  <h2 className="flex items-center gap-2.5 font-display text-lg font-medium text-text sm:col-span-2"><span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-primary-soft font-display text-sm font-semibold text-primary-text">1</span>ข้อมูลโรงเรียน</h2>
                  <FormField label="ชื่อโรงเรียน" required className="sm:col-span-2" error={errors.schoolName}
                    hint="ชื่อเต็มตามใบอนุญาต ไม่ใช้ตัวย่อ เพราะจะแสดงบนใบเชิญและรายงาน">
                    <Input name="schoolName" maxLength={120} placeholder="เช่น โรงเรียนบ้านสวน" />
                  </FormField>
                  <FormField label="รหัสโรงเรียน" error={errors.schoolCode} hint="ไม่บังคับ ตัวเลข 10 หลักของ สพฐ. ช่วยตรวจว่ายังไม่เคยสมัคร">
                    <Input name="schoolCode" inputMode="numeric" maxLength={10} placeholder="1020304050" />
                  </FormField>
                  <FormField label="สังกัด">
                    <Select name="affiliation" defaultValue="">
                      <option value="">ไม่ระบุ</option>
                      {SCHOOL_AFFILIATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="จังหวัด" required className="sm:col-span-2" error={errors.province}>
                    <Select name="province" defaultValue="">
                      <option value="" disabled>เลือกจังหวัด</option>
                      {THAI_PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}
                    </Select>
                  </FormField>

                  <h2 className="mt-3 flex items-center gap-2.5 border-t border-border pt-5 font-display text-lg font-medium text-text sm:col-span-2"><span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-primary-soft font-display text-sm font-semibold text-primary-text">2</span>ผู้ติดต่อ</h2>
                  {profile ? (
                    <p className="rounded-control bg-surface-muted px-3 py-2 text-sm text-text-muted sm:col-span-2">
                      <strong className="text-text">{contactName}</strong> ·{" "}
                      <Link href="/settings#personal" target="_blank" className="font-semibold text-primary-text hover:underline">แก้ชื่อ</Link>
                    </p>
                  ) : (
                    <FormField label="ชื่อ-นามสกุลผู้ติดต่อ" required className="sm:col-span-2" error={errors.contactName}>
                      <Input name="contactName" maxLength={120} autoComplete="name" />
                    </FormField>
                  )}
                  <FormField label="ตำแหน่ง" required error={errors.position}>
                    <Input name="position" maxLength={80} placeholder="เช่น ผู้อำนวยการ ครูวิชาการ" />
                  </FormField>
                  <FormField label="เบอร์โทรติดต่อ" required error={errors.phone} hint="ทีมงานอาจโทรยืนยันก่อนอนุมัติ">
                    <Input name="phone" type="tel" maxLength={14} autoComplete="tel" inputMode="tel" defaultValue={profile?.phone ?? ""} placeholder="081-234-5678" />
                  </FormField>
                  <FormField label="ข้อมูลเพิ่มเติม" hint="เช่น จำนวนนักเรียน ระดับชั้นที่จะใช้" className="sm:col-span-2">
                    <Textarea name="note" maxLength={500} />
                  </FormField>
                  {error && <Alert tone="error" className="sm:col-span-2">{error}</Alert>}
                  <Button type="submit" size="lg" block loading={busy} className="sm:col-span-2">ส่งคำขอใช้งาน</Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-sm text-text-muted">
          เป็นครูหรือผู้ปกครอง? <Link href="/join" className="font-semibold text-primary hover:underline">ใช้รหัสเข้าร่วม</Link>
        </p>
    </AuthLayout>
  );
}
