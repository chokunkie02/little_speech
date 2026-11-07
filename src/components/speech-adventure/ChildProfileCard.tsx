import ProfileMark from "@/components/ui/ProfileMark";
import type { ChildProfile } from "@/types/speechAdventure";

interface Props {
  profile: ChildProfile;
  compact?: boolean;
  isHydrated?: boolean;
  averageScore?: number;
}

export default function ChildProfileCard({
  profile,
  compact = false,
  isHydrated = true,
  averageScore,
}: Props) {
  const stars = isHydrated ? profile.totalStars : "—";
  const attempts = isHydrated ? profile.totalAttempts : "—";
  const scoreDisplay =
    isHydrated && averageScore !== undefined ? `${averageScore}%` : "—";

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-lg flex-shrink-0" aria-hidden="true">
          <ProfileMark name={profile.nickname || profile.name} avatar={profile.avatarEmoji} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-text text-sm truncate">{profile.nickname}</p>
          <p className="text-xs text-text-muted">อายุ {profile.age} ปี</p>
        </div>
        <div className="ml-auto flex items-center gap-1 text-secondary font-bold text-sm flex-shrink-0">
          <span className="text-base">★</span>
          {stars}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl flex-shrink-0" aria-hidden="true">
          <ProfileMark name={profile.nickname || profile.name} avatar={profile.avatarEmoji} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-text">{profile.name}</h2>
          <p className="text-sm text-text-muted">
            ชื่อเล่น: {profile.nickname} · อายุ {profile.age} ปี
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg rounded-xl p-3 text-center border border-border">
          <p className="text-xl font-bold text-secondary leading-none mb-1">
            {stars}
          </p>
          <p className="text-xs text-text-muted">ดาวที่ได้</p>
        </div>
        <div className="bg-bg rounded-xl p-3 text-center border border-border">
          <p className="text-xl font-bold text-primary leading-none mb-1">
            {attempts}
          </p>
          <p className="text-xs text-text-muted">ครั้งที่ฝึก</p>
        </div>
        <div className="bg-bg rounded-xl p-3 text-center border border-border">
          <p className="text-xl font-bold text-success leading-none mb-1">
            {scoreDisplay}
          </p>
          <p className="text-xs text-text-muted">ความแม่นยำ</p>
        </div>
      </div>
    </div>
  );
}
