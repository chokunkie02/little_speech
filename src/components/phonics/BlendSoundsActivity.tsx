"use client";

import { useState } from "react";
import SampleAudioButton from "@/components/speech-adventure/SampleAudioButton";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { evaluateSpeechViaApi } from "@/lib/speech-evaluation/client";
import PhonicsRecordPanel, { type EvalState } from "./PhonicsRecordPanel";
import type { PhonicsPracticeItem, PhonicsActivityResult } from "@/types/phonics";

interface Props {
  item: PhonicsPracticeItem;
  onComplete: (result: PhonicsActivityResult) => void;
}

/** Parse "ก + อา = กา  ..." into parts. Returns null if format unexpected. */
function parseBlendEquation(
  instruction: string,
): { initial: string; vowel: string; result: string } | null {
  const m = instruction.match(/^(.+?)\s*\+\s*(.+?)\s*=\s*([^\s]+)/);
  if (!m) return null;
  return { initial: m[1].trim(), vowel: m[2].trim(), result: m[3].trim() };
}

export default function BlendSoundsActivity({ item, onComplete }: Props) {
  const [listened, setListened] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalState | null>(null);
  const recorder = useAudioRecorder();

  const equation = parseBlendEquation(item.instruction);
  const isRecording = recorder.state === "recording";
  const hasRecording = recorder.blob !== null && recorder.state !== "recording";
  const canEvaluate = hasRecording && !evaluating && evalResult === null;
  const canProceed = listened || evalResult !== null;

  const handleEvaluate = async () => {
    if (!recorder.blob) return;
    setEvaluating(true);
    try {
      const result = await evaluateSpeechViaApi({
        stageId: `phonics-${item.id}`,
        practiceItemId: item.id,
        targetSound: "phonics",
        promptText: item.prompt,
        itemType: item.type,
        durationMs: recorder.durationMs,
        audioBlob: recorder.blob,
        trainingMode: "kindergarten_phonics",
      });
      setEvalResult({ score: result.score, status: result.status as EvalState["status"], feedback: result.feedback, isMock: result.isMock });
      setListened(true);
    } catch {
      setEvalResult({ score: 60, status: "passed", feedback: "ดีมาก ลองอีกครั้งได้เลย", isMock: true });
    } finally {
      setEvaluating(false);
    }
  };

  const handleRetryRecording = () => {
    setEvalResult(null);
    recorder.clearRecording();
  };

  const handleNext = () => {
    const r = evalResult ?? { score: 60, status: "passed" as const, feedback: "ดีมาก!", isMock: true };
    onComplete({ passed: r.status !== "retry", score: r.score, status: r.status, feedback: r.feedback, isMock: r.isMock, durationMs: recorder.durationMs });
  };

  return (
    <div className="space-y-6">
      {/* Blend equation visual */}
      <div className="text-center space-y-3">
        {equation ? (
          <div className="flex items-center justify-center gap-2 sm:gap-3 py-4 overflow-x-auto px-2">
            <div className="flex flex-col items-center flex-shrink-0">
              <span className="text-4xl sm:text-5xl font-bold text-text">{equation.initial}</span>
              <span className="text-xs text-text-muted mt-1">พยัญชนะ</span>
            </div>
            <span className="text-2xl sm:text-3xl text-amber-400 font-light flex-shrink-0">+</span>
            <div className="flex flex-col items-center flex-shrink-0">
              <span className="text-4xl sm:text-5xl font-bold text-text">{equation.vowel}</span>
              <span className="text-xs text-text-muted mt-1">สระ</span>
            </div>
            <span className="text-2xl sm:text-3xl text-amber-400 font-light flex-shrink-0">=</span>
            <div className="flex flex-col items-center flex-shrink-0">
              <span className="text-5xl sm:text-6xl font-bold text-amber-600 dark:text-amber-400">
                {equation.result}
              </span>
              <span className="text-xs text-text-muted mt-1">พยางค์</span>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <div className="text-7xl font-bold text-amber-600 dark:text-amber-400">
              {item.prompt}
            </div>
            <p className="text-sm text-text-muted mt-2">{item.instruction}</p>
          </div>
        )}
      </div>

      {/* Sample audio */}
      <div className="flex justify-center">
        <SampleAudioButton
          expectedText={item.sampleAudioText}
          stageId={`phonics-${item.id}`}
          onPlayed={() => setListened(true)}
        />
      </div>

      {/* Record / Evaluate / Next */}
      <PhonicsRecordPanel
        recorderState={recorder.state}
        hasRecording={hasRecording}
        isRecording={isRecording}
        onStartRecording={recorder.startRecording}
        onStopRecording={recorder.stopRecording}
        onPlayRecording={recorder.playRecording}
        onClearRecording={recorder.clearRecording}
        evaluating={evaluating}
        evalResult={evalResult}
        canEvaluate={canEvaluate}
        onEvaluate={handleEvaluate}
        onRetryRecording={handleRetryRecording}
        canProceed={canProceed}
        onNext={handleNext}
      />
    </div>
  );
}
