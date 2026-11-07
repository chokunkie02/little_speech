import DisplayIcon from "@/components/ui/DisplayIcon";
import type { StageStatus } from "@/types/speechAdventure";

interface Props {
  stageName: string;
  stageIcon: string;
  accentColor: string;
  status: StageStatus;
  starsEarned: number;
  starsTotal: number;
  attemptCount?: number;
  bestScore?: number;
  latestScore?: number;
}

const STATUS_CONFIG: Record<StageStatus, { label: string; cls: string }> = {
  completed: { label: "สำเร็จ", cls: "bg-success/12 text-success" },
  current:   { label: "กำลังฝึก", cls: "bg-primary/12 text-primary" },
  review:    { label: "ทบทวน", cls: "bg-level-pretest/15 text-level-pretest" },
  locked:    { label: "ล็อค", cls: "bg-gray-100 dark:bg-white/8 text-text-muted" },
};

export default function StageProgressCard({
  stageName, stageIcon, accentColor, status,
  starsEarned, starsTotal, attemptCount, bestScore, latestScore,
}: Props) {
  const cappedStars = Math.min(starsEarned, starsTotal);
  const percent = starsTotal > 0 ? Math.round((cappedStars / starsTotal) * 100) : 0;
  const isLocked = status === "locked";
  const badge = STATUS_CONFIG[status];
  const hasStats = !isLocked && attemptCount !== undefined && attemptCount > 0;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl p-3 transition-opacity ${
        isLocked ? "opacity-45" : "bg-bg dark:bg-white/3 border border-border"
      }`}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
        style={{ backgroundColor: isLocked ? undefined : `${accentColor}18` }}
        aria-hidden="true"
      >
        {isLocked ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ) : (
          <DisplayIcon name={stageIcon} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-semibold text-text truncate">{stageName}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}>
            {badge.label}
          </span>
        </div>

        {hasStats && (
          <div className="flex items-center gap-2 mb-1.5 text-xs text-text-muted flex-wrap">
            <span>{attemptCount} ครั้ง</span>
            {typeof bestScore === "number" && <span>· สูงสุด {bestScore}%</span>}
            {typeof latestScore === "number" && latestScore !== bestScore && (
              <span>· ล่าสุด {latestScore}%</span>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percent}%`,
              backgroundColor: isLocked ? "#CBD5E1" : accentColor,
            }}
          />
        </div>
      </div>

      {/* Stars */}
      <div className="flex-shrink-0 text-xs text-text-muted text-right min-w-[40px]">
        <span className="text-secondary">★</span> {cappedStars}/{starsTotal}
      </div>
    </div>
  );
}
