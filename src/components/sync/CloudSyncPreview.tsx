"use client";

import { useState } from "react";
import Link from "next/link";
import { useSyncPlanPreview } from "@/hooks/useSyncPlanPreview";
import { useMigration } from "@/hooks/useMigration";
import type { StorageProvider } from "@/lib/config/storageProvider";
import type { SyncDomainPlan } from "@/lib/sync/syncPlan";
import type { MigrationDomain } from "@/lib/sync/migrateToSupabase";

// ── SVG icons ────────────────────────────────────────────────────────────────

function DeviceIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function CloudIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  );
}

function CheckCircleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertTriangleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function UserIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" x2="18" y1="20" y2="10" />
      <line x1="12" x2="12" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function LogInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function providerLabel(p: StorageProvider): string {
  if (p === "supabase") return "Supabase Cloud";
  if (p === "hybrid") return "Hybrid (Local + Cloud)";
  return "บน Device นี้";
}

function providerBadgeCls(p: StorageProvider): string {
  if (p === "supabase") return "bg-info/10 text-info border border-info/20";
  if (p === "hybrid") return "bg-primary/10 text-primary border border-primary/20";
  return "bg-success/10 text-success border border-success/20";
}

function domainLabel(d: SyncDomainPlan["domain"]): string {
  if (d === "profile") return "โปรไฟล์";
  if (d === "progress") return "ความก้าวหน้า";
  return "บันทึกการสังเกต";
}

function DomainIcon({ domain }: { domain: SyncDomainPlan["domain"] }) {
  if (domain === "profile") return <UserIcon size={16} />;
  if (domain === "progress") return <BarChartIcon />;
  return <ClipboardIcon />;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`rounded-lg bg-border/60 animate-pulse ${className}`} aria-hidden="true" />;
}

// ── Auth status row ───────────────────────────────────────────────────────────

interface AuthStatusRowProps {
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  isSupabaseEnvSet: boolean;
}

function AuthStatusRow({ isAuthLoading, isAuthenticated, userEmail, isSupabaseEnvSet }: AuthStatusRowProps) {
  if (isAuthLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface border border-border">
        <SkeletonBlock className="w-4 h-4 rounded-full" />
        <SkeletonBlock className="h-3.5 w-32" />
      </div>
    );
  }

  if (isAuthenticated && userEmail) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-success/6 border border-success/20">
        <span className="text-success flex-shrink-0"><CheckCircleIcon /></span>
        <div className="min-w-0">
          <span className="text-xs font-semibold text-text">เข้าสู่ระบบแล้ว</span>
          <span className="text-xs text-text-muted ml-1.5 truncate">{userEmail}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-surface border border-border">
      <div className="flex items-center gap-2 text-text-muted">
        <UserIcon size={14} />
        <span className="text-xs">ยังไม่ได้เข้าสู่ระบบ</span>
      </div>
      {isSupabaseEnvSet && (
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex-shrink-0"
        >
          <LogInIcon />
          เข้าสู่ระบบ
        </Link>
      )}
    </div>
  );
}

// ── Domain cards ──────────────────────────────────────────────────────────────

interface DomainCardProps {
  domain: SyncDomainPlan["domain"];
  recordCount: number;
  syncOrder: number;
  migrated?: boolean;
}

