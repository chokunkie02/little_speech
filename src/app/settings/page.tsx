"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Database, Info, KeyRound, Lock, LogOut, Palette, Settings, ShieldCheck, Trash2, User, UserCircle } from "lucide-react";
import { Avatar, Button, ButtonLink, Card, CardContent, ConfirmDialog, FormField, Page, PageHeader, Section, SectionNav, Textarea, toast, type SectionNavItem } from "@/components/ui";
import { ROLE_LABELS, appRole } from "@/components/layout/navigation";
import { requestDataDeletion } from "@/lib/joinCodes";
import AppShell from "@/components/layout/AppShell";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTheme } from "@/components/ui/ThemeProvider";
import CloudSyncPreview from "@/components/sync/CloudSyncPreview";
import { useAuth, isParent } from "@/hooks/useAuth";
import { useRepositories } from "@/lib/providers/RepositoryProvider";
import {
  exportData,
  importData,
  clearAllData,
  readBackupFile,
  getStorageSummary,
} from "@/lib/local-data/localDataBackup";
import { STORAGE_KEYS } from "@/lib/storage/storageKeys";
import type { SpeechProgress } from "@/types/speechAdventure";
import type { ObservationNote } from "@/types/observations";
import type { ChildProfileData } from "@/lib/child-profile/childProfileStorage";
import { useChildAccess } from "@/hooks/useChildAccess";
import { ACCESS_ROLE_LABELS } from "@/types/childAccess";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAccountProfile } from "@/components/account/AccountProfileProvider";
import { ChangePasswordCard, PersonalInfoCard } from "@/components/account/AccountSettings";

// ── Account ───────────────────────────────────────────────────────────────────

function AccountCard() {
  const { user, signOut } = useAuth();
  const { displayName } = useAccountProfile();
  const [signingOut, setSigningOut] = useState(false);
  if (!user) return null;
  const role = appRole(user);
  return (
    <section className="hero-night relative overflow-hidden rounded-[1.5rem] p-5 sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgb(255_255_255/0.18)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(120deg,transparent_35%,#000_90%)]" />
      <div className="relative flex flex-wrap items-center gap-4">
        <span className="rounded-full ring-4 ring-white/15"><Avatar name={displayName} size="lg" /></span>
        <div className="min-w-48 flex-1">
          <p className="font-display text-[1.5rem] font-semibold leading-tight [overflow-wrap:anywhere]">{displayName}</p>
          <p className="text-sm text-white/75 [overflow-wrap:anywhere]">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 ring-1 ring-inset ring-white/15">{ROLE_LABELS[role]}</span>
            {isSupabaseConfigured()
              ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 ring-1 ring-inset ring-white/15"><span aria-hidden="true" className="size-1.5 rounded-full bg-[#7CE3B5]" />บันทึกออนไลน์</span>
              : <span className="rounded-full bg-white/15 px-2.5 py-0.5">โหมดออฟไลน์</span>}
          </div>
        </div>
        <Button variant="inverse-outline" className="border-white/25 bg-white/10" icon={<LogOut size={16} aria-hidden="true" />} loading={signingOut} loadingText="กำลังออกจากระบบ…"
          onClick={async () => {
            setSigningOut(true);
            await signOut();
            window.location.replace("/auth/signin");
          }}>
          ออกจากระบบ
        </Button>
      </div>
    </section>
  );
}

// ── Privacy (PDPA) ────────────────────────────────────────────────────────────

function PrivacySection({ parent }: { parent: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <CardContent className="space-y-3 text-sm">
        <ul className="list-disc space-y-1 pl-5 text-text-muted">
          <li>ระบบเก็บเสียงที่อัดตอนฝึกและผลคะแนน เพื่อให้ผู้ปกครองและครูประจำห้องติดตามพัฒนาการ</li>
          {parent && <li>ยกเลิกการเชื่อมกับนักเรียนได้ที่หน้า <Link href="/profile" className="font-semibold text-primary hover:underline">ข้อมูลลูก</Link> (ส่วนผู้ปกครองร่วม)</li>}
          <li>ขอลบบัญชีและข้อมูลทั้งหมดได้ ทีมงานจะยืนยันทางอีเมลภายใน 30 วัน</li>
        </ul>
        <Button variant="outline" icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setOpen(true)}>ขอลบบัญชีและข้อมูล</Button>
      </CardContent>
      <ConfirmDialog
        open={open}
        tone="danger"
        title="ขอลบบัญชีและข้อมูล?"
        description="ทีมงานจะติดต่อกลับทางอีเมลของบัญชีนี้เพื่อยืนยันก่อนลบ เมื่อลบแล้วจะกู้คืนไม่ได้ รวมถึงผลการฝึกและเสียงที่อัดไว้"
        confirmLabel="ส่งคำขอ"
        loading={busy}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await requestDataDeletion(reason);
            toast.success("ส่งคำขอแล้ว", "ทีมงานจะติดต่อกลับทางอีเมลภายใน 30 วัน");
            setOpen(false);
          } catch (cause) {
            toast.error("ส่งคำขอไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
          } finally {
            setBusy(false);
          }
        }}
      >
        <FormField label="เหตุผล (ไม่บังคับ)">
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} />
        </FormField>
      </ConfirmDialog>
    </Card>
  );
}

