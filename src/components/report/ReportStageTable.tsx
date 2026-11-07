import DisplayIcon from "@/components/ui/DisplayIcon";
import type { StageStatus } from "@/types/speechAdventure";

export interface StageRow {
  id: string;
  name: string;
  icon: string;
  accentColor: string;
  status: StageStatus;
  attemptCount: number;
  bestScore: number | null;
  starsEarned: number;
  starsTotal: number;
}

interface Props {
  stages: StageRow[];
}

const STATUS_LABEL: Record<StageStatus, string> = {
  completed: "สำเร็จ",
  current:   "กำลังฝึก",
  review:    "ทบทวน",
  locked:    "ยังไม่ถึง",
};

const STATUS_COLOR: Record<StageStatus, string> = {
  completed: "text-success bg-success/10 print:bg-green-50 print:text-green-700",
  current:   "text-primary bg-primary/10 print:bg-blue-50 print:text-blue-700",
  review:    "text-level-pretest bg-level-pretest/12 print:bg-purple-50 print:text-purple-700",
  locked:    "text-text-muted bg-gray-100 dark:bg-white/8 print:bg-gray-50 print:text-gray-400",
};

function StarBar({ earned, total, color }: { earned: number; total: number; color: string }) {
  const capped = Math.min(earned, total);
  return (
    <span className="text-xs text-text-muted print:text-gray-500">
      <span className="text-secondary print:text-yellow-500">{"★".repeat(capped)}</span>
      <span className="opacity-30">{"★".repeat(total - capped)}</span>
      {" "}{capped}/{total}
    </span>
  );
}

export default function ReportStageTable({ stages }: Props) {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden print:border-gray-200 print:rounded-lg">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-bg/60 dark:bg-white/3 print:bg-gray-50 print:border-gray-200">
        <p className="text-xs font-bold text-text-muted uppercase tracking-wider print:text-gray-500">
          ผลการฝึกแต่ละระดับ
        </p>
      </div>

      <div className="divide-y divide-border print:divide-gray-100">
        {stages.map((stage) => {
          const isLocked = stage.status === "locked";
          return (
            <div
              key={stage.id}
              className={`flex items-center gap-3 px-5 py-3 ${
                isLocked ? "opacity-40" : ""
              }`}
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm print:hidden"
                style={{ backgroundColor: isLocked ? "#F1F5F9" : `${stage.accentColor}18` }}
                aria-hidden="true"
              >
                <DisplayIcon name={stage.icon} />
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text truncate print:text-black">
                  {stage.name}
                </p>
                {!isLocked && stage.attemptCount > 0 && (
                  <p className="text-xs text-text-muted print:text-gray-400">
                    {stage.attemptCount} ครั้ง
                    {stage.bestScore !== null && ` · สูงสุด ${stage.bestScore}%`}
                  </p>
                )}
              </div>

              {/* Stars */}
              <div className="hidden sm:block flex-shrink-0">
                <StarBar earned={stage.starsEarned} total={stage.starsTotal} color={stage.accentColor} />
              </div>

              {/* Status badge */}
              <span
                className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  STATUS_COLOR[stage.status]
                }`}
              >
                {STATUS_LABEL[stage.status]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
