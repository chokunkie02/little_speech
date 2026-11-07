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

const TYPE_LABEL: Record<string, string> = {
  simple_word: "คำ",
  final_consonant: "คำ (มีตัวสะกด)",
  short_sentence: "ประโยค",
};

export default function WordPracticeActivity({ item, onComplete }: Props) {
  const [listened, setListened] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalState | null>(null);
  const recorder = useAudioRecorder();

  const isRecording = recorder.state === "recording";
  const hasRecording = recorder.blob !== null && recorder.state !== "recording";
  const canEvaluate = hasRecording && !evaluating && evalResult === null;
  const canProceed = listened || evalResult !== null;
  const isSentence = item.type === "short_sentence";

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
      {/* Prompt */}
      <div className="text-center space-y-2">
        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
          {TYPE_LABEL[item.type] ?? item.type}
        </p>
        <div className={`font-bold text-text tracking-wide py-2 ${isSentence ? "text-4xl" : "text-7xl"}`}>
          {item.prompt}
        </div>
        <p className="text-sm text-text-muted">{item.instruction}</p>
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
