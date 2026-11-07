import ProfileMark from "@/components/ui/ProfileMark";

interface Props {
  childName: string;
  childNickname: string;
  childAge: number;
  childAvatar: string;
  targetSound: string;
  targetSoundLabel: string;
  currentLevel: string;
  reportDate: string;
  totalAttempts: number;
}

export default function ReportHeader({
  childName,
  childNickname,
  childAge,
  childAvatar,
  targetSound,
  targetSoundLabel,
  currentLevel,
  reportDate,
  totalAttempts,
}: Props) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 print:border-gray-200 print:rounded-lg print:p-4">
      {/* Print-only document title */}
      <div className="hidden print:flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div>
          <p className="text-base font-bold text-black">Speech Adventure</p>
          <p className="text-xs text-gray-500">รายงานความก้าวหน้าการพัฒนาการพูด</p>
        </div>
        <p className="text-xs text-gray-400">{reportDate}</p>
      </div>

      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl flex-shrink-0 print:hidden"
          aria-hidden="true"
        >
          <ProfileMark name={childNickname || childName} avatar={childAvatar} />
        </div>

        {/* Child info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-text print:text-black">{childName}</h2>
          <p className="text-sm text-text-muted print:text-gray-500">
            ชื่อเล่น <strong className="text-text print:text-black">{childNickname}</strong>
            {" · "}อายุ {childAge} ปี
          </p>
        </div>

        {/* Date — hidden on screen, visible on print */}
        <p className="hidden print:block text-xs text-gray-400 flex-shrink-0">{reportDate}</p>
      </div>

      {/* Meta row */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 bg-primary/8 border border-primary/20 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary print:border-gray-300 print:text-black print:bg-gray-50">
          เสียงเป้าหมาย: {targetSound} ({targetSoundLabel})
        </span>
        <span className="inline-flex items-center gap-1.5 bg-bg border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted print:border-gray-200 print:text-gray-600">
          ระดับปัจจุบัน: {currentLevel}
        </span>
        <span className="inline-flex items-center gap-1.5 bg-bg border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted print:border-gray-200 print:text-gray-600">
          ฝึกรวม {totalAttempts} ครั้ง
        </span>
        <span className="inline-flex items-center gap-1.5 bg-bg border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted print:border-gray-200 print:text-gray-600 print:hidden">
          {reportDate}
        </span>
      </div>
    </div>
  );
}