function DomainCard({ domain, recordCount, syncOrder, migrated }: DomainCardProps) {
  return (
    <div className={`bg-surface border rounded-xl p-4 flex flex-col gap-2 ${migrated ? "border-success/30" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-muted">
          <DomainIcon domain={domain} />
          <span className="text-sm font-semibold text-text">{domainLabel(domain)}</span>
        </div>
        {migrated ? (
          <span className="text-xs font-medium text-success flex items-center gap-1">
            <CheckCircleIcon size={12} />
            อัปโหลดแล้ว
          </span>
        ) : (
          <span className="text-xs font-medium text-text-muted/70 bg-border/50 px-2 py-0.5 rounded-full">
            ลำดับ {syncOrder}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-text">
        {recordCount}
        <span className="text-sm font-medium text-text-muted ml-1">รายการ</span>
      </p>
    </div>
  );
}

function EmptyDomainCard({ domain }: { domain: SyncDomainPlan["domain"] }) {
  return (
    <div className="bg-surface border border-border/50 rounded-xl p-4 flex flex-col gap-2 opacity-50">
      <div className="flex items-center gap-2 text-text-muted">
        <DomainIcon domain={domain} />
        <span className="text-sm font-semibold text-text-muted">{domainLabel(domain)}</span>
      </div>
      <p className="text-sm text-text-muted">ไม่มีข้อมูล</p>
    </div>
  );
}

// ── Migration progress step list ─────────────────────────────────────────────

interface MigrationStepsProps {
  currentDomain: MigrationDomain | null;
  completedDomains: MigrationDomain[];
  uploadedRecords: number;
  totalRecords: number;
}

function MigrationSteps({ currentDomain, completedDomains, uploadedRecords, totalRecords }: MigrationStepsProps) {
  const steps: { domain: MigrationDomain; label: string }[] = [
    { domain: "profile", label: "โปรไฟล์" },
    { domain: "progress", label: "ความก้าวหน้า" },
    { domain: "observations", label: "บันทึกการสังเกต" },
  ];

  const pct = totalRecords > 0 ? Math.round((uploadedRecords / totalRecords) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-text-muted text-right">{uploadedRecords} / {totalRecords} รายการ</p>

      {/* Step list */}
      <div className="space-y-1.5">
        {steps.map(({ domain, label }) => {
          const isDone = completedDomains.includes(domain);
          const isActive = currentDomain === domain;
          return (
            <div key={domain} className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                isDone ? "bg-success text-white" : isActive ? "bg-primary text-white" : "bg-border text-text-muted"
              }`}>
                {isDone ? (
                  <CheckCircleIcon size={12} />
                ) : isActive ? (
                  <SpinnerIcon />
                ) : (
                  <span className="text-[10px] font-bold">{steps.findIndex((s) => s.domain === domain) + 1}</span>
                )}
              </div>
              <span className={`text-xs font-medium ${isDone ? "text-success" : isActive ? "text-text" : "text-text-muted"}`}>
                {label}
                {isActive && <span className="ml-1 opacity-70">กำลังอัปโหลด…</span>}
                {isDone && <span className="ml-1 opacity-70">เสร็จสิ้น</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Conflict warning card ─────────────────────────────────────────────────────

interface ConflictWarningCardProps {
  conflictSummary: string;
  acknowledged: boolean;
  onAcknowledge: (checked: boolean) => void;
}

function ConflictWarningCard({ conflictSummary, acknowledged, onAcknowledge }: ConflictWarningCardProps) {
  return (
    <div className="bg-warning/8 border border-warning/30 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <span className="text-warning mt-0.5 flex-shrink-0"><AlertTriangleIcon size={16} /></span>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-text">ตรวจพบข้อมูลบน Cloud แล้ว</p>
          <p className="text-xs text-text-muted leading-relaxed">{conflictSummary}</p>
          <p className="text-xs text-text-muted leading-relaxed">
            ข้อมูลบนอุปกรณ์นี้จะถูก <strong className="text-text">เพิ่มต่อ</strong> ไปยังข้อมูลที่มีอยู่บน Cloud — ไม่มีการลบหรือเขียนทับ
          </p>
        </div>
      </div>
      <label className="flex items-start gap-2.5 cursor-pointer group">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => onAcknowledge(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-border accent-warning cursor-pointer flex-shrink-0"
          aria-label="ยืนยันว่าเข้าใจความเสี่ยงของการอัปโหลดซ้ำ"
        />
        <span className="text-xs text-text-muted group-hover:text-text transition-colors leading-relaxed">
          ฉันเข้าใจว่าการอัปโหลดอาจสร้างข้อมูลซ้ำ และต้องการดำเนินการต่อ
        </span>
      </label>
    </div>
  );
}

// ── Confirmation card ─────────────────────────────────────────────────────────

interface ConfirmationCardProps {
  totalRecords: number;
  hasConflict: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmationCard({ totalRecords, hasConflict, onConfirm, onCancel }: ConfirmationCardProps) {
  return (
    <div className="bg-surface border border-primary/30 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <span className="text-primary mt-0.5 flex-shrink-0"><AlertTriangleIcon /></span>
        <div>
          <p className="text-sm font-semibold text-text">ยืนยันการอัปโหลดข้อมูล</p>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            ระบบจะอัปโหลด <span className="font-semibold text-text">{totalRecords} รายการ</span> ไปยัง Supabase
            — ข้อมูลบนอุปกรณ์นี้จะไม่ถูกลบหรือเปลี่ยนแปลง
          </p>
          {hasConflict ? (
            <p className="text-xs text-warning mt-1 font-medium">
               Cloud มีข้อมูลอยู่แล้ว — การอัปโหลดจะเพิ่มข้อมูลใหม่ต่อท้าย (ไม่เขียนทับ)
            </p>
          ) : (
            <p className="text-xs text-warning mt-1">
               อย่ากดอัปโหลดซ้ำ เนื่องจากจะสร้างข้อมูลซ้ำในฐานข้อมูล
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-2 rounded-lg border border-border text-sm font-medium text-text-muted hover:text-text hover:border-text-muted/50 transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          <UploadIcon />
          ยืนยันการอัปโหลด
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CloudSyncPreview() {
  const {
    plan,
    provider,
    isSupabaseEnvSet,
    isHydrated,
    isAuthenticated,
    isAuthLoading,
    userEmail,
    counts,
  } = useSyncPlanPreview();

  const { migrationState, migrationProgress, previousMigration, startMigration } = useMigration();

  const [showConfirmation, setShowConfirmation] = useState(false);
  // Conflict acknowledgement — required before upload when plan.hasConflict
  const [conflictAcknowledged, setConflictAcknowledged] = useState(false);

  const allDomains: SyncDomainPlan["domain"][] = ["profile", "progress", "observations"];

  // Local data existence — independent of auth/sync state.
  // plan.domains is empty when unauthenticated, so we must NOT use it to decide
  // whether data cards show. Use raw counts instead so local data is always visible.
  const localDataDomains: { domain: SyncDomainPlan["domain"]; recordCount: number; syncOrder: 1 | 2 | 3 }[] = isHydrated
    ? [
        ...(counts.hasProfile ? [{ domain: "profile" as const, recordCount: 1, syncOrder: 1 as const }] : []),
        ...(counts.attempts > 0 || counts.sessions > 0
          ? [{ domain: "progress" as const, recordCount: counts.attempts + counts.sessions, syncOrder: 2 as const }]
          : []),
        ...(counts.observations > 0
          ? [{ domain: "observations" as const, recordCount: counts.observations, syncOrder: 3 as const }]
          : []),
      ]
    : [];
  const localDataMap = new Map(localDataDomains.map((d) => [d.domain, d]));

  const hasAnyData = isHydrated && localDataDomains.length > 0;
  const hasMigrated = previousMigration !== null || migrationState === "success";
  const isMigrating = migrationState === "checking" || migrationState === "migrating";

  const canUpload =
    isSupabaseEnvSet &&
    !isAuthLoading &&
    isAuthenticated &&
    provider !== "local" &&
    hasAnyData &&
    !hasMigrated &&
    migrationState === "idle" &&
    // When conflict exists, user must explicitly acknowledge before uploading
    (!plan.hasConflict || conflictAcknowledged);

  // Blocked reasons — ordered by priority
  function getBlockedMessage(): string | null {
    if (!isSupabaseEnvSet) {
      return "ยังไม่ได้ตั้งค่า Supabase — กรุณาเพิ่ม NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY ใน .env.local";
    }
    if (provider === "local") {
      return "Storage Provider ปัจจุบันเป็น 'local' — เปลี่ยน NEXT_PUBLIC_STORAGE_PROVIDER=supabase ใน .env.local เพื่อเปิดใช้งาน";
    }
    if (!isAuthLoading && !isAuthenticated) {
      return "กรุณาเข้าสู่ระบบก่อนซิงค์ข้อมูล";
    }
    if (isHydrated && !hasAnyData) {
      return "ยังไม่มีข้อมูลในอุปกรณ์นี้ที่ต้องการซิงค์";
    }
    return null;
  }

  const blockedMessage = getBlockedMessage();
  const showSignInCta = isSupabaseEnvSet && provider !== "local" && !isAuthLoading && !isAuthenticated;

  function handleUploadClick() {
    setShowConfirmation(true);
  }

  function handleConfirm() {
    setShowConfirmation(false);
    startMigration();
  }

  function handleCancel() {
    setShowConfirmation(false);
  }

  function handleAcknowledge(checked: boolean) {
    setConflictAcknowledged(checked);
    // Reset confirmation when acknowledgement is toggled
    if (!checked) setShowConfirmation(false);
  }

  return (
    <div className="space-y-4">

      {/* ── Status badges ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${providerBadgeCls(provider)}`}>
          {provider === "local" ? <DeviceIcon /> : <CloudIcon />}
          <span>{providerLabel(provider)}</span>
        </div>

        {isSupabaseEnvSet ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
            <CheckCircleIcon />
            <span>Supabase พร้อมใช้งาน</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-error/8 text-error border border-error/20">
            <AlertTriangleIcon />
            <span>Supabase ยังไม่ได้ตั้งค่า</span>
          </div>
        )}

        {hasMigrated && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
            <CheckCircleIcon />
            <span>อัปโหลดแล้ว</span>
          </div>
        )}
      </div>

      {/* ── Auth status ── */}
      <AuthStatusRow
        isAuthLoading={isAuthLoading}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        isSupabaseEnvSet={isSupabaseEnvSet}
      />

      {/* ── Migration in progress ── */}
      {isMigrating && (
        <div className="bg-surface border border-primary/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <SpinnerIcon />
            <p className="text-sm font-semibold text-text">กำลังอัปโหลดข้อมูล…</p>
          </div>
          <MigrationSteps
            currentDomain={migrationProgress.currentDomain}
            completedDomains={migrationProgress.completedDomains}
            uploadedRecords={migrationProgress.uploadedRecords}
            totalRecords={migrationProgress.totalRecords}
          />
        </div>
      )}

      {/* ── Migration success ── */}
      {migrationState === "success" && (
        <div className="bg-success/6 border border-success/20 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center gap-2 text-success">
            <CheckCircleIcon size={16} />
            <p className="text-sm font-semibold">อัปโหลดสำเร็จ</p>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            ข้อมูลทั้งหมดถูกอัปโหลดไปยัง Supabase เรียบร้อยแล้ว
            — ข้อมูลบนอุปกรณ์นี้ยังคงอยู่ครบถ้วน
          </p>
          {migrationProgress.completedAt && (
            <p className="text-xs text-text-muted">เวลา: {formatDate(migrationProgress.completedAt)}</p>
          )}
        </div>
      )}

      {/* ── Migration error ── */}
      {migrationState === "error" && (
        <div className="bg-error/6 border border-error/20 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center gap-2 text-error">
            <AlertTriangleIcon size={16} />
            <p className="text-sm font-semibold">อัปโหลดไม่สำเร็จ</p>
          </div>
          {migrationProgress.errorMessage && (
            <p className="text-xs text-text-muted font-mono bg-border/30 rounded px-2 py-1">
              {migrationProgress.errorMessage}
            </p>
          )}
          <p className="text-xs text-text-muted">ข้อมูลบนอุปกรณ์นี้ยังคงอยู่ครบถ้วน</p>
        </div>
      )}

      {/* ── Previous migration info ── */}
      {previousMigration && migrationState !== "success" && (
        <div className="bg-success/6 border border-success/20 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-success mb-1">
            <CheckCircleIcon size={14} />
            <p className="text-xs font-semibold">อัปโหลดข้อมูลแล้วเมื่อ {formatDate(previousMigration.completedAt)}</p>
          </div>
          <p className="text-xs text-text-muted">
            {previousMigration.sessionsUploaded + previousMigration.attemptsUploaded} เซสชัน/ความพยายาม
            · {previousMigration.observationsUploaded} บันทึก
          </p>
        </div>
      )}

      {/* ── Data summary (only in idle/non-migrating states) ── */}
      {!isMigrating && (
        <div>
          <h3 className="text-sm font-semibold text-text mb-3">ข้อมูลที่พบบนอุปกรณ์นี้</h3>
          {!isHydrated ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {allDomains.map((d) => (
                <div key={d} className="bg-surface border border-border rounded-xl p-4">
                  <SkeletonBlock className="h-5 w-24 mb-3" />
                  <SkeletonBlock className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : !hasAnyData ? (
            <div className="bg-surface border border-border rounded-xl px-4 py-6 text-center">
              <p className="text-sm text-text-muted">ยังไม่มีข้อมูลในอุปกรณ์นี้</p>
              <p className="text-xs text-text-muted/60 mt-1">เริ่มฝึกออกเสียงเพื่อสร้างข้อมูลก่อนซิงค์</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {allDomains.map((d) => {
                const local = localDataMap.get(d);
                return local
                  ? <DomainCard key={d} domain={local.domain} recordCount={local.recordCount} syncOrder={local.syncOrder} migrated={hasMigrated} />
                  : <EmptyDomainCard key={d} domain={d} />;
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Sync order (idle only, no prior migration) ── */}
      {!isMigrating && !hasMigrated && isHydrated && plan.domains.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text mb-2">ลำดับการซิงค์</h3>
          <div className="flex flex-wrap items-center gap-2">
            {plan.domains
              .slice()
              .sort((a, b) => a.syncOrder - b.syncOrder)
              .map((d, i, arr) => (
                <div key={d.domain} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-3 py-1.5">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {d.syncOrder}
                    </span>
                    <span className="text-xs font-medium text-text">{domainLabel(d.domain)}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <span className="text-text-muted/40"><ArrowRightIcon /></span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Blocked reason ── */}
      {!hasMigrated && blockedMessage && !isMigrating && (
        <div className="bg-info/8 border border-info/20 rounded-xl px-4 py-3 flex items-start gap-3">
          <div className="mt-0.5 text-info flex-shrink-0">
            <AlertTriangleIcon />
          </div>
          <p className="text-xs text-text-muted leading-relaxed">{blockedMessage}</p>
        </div>
      )}

      {/* ── Conflict warning (shown before upload when cloud already has data) ── */}
      {!isMigrating && !hasMigrated && plan.hasConflict && isAuthenticated && hasAnyData && (
        <ConflictWarningCard
          conflictSummary={plan.conflictSummary ?? "พบข้อมูลทั้งบน Cloud และบนอุปกรณ์นี้"}
          acknowledged={conflictAcknowledged}
          onAcknowledge={handleAcknowledge}
        />
      )}

      {/* ── Action area ── */}
      {!isMigrating && migrationState !== "success" && !hasMigrated && (
        <div className="space-y-3 pt-1">
          {/* Confirmation card */}
          {showConfirmation && canUpload && (
            <ConfirmationCard
              totalRecords={plan.totalRecords}
              hasConflict={plan.hasConflict}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          )}

          {/* Sign-in CTA */}
          {showSignInCta && !showConfirmation && (
            <Link
              href="/auth/signin"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-primary text-primary font-semibold text-sm hover:bg-primary/6 active:scale-[0.98] transition-all"
            >
              <LogInIcon />
              เข้าสู่ระบบเพื่อเปิดใช้งานการซิงค์
            </Link>
          )}

          {/* Upload button */}
          {!showConfirmation && (
            <button
              type="button"
              disabled={!canUpload}
              aria-disabled={!canUpload}
              onClick={canUpload ? handleUploadClick : undefined}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              <UploadIcon />
              อัปโหลดข้อมูลไปยัง Cloud
            </button>
          )}

          {!canUpload && !showConfirmation && (
            <p className="text-xs text-text-muted text-center">
              {hasMigrated
                ? "อัปโหลดข้อมูลแล้ว — ข้อมูลของคุณปลอดภัยบน Cloud"
                : "ข้อมูลของคุณปลอดภัยบนอุปกรณ์นี้"}
            </p>
          )}
        </div>
      )}

    </div>
  );
}
