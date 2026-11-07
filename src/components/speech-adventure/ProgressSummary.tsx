import type { ProgressSummary as ProgressSummaryType } from "@/types/speechAdventure";

interface Props {
  summary: ProgressSummaryType;
}

export default function ProgressSummary({ summary }: Props) {
  const scoreImprovement = summary.reviewScore - summary.pretestScore;

  return (
    <div className="bg-surface rounded-3xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-text mb-4">สรุปความก้าวหน้า</h3>

      {/* Pretest vs Review Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-level-pretest/10 rounded-2xl p-4 text-center">
          <p className="text-sm text-text-muted mb-1">คะแนน Pre-test</p>
          <p className="text-3xl font-bold text-level-pretest">{summary.pretestScore}</p>
        </div>
        <div className="bg-success/10 rounded-2xl p-4 text-center">
          <p className="text-sm text-text-muted mb-1">คะแนน Review</p>
          <p className="text-3xl font-bold text-success">{summary.reviewScore}</p>
        </div>
      </div>

      {/* Improvement indicator */}
      <div className="bg-success/10 rounded-2xl p-4 mb-6 text-center">
        <p className="text-sm text-text-muted">พัฒนาการ</p>
        <p className="text-2xl font-bold text-success">
          +{scoreImprovement} คะแนน
        </p>
        <p className="text-sm text-text-muted mt-1">
          {scoreImprovement >= 30 ? "พัฒนาการยอดเยี่ยม!" : scoreImprovement >= 15 ? "พัฒนาการดีมาก!" : "พัฒมาการดีขึ้นเรื่อยๆ!"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-bg rounded-2xl p-3">
          <p className="text-xs text-text-muted">ระดับปัจจุบัน</p>
          <p className="text-sm font-semibold text-text">{summary.currentLevel}</p>
        </div>
        <div className="bg-bg rounded-2xl p-3">
          <p className="text-xs text-text-muted">ดาวทั้งหมด</p>
          <p className="text-sm font-semibold text-secondary">★ {summary.starsEarned}</p>
        </div>
        <div className="bg-bg rounded-2xl p-3">
          <p className="text-xs text-text-muted">จำนวนครั้งที่ฝึก</p>
          <p className="text-sm font-semibold text-primary">{summary.totalAttempts} ครั้ง</p>
        </div>
        <div className="bg-bg rounded-2xl p-3">
          <p className="text-xs text-text-muted">ความแม่นยำ</p>
          <p className="text-sm font-semibold text-success">{summary.accuracy}%</p>
        </div>
      </div>

      {/* Difficult Sounds */}
      {summary.difficultSounds.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-text mb-2">เสียงที่ควรฝึกเพิ่มเติม</p>
          <div className="flex gap-2">
            {summary.difficultSounds.map((sound) => (
              <span
                key={sound}
                className="inline-flex items-center gap-1 bg-error/10 text-error px-3 py-1.5 rounded-full text-sm font-medium"
              >
                {sound}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
