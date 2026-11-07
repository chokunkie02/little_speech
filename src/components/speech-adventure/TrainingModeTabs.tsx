"use client";

import DisplayIcon from "@/components/ui/DisplayIcon";
import type { TrainingMode } from "@/lib/child-profile/childProfileStorage";

interface Props {
  activeMode: TrainingMode;
  onModeChange: (mode: TrainingMode) => void;
  disabled?: boolean;
}

const TABS: { mode: TrainingMode; icon: string; label: string }[] = [
  { mode: "speech_clarity", icon: "target", label: "ฝึกเสียงให้ชัด" },
  { mode: "kindergarten_phonics", icon: "star", label: "เรียนเสียงไทย" },
];

export default function TrainingModeTabs({ activeMode, onModeChange, disabled }: Props) {
  return (
    <div className="flex gap-2 p-1 bg-surface border border-border rounded-2xl w-full sm:w-auto">
      {TABS.map(({ mode, icon, label }) => {
        const isActive = activeMode === mode;
        return (
          <button
            key={mode}
            onClick={() => !disabled && onModeChange(mode)}
            disabled={disabled}
            aria-pressed={isActive}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] ${
              isActive
                ? mode === "kindergarten_phonics"
                  ? "bg-amber-500 text-white shadow-sm shadow-amber-500/25"
                  : "bg-primary text-white shadow-sm shadow-primary/25"
                : "text-text-muted hover:text-text hover:bg-bg"
            } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <span aria-hidden="true"><DisplayIcon name={icon} /></span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
