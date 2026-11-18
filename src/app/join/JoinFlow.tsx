"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Clock, GraduationCap, KeyRound, School, ShieldCheck, Users } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthScreen";
import { JoinAside } from "@/components/auth/authAsides";
import {
  Alert, Button, ButtonLink, Card, CardContent, Checkbox, FormField, Input, LoadingState, Select,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useInvitations } from "@/hooks/useInvitations";
import { useInbox } from "@/components/inbox/InboxProvider";
import { useAccountProfile } from "@/components/account/AccountProfileProvider";
import { InlineAuth } from "@/components/auth/InlineAuth";
import { previewJoinCode, redeemJoinCode, SAVED_JOIN_CODE_KEY } from "@/lib/joinCodes";
import { formatThaiDate } from "@/lib/thaiDate";
import { formatJoinCode, normalizeJoinCode, type JoinCodePreview, type RedeemResult } from "@/types/joinCodes";

const RELATIONSHIPS = ["แม่", "พ่อ", "ปู่", "ย่า", "ตา", "ยาย", "พี่", "ผู้ปกครอง"];

const KIND_TEXT = {
  guardian: { icon: Users, title: "ใบเชิญผู้ปกครอง", action: "เชื่อมกับนักเรียน" },
  classroom_guardian: { icon: Users, title: "เชื่อมกับนักเรียนในห้อง", action: "ส่งคำขอถึงครู" },
  teacher: { icon: GraduationCap, title: "เข้าร่วมโรงเรียนในบทบาทครู", action: "ส่งคำขอเข้าร่วม" },
  school_admin: { icon: School, title: "เป็นผู้ดูแลโรงเรียน", action: "เข้าร่วมเป็นผู้ดูแล" },
} as const;

const STATUS_TEXT: Record<Exclude<JoinCodePreview["status"], "valid">, string> = {
  not_found: "ไม่พบรหัสนี้ กรุณาตรวจตัวอักษรอีกครั้ง",
  expired: "รหัสนี้หมดอายุแล้ว กรุณาขอรหัสใหม่จากผู้ที่ให้รหัส",
  used_up: "รหัสนี้ถูกใช้ครบแล้ว กรุณาขอรหัสใหม่",
  revoked: "รหัสนี้ถูกยกเลิกแล้ว กรุณาขอรหัสใหม่",
};

function readSavedCode() {
  try { return sessionStorage.getItem(SAVED_JOIN_CODE_KEY) ?? localStorage.getItem(SAVED_JOIN_CODE_KEY) ?? ""; } catch { return ""; }
}
function saveCode(code: string) {
  try {
    sessionStorage.setItem(SAVED_JOIN_CODE_KEY, code);
    localStorage.setItem(SAVED_JOIN_CODE_KEY, code);
  } catch { /* storage blocked: the code stays in the URL */ }
}
function clearSavedCode() {
  try {
    sessionStorage.removeItem(SAVED_JOIN_CODE_KEY);
    localStorage.removeItem(SAVED_JOIN_CODE_KEY);
  } catch { /* ignore */ }
}

// ── Step 1: code entry ───────────────────────────────────────────────────────

function CodeForm({ initial, onSubmit, busy }: { initial: string; onSubmit: (code: string) => void; busy: boolean }) {
  const [value, setValue] = useState(initial ? formatJoinCode(initial) : "");
  return (
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(normalizeJoinCode(value)); }}>
      <FormField label="รหัสเข้าร่วม" hint="รหัส 8 ตัวจากใบเชิญหรือจากผู้ดูแล เช่น ABCD-2345 (สแกน QR บนใบเชิญก็ได้)">
        <Input
          value={value}
          onChange={(event) => {
            const raw = normalizeJoinCode(event.target.value).slice(0, 8);
            setValue(raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw);
          }}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="one-time-code"
          spellCheck={false}
          placeholder="XXXX-XXXX"
          className="h-14 text-center font-mono text-2xl tracking-[0.25em]"
          autoFocus
        />
      </FormField>
      <Button type="submit" block size="lg" loading={busy} disabled={normalizeJoinCode(value).length !== 8}>ตรวจรหัส</Button>
    </form>
  );
}

// ── Step 2: what this code is for ───────────────────────────────────────────

function PreviewCard({ preview }: { preview: JoinCodePreview }) {
  const text = KIND_TEXT[preview.kind ?? "guardian"];
  const Icon = text.icon;
  return (
    <div className="flex items-start gap-3 rounded-card border border-primary/25 bg-primary-soft p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-surface text-primary-text">
        <Icon size={22} aria-hidden="true" />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-caption font-semibold text-primary-text">{text.title}</p>
        {preview.child_name && <p className="text-card-title break-words text-text">{preview.child_name}</p>}
        <p className="text-sm text-text">
          {preview.school_name}{preview.classroom_name ? ` · ห้อง ${preview.classroom_name}` : ""}
        </p>
        <p className="text-caption text-text-muted">
          รหัส {formatJoinCode(preview.code ?? "")}{preview.expires_at ? ` · ใช้ได้ถึง ${formatThaiDate(preview.expires_at)}` : ""}
        </p>
      </div>
    </div>
  );
}

