"use client";

import Link from "next/link";
import type { TeacherChildSummary } from "@/hooks/useTeacherChildren";
import { ACCESS_ROLE_LABELS } from "@/types/childAccess";

interface Props {
  data: TeacherChildSummary;
  onSelect: (childId: string) => void;
}

function formatThaiRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "วันนี้";
  if (days === 1) return "เมื่อวาน";
  if (days < 7) return `${days} วันที่แล้ว`;
  if (days < 30) return `${Math.floor(days / 7)} สัปดาห์ที่แล้ว`;
  return `${Math.floor(days / 30)} เดือนที่แล้ว`;
}

function needsPractice(data: TeacherChildSummary): boolean {
  return (
    data.progressSummary.totalAttempts === 0 ||
    (data.lastActivityAt !== null &&
      Date.now() - new Date(data.lastActivityAt).getTime() > 7 * 86400000)
  );
}

export default function TeacherChildProgressCard({ data, onSelect }: Props) {
  const { grant, child, progressSummary, lastActivityAt } = data;
  const { permissions } = grant;
  const showNeedsPractice = needsPractice(data);

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 hover:border-primary/30 hover:shadow-sm transition-all flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-primary leading-none" aria-hidden="true">
              {child.name?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
          <div>
            <p className="font-bold text-text leading-tight">{child.name}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {child.age ? `${child.age} ปี` : ""}
              {child.targetSound ? ` · เสียง ${child.targetSound}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className="text-xs font-medium text-text-muted bg-bg border border-border px-2 py-0.5 rounded-full">
            {ACCESS_ROLE_LABELS[grant.role]}
          </span>
          {showNeedsPractice && (
            <span className="text-xs font-semibold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
              ควรฝึก
            </span>
          )}
        </div>
      </div>

      {/* Progress stats — only if teacher has canViewProgress */}
      {permissions.canViewProgress ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-bg dark:bg-white/3 border border-border rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-primary leading-none">
              {progressSummary.averageScore > 0 ? `${progressSummary.averageScore}%` : "—"}
            </p>
            <p className="text-xs text-text-muted mt-1">คะแนนเฉลี่ย</p>
          </div>
          <div className="bg-bg dark:bg-white/3 border border-border rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-info-text leading-none">{progressSummary.totalAttempts}</p>
            <p className="text-xs text-text-muted mt-1">ครั้งที่ฝึก</p>
          </div>
          <div className="bg-bg dark:bg-white/3 border border-border rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-secondary leading-none">★ {progressSummary.starsEarned}</p>
            <p className="text-xs text-text-muted mt-1">ดาว</p>
          </div>
        </div>
      ) : (
        <div className="bg-bg dark:bg-white/3 border border-dashed border-border rounded-xl p-3 text-center">
          <p className="text-xs text-text-muted">ไม่มีสิทธิ์ดูความก้าวหน้า</p>
        </div>
      )}

      {/* Last activity row */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">
          {lastActivityAt
            ? `ฝึกล่าสุด: ${formatThaiRelative(lastActivityAt)}`
            : "ยังไม่ได้ฝึก"}
        </span>
        {permissions.canViewProgress && progressSummary.currentLevel && (
          <span className="font-medium text-text">{progressSummary.currentLevel}</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {permissions.canViewProgress && (
          <Link
            href="/progress"
            onClick={() => onSelect(child.id)}
            className="flex-1 text-center px-3 py-2 rounded-xl text-sm font-semibold text-primary border border-primary/30 hover:bg-primary/8 transition-all active:scale-[0.98]"
          >
            ดูความก้าวหน้า
          </Link>
        )}
        {permissions.canStartPractice && (
          <Link
            href="/training"
            onClick={() => onSelect(child.id)}
            className="flex-1 text-center px-3 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]"
          >
            เริ่มฝึก
          </Link>
        )}
        {!permissions.canViewProgress && !permissions.canStartPractice && (
          <span className="flex-1 text-center px-3 py-2 rounded-xl text-xs text-text-muted border border-border/60 opacity-60 cursor-not-allowed">
            ดูได้เท่านั้น
          </span>
        )}
      </div>
    </div>
  );
}
