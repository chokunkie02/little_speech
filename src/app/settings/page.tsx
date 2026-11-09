"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SharedGuardianSettings from "@/components/layout/SharedGuardianSettings";
import { useChildProfile } from "@/hooks/useChildProfile";
import AppShell from "@/components/layout/AppShell";
import ThemeToggle from "@/components/ui/ThemeToggle";
import CloudSyncPreview from "@/components/sync/CloudSyncPreview";
import {
  InviteNewMemberSection,
  SentInvitesSection,
  ChildAccessSection,
} from "@/components/layout/InviteSection";
import { useAuth, isParent, isTeacher, isSchoolAdmin } from "@/hooks/useAuth";
import { useRepositories } from "@/lib/providers/RepositoryProvider";
import {
  exportData,
  importData,
  clearAllData,
  readBackupFile,
  getStorageSummary,
} from "@/lib/local-data/localDataBackup";
import { DEMO_ATTEMPT_COUNT, DEMO_PROGRESS, DEMO_OBSERVATIONS } from "@/lib/demo/speechAdventureDemoData";
import { STORAGE_KEYS } from "@/lib/storage/storageKeys";
import type { SpeechProgress } from "@/types/speechAdventure";
import type { ObservationNote } from "@/types/observations";
import type { ChildProfileData } from "@/lib/child-profile/childProfileStorage";
import { useChildAccess } from "@/hooks/useChildAccess";
import { useInvitations } from "@/hooks/useInvitations";
import { useCurrentChildAccess } from "@/hooks/useCurrentChildAccess";
import { ACCESS_ROLE_LABELS } from "@/types/childAccess";
import { INVITATION_ROLE_LABELS } from "@/types/invitations";
import { isSupabaseConfigured } from "@/lib/supabase/client";

// ── Role display helpers ──────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  parent:      "ผู้ปกครอง",
  teacher:     "ครูผู้สอน",
  school_admin:"ผู้ดูแลโรงเรียน",
  therapist:   "นักบำบัด",
};

function roleBadgeClass(role: string): string {
  switch (role) {
    case "teacher":      return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "school_admin": return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "therapist":    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    default:             return "bg-primary/10 text-primary";
  }
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function UserCircleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 20a6 6 0 0 0-12 0" />
      <circle cx="12" cy="10" r="4" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function BuildingIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <rect x="9" y="13" width="6" height="9" />
      <path d="M9 9h.01M15 9h.01" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-text">{title}</h2>
      {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
    </div>
  );
}

// ── Account Card (authenticated) ──────────────────────────────────────────────

function AccountCard() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const role = user?.role ?? "parent";
  const label = ROLE_LABELS[role] ?? role;
  const badgeClass = roleBadgeClass(role);
  const isCloud = isSupabaseConfigured();

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  }

  if (!user) return null;

  return (
    <div className="bg-surface border border-border rounded-xl divide-y divide-border">
      {/* User info */}
      <div className="flex items-center gap-3 px-4 py-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${badgeClass}`}>
          <UserCircleIcon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text truncate">{user.email}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
              {label}
            </span>
            {isCloud ? (
              <span className="inline-flex items-center gap-1 text-xs text-success">
                <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" aria-hidden="true" />
                เชื่อมต่อ Cloud
              </span>
            ) : (
              <span className="text-xs text-text-muted">โหมดออฟไลน์</span>
            )}
          </div>
        </div>
      </div>
      {/* Sign out */}
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex items-center gap-2 text-sm font-medium text-error hover:text-error/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <LogOutIcon />
          {signingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
        </button>
      </div>
    </div>
  );
}

// ── Local mode card (anonymous user) ─────────────────────────────────────────

function LocalModeCard() {
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-border/50 flex items-center justify-center flex-shrink-0 text-text-muted mt-0.5">
        <UserCircleIcon />
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
  return (
    <div className="bg-surface border border-border rounded-xl divide-y divide-border">
      <div className="flex items-center justify-between px-4 py-3.5">
        <div>
          <p className="text-sm font-medium text-text">ธีมแอป</p>
          <p className="text-xs text-text-muted mt-0.5">เลือกโหมดสว่างหรือมืด</p>
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}

// ── School admin shortcut ─────────────────────────────────────────────────────

function SchoolManagementCard() {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <Link
        href="/school"
        className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-700 dark:text-amber-300 flex-shrink-0">
            <BuildingIcon size={17} />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">จัดการโรงเรียน</p>
            <p className="text-xs text-text-muted mt-0.5">ดูและจัดการองค์กร ห้องเรียน และครู</p>
          </div>
        </div>
        <span className="text-text-muted group-hover:text-text transition-colors flex-shrink-0">
          <ChevronRightIcon />
        </span>
      </Link>
    </div>
  );
}

// ── Received invite lookup ────────────────────────────────────────────────────