function LocalModeCard() {
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-border/50 flex items-center justify-center flex-shrink-0 text-text-muted mt-0.5">
        <UserCircle size={18} aria-hidden="true" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-text">โหมดออฟไลน์</p>
        <p className="text-xs text-text-muted mt-0.5">
          ข้อมูลถูกบันทึกไว้ในอุปกรณ์นี้เท่านั้น
          {" "}
          <Link href="/auth/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
            สมัครสมาชิก
          </Link>
          {" "}หรือ{" "}
          <Link href="/auth/signin" className="text-primary hover:text-primary/80 font-medium transition-colors">
            เข้าสู่ระบบ
          </Link>
          {" "}เพื่อซิงค์ข้อมูลไปยัง Cloud
        </p>
      </div>
    </div>
  );
}

// ── Appearance ────────────────────────────────────────────────────────────────

function AppearanceSection() {
  const { theme } = useTheme();
  return (
    <div className="bg-surface border border-border rounded-xl divide-y divide-border">
      <div className="flex items-center justify-between px-4 py-3.5">
        <div>
          <p className="text-sm font-medium text-text">ธีมแอป</p>
          <p className="text-xs text-text-muted mt-0.5">{theme === "dark" ? "กำลังใช้โหมดมืด" : "กำลังใช้โหมดสว่าง"}</p>
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}

function ReceivedGrantsSection() {
  const { receivedGrants } = useChildAccess();
  const active = receivedGrants.filter((g) => !g.revokedAt);

  if (active.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">สิทธิ์ที่ได้รับ</p>
      {active.map((grant) => (
        <div
          key={grant.id}
          className="bg-surface border border-border rounded-xl px-4 py-3 flex items-start justify-between gap-3"
        >
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-sm font-semibold text-text truncate">
              {grant.childSnapshot?.name ?? grant.childId}
            </p>
            <p className="text-xs text-text-muted">{ACCESS_ROLE_LABELS[grant.role]}</p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success-text border border-success/20 flex-shrink-0">
            ใช้งานอยู่
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Data Manager ──────────────────────────────────────────────────────────────

type DataConfirmState = "clear" | "import" | null;

function DataManagerSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmState, setConfirmState] = useState<DataConfirmState>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [storageInfo, setStorageInfo] = useState(getStorageSummary(userId));
  const { progress: progressRepo, observations: obsRepo, profile: profileRepo } = useRepositories();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStorageInfo(getStorageSummary(userId));
  }, [userId]);

  const flash = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  const handleExport = useCallback(() => {
    try {
      exportData(userId);
      flash("success", "ส่งออกข้อมูลสำเร็จ — ไฟล์จะถูกดาวน์โหลดไปยังเครื่องของคุณ");
    } catch {
      flash("error", "เกิดข้อผิดพลาดในการส่งออกข้อมูล");
    }
  }, [userId, flash]);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    try {
      const backup = await readBackupFile(file);
      const result = importData(backup);
      if (result.success) {
        const d = backup.data;
        if (d[STORAGE_KEYS.PROGRESS]) {
          try { void progressRepo.replaceProgress(d[STORAGE_KEYS.PROGRESS] as SpeechProgress); } catch { /* ignore */ }
        }
        if (d[STORAGE_KEYS.OBSERVATIONS]) {
          try { void obsRepo.replaceNotes(d[STORAGE_KEYS.OBSERVATIONS] as ObservationNote[]); } catch { /* ignore */ }
        }
        if (d[STORAGE_KEYS.PROFILE]) {
          try { void profileRepo.replaceProfile(d[STORAGE_KEYS.PROFILE] as ChildProfileData); } catch { /* ignore */ }
        }
        setStorageInfo(getStorageSummary(userId));
        flash("success", "นำเข้าข้อมูลสำเร็จ — ข้อมูลถูกกู้คืนแล้ว");
      } else {
        flash("error", result.error);
      }
    } catch (err) {
      flash("error", err instanceof Error ? err.message : "ไม่สามารถอ่านไฟล์ได้");
    }
    setConfirmState(null);
  }, [userId, progressRepo, obsRepo, profileRepo, flash]);

  const handleClear = useCallback(() => {
    void progressRepo.clearProgress();
    void obsRepo.clearNotes();
    void profileRepo.clearProfile();
    clearAllData(userId);
    setStorageInfo(getStorageSummary(userId));
    setConfirmState(null);
    flash("success", "ล้างข้อมูลทั้งหมดสำเร็จ — ยังคงตั้งค่าธีมและเมนูไว้");
  }, [userId, progressRepo, obsRepo, profileRepo, flash]);

  return (
    <div>
      {/* Storage status */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        {storageInfo.hasProfile && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-success/10 text-success-text text-xs font-semibold">มีโปรไฟล์</span>
        )}
        {storageInfo.hasProgress && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-info/10 text-info-text text-xs font-semibold">มีข้อมูลการฝึก</span>
        )}
        {storageInfo.hasObservations && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-semibold">มีบันทึก</span>
        )}
        {!storageInfo.hasProfile && !storageInfo.hasProgress && !storageInfo.hasObservations && (
          <span className="text-xs text-text-muted">ยังไม่มีข้อมูลในระบบ</span>
        )}
      </div>

      {/* Flash message */}
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === "success"
              ? "bg-success/10 text-success-text border border-success/20"
              : "bg-error/10 text-error border border-error/20"
          }`}
          role="alert"
        >
          {message.text}
        </div>
      )}

      {/* Confirm: clear */}
      {confirmState === "clear" && (
        <div className="mb-4 bg-surface border border-error/25 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-text mb-1">ล้างข้อมูลทั้งหมด?</p>
          <p className="text-xs text-text-muted mb-4">ข้อมูลโปรไฟล์ การฝึก บันทึก จะถูกลบทั้งหมด ไม่สามารถกู้คืนได้</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setConfirmState(null)} className="px-5 py-2 rounded-xl border border-border text-text-muted font-medium text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-all">ยกเลิก</button>
            <button onClick={handleClear} className="px-5 py-2 rounded-xl bg-error text-error-foreground font-semibold text-sm hover:bg-error/90 transition-all">ล้างข้อมูล</button>
          </div>
        </div>
      )}

      {/* Confirm: import */}
      {confirmState === "import" && (
        <div className="mb-4 bg-surface border border-primary/20 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-text mb-1">นำเข้าข้อมูลสำรอง?</p>
          <p className="text-xs text-text-muted mb-4">ข้อมูลปัจจุบันจะถูกแทนที่ด้วยข้อมูลจากไฟล์สำรอง</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setConfirmState(null)} className="px-5 py-2 rounded-xl border border-border text-text-muted font-medium text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-all">ยกเลิก</button>
            <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all">เลือกไฟล์และนำเข้า</button>
          </div>
        </div>
      )}

      {/* Actions */}
      {!confirmState && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleExport} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface border border-border text-sm font-semibold text-text hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.98]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              ส่งออกข้อมูล
            </button>
            <button onClick={() => setConfirmState("import")} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface border border-border text-sm font-semibold text-text hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.98]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              นำเข้าข้อมูล
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/demo" className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/8 border border-primary/15 text-sm font-semibold text-primary-text hover:bg-primary/12 transition-all active:scale-[0.98]">
              ดูตัวอย่างระบบ
            </Link>
            <button onClick={() => setConfirmState("clear")} className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-error/30 text-sm font-semibold text-error hover:bg-error/8 transition-all active:scale-[0.98]">
              ล้างข้อมูลทั้งหมด
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportFile}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth();
  const isParentUser = !user || (isParent(user) && !user.isPlatformAdmin);
  const online = Boolean(user) && isSupabaseConfigured();
  const sections: SectionNavItem[] = [
    { id: "account", label: "บัญชีผู้ใช้", icon: <UserCircle size={17} /> },
    ...(online ? [{ id: "personal", label: "ข้อมูลส่วนตัว", icon: <User size={17} /> }, { id: "password", label: "รหัสผ่าน", icon: <Lock size={17} /> }] : []),
    { id: "appearance", label: "การแสดงผล", icon: <Palette size={17} /> },
    { id: "invitations", label: "รหัสเข้าร่วมและสิทธิ์", icon: <KeyRound size={17} /> },
    ...(isParentUser ? [{ id: "device-data", label: "ข้อมูลในเครื่อง", icon: <Database size={17} /> }] : []),
    ...(user ? [{ id: "privacy", label: "ความเป็นส่วนตัว", icon: <ShieldCheck size={17} /> }] : []),
    { id: "about", label: "เกี่ยวกับแอป", icon: <Info size={17} /> },
  ];

  return (
    <AppShell>
      <Page>
        <PageHeader icon={<Settings size={20} />} title="ตั้งค่า" description="บัญชี การแสดงผล และความเป็นส่วนตัว" />

        {/* Desktop: section menu on the left, settings on the right. Phones: chips above the settings. */}
        <div className="space-y-6 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-10 lg:space-y-0">
          <SectionNav items={sections} label="หมวดการตั้งค่า" />
          <div className="min-w-0 max-w-3xl space-y-8">
            <Section id="account" title="บัญชีผู้ใช้">{user ? <AccountCard /> : <LocalModeCard />}</Section>

            {online && (
              <>
                <Section id="personal" title="ข้อมูลส่วนตัว" description="ชื่อนี้แสดงให้ครู ผู้ดูแลโรงเรียน และผู้ปกครองร่วมเห็น เบอร์โทรเห็นเฉพาะคนที่อนุมัติคำขอของคุณ">
                  <PersonalInfoCard />
                </Section>
                <Section id="password" title="รหัสผ่าน"><ChangePasswordCard /></Section>
              </>
            )}

            <Section id="appearance" title="การแสดงผล"><AppearanceSection /></Section>

            <Section id="invitations" title="รหัสเข้าร่วมและสิทธิ์ที่ได้รับ" description="ได้รับใบเชิญ QR หรือรหัสจากครูหรือโรงเรียน ใช้ที่หน้าใช้รหัสเข้าร่วม"
              action={<ButtonLink href="/join" size="sm" variant="outline" icon={<KeyRound size={14} aria-hidden="true" />}>ใช้รหัสเข้าร่วม</ButtonLink>}>
              <Card><CardContent><ReceivedGrantsSection /></CardContent></Card>
            </Section>

            {isParentUser && (
              <Section id="device-data" title="ข้อมูลในเครื่อง" description="สำรอง นำเข้า หรือล้างข้อมูลที่เก็บในเบราว์เซอร์นี้">
                <Card><CardContent>
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold text-text">เปิดเครื่องมือสำรองและจัดการข้อมูล</summary>
                    <div className="mt-4 space-y-4">
                      <DataManagerSection />
                      <details className="border-t border-border pt-3">
                        <summary className="cursor-pointer text-sm text-text-muted">ตัวช่วยตรวจสอบข้อมูลก่อนซิงก์</summary>
                        <div className="mt-3"><CloudSyncPreview /></div>
                      </details>
                    </div>
                  </details>
                </CardContent></Card>
              </Section>
            )}

            {user && <Section id="privacy" title="ความเป็นส่วนตัวและข้อมูล"><PrivacySection parent={isParentUser} /></Section>}

            <Section id="about" title="เกี่ยวกับแอป">
              <Card><dl className="divide-y divide-border text-sm">
                <div className="flex items-center justify-between px-4 py-3"><dt className="text-text-muted">เวอร์ชัน</dt><dd className="font-medium">0.1.0</dd></div>
                <div className="flex items-center justify-between px-4 py-3"><dt className="text-text-muted">ข้อมูลจัดเก็บที่</dt>
                  <dd className="font-medium">{isSupabaseConfigured() ? "ออนไลน์ (Supabase)" : "ในเบราว์เซอร์นี้"}</dd></div>
              </dl></Card>
            </Section>
          </div>
        </div>
      </Page>
    </AppShell>
  );
}
