"use client";

import DisplayIcon from "@/components/ui/DisplayIcon";
import { useState } from "react";
import SampleAudioButton from "@/components/speech-adventure/SampleAudioButton";
import type { PhonicsPracticeItem, PhonicsActivityResult } from "@/types/phonics";

interface Props {
  item: PhonicsPracticeItem;
  onComplete: (result: PhonicsActivityResult) => void;
}

export default function ListenAndChooseActivity({ item, onComplete }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [passed, setPassed] = useState(false);
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const startTimeRef = useState(() => Date.now())[0];

  const handleChoice = (choice: string) => {
    if (passed) return;
    setSelected(choice);

    if (choice === item.correctAnswer) {
      setPassed(true);
    } else {
      setWrongFlash(choice);
      setTimeout(() => {
        setSelected(null);
        setWrongFlash(null);
      }, 700);
    }
  };

  return (
    <div className="space-y-7">
      {/* Prompt header */}
      <div className="text-center space-y-2">
        <p className="text-sm text-text-muted leading-relaxed">{item.instruction}</p>
      </div>

      {/* Sample audio */}
      <div className="flex justify-center">
        <SampleAudioButton
          expectedText={item.sampleAudioText}
          stageId={`phonics-${item.id}`}
        />
      </div>

      {/* Choice grid */}
      {item.choices && (
        <div className="grid grid-cols-2 gap-3">
          {item.choices.map((choice) => {
            const isSelected = selected === choice;
            const isCorrectSelected = isSelected && passed;
            const isWrong = wrongFlash === choice;

            return (
              <button
                key={choice}
                type="button"
                onClick={() => handleChoice(choice)}
                disabled={passed}
                className={`relative flex items-center justify-center h-20 rounded-2xl border-2 text-4xl font-bold transition-all active:scale-[0.95] select-none ${
                  isCorrectSelected
                    ? "border-green-400 bg-green-50 dark:bg-green-950/40 shadow-md shadow-green-200/40 dark:shadow-green-900/30 scale-[1.02]"
                    : isWrong
                    ? "border-red-300 bg-red-50 dark:bg-red-950/30 animate-shake"
                    : passed
                    ? "border-border bg-surface opacity-40 cursor-not-allowed"
                    : "border-amber-200 dark:border-amber-700/60 bg-surface hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 cursor-pointer"
                }`}
                aria-pressed={isSelected}
              >
                <span
                  className={
                    isCorrectSelected
                      ? "text-green-600 dark:text-green-400"
                      : isWrong
                      ? "text-red-500 dark:text-red-400"
                      : "text-text"
                  }
                >
                  {choice}
                </span>

                {isCorrectSelected && (
                  <span
                    className="absolute top-1.5 right-2 text-base"
                    aria-hidden="true"
                  >
                    <DisplayIcon name="check" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Success feedback */}
      {passed && (
        <div className="animate-slide-up rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 px-4 py-3 text-center">
          <p className="font-bold text-green-700 dark:text-green-400 text-base">
            ถูกต้องเลย!
          </p>
          <p className="text-sm text-green-600/80 dark:text-green-500/70 mt-0.5">
            เก่งมาก เสียง <strong>{item.correctAnswer}</strong> ใช่เลย
          </p>
        </div>
      )}

      {/* Next button */}
      <button
        type="button"
        onClick={() =>
          onComplete({
            passed: true,
            score: 100,
            status: "passed",
            feedback: "ถูกต้องเลย!",
            isMock: true,
            durationMs: Date.now() - startTimeRef,
          })
        }
        disabled={!passed}
        className={`w-full py-3.5 rounded-xl text-base font-semibold transition-all active:scale-[0.98] ${
          passed
            ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-300/40"
            : "bg-border/40 text-text-muted/50 cursor-not-allowed"
        }`}
      >
        ถัดไป →
      </button>
    </div>
  );
}