function ReceivedInviteSection() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const extractToken = useCallback((raw: string): string | null => {
    const trimmed = raw.trim();
    try {
      const url = new URL(trimmed);
      const t = url.searchParams.get("token");
      if (t) return t;
      const parts = url.pathname.split("/").filter(Boolean);
      const last = parts[parts.length - 1];
      return last && last !== "accept" ? last : null;
    } catch {
      if (/^[a-z0-9-]{8,}$/i.test(trimmed)) return trimmed;
    }
    return null;
  }, []);

  function handleOpen() {
    setError(null);
    const token = extractToken(input);
    if (!token) {
      setError("กรุณาวางลิงก์คำเชิญหรือ token ที่ถูกต้อง");
      return;
    }
    router.push(`/invite/accept?token=${encodeURIComponent(token)}`);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        วางลิงก์หรือรหัสคำเชิญที่ได้รับเพื่อเปิดคำเชิญ
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(null); }}
          placeholder="https://…/invite/accept?token=… หรือรหัส"
          className="flex-1 min-w-0 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
        />
        <button
          onClick={handleOpen}
          disabled={!input.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
        >
          <LinkIcon />
          เปิด
        </button>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

// ── Pending received invitations ──────────────────────────────────────────────

function PendingReceivedInvites() {
  const router = useRouter();
  const { receivedInvitations } = useInvitations();
  const pending = receivedInvitations.filter((invitation) =>
    invitation.status === "pending" || (invitation.requiresTeacherApproval && invitation.requestedAt),
  );

  if (pending.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
        คำเชิญที่ส่งถึงฉัน
      </p>
      {pending.map((inv) => (
        <div
          key={inv.id}
          className="bg-surface border border-primary/20 rounded-xl px-4 py-3 flex items-start justify-between gap-3"
        >
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-sm font-semibold text-text truncate">
              {inv.inviterEmail ?? "ผู้ส่งคำเชิญ"}
            </p>
            <p className="text-xs text-text-muted">
              {INVITATION_ROLE_LABELS[inv.role]} · {inv.requiresTeacherApproval && inv.requestedAt
                ? inv.status === "pending" ? (inv.isAdditionalGuardian ? "รออนุมัติ" : "รอครูอนุมัติ") : inv.status === "accepted" ? "อนุมัติแล้ว" : "คำขอปิดแล้ว"
                : `หมดอายุ ${new Date(inv.expiresAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`}
            </p>
          </div>
          <button
            onClick={() => router.push(`/invite/accept?token=${encodeURIComponent(inv.token)}`)}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all flex-shrink-0"
          >
            {inv.requiresTeacherApproval ? "ดูคำเชิญ" : "ตอบรับ"}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Received grants ───────────────────────────────────────────────────────────

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
          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 flex-shrink-0">
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

  const handleLoadDemo = useCallback(() => {
    void progressRepo.replaceProgress(DEMO_PROGRESS);
    void obsRepo.replaceNotes(DEMO_OBSERVATIONS);
    setStorageInfo(getStorageSummary(userId));
    flash("success", `โหลดข้อมูลสาธิตสำเร็จ (${DEMO_ATTEMPT_COUNT} ครั้ง)`);
  }, [userId, progressRepo, obsRepo, flash]);

  return (
    <div>
      {/* Storage status */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        {storageInfo.hasProfile && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-semibold">มีโปรไฟล์</span>
        )}
        {storageInfo.hasProgress && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-info/10 text-info text-xs font-semibold">มีข้อมูลการฝึก</span>
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
              ? "bg-success/10 text-success border border-success/20"
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
            <button onClick={handleClear} className="px-5 py-2 rounded-xl bg-error text-white font-semibold text-sm hover:bg-error/90 transition-all">ล้างข้อมูล</button>
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
            <button onClick={handleLoadDemo} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/8 border border-primary/15 text-sm font-semibold text-primary hover:bg-primary/12 transition-all active:scale-[0.98]">
              โหลดข้อมูลสาธิต
            </button>
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
  const { isOwner, isSharedChild } = useCurrentChildAccess();
  const { profile } = useChildProfile();
  const { receivedGrants } = useChildAccess();
  const isSchoolGuardian = !!profile?.organizationId && receivedGrants.some(
    (grant) => grant.childId === profile.id && grant.role === "guardian" && !grant.revokedAt,
  );

  // Anonymous (local mode) defaults to parent flow
  const isParentUser = !user || isParent(user);
  const isTeacherUser = !!user && isTeacher(user);
  const isAdminUser   = !!user && isSchoolAdmin(user);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* Page title */}
        <div>
          <h1 className="text-xl font-bold text-text">ตั้งค่า</h1>
          <p className="text-sm text-text-muted mt-1">จัดการบัญชีและการตั้งค่าแอป</p>
        </div>

        {/* ── Account ───────────────────────────────────────────────────── */}
        <section>
          <SectionHeader title="บัญชีผู้ใช้" />
          {user ? <AccountCard /> : <LocalModeCard />}
        </section>

        {/* ── Appearance ────────────────────────────────────────────────── */}
        <section>
          <SectionHeader title="การแสดงผล" />
          <AppearanceSection />
        </section>

        {/* ── School admin sections ─────────────────────────────────────── */}
        {isAdminUser && (
          <>
            <section>
              <SectionHeader title="การจัดการโรงเรียน" />
              <SchoolManagementCard />
            </section>
            <section>
              <SectionHeader
                title="คำเชิญและสิทธิ์ที่ได้รับ"
                description="ตอบรับคำเชิญเข้าร่วมองค์กรหรือห้องเรียน"
              />
              <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                <PendingReceivedInvites />
                <ReceivedInviteSection />
              </div>
            </section>
          </>
        )}

        {/* ── Teacher sections ──────────────────────────────────────────── */}
        {isTeacherUser && (
          <section>
            <SectionHeader
              title="คำเชิญและสิทธิ์ที่ได้รับ"
              description="ตอบรับคำเชิญและดูสิทธิ์การเข้าถึงเด็กที่ได้รับ"
            />
            <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
              <PendingReceivedInvites />
              <ReceivedInviteSection />
              <ReceivedGrantsSection />
            </div>
          </section>
        )}

        {/* ── Parent sections ───────────────────────────────────────────── */}
        {isParentUser && (
          <>
            {/* Cloud sync */}
            <section>
              <SectionHeader
                title="ซิงค์ข้อมูลไปยัง Cloud"
                description="ย้ายข้อมูลจากอุปกรณ์นี้ไปยัง Supabase — ยังไม่มีการเปลี่ยนแปลงข้อมูลจริง"
              />
              <div className="bg-surface border border-border rounded-xl p-5">
                <CloudSyncPreview />
              </div>
            </section>

            {/* Owner: invite management */}
            {isOwner ? (
              <>
                <section>
                  <SectionHeader
                    title="เชิญสมาชิกใหม่"
                    description="เชิญผู้ปกครอง ครู หรือนักบำบัดเข้ามาดูพัฒนาการของเด็ก"
                  />
                  <div className="bg-surface border border-border rounded-xl p-5">
                    <InviteNewMemberSection />
                  </div>
                </section>

                <section>
                  <SectionHeader
                    title="สมาชิกที่เข้าถึงเด็กได้"
                    description="จัดการสิทธิ์การเข้าถึงของสมาชิกแต่ละคน"
                  />
                  <div className="bg-surface border border-border rounded-xl p-5">
                    <ChildAccessSection />
                  </div>
                </section>

                <section>
                  <SectionHeader
                    title="คำเชิญที่ส่งแล้ว"
                    description="ประวัติคำเชิญและสถานะการตอบรับ"
                  />
                  <div className="bg-surface border border-border rounded-xl p-5">
                    <SentInvitesSection />
                  </div>
                </section>
              </>
            ) : isSchoolGuardian && profile ? (
              <section>
                <SectionHeader title="ผู้ปกครองร่วม" description="จัดการการเชื่อมของเด็กที่เลือก" />
                <SharedGuardianSettings key={`${user?.id}:${profile.id}`} child={profile} />
              </section>
            ) : isSharedChild ? (
              <section>
                <SectionHeader title="การจัดการสิทธิ์" />
                <div className="bg-surface border border-border rounded-xl px-4 py-5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5BA4CF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text">คุณมีสิทธิ์ดูเท่านั้น</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      การเชิญสมาชิกและจัดการสิทธิ์ทำได้เฉพาะเจ้าของโปรไฟล์เด็ก
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            {/* Received invitations */}
            <section>
              <SectionHeader
                title="คำเชิญที่ได้รับ"
                description="ตอบรับคำเชิญจากผู้ปกครอง ครู หรือนักบำบัดท่านอื่น"
              />
              <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                <PendingReceivedInvites />
                <ReceivedInviteSection />
                <ReceivedGrantsSection />
              </div>
            </section>

            {/* Data management */}
            <section>
              <SectionHeader
                title="จัดการข้อมูล"
                description="ส่งออก นำเข้า หรือล้างข้อมูลที่บันทึกไว้ในอุปกรณ์นี้"
              />
              <div className="bg-surface border border-border rounded-xl p-5">
                <DataManagerSection />
              </div>
            </section>
          </>
        )}

        {/* ── App info ──────────────────────────────────────────────────── */}
        <section>
          <SectionHeader title="เกี่ยวกับแอป" />
          <div className="bg-surface border border-border rounded-xl divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-text-muted">เวอร์ชัน</span>
              <span className="text-sm font-medium text-text">0.1.0 · Prototype</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-text-muted">ข้อมูลจัดเก็บที่</span>
              <span className="text-sm font-medium text-text">
                {isSupabaseConfigured() ? "Supabase Cloud" : "localStorage"}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-text-muted">Storage Provider</span>
              <span className="text-sm font-mono text-text-muted bg-border/40 px-2 py-0.5 rounded">
                {process.env.NEXT_PUBLIC_STORAGE_PROVIDER ?? "local"}
              </span>
            </div>
          </div>
        </section>

      </div>
    </AppShell>
  );
}
