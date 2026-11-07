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

export default function SayAfterMeActivity({ item, onComplete }: Props) {
  const [listened, setListened] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalState | null>(null);
  const recorder = useAudioRecorder();

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
      setEvalResult({ score: 60, status: "passed", feedback: "ลองอีกครั้งได้เลยนะ", isMock: true });
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
      {/* Prompt */}
      <div className="text-center space-y-2">
        <div className="text-7xl font-bold text-amber-600 dark:text-amber-400 tracking-wider py-2">
          {item.prompt}
        </div>
        <p className="text-sm text-text-muted">{item.instruction}</p>
      </div>

      {/* Step 1: Listen */}
      <div className="flex justify-center">
        <SampleAudioButton
          expectedText={item.sampleAudioText}
          stageId={`phonics-${item.id}`}
          onPlayed={() => setListened(true)}
        />
      </div>

      {/* Step 2: Record / Evaluate / Next */}
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
