import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { AssessmentResult } from "@/lib/assessment/policy";
import { submitStudioAssessment } from "./assessment-client";
import { now, uid } from "./domain";
import type { Attempt, Item, Review, Session } from "./types";

/** Children saved centrally have a UUID id; demo/guest children stay in the browser only. */
export const CENTRAL_CHILD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RECORDING_EVENT = "speech-adventure:recording";
const announceRecording = (on: boolean) => {
  window.dispatchEvent(new CustomEvent(RECORDING_EVENT, { detail: on }));
};

/** Values a screen can decide at the moment it saves, before its own state has re-rendered. */
export interface SaveOverrides {
  choice?: string;
  review?: Review;
  support?: Attempt["support"];
  demo?: boolean;
}

/**
 * Recording, central assessment and saving for one practice item. Shared by the classic practice
 * screen and the kid screens so both record exactly the same attempt.
 */
export function usePracticeItem({
  session,
  item,
  onSave,
  stopSpeaker,
}: {
  session: Session;
  item: Item | undefined;
  onSave: (a: Attempt) => void;
  stopSpeaker: () => void;
}) {
  const { user } = useAuth();
  const [choice, setChoice] = useState<string | null>(
    () =>
      session.attempts.find((a) => a.itemId === session.itemIds[session.index])
        ?.choiceId ?? null,
  );
  const [support, setSupport] = useState<Attempt["support"]>(
    ["imitate", "syllables", "blend"].includes(session.stageId)
      ? "modeled"
      : "independent",
  );
  const [review, setReview] = useState<Review>("pending");
  const [retries, setRetries] = useState(0);
  const [demo, setDemo] = useState(false);
  const [recording, setRecording] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [audio, setAudio] = useState("");
  const [recordedBlob, setRecordedBlob] = useState<Blob>();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [assessment, setAssessment] = useState<AssessmentResult>();
  const [assessmentBusy, setAssessmentBusy] = useState(false);
  const [assessmentMessage, setAssessmentMessage] = useState("");
  const saveRequestId = useRef("");
  const saveRequestInput = useRef("");
  const [micError, setMicError] = useState("");
  /** "denied" | "unsupported" | "failed" once the microphone could not be used, so screens can switch to tap mode. */
  const [micProblem, setMicProblem] = useState<"" | "denied" | "unsupported" | "failed">("");
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const urlRef = useRef("");
  const recordedPlayer = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const mounted = useRef(true);

  useEffect(() => {
    announceRecording(recording || requesting);
    return () => announceRecording(false);
  }, [recording, requesting]);
  const saved = item ? session.attempts.find((a) => a.itemId === item.id) : undefined;
  useEffect(() => {
    // React Strict Mode runs setup/cleanup twice in development.
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearInterval(timerRef.current);
      if (mediaRef.current) {
        mediaRef.current.onstop = null;
        if (mediaRef.current.state === "recording") mediaRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  async function record() {
    stopSpeaker();
    recordedPlayer.current?.pause();
    announceRecording(true);
    setMicError("");
    setRequesting(true);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMicError("เครื่องนี้ยังอัดเสียงไม่ได้ ใช้ปุ่มทดลองโดยไม่อัดเสียงได้");
      setMicProblem("unsupported");
      announceRecording(false);
      setRequesting(false);
      return;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = mediaStream;
      setStream(mediaStream);
      const media = new MediaRecorder(mediaStream);
      mediaRef.current = media;
      const parts: BlobPart[] = [];
      media.ondataavailable = (e) => {
        if (e.data.size) parts.push(e.data);
      };
      media.onstop = () => {
        clearInterval(timerRef.current);
        mediaStream.getTracks().forEach((t) => t.stop());
        if (!mounted.current) return;
        setStream(null);
        const blob = new Blob(parts, { type: media.mimeType || "audio/webm" });
        if (!blob.size) {
          setMicError("ยังไม่ได้เสียง ลองอีกครั้งหรือใช้โหมดทดลอง");
          setRecording(false);
          return;
        }
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(blob);
        setAudio(urlRef.current);
        setRecordedBlob(blob);
        setRecording(false);
        setDemo(false);
      };
      media.onerror = () => {
        clearInterval(timerRef.current);
        mediaStream.getTracks().forEach((t) => t.stop());
        setStream(null);
        setMicError("อัดเสียงไม่สำเร็จ ลองใหม่ได้");
        setMicProblem("failed");
        setRecording(false);
      };
      setAudio("");
      setRecordedBlob(undefined);
      setAssessment(undefined);
      setAssessmentMessage("");
      setDemo(false);
      setElapsed(0);
      setMicProblem("");
      media.start();
      setRecording(true);
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds++;
        setElapsed(seconds);
        if (seconds >= 30 && media.state === "recording") media.stop();
      }, 1000);
    } catch (e) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setStream(null);
      setRecording(false);
      announceRecording(false);
      const denied = e instanceof DOMException && e.name === "NotAllowedError";
      setMicProblem(denied ? "denied" : "failed");
      setMicError(
        denied
          ? "ยังไม่ได้รับสิทธิ์ไมค์ เลือกอนุญาตจากเบราว์เซอร์ หรือใช้โหมดทดลองได้"
          : "เปิดไมค์ไม่สำเร็จ ตรวจว่าเสียบไมค์แล้ว หรือใช้โหมดทดลองได้",
      );
    } finally {
      if (mounted.current) setRequesting(false);
    }
  }
  const stopRecording = () => {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
  };
  function resetAudio() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = "";
    setAudio("");
    setRecordedBlob(undefined);
    setAssessment(undefined);
    setAssessmentMessage("");
    setDemo(false);
    setRetries((v) => v + 1);
  }
  function chooseDemo() {
    setDemo(true);
    setAudio("");
    setRecordedBlob(undefined);
    setAssessment(undefined);
    setMicError("");
  }

  const attachPlayer = (el: HTMLAudioElement | null) => {
    recordedPlayer.current = el;
  };
  const playRecording = () => {
    stopSpeaker();
    const player = recordedPlayer.current;
    if (!player) return;
    player.currentTime = 0;
    void player.play().catch(() => {});
  };
  const pauseRecording = () => recordedPlayer.current?.pause();

  const isChoice = item?.kind === "choice";
  const correctFor = (picked: string | null) => saved?.choiceCorrect ?? picked === item?.answer;
  const correct = correctFor(choice);

  const save = async (overrides: SaveOverrides = {}) => {
    if (!item || assessmentBusy) return;
    const picked = overrides.choice ?? choice;
    const isDemo = overrides.demo ?? demo;
    const adultReview = overrides.review ?? review;
    const tried = overrides.support ?? support;
    const isCorrect = correctFor(picked);
    let assessed = assessment;
    // The central copy is best effort: a child is never stuck on an item because the assessment
    // service is unreachable, rate-limited or not deployed. The attempt is still saved locally.
    // A recorded speech attempt that was not checked yet still goes to the central record, as waiting
    // for an adult (no audio is sent), so it reaches the teacher's queue and the child's progress.
    // Simulated answers ("ทดลองตอบโดยไม่อัดเสียง") stay local, like before.
    const unsentSpeech = item.kind === "speech" && !assessed && !isDemo && !!recordedBlob;
    if (user && CENTRAL_CHILD_ID.test(session.childId) && (isChoice || item.kind === "observation" || unsentSpeech)) {
      setAssessmentBusy(true);
      setAssessmentMessage("");
      try {
        const inputKey = JSON.stringify({ choice: picked, review: adultReview, unsentSpeech });
        if (!saveRequestId.current || saveRequestInput.current !== inputKey) {
          saveRequestId.current = uid();
          saveRequestInput.current = inputKey;
        }
        assessed = await submitStudioAssessment(session, item, saveRequestId.current, {
          selectedChoice: isChoice ? picked ?? undefined : undefined,
          adultReview: item.kind === "observation" ? adultReview : undefined,
          adultOnly: unsentSpeech || undefined,
        });
        setAssessment(assessed);
      } catch {
        setAssessmentMessage("บันทึกในเครื่องแล้ว แต่ยังส่งผลเข้าศูนย์ประเมินไม่ได้");
      }
      setAssessmentBusy(false);
    }
    if (isChoice && isCorrect)
      window.dispatchEvent(new CustomEvent("speech-adventure:chime", { detail: "success" }));
    onSave({
      id: uid(),
      itemId: item.id,
      createdAt: now(),
      kind: item.kind,
      mode: isChoice
        ? "choice"
        : item.kind === "observation"
          ? "observation"
          : isDemo
            ? "demo"
            : "recording",
      choiceId: isChoice ? (picked ?? undefined) : undefined,
      choiceCorrect: isChoice ? isCorrect : undefined,
      support: isChoice ? "independent" : tried,
      review: isChoice
        ? isCorrect ? "achieved" : "practice"
        : item.kind === "observation"
          ? adultReview
          : // Speech: the adult's tap in the kid screen counts like the review screen; otherwise it waits.
            overrides.review ?? "pending",
      retries,
      assessment: assessed,
    });
  };

  return {
    user,
    saved,
    isChoice,
    correct,
    choice,
    setChoice,
    support,
    setSupport,
    review,
    setReview,
    retries,
    setRetries,
    demo,
    chooseDemo,
    recording,
    requesting,
    elapsed,
    audio,
    recordedBlob,
    stream,
    /** Ref callback for the <audio> element that plays the child's recording. */
    attachPlayer,
    playRecording,
    pauseRecording,
    assessment,
    setAssessment,
    assessmentBusy,
    setAssessmentBusy,
    assessmentMessage,
    micError,
    micProblem,
    record,
    stopRecording,
    resetAudio,
    save,
    /** Whether this child's results also go to the central record (signed in, real child). */
    central: !!user && CENTRAL_CHILD_ID.test(session.childId),
  };
}

export type PracticeItem = ReturnType<typeof usePracticeItem>;