// ── Step 4: confirm ─────────────────────────────────────────────────────────

function ConfirmForm({ preview, code, onDone }: { preview: JoinCodePreview; code: string; onDone: (result: RedeemResult) => void }) {
  const kind = preview.kind ?? "guardian";
  const parentKind = kind === "guardian" || kind === "classroom_guardian";
  const [relationship, setRelationship] = useState("แม่");
  const [otherRelationship, setOtherRelationship] = useState("");
  const [childId, setChildId] = useState("");
  const { profile, displayName } = useAccountProfile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await redeemJoinCode({
        code,
        relationship: parentKind ? (relationship === "อื่น ๆ" ? otherRelationship : relationship) : undefined,
        consent: form.get("consent") === "on",
        childId: kind === "classroom_guardian" ? childId : undefined,
        displayName: String(form.get("displayName") ?? "").trim() || undefined,
      });
      clearSavedCode();
      onDone(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ใช้รหัสไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      {kind === "classroom_guardian" && (
        <FormField label="นักเรียนของคุณ" required hint="ครูประจำห้องจะตรวจและอนุมัติก่อนเชื่อมบัญชี">
          <Select value={childId} onChange={(event) => setChildId(event.target.value)} required>
            <option value="" disabled>เลือกชื่อนักเรียน</option>
            {(preview.students ?? []).map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
          </Select>
        </FormField>
      )}
      {profile ? (
        <p className="rounded-control bg-surface-muted px-3 py-2 text-sm text-text-muted">
          ส่งคำขอในชื่อ <strong className="text-text">{displayName}</strong> ·{" "}
          <Link href="/settings#personal" target="_blank" className="font-semibold text-primary-text hover:underline">แก้ชื่อ</Link>
        </p>
      ) : (
        <FormField label="ชื่อ-นามสกุล" required hint={parentKind ? "ให้ครูรู้ว่าเป็นใคร" : "ชื่อที่ผู้ดูแลโรงเรียนจะเห็นในคำขอ"}>
          <Input name="displayName" maxLength={120} required autoComplete="name" />
        </FormField>
      )}
      {parentKind && (
        <>
          <FormField label="ความสัมพันธ์กับนักเรียน" required>
            <Select value={relationship} onChange={(event) => setRelationship(event.target.value)}>
              {[...RELATIONSHIPS, "อื่น ๆ"].map((option) => <option key={option}>{option}</option>)}
            </Select>
          </FormField>
          {relationship === "อื่น ๆ" && (
            <FormField label="ระบุความสัมพันธ์" required>
              <Input value={otherRelationship} onChange={(event) => setOtherRelationship(event.target.value)} maxLength={60} required />
            </FormField>
          )}
          <div className="space-y-2 rounded-card border border-border bg-surface-muted p-3.5 text-sm">
            <p className="flex items-center gap-2 font-semibold text-text"><ShieldCheck size={16} aria-hidden="true" />ข้อมูลที่ระบบเก็บ</p>
            <ul className="list-disc space-y-0.5 pl-5 text-text-muted">
              <li>ผลการฝึก: รอบที่ฝึก กิจกรรมที่ได้ลอง และข้อที่ฟังแล้วเลือกตรงเสียง (ไม่มีคะแนน AI)</li>
              <li>เสียงที่อัดตอนฝึกใช้ฟังทบทวนในเครื่องเท่านั้น ไม่ถูกอัปโหลด</li>
              <li>ครูประจำห้องและผู้ดูแลโรงเรียนดูผลการฝึกได้ <Link href="/privacy" target="_blank" className="font-semibold text-primary-text underline">อ่านนโยบายความเป็นส่วนตัว</Link></li>
              <li>ขอยกเลิกการเชื่อมหรือขอลบข้อมูลได้ทุกเมื่อจากหน้าตั้งค่า</li>
            </ul>
            <FormField label="ฉันเป็นผู้ปกครองของนักเรียนคนนี้ และยินยอมให้เก็บข้อมูลการฝึกตามที่ระบุ" inline required>
              <Checkbox name="consent" required />
            </FormField>
          </div>
        </>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" block size="lg" loading={busy}>{KIND_TEXT[kind].action}</Button>
    </form>
  );
}

// ── Done ────────────────────────────────────────────────────────────────────

function DoneState({ result }: { result: RedeemResult }) {
  if (result.result === "requested") {
    return (
      <div className="space-y-4 text-center">
        <Clock size={40} className="mx-auto text-warning-text" aria-hidden="true" />
        <div className="space-y-1">
          <h2 className="text-section-title">{result.already ? "ส่งคำขอนี้ไว้แล้ว" : "ส่งคำขอแล้ว"}</h2>
          <p className="text-sm text-text-muted">เมื่อได้รับการอนุมัติ จะมีแจ้งเตือนในกล่องข้อความ</p>
        </div>
        <ButtonLink href="/inbox" block>ไปที่กล่องข้อความ</ButtonLink>
      </div>
    );
  }
  const linked = result.result === "linked";
  return (
    <div className="space-y-4 text-center">
      <CheckCircle2 size={40} className="mx-auto text-success-text" aria-hidden="true" />
      <div className="space-y-1">
        <h2 className="text-section-title">{linked ? "เชื่อมกับนักเรียนแล้ว" : "เข้าร่วมโรงเรียนแล้ว"}</h2>
        <p className="text-sm text-text-muted">{linked ? "ดูผลการฝึกและเริ่มฝึกที่บ้านได้เลย" : "เริ่มจัดการโรงเรียนได้เลย"}</p>
      </div>
      <ButtonLink href={linked ? "/dashboard" : "/school"} block>{linked ? "ไปหน้าหลัก" : "ไปหน้าโรงเรียน"}</ButtonLink>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function JoinFlow() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const { openLinkedChild } = useInvitations();
  const { refresh: refreshInbox } = useInbox();
  const [code, setCode] = useState(() => normalizeJoinCode(params.get("code") ?? ""));
  const [preview, setPreview] = useState<JoinCodePreview>();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RedeemResult>();
  // Bumped on every "ตรวจรหัส" so checking the same code again runs a new lookup instead of
  // waiting forever for a code change that never comes.
  const [attempt, setAttempt] = useState(0);

  // Resume a code saved before sign-up / email confirmation.
  useEffect(() => {
    if (code) return;
    const saved = normalizeJoinCode(readSavedCode());
    if (saved.length === 8) router.replace(`/join?code=${encodeURIComponent(saved)}`);
  }, [code, router]);

  // `code` is set from the URL on mount only; follow later URL changes too (the resume above, or a
  // QR link opened while this page is already showing).
  const urlCode = normalizeJoinCode(params.get("code") ?? "");
  const [seenUrlCode, setSeenUrlCode] = useState(urlCode);
  if (urlCode !== seenUrlCode) {
    setSeenUrlCode(urlCode);
    if (urlCode && urlCode !== code) setCode(urlCode);
  }

  useEffect(() => {
    if (code.length !== 8) return;
    let active = true;
    previewJoinCode(code)
      .then((value) => {
        if (!active) return;
        setPreview(value);
        setError("");
        // A remembered code that is used up, expired or revoked must not come back on every visit.
        if (value.status !== "valid" && readSavedCode() === code) clearSavedCode();
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "ตรวจรหัสไม่สำเร็จ"); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [code, attempt]);

  function check(next: string) {
    setChecking(true);
    setPreview(undefined);
    setError("");
    setCode(next);
    setAttempt((value) => value + 1);
    router.replace(`/join?code=${encodeURIComponent(next)}`);
  }

  async function finished(value: RedeemResult) {
    setResult(value);
    refreshInbox();
    if (value.result === "linked") await openLinkedChild(value.child_id).catch(() => undefined);
  }

  const valid = preview?.status === "valid";
  const loadingPreview = code.length === 8 && !preview && !error;

  return (
    <AuthLayout aside={<JoinAside />}>
        <Card>
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="space-y-1">
              <h1 className="flex items-center gap-2 text-page-title"><KeyRound size={22} className="text-primary" aria-hidden="true" />ใช้รหัสเข้าร่วม</h1>
              <p className="text-sm text-text-muted">สำหรับผู้ปกครอง ครู และผู้ดูแลโรงเรียนที่ได้รับรหัสหรือ QR</p>
            </div>

            {result ? <DoneState result={result} /> : (
              <>
                {(!preview || !valid) && !loadingPreview && (
                  <CodeForm key={code} initial={code} onSubmit={check} busy={checking} />
                )}
                {loadingPreview && <LoadingState variant="list" rows={1} label="กำลังตรวจรหัส…" />}
                {error && <Alert tone="error">{error}</Alert>}
                {preview && !valid && <Alert tone="warning">{STATUS_TEXT[preview.status as keyof typeof STATUS_TEXT]}</Alert>}

                {preview && valid && (
                  <div className="space-y-5">
                    <PreviewCard preview={preview} />
                    {isLoading ? <LoadingState variant="list" rows={1} /> : !user ? (
                      <InlineAuth beforeSubmit={() => saveCode(code)} confirmHint={`กดลิงก์ในอีเมลแล้วกลับมาที่หน้านี้ ระบบจำรหัส ${formatJoinCode(code)} ไว้ให้แล้ว`} />
                    ) : (
                      <>
                        <p className="text-caption text-text-muted">
                          ใช้บัญชี <strong className="text-text">{user.email}</strong> ·{" "}
                          <button type="button" className="font-semibold text-primary underline-offset-2 hover:underline"
                            onClick={() => { saveCode(code); void signOut(); }}>
                            ใช้บัญชีอื่น
                          </button>
                        </p>
                        <ConfirmForm preview={preview} code={code} onDone={(value) => void finished(value)} />
                      </>
                    )}
                    <button type="button" className="text-sm font-semibold text-text-muted hover:text-text"
                      onClick={() => { setPreview(undefined); setCode(""); clearSavedCode(); router.replace("/join"); }}>
                      ใช้รหัสอื่น
                    </button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
    </AuthLayout>
  );
}
