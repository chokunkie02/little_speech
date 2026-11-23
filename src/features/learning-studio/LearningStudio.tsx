"use client";
import "./studio.generated.css";
import "./host-theme.css";
import "./today.css";
import { useStudioResultSync } from "./useStudioResultSync";
import { CENTRAL_CHILD_ID, usePracticeItem } from "./usePracticeItem";
import { KidPractice } from "./kid/KidPractice";
import { usePracticeUi } from "./kid/preferences";
import { KidFinale, KidMap, KidRoundEnd, KidStart, KidTravel, MAP_TIPS_KEY } from "./kid/KidScreens";
import { KidHomeContext } from "./kid/KidShell";
import { KidStickerBook, readSeenStickers } from "./kid/StickerBook";
import { stickerBook, stickersOfRound } from "./kid/stickers";
import { PrintCenter, type PrintKind } from "./print/PrintCenter";
import { GuideFaq, GuideWalkthrough } from "./guide/GuideWalkthrough";
import { gameFor } from "./kid/games";
import { WaitingReviews } from "./WaitingReviews";
import AssessmentControls from "@/components/assessment/AssessmentControls";
import AssessmentResultCard from "@/components/assessment/AssessmentResultCard";
import RoundAdvice from "./RoundAdvice";
import {
  createStudioState,
  studioStorageKey,
  type StudioChild,
} from "./integration";
import React, { useState, useEffect, useMemo, useRef, useEffectEvent } from "react";
import {
  Home,
  Map,
  BookOpen,
  BarChart3,
  SlidersHorizontal,
  ArrowRight,
  ArrowLeft,
  Play,
  Volume2,
  Mic,
  MicOff,
  Check,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Star,
  Sparkles,
  Flag,
  Ear,
  MessageCircle,
  Music2,
  Puzzle,
  Smile,
  X,
  Download,
  Printer,
  RotateCcw,
  Search,
  FileText,
  Users,
  ShieldCheck,
  AlertCircle,
  Square,
  Heart,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import { PageHeader } from "@/components/ui/PageLayout";

/** Stage colours are bright fills; as text they are mixed with the theme text colour to stay readable (WCAG AA). */
const stageInk = (color: string) => `color-mix(in srgb, ${color} 50%, var(--text))`;
import type {
  AppState,
  Route,
  Plan,
  Stage,
  Item,
  Session,
  Attempt,
  Review,
  Track,
  LearningEvent,
} from "./types";
import {
  startSession,
  saveAttempt,
  advanceSession,
  metrics,
  uid,
  now,
} from "./domain";
import { getStages, TRACKS, SOUNDS } from "./curriculum";
import { Art, Landscape } from "./Art";

import { MusicRoom } from "./MusicRoom";
import { MouthCoach } from "./MouthCoach";
import { LevelPicker } from "./LevelPicker";
import { getLevel, type LearningLevelId } from "./learning-levels";
import { useSpeaker, VOICE_CUES } from "./useSpeaker";
const icons: Record<string, React.ComponentType<LucideProps>> = {
  home: Home,
  print: Printer,
  path: Map,
  library: BookOpen,
  progress: BarChart3,
  plan: SlidersHorizontal,
  guide: HelpCircle,
  ear: Ear,
  mouth: Smile,
  music: Music2,
  book: BookOpen,
  chat: MessageCircle,
  speech: MessageCircle,
  sparkle: Sparkles,
  flag: Flag,
  puzzle: Puzzle,
};
function Icon({ name, ...props }: { name: string } & LucideProps) {
  const I = icons[name] ?? Sparkles;
  return <I size={20} strokeWidth={1.8} {...props} />;
}
/** Monday to Sunday of this week, marking the days a round was finished. */
function practiceWeek(rounds: Session[]) {
  const today = new Date();
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const played = new Set(rounds.filter((r) => r.completedAt).map((r) => key(new Date(r.completedAt!))));
  return ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((label, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return { key: key(day), label, played: played.has(key(day)), today: key(day) === key(today) };
  });
}
const date = (v: string) =>
  new Date(v).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
const routeFromHash = (): Route => {
  if (typeof window === "undefined") return "home";
  const s = location.hash.replace("#", "").split("?")[0];
  return [
    "home",
    "path",
    "library",
    "progress",
    "plan",
    "practice",
    "summary",
    "guide",
    "play",
    "celebrate",
    "finale",
    "stickers",
    "print",
    "demo",
  ].includes(s)
    ? (s as Route)
    : "home";
};
function download(name: string, data: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button {...props} className={`button ${variant} ${className}`}>
      {children}
    </button>
  );
}
function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Flag />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeEffect = useEffectEvent(onClose);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector(".mouth-zoom"))
        closeEffect();
      if (e.key === "Tab" && ref.current) {
        const nodes = Array.from(
          ref.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]),input,textarea,select,a[href],[tabindex="0"]',
          ),
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus();
    };
  }, []);
  return (
    <div className="modal-shade" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="ปิดหน้าต่าง"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function SectionHead({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {body && <p>{body}</p>}
      </div>
      {action}
    </div>
  );
}
function Stat({
  icon,
  label,
  value,
  detail,
  color = "purple",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail?: string;
  color?: string;
}) {
  return (
    <div className="stat">
      <span className={`stat-icon ${color}`}>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {detail && <span className="stat-detail">{detail}</span>}
      </div>
    </div>
  );
}
export interface LearningStudioProps {
  onEvent?: (event: LearningEvent) => void;
  child?: StudioChild;
  accountId?: string;
  allowExport?: boolean;
  syncToSchool?: boolean;
}
export function LearningStudio({
  onEvent,
  child,
  accountId,
  allowExport = true,
  syncToSchool = false,
}: LearningStudioProps) {
  const homeSpeaker = useSpeaker();
  const stopHomeSpeaker = homeSpeaker.stop;
  const storageKey = studioStorageKey(accountId, child?.id);
  const [state, setState] = useState<AppState>(() => {
    try {
      return createStudioState(localStorage.getItem(storageKey), child);
    } catch {
      return createStudioState(null, child);
    }
  });
  const sync = useStudioResultSync(syncToSchool ? child?.id : undefined, accountId, state.sessions);
  const stateRef = useRef(state);
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [toast, setToast] = useState("");
  const [preview, setPreview] = useState<{ item: Item; stage: Stage } | null>(
    null,
  );
  const [startRequest, setStartRequest] = useState<{
    stage: Stage;
    ids?: string[];
    /** Page it was asked from: the start screen only shows there (Back must not leave it on top). */
    route: Route;
  } | null>(null);
  /** Cutscene from the stage just finished to the next one (kid screens), on the page it was asked from. */
  /** Which sheet the print page opens on (the end-of-adventure screen asks for the certificate). */
  const [printKind, setPrintKind] = useState<PrintKind>("stickers");
  const openPrint = (kind: PrintKind) => {
    setPrintKind(kind);
    go("print");
  };
  const [travel, setTravel] = useState<{ from: Stage; to: Stage; route: Route } | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [practiceUi, setPracticeUi] = usePracticeUi();
  const kidMode = practiceUi === "kid";
  const PracticeView = kidMode ? KidPractice : Practice;
  const commit = (
    next: AppState,
    event?: Omit<LearningEvent, "childId" | "planId">,
  ) => {
    stateRef.current = next;
    setState(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setToast(
        "พื้นที่เก็บข้อมูลไม่พร้อม ผลยังอยู่ในหน้านี้ แต่ปิดแล้วอาจหายได้",
      );
    }
    window.dispatchEvent(
      new CustomEvent("speech-adventure:studio-state", {
        detail: { storageKey },
      }),
    );
    if (event) {
      const ev: LearningEvent = {
        ...event,
        childId: next.plan.childId,
        planId: next.plan.id,
      };
      onEvent?.(ev);
      window.dispatchEvent(
        new CustomEvent("speech-adventure:learning", { detail: ev }),
      );
    }
  };
  useEffect(() => {
    const fn = () => {
      setRoute(routeFromHash());
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  useEffect(() => {
    stopHomeSpeaker();
  }, [route, stopHomeSpeaker]);
  const go = (r: Route) => {
    if (location.hash !== "#" + r) window.history.pushState(null, "", "#" + r);
    setRoute(r);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const stages = getStages(
    state.plan.track,
    state.plan.sound,
    state.plan.level,
  );
  const active = state.sessions.find(
    (s) =>
      s.id === state.activeSessionId &&
      s.status === "active" &&
      s.childId === state.plan.childId,
  );
  const completed = state.sessions.filter(
    (s) => s.status === "completed" && s.childId === state.plan.childId,
  );
  const currentIndex = Math.max(
    0,
    stages.findIndex((s) => s.id === state.plan.startStage),
  );
  const currentStage = stages[currentIndex];
  const start = (stage: Stage, ids?: string[]) => {
    const selected =
      ids ??
      state.plan.selectedItems.filter((id) =>
        stage.items.some((i) => i.id === id),
      );
    const r = startSession(
      stateRef.current,
      stage,
      selected.length ? selected : undefined,
    );
    commit(r.state, {
      type: "session.started",
      sessionId: r.session.id,
      payload: r.session,
    });
    setStartRequest(null);
    go("practice");
  };
  const begin = (stage: Stage, ids?: string[]) => {
    if (kidMode || stage.items.some((i) => i.kind !== "choice"))
      setStartRequest({ stage, ids, route });
    else start(stage, ids);
  };
  const finishedStages = new Set(
    completed.filter((x) => x.planId === state.plan.id).map((x) => x.stageId),
  );
  const nextStage =
    [...stages.slice(currentIndex), ...stages.slice(0, currentIndex)].find(
      (s) => !finishedStages.has(s.id),
    ) ?? currentStage;
  /** Kid screens move forward from the stage just played: the very next one (none after the last). */
  const stageAfter = (stageId: string) => {
    const i = stages.findIndex((s) => s.id === stageId);
    return i < 0 ? undefined : stages[i + 1];
  };
  const lastPlayed = completed
    .filter((x) => x.planId === state.plan.id)
    .reduce<Session | undefined>((a, b) => (!a || (b.completedAt ?? "") > (a.completedAt ?? "") ? b : a), undefined);
  /** Where พี่ปู waits on the map: after the last stage played; from the start when the round of stages is done. */
  const mapNext = (lastPlayed && stageAfter(lastPlayed.stageId)) ?? (lastPlayed ? stages.find((s) => !finishedStages.has(s.id)) ?? stages[0] : nextStage);
  const continueLearning = () => {
    // The kid screens always open on the adventure map, which shows where the child is (a paused round
    // included) before anything starts.
    if (kidMode) {
      go("play");
      return;
    }
    if (active) {
      go("practice");
      return;
    }
    begin(nextStage);
  };
  /** The paused round's stage on this plan's map, if any. */
  const activeStage = active ? stages.find((s) => s.id === active.stageId) : undefined;
  const sessionForSummary = state.sessions.find(
    (s) => s.id === state.lastCompletedId && s.childId === state.plan.childId,
  );
  /** The round-end "ด่านต่อไป": the stage after the one just finished (none after the last stage). */
  const roundNext = sessionForSummary ? stageAfter(sessionForSummary.stageId) : undefined;
  const roundStage = sessionForSummary ? stages.find((s) => s.id === sessionForSummary.stageId) : undefined;
  /** Stars: one per activity tried, over every round the child finished (same as the map and sidebar). */
  const starTotal = completed.reduce((n, x) => n + x.attempts.length, 0);
  /** Items still waiting for an adult's result (same rule as the results page and its stats). */
  const waitingSpeech = completed.flatMap((x) => x.attempts).filter((a) => a.kind !== "choice" && a.review === "pending").length;
  const week = practiceWeek(completed);
  /** The child's sticker book, worked out from every round they played (nothing new is stored). */
  const stickers = useMemo(() => stickerBook(state.sessions, state.plan.childId), [state.sessions, state.plan.childId]);
  /**
   * "ลองเล่น 1 ข้อ" from the guide: one real game item (stepping stones when the plan has them) on a
   * throwaway round. It is never stored, and its child id is not an account child, so nothing is sent.
   */
  const makeDemoSession = (): Session | null => {
    const stage =
      stages.find((s) => s.items.some((i) => gameFor(i) === "stones")) ?? stages.find((s) => s.items.some((i) => i.kind === "speech")) ?? stages[0];
    const item = stage?.items.find((i) => gameFor(i) === "stones") ?? stage?.items.find((i) => i.kind === "speech") ?? stage?.items[0];
    if (!stage || !item) return null;
    return {
      id: "guide-demo",
      childId: "guide-demo",
      planId: "guide-demo",
      track: state.plan.track,
      sound: state.plan.sound,
      level: state.plan.level,
      stageId: stage.id,
      stageLabel: stage.label,
      itemIds: [item.id],
      index: 0,
      attempts: [],
      status: "active",
      startedAt: new Date(0).toISOString(),
    };
  };
  const demoSession = route === "demo" ? makeDemoSession() : null;
  /** One adult result from the waiting list: saved like the review dialog, one attempt at a time. */
  const reviewOne = (sessionId: string, attemptId: string, review: Exclude<Review, "pending">) => {
    const next = {
      ...state,
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, attempts: s.attempts.map((a) => (a.id === attemptId ? { ...a, review } : a)) } : s,
      ),
    };
    commit(next, { type: "review.saved", sessionId, payload: next.sessions.find((s) => s.id === sessionId) });
    setToast(review === "achieved" ? "บันทึกแล้ว: ทำได้" : review === "practice" ? "บันทึกแล้ว: ยังต้องฝึก" : "บันทึกแล้ว: ประเมินไม่ได้");
  };
  const endDemo = () => {
    // Replace #demo in history, so Back from the guide does not start the demo again.
    window.history.replaceState(null, "", "#guide");
    go("guide");
    setToast("จบการลองเล่นแล้ว · ข้อนี้ไม่ได้บันทึกผล");
  };
  /** Latest finished round of each stage in this plan, for the end-of-adventure summary. */
  const latestRounds = new globalThis.Map<string, Session>();
  for (const round of completed.filter((x) => x.planId === state.plan.id)) {
    const seen = latestRounds.get(round.stageId);
    if (!seen || (round.completedAt ?? "") > (seen.completedAt ?? "")) latestRounds.set(round.stageId, round);
  }
  const reviewSession = state.sessions.find((s) => s.id === reviewId);
  // Five tabs plus help. The library stays a tab: it is where adults see every activity, preview one and
  // play a single item. The stage path is one link away (แผนวันนี้, จัดชุดฝึก); the kid map is the
  // child's path.
  const nav = [
    { id: "home", label: "แผนวันนี้" },
    { id: "library", label: "คลังกิจกรรม" },
    { id: "progress", label: "ผลการฝึก" },
    { id: "print", label: "สติกเกอร์และพิมพ์" },
    { id: "plan", label: "จัดชุดฝึก" },
    { id: "guide", label: "คู่มือ" },
  ] as const;
  const navCurrent = (id: string) =>
    route === id || (id === "plan" && route === "path") || (id === "home" && route === "summary");
  // Phones scroll the tab bar sideways: keep the current tab in sight when a page opens.
  useEffect(() => {
    document.querySelector(".studio-nav [aria-current=\"page\"]")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [route]);
  /** The kid screens' home button: back to the studio home (a round in progress stays paused). */
  const goHome = () => {
    setStartRequest(null);
    setTravel(null);
    go("home");
  };
  return (
    <KidHomeContext.Provider value={goHome}>
    <div className="app-shell">
      <audio
        data-sample-player="true"
        className="sample-audio-element"
        preload="none"
        aria-hidden="true"
      />
      <div className="main-shell">
        <header className="studio-header print:hidden">
          <PageHeader className="studio-page-header" icon={<Map size={20} />} title="ฝึกและเรียน"
            description={route !== "practice" && (
              <span role="status">
                {syncToSchool
                  ? sync.status === "saving" ? "กำลังบันทึกผลฝึกเข้าระบบ…"
                    : sync.status === "saved"
                      ? sync.teacherConfirms
                        ? "บันทึกผลฝึกเข้าระบบแล้ว · ครูประจำห้องเป็นผู้ยืนยันผลการพูด ผลที่ผู้ใหญ่ให้ไว้ใช้ในเครื่องนี้"
                        : "บันทึกผลฝึกเข้าความก้าวหน้าและรายงานแล้ว"
                      : sync.status === "error" ? "ผลอยู่ในเครื่องนี้ ยังส่งเข้าระบบไม่สำเร็จ"
                        : "รอบที่ฝึกจบจะบันทึกเข้าความก้าวหน้าและรายงาน"
                  : "โหมดนี้เก็บผลฝึกในเบราว์เซอร์ที่ใช้งาน"}
                {sync.status === "error" && <button type="button" className="ml-2 font-semibold text-primary underline" onClick={sync.retry}>ลองส่งผลอีกครั้ง</button>}
              </span>
            )}
            actions={<MusicRoom />} />
          {route !== "practice" && <nav aria-label="เมนูห้องฝึกการพูด" className="studio-nav">
            {nav.map((item) => (
              <button key={item.id} type="button" onClick={() => (item.id === "print" ? openPrint("stickers") : go(item.id))}
                className={item.id === "guide" ? "studio-nav-help" : undefined}
                aria-current={navCurrent(item.id) ? "page" : undefined}>
                <Icon name={item.id} size={17} />
                {item.label}
              </button>
            ))}
          </nav>}
        </header>
        {child?.targetSound && !Object.keys(SOUNDS).includes(child.targetSound) && (
          <div className="studio-context-note" role="status">
            โปรไฟล์หลักเลือกเสียง {child.targetSound} ห้องนี้มีชุดคำเสียง ป ก ม
            และกำลังใช้กลุ่มเสียง {state.plan.sound} เลือกชุดอื่นได้ใน “จัดชุดฝึก”
          </div>
        )}
        <section
          className={`content ${route === "practice" ? "practice-content" : ""}`}
          aria-label="ห้องฝึกการพูด"
        >
          {route === "home" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <p className="hero-learner">{state.plan.childName} · {TRACKS[state.plan.track].label} · เสียง {state.plan.sound}</p>
                  <h2>{kidMode ? "พร้อมผจญภัยวันนี้" : "ฝึกตามแผนวันนี้"}</h2>
                  <p>
                    {getLevel(state.plan.level).label} · ฟังตัวอย่าง แล้วลองทำกิจกรรมทีละข้อ
                  </p>
                  <Button onClick={continueLearning}>
                    {active ? <RefreshCw size={17} /> : <Play size={17} />}{" "}
                    {active ? "กลับมาฝึกต่อ" : kidMode ? "เข้าโลกของพี่ปู" : "เริ่มภารกิจวันนี้"}
                    <ArrowRight size={17} />
                  </Button>
                  <div className="hero-voice">
                    <button
                      className="text-button"
                      onClick={() => homeSpeaker.speak(VOICE_CUES.welcome)}
                    >
                      <Volume2 size={16} />
                      ฟังเสียงทักทาย
                    </button>
                    {homeSpeaker.speaking && (
                      <button className="voice-stop" onClick={homeSpeaker.stop}>
                        <Square size={12} />
                        หยุดเสียง
                      </button>
                    )}
                  </div>
                  {homeSpeaker.message && (
                    <p className="notice" role="status">
                      {homeSpeaker.message}
                    </p>
                  )}
                  <small>
                    {active
                      ? `พักไว้ที่ ${active.stageLabel} · ข้อ ${active.index + 1}/${active.itemIds.length}`
                      : "รอบสั้น ๆ · มีผู้ใหญ่ช่วยได้ · ไม่ต้องรีบ"}
                  </small>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <Landscape />

                  <Art
                    kind={SOUNDS[state.plan.sound as keyof typeof SOUNDS]?.hero}
                    animate
                  />
                  <div className="hero-star one">✦</div>
                  <div className="hero-star two">✧</div>
                </div>
              </section>
              <div className="today-strip" aria-label="สรุปสั้น ๆ">
                <span>
                  <Star size={16} />
                  ดาว {starTotal}
                </span>
                <span>
                  <BookOpen size={16} />
                  สติกเกอร์ {stickers.owned.size}
                </span>
                <span>
                  <Flag size={16} />
                  ด่านต่อไป: {mapNext.label}
                </span>
              </div>
              <div className="today-todo">
                {waitingSpeech > 0 && (
                  <button type="button" className="panel today-card" onClick={() => go("progress")}>
                    <span className="today-card-icon">
                      <Ear size={20} />
                    </span>
                    <span>
                      <b>{sync.teacherConfirms ? `ครูประจำห้องจะฟัง ${waitingSpeech} ข้อ` : `รอผู้ใหญ่ฟัง ${waitingSpeech} ข้อ`}</b>
                      <small>{sync.teacherConfirms ? "ดูรายการได้ที่ผลการฝึก" : "แตะผลได้เลยที่หน้าผลการฝึก"}</small>
                    </span>
                    <ArrowRight size={17} />
                  </button>
                )}
                <button type="button" className="panel today-card" onClick={() => openPrint(stickers.owned.size ? "stickers" : "cards")}>
                  <span className="today-card-icon">
                    <Printer size={20} />
                  </span>
                  <span>
                    <b>{stickers.owned.size ? `สติกเกอร์ ${stickers.owned.size} ดวง` : `บัตรคำฝึกเสียง ${state.plan.sound}`}</b>
                    <small>{stickers.owned.size ? "พิมพ์ให้น้องติดสมุดจริงได้" : "พิมพ์ไปเล่นต่อที่บ้านได้"}</small>
                  </span>
                  <ArrowRight size={17} />
                </button>
                <section className="panel today-week" aria-label="สัปดาห์นี้">
                  <b>สัปดาห์นี้</b>
                  <span className="today-days">
                    {week.map((d) => (
                      <i key={d.key} className={`${d.played ? "on" : ""}${d.today ? " now" : ""}`} title={d.played ? "ได้เล่นแล้ว" : undefined}>
                        {d.label}
                      </i>
                    ))}
                  </span>
                  <small>{week.filter((d) => d.played).length ? `เล่นแล้ว ${week.filter((d) => d.played).length} วัน` : "ยังไม่ได้เล่นสัปดาห์นี้"}</small>
                </section>
              </div>
              <section className="panel tip-card">
                <span className="tip-illustration">
                  <Smile size={37} />
                </span>
                <span className="eyebrow">ถึงคนข้าง ๆ</span>
                <h3>เว้นจังหวะให้หนูได้ลอง</h3>
                <p>
                  ฟังไปด้วยกัน ชมเมื่อเด็กพยายาม
                  และให้ตัวอย่างเมื่อขอความช่วยเหลือ
                </p>
                <button className="text-button" onClick={() => go("guide")}>
                  ดูพี่ปูสอนเล่น <ArrowRight size={15} />
                </button>
              </section>
              <div className="today-links">
                <button className="text-button" onClick={() => go("path")}>
                  รายการด่านทั้งหมด <ArrowRight size={15} />
                </button>
                <button className="text-button" onClick={() => go("library")}>
                  ดูกิจกรรมทั้งหมดในคลัง <ArrowRight size={15} />
                </button>
              </div>
              <div className="bottom-note">
                <ShieldCheck size={16} />
                กิจกรรมเพื่อทดลองการใช้งาน ผลการพูดให้ผู้ใหญ่ช่วยสังเกต
                AI ช่วยฟังได้เฉพาะเมื่อเปิดใช้และผู้ใหญ่กดยินยอม
              </div>
            </>
          )}
          {route === "path" && (() => {
            const doneStages = stages.filter((st) => completed.some((s) => s.planId === state.plan.id && s.stageId === st.id)).length;
            return (
            <>
              <SectionHead
                eyebrow="เส้นทางการฝึก"
                title="เส้นทางของฉัน"
                body="เริ่มตรงที่พร้อม พักเมื่ออยากพัก แล้วกลับมาได้เสมอ"
                action={
                  <Button variant="secondary" onClick={() => go("plan")}>
                    <SlidersHorizontal size={16} />
                    ปรับจุดเริ่ม
                  </Button>
                }
              />
              <div className="path-summary">
                <span className="plan-symbol">
                  {state.plan.track === "speech" ? (
                    state.plan.sound
                  ) : (
                    <Icon name={TRACKS[state.plan.track].icon} />
                  )}
                </span>
                <div>
                  <h3>
                    {TRACKS[state.plan.track].label}
                    {state.plan.track === "speech"
                      ? ` · เสียง ${state.plan.sound}`
                      : ""}
                  </h3>
                  <p>
                    ทำกิจกรรมครบ {doneStages}/{stages.length} ช่วง · “ทำครบ” แสดงการเข้าร่วม
                    ไม่ใช่การผ่านทักษะ
                  </p>
                  <div className="path-meter" role="progressbar" aria-label="ช่วงที่ทำครบ" aria-valuemin={0} aria-valuemax={stages.length} aria-valuenow={doneStages}>
                    <i style={{ width: `${stages.length ? (doneStages / stages.length) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="path-count" aria-hidden="true"><strong>{doneStages}</strong>/{stages.length}</div>
              </div>
              <div className="journey">
                {stages.map((stage, i) => {
                  const current = stage.id === active?.stageId || (!active && stage.id === state.plan.startStage);
                  const done = completed.some(
                    (s) => s.planId === state.plan.id && s.stageId === stage.id,
                  );
                  return (
                    <div className="journey-row" key={stage.id}>
                      <div
                        className={`journey-number ${done ? "done" : ""}`}
                        style={
                          {
                            "--stage-color": stage.color,
                          } as React.CSSProperties
                        }
                      >
                        {done ? <Check size={23} /> : i + 1}
                      </div>
                      <div className={`journey-card ${current ? "is-current" : ""}`}>
                        <div
                          className="journey-icon"
                          style={{
                            background: stage.color + "18",
                            color: stage.color,
                          }}
                        >
                          <Icon name={stage.icon} size={28} />
                        </div>
                        <div className="journey-info">
                          <span className="eyebrow">
                            ขั้นที่ {i + 1}
                          </span>
                          <h2>{stage.label}</h2>
                          <p>{stage.description}</p>
                          <div className="chips">
                            <span>{stage.items.length} กิจกรรม</span>
                            <span>
                              {stage.items.every((it) => it.kind === "choice")
                                ? "ฟังและเลือก"
                                : stage.items.some(
                                      (it) => it.kind === "observation",
                                    )
                                  ? "เล่นกับผู้ใหญ่"
                                  : "ลองพูดและฟังตัวเอง"}
                            </span>
                            {done && <span className="green">ทำครบแล้ว</span>}
                            {current && <span className="current-stage">{active ? "รอบที่กำลังฝึก" : "จุดเริ่มในแผน"}</span>}
                          </div>
                        </div>
                        <Button
                          variant={current ? "primary" : "secondary"}
                          // False positive: begin() reads stateRef only when clicked; stage is curriculum data.
                          // eslint-disable-next-line react-hooks/refs
                          onClick={() => begin(stage)}
                        >
                          {done ? "ฝึกอีกครั้ง" : "เริ่มตรงนี้"}
                          <ArrowRight size={16} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="footnote">
                ครูหรือผู้ปกครองเลือกข้ามช่วงได้
                ตัวอย่างคำและภาพยังต้องผ่านการตรวจจากนักแก้ไขการพูดก่อนใช้งานกับเด็กจริง
              </p>
            </>
            );
          })()}
          {route === "plan" && (
            <PlanPage
              plan={state.plan}
              onSave={(p) => {
                commit(
                  { ...state, plan: p, activeSessionId: undefined },
                  { type: "plan.saved", payload: p },
                );
                setToast("บันทึกแผนในเครื่องแล้ว เริ่มจากช่วงที่เลือกได้เลย");
                go("path");
              }}
              onCancel={() => go("home")}
            />
          )}
          {route === "library" && (
            <Library
              stages={stages}
              track={state.plan.track}
              level={state.plan.level}
              onPreview={(item, stage) => setPreview({ item, stage })}
              onPlan={() => go("plan")}
            />
          )}
          {route === "practice" &&
            (active ? (
              <PracticeView
                key={active.id + ":" + active.index}
                onSwitchUi={() => setPracticeUi(practiceUi === "kid" ? "classic" : "kid")}
                session={active}
                stages={getStages(active.track, active.sound, active.level)}
                onPause={() => {
                  if (kidMode) {
                    go("play");
                    return;
                  }
                  setToast("พักรอบนี้ไว้แล้ว กลับมาฝึกต่อได้จากหน้าหลัก");
                  go("home");
                }}
                onSave={(attempt) => {
                  const next = saveAttempt(
                    stateRef.current,
                    active.id,
                    attempt,
                  );
                  commit(next, {
                    type: "attempt.saved",
                    sessionId: active.id,
                    payload: attempt,
                  });
                }}
                onNext={() => {
                  const r = advanceSession(stateRef.current, active.id);
                  commit(
                    r.state,
                    r.done
                      ? {
                          type: "session.completed",
                          sessionId: active.id,
                          payload: r.state.sessions.find(
                            (s) => s.id === active.id,
                          ),
                        }
                      : undefined,
                  );
                  if (r.done) go(kidMode ? "celebrate" : "summary");
                }}
              />
            ) : kidMode ? null : (
              <Empty
                title="เลือกภารกิจก่อนเริ่มกัน"
                body="ยังไม่มีรอบฝึกที่กำลังทำ เลือกช่วงที่อยากลองได้เลย"
                action={
                  <Button onClick={() => go("path")}>
                    เลือกชุดฝึก <ArrowRight size={16} />
                  </Button>
                }
              />
            ))}
          {route === "summary" &&
            (sessionForSummary ? (
              <Summary
                nextLabel={
                  sessionForSummary.planId === state.plan.id &&
                  getStages(
                    sessionForSummary.track,
                    sessionForSummary.sound,
                    sessionForSummary.level,
                  ).findIndex((s) => s.id === sessionForSummary.stageId) <
                    getStages(
                      sessionForSummary.track,
                      sessionForSummary.sound,
                      sessionForSummary.level,
                    ).length -
                      1
                    ? "ไปช่วงถัดไป"
                    : "กลับเส้นทางฝึก"
                }
                session={sessionForSummary}
                onReview={() => setReviewId(sessionForSummary.id)}
                onProgress={() => go("progress")}
                onNext={() => {
                  const all = getStages(
                    sessionForSummary.track,
                    sessionForSummary.sound,
                    sessionForSummary.level,
                  );
                  const idx = all.findIndex(
                    (s) => s.id === sessionForSummary.stageId,
                  );
                  if (
                    idx >= 0 &&
                    idx < all.length - 1 &&
                    sessionForSummary.planId === state.plan.id
                  )
                    begin(all[idx + 1]);
                  else go("path");
                }}
              />
            ) : (
              <Empty
                title="ยังไม่มีรอบที่จบ"
                body="เมื่อฝึกครบรอบ จะกลับมาดูผลสรุปที่นี่ได้"
                action={<Button onClick={() => go("path")}>เลือกชุดฝึก</Button>}
              />
            ))}
          {route === "progress" && (
            <WaitingReviews sessions={completed} teacherConfirms={sync.teacherConfirms} onReview={reviewOne} />
          )}
          {route === "progress" && (
            <Progress
              allowExport={allowExport}
              sessions={completed}
              childName={state.plan.childName}
              onReview={setReviewId}
              onExport={() => {
                if (!allowExport) return;
                download(
                  "speech-adventure-learning-results.json",
                  JSON.stringify(
                    {
                      schemaVersion: 1,
                      exportedAt: now(),
                      plan: state.plan,
                      sessions: state.sessions.filter(
                        (s) => s.childId === state.plan.childId,
                      ),
                      notice:
                        "Prototype data. No AI scoring. Audio not included.",
                    },
                    null,
                    2,
                  ),
                );
                setToast("ส่งออกข้อมูลต้นแบบแล้ว ไม่มีไฟล์เสียงรวมอยู่ด้วย");
              }}
              onStart={() => go("path")}
            />
          )}
          {route === "guide" && <Guide
              onReset={() => setResetOpen(true)}
              onTry={() => go("demo")}
              onShowTips={() => {
                try {
                  localStorage.removeItem(MAP_TIPS_KEY);
                } catch {
                  // Storage blocked: tips cannot be remembered either way.
                }
                go("play");
              }}
            />}
          {route === "demo" && demoSession && (
            <KidPractice
              key="guide-demo"
              session={demoSession}
              stages={stages}
              onSave={() => {}}
              onNext={endDemo}
              onPause={endDemo}
              onSwitchUi={endDemo}
            />
          )}
          {(route === "play" || (route === "practice" && !active && kidMode)) && (
            <KidMap
              stages={stages}
              done={finishedStages}
              next={activeStage ?? mapNext}
              resume={active && activeStage ? { index: active.index, total: active.itemIds.length } : undefined}
              // All rounds this child finished, not only this plan's: changing level must not empty the jar.
              stars={completed.reduce((n, x) => n + x.attempts.length, 0)}
              sound={state.plan.sound}
              // The paused stage resumes where it stopped; any other station starts a new round.
              onPick={(stage) => (active && stage.id === active.stageId ? go("practice") : begin(stage))}
              onGo={() => (active ? go("practice") : begin(mapNext))}
              newStickers={stickers.owned.size > readSeenStickers(state.plan.childId)}
              onBook={() => go("stickers")}
              onExit={() => go("home")}
            />
          )}
          {route === "stickers" && (
            <KidStickerBook
              childId={state.plan.childId}
              stages={stages}
              book={stickers}
              latestRoundId={state.lastCompletedId}
              onPlay={(stage) => begin(stage)}
              onPrint={() => openPrint("stickers")}
              onMap={() => go("play")}
            />
          )}
          {route === "print" && (
            <>
              <SectionHead
                eyebrow="พิมพ์ให้น้องที่บ้าน"
                title="พิมพ์ให้น้อง"
                body="สติกเกอร์ที่น้องเก็บได้ บัตรคำฝึกเสียงที่บ้าน และใบประกาศ เลือกแบบ ดูตัวอย่าง แล้วพิมพ์ได้เลย"
              />
              <PrintCenter
                key={printKind}
                initial={printKind}
                childName={state.plan.childName || child?.name || ""}
                sound={state.plan.sound}
                stages={stages}
                book={stickers}
                stagesDone={finishedStages.size}
                stars={completed.reduce((n, x) => n + x.attempts.length, 0)}
              />
            </>
          )}
          {route === "celebrate" && travel && travel.route === route && (
            <KidTravel
              stages={stages}
              done={finishedStages}
              from={travel.from}
              to={travel.to}
              onArrive={() => {
                setTravel(null);
                start(travel.to);
              }}
              onMap={() => {
                setTravel(null);
                go("play");
              }}
            />
          )}
          {route === "finale" && (
            <KidFinale
              stages={stages}
              latest={latestRounds}
              stars={starTotal}
              stickers={stickers.owned.size}
              onPrint={() => openPrint("certificate")}
              onAgain={() => begin(stages[0])}
              onPick={(stage) => begin(stage)}
              onMap={() => go("play")}
              onAdult={() => go("progress")}
            />
          )}
          {route === "celebrate" &&
            !(travel && travel.route === route) &&
            (sessionForSummary ? (
              <KidRoundEnd
                session={sessionForSummary}
                nextLabel={roundNext ? "ด่านต่อไป" : "ดูสรุปการผจญภัย"}
                onAgain={() => {
                  const stage = stages.find((s) => s.id === sessionForSummary.stageId);
                  if (stage) begin(stage);
                  else go("play");
                }}
                onNext={() =>
                  roundNext && roundStage ? setTravel({ from: roundStage, to: roundNext, route }) : go("finale")
                }
                roundStickers={stickersOfRound(sessionForSummary)}
                freshStickers={stickers.newIn.get(sessionForSummary.id) ?? []}
                onBook={() => go("stickers")}
                onAdult={() => go("summary")}
                onMap={() => go("play")}
              />
            ) : (
              <Empty
                title="ยังไม่มีรอบที่จบ"
                body="เล่นให้จบรอบ แล้วจะได้ฉลองที่นี่"
                action={<Button onClick={() => go("play")}>ไปแผนที่</Button>}
              />
            ))}
        </section>
        <footer className="app-footer">
          <span>
            Speech Adventure <span className="tiny-dot">·</span> Learning
            prototype
          </span>
          <span>ลอง ฟัง พูด และเติบโตไปด้วยกัน</span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      {preview && (
        <Preview
          item={preview.item}
          stage={preview.stage}
          onClose={() => setPreview(null)}
          onStart={() => {
            const p = preview;
            setPreview(null);
            begin(p.stage, [p.item.id]);
          }}
        />
      )}
      {startRequest && kidMode && startRequest.route === route && (
        <KidStart
          stage={startRequest.stage}
          onStart={() => start(startRequest.stage, startRequest.ids)}
          onBack={() => setStartRequest(null)}
        />
      )}
      {startRequest && !kidMode && startRequest.route === route && (
        <Modal
          title="เตรียมตัวก่อนเริ่มกัน"
          onClose={() => setStartRequest(null)}
        >
          <div className="preflight-art">
            <Art kind={SOUNDS[state.plan.sound as keyof typeof SOUNDS]?.hero} />
          </div>
          <h3>{startRequest.stage.label}</h3>
          <p>
            รอบนี้มี{" "}
            {startRequest.ids?.length ??
              (state.plan.selectedItems.filter((id) =>
                startRequest.stage.items.some((i) => i.id === id),
              ).length ||
                startRequest.stage.items.length)}{" "}
            กิจกรรม เลือกอัดเสียงในเครื่อง หรือทดลองตอบโดยไม่ใช้ไมค์ได้
          </p>
          <div className="privacy-list">
            <span>
              <Mic size={18} />
              ขอสิทธิ์ไมค์เฉพาะเมื่อกดอัดเสียง
            </span>
            <span>
              <ShieldCheck size={18} />
              ไม่เก็บไฟล์เสียง ส่งให้ AI เฉพาะเมื่อยินยอม
            </span>
            <span>
              <Users size={18} />
              ผลการพูดใช้ผู้ใหญ่ช่วยสังเกต
            </span>
          </div>
          <p className="footnote">
            เสียงที่อัดหายเมื่อเปลี่ยนข้อหรือปิดหน้า
            แผนฝึกและรายละเอียดกิจกรรมอยู่ในเครื่องที่ใช้ฝึก
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setStartRequest(null)}>
              ยังไม่เริ่ม
            </Button>
            <Button onClick={() => start(startRequest.stage, startRequest.ids)}>
              พร้อมแล้ว เริ่มเลย <ArrowRight size={16} />
            </Button>
          </div>
        </Modal>
      )}
      {reviewSession && (
        <ReviewModal
          session={reviewSession}
          onClose={() => setReviewId(null)}
          onSave={(reviews, note) => {
            const next = {
              ...state,
              sessions: state.sessions.map((s) =>
                s.id === reviewSession.id
                  ? {
                      ...s,
                      reviewNote: note,
                      attempts: s.attempts.map((a) => ({
                        ...a,
                        review: reviews[a.id] ?? a.review,
                      })),
                    }
                  : s,
              ),
            };
            commit(next, {
              type: "review.saved",
              sessionId: reviewSession.id,
              payload: next.sessions.find((s) => s.id === reviewSession.id),
            });
            setReviewId(null);
            setToast("บันทึกการสังเกตของผู้ใหญ่แล้ว");
          }}
        />
      )}
      {resetOpen && (
        <Modal
          title="เริ่มพื้นที่ทดลองใหม่"
          onClose={() => setResetOpen(false)}
        >
          <p>
            ล้างแผนและผลในต้นแบบนี้เพื่อเริ่มทดสอบใหม่ สามารถสำรองข้อมูลการฝึก
            จากหน้าผลการฝึกก่อนล้างได้
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              เก็บข้อมูลไว้
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                commit(createStudioState(null, child));
                try {
                  localStorage.removeItem(`speech-adventure:stickers-seen:${state.plan.childId}`);
                  localStorage.removeItem(MAP_TIPS_KEY);
                } catch {
                  // Storage blocked: nothing to clear.
                }
                setResetOpen(false);
                go("home");
                setToast("เริ่มพื้นที่ทดลองใหม่แล้ว");
              }}
            >
              <RotateCcw size={16} />
              ล้างข้อมูลต้นแบบ
            </Button>
          </div>
        </Modal>
      )}
    </div>
    </KidHomeContext.Provider>
  );
}
function PlanPage({
  plan,
  onSave,
  onCancel,
}: {
  plan: Plan;
  onSave: (p: Plan) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Plan>({ ...plan });
  const stages = getStages(draft.track, draft.sound, draft.level);
  const [error, setError] = useState("");
  /** "ตั้งค่าเพิ่มเติม" opens by itself when the nickname is missing, so the required field is never hidden. */
  const [more, setMore] = useState(!plan.childName.trim());
  const update = (value: Partial<Plan>) =>
    setDraft((d) => ({ ...d, ...value }));
  const switchTrack = (track: Track) =>
    update({
      track,
      startStage: getStages(track, draft.sound, draft.level)[0].id,
      selectedItems: [],
    });
  return (
    <>
      <SectionHead
        eyebrow="แผนการฝึก"
        title={draft.track === "phonics" ? "จัดชุดฝึกเรียนเสียงไทย" : "จัดชุดฝึกให้เหมาะกับเรา"}
        body="เลือกเป้าหมายและจุดเริ่ม ผู้ใหญ่ปรับให้เหมาะกับเด็กได้เสมอ"
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.childName.trim()) {
            setError("ใส่ชื่อเล่นก่อนบันทึกแผน");
            setMore(true);
            return;
          }
          onSave({
            ...draft,
            childName: draft.childName.trim(),
            id: uid(),
            createdAt: now(),
          });
        }}
      >
        <div className="plan-layout">
          <div>
            <section className="panel form-section">
              <h2>
                <span className="step-number">1</span>ฝึกเรื่องอะไร
              </h2>
              <div className="track-options">
                {(Object.keys(TRACKS) as Track[]).map((track) => (
                  <button
                    key={track}
                    type="button"
                    className={`track-option ${draft.track === track ? "selected" : ""}`}
                    onClick={() => switchTrack(track)}
                    aria-pressed={draft.track === track}
                  >
                    <Icon name={TRACKS[track].icon} size={26} />
                    <strong>{TRACKS[track].label}</strong>
                    <small>{TRACKS[track].description}</small>
                    <span className="radio-circle">
                      {draft.track === track && <span />}
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className="panel form-section">
              <h2>
                <span className="step-number">2</span>
                {draft.track === "speech" ? "เสียงไหน" : "กลุ่มคำไหน"}
              </h2>
              <div className="sound-options">
                {Object.entries(SOUNDS).map(([key, s]) => (
                  <button
                    type="button"
                    className={draft.sound === key ? "selected" : ""}
                    key={key}
                    onClick={() => update({ sound: key, selectedItems: [] })}
                  >
                    <strong>{key}</strong>
                    <span>{s.name}</span>
                    {draft.sound === key && <CheckCircle2 size={16} />}
                  </button>
                ))}
              </div>
            </section>
            <section className="panel form-section">
              <LevelPicker
                value={draft.level}
                onChange={(level) => update({ level, selectedItems: [] })}
              />
            </section>
            <details
              className="panel form-section plan-more"
              open={more}
              onToggle={(e) => setMore(e.currentTarget.open)}
            >
              <summary>
                ตั้งค่าเพิ่มเติม <span>ชื่อเล่น ช่วงวัย จุดเริ่ม และเลือกข้อเอง</span>
              </summary>
              <h3>ชื่อเล่นและช่วงวัย</h3>
              <div className="form-row">
                <label>
                  ชื่อเล่น
                  <input
                    value={draft.childName}
                    maxLength={30}
                    onChange={(e) => update({ childName: e.target.value })}
                    placeholder="ชื่อเล่นของเด็ก"
                    aria-required="true"
                  />
                </label>
                <label>
                  ช่วงวัย
                  <select
                    value={draft.age}
                    onChange={(e) => update({ age: e.target.value })}
                  >
                    {["3–4 ปี", "4–5 ปี", "5–7 ปี", "7–9 ปี", "9–12 ปี"].map(
                      (v) => (
                        <option key={v}>{v}</option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              <p className="footnote">
                ช่วงวัยเป็นข้อมูลในแผน เลือกระดับเนื้อหาตามความพร้อมได้
              </p>
              <h3>จุดเริ่มและกิจกรรม</h3>
              <label>
                เริ่มจากช่วงไหน
                <select
                  value={draft.startStage}
                  onChange={(e) => update({ startStage: e.target.value })}
                >
                  {stages.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={draft.adultSupport}
                  onChange={(e) => update({ adultSupport: e.target.checked })}
                />
                มีผู้ใหญ่เล่นด้วยและช่วยสังเกต
              </label>
              <details className="activity-picker">
                <summary>
                  เลือกเฉพาะบางกิจกรรม{" "}
                  <span>
                    {draft.selectedItems.length
                      ? "เลือก " + draft.selectedItems.length + " ข้อ"
                      : "ค่าเริ่มต้นใช้ทุกข้อ"}
                  </span>
                </summary>
                <p className="footnote">
                  ช่วงที่ไม่มีข้อถูกเลือกจะใช้กิจกรรมทั้งช่วง
                  เด็กยังเลือกเริ่มช่วงอื่นได้
                </p>
                {stages.map((s) => (
                  <div key={s.id}>
                    <h4>{s.label}</h4>
                    {s.items.map((it) => (
                      <label key={it.id} className="check-label">
                        <input
                          type="checkbox"
                          checked={draft.selectedItems.includes(it.id)}
                          onChange={(e) =>
                            update({
                              selectedItems: e.target.checked
                                ? [...draft.selectedItems, it.id]
                                : draft.selectedItems.filter(
                                    (id) => id !== it.id,
                                  ),
                            })
                          }
                        />
                        {it.title} · {it.prompt}
                      </label>
                    ))}
                  </div>
                ))}
              </details>
            </details>
          </div>
          <aside className="plan-preview panel">
            <span className="eyebrow">แผนที่กำลังจัด</span>
            <h2>{draft.childName || "เพื่อนตัวน้อย"}</h2>
            <p>{TRACKS[draft.track].label}</p>
            <div className="preview-facts">
              <span>
                ระดับ<strong>{getLevel(draft.level).label}</strong>
              </span>
              <span>
                กลุ่มคำ<strong>เสียง {draft.sound}</strong>
              </span>
              <span>
                เริ่มที่
                <strong>
                  {stages.find((s) => s.id === draft.startStage)?.label}
                </strong>
              </span>
              <span>
                กิจกรรม
                <strong>
                  {draft.selectedItems.length
                    ? `${draft.selectedItems.length} ข้อที่เลือก`
                    : `${stages.reduce((n, s) => n + s.items.length, 0)} ข้อทั้งหมด`}
                </strong>
              </span>
            </div>
            <p className="footnote">
              แผนนี้ใช้บนเครื่องที่จัด ส่วนสรุปรอบที่จบจะแสดงตามสิทธิ์เมื่อบันทึกเข้าระบบ
            </p>
          </aside>
        </div>
        <div className="plan-actions panel">
          <Button type="submit">
              บันทึกและดูเส้นทาง <ArrowRight size={16} />
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
              กลับก่อน
          </Button>
            {error && (
            <p role="alert" className="error-text">
                {error}
            </p>
            )}
        </div>
      </form>
    </>
  );
}
function Library({
  stages,
  track,
  level,
  onPreview,
  onPlan,
}: {
  stages: Stage[];
  track: Track;
  level?: LearningLevelId;
  onPreview: (i: Item, s: Stage) => void;
  onPlan: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const items = stages
    .flatMap((stage) => stage.items.map((item) => ({ stage, item })))
    .filter(
      ({ stage, item }) =>
        (filter === "all" || stage.id === filter) &&
        `${item.title} ${item.prompt} ${stage.label}`.includes(query),
    );
  return (
    <>
      <SectionHead
        eyebrow="กิจกรรมสั้น ๆ ให้ลองเล่น"
        title="คลังกิจกรรม"
        body={`${getLevel(level).label} · ${TRACKS[track].label} · เปิดดูแต่ละข้อก่อนเลือกเล่นได้`}
        action={
          <Button variant="secondary" onClick={onPlan}>
            <SlidersHorizontal size={16} />
            เปลี่ยนเป้าหมาย
          </Button>
        }
      />
      <div className="filter-bar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="ค้นหากิจกรรม"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาคำหรือกิจกรรม..."
          />
        </label>
        <span className="muted">{items.length} กิจกรรม</span>
      </div>
      <div className="stage-chips" role="group" aria-label="กรองช่วงฝึก">
        <button type="button" aria-pressed={filter === "all"} className={filter === "all" ? "stage-chip active" : "stage-chip"}
          onClick={() => setFilter("all")}>
          ทั้งหมด <b>{stages.reduce((sum, s) => sum + s.items.length, 0)}</b>
        </button>
        {stages.map((s, index) => (
          <button key={s.id} type="button" aria-pressed={filter === s.id}
            className={filter === s.id ? "stage-chip active" : "stage-chip"}
            style={{ "--chip": s.color } as React.CSSProperties}
            onClick={() => setFilter(s.id)}>
            <i aria-hidden="true">{index + 1}</i>{s.label} <b>{s.items.length}</b>
          </button>
        ))}
      </div>
      <div className="library-grid">
        {items.map(({ item, stage }) => (
          <button
            className="library-card"
            key={item.id}
            style={{ "--lv": stage.color } as React.CSSProperties}
            onClick={() => onPreview(item, stage)}
          >
            <div
              className="library-art"
              style={{ background: stage.color + "0D" }}
            >
              {item.art === "mouth" ? (
                <MouthCoach sample={item.sample} compact />
              ) : item.art === "letter" ? (
                <span className="big-letter">{item.prompt}</span>
              ) : (
                <Art kind={item.art} />
              )}
              <span className="small-tag" style={{ color: stageInk(stage.color) }}>
                {stage.label}
              </span>
            </div>
            <div className="library-info">
              <h3>{item.prompt}</h3>
              <p>{item.title}</p>
              <span>
                {item.kind === "choice"
                  ? "ฟังและเลือกภาพ"
                  : item.kind === "observation"
                    ? "กิจกรรมกับผู้ใหญ่"
                    : "ลองพูด"}
                <ArrowRight size={16} />
              </span>
            </div>
          </button>
        ))}
      </div>
      {!items.length && (
        <Empty
          title="ยังไม่เจอกิจกรรมนี้"
          body="ลองคำค้นอื่นหรือเปลี่ยนช่วงการฝึก"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              ล้างตัวกรอง
            </Button>
          }
        />
      )}
    </>
  );
}
function Preview({
  item,
  stage,
  onStart,
  onClose,
}: {
  item: Item;
  stage: Stage;
  onStart: () => void;
  onClose: () => void;
}) {
  const speaker = useSpeaker();
  return (
    <Modal title="ดูตัวอย่างกิจกรรม" onClose={onClose}>
      <span className="pill">{stage.label}</span>
      <h2>{item.title}</h2>
      <p className="preview-prompt">{item.prompt}</p>
      <p>{item.instruction}</p>
      <p className="footnote">{item.hint}</p>
      <div
        className={item.art === "mouth" ? "preview-mouth" : "preview-item-art"}
      >
        {item.art === "mouth" ? (
          <MouthCoach
            sample={item.sample}
            sound={
              item.sample.startsWith("ก")
                ? "ก"
                : item.sample.startsWith("ม")
                  ? "ม"
                  : "ป"
            }
          />
        ) : item.art === "letter" ? (
          <span className="big-letter">{item.prompt}</span>
        ) : (
          <Art kind={item.art} />
        )}
      </div>
      <Button variant="secondary" onClick={() => speaker.speak(item.sample)}>
        <Volume2 size={17} />
        ฟังตัวอย่าง
      </Button>
      {speaker.speaking && (
        <button className="voice-stop" onClick={speaker.stop}>
          <Square size={12} />
          หยุดเสียง
        </button>
      )}
      {speaker.message && (
        <p className="notice" role="status">
          {speaker.message}
        </p>
      )}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>
          กลับคลัง
        </Button>
        <Button onClick={onStart}>
          ทดลองข้อนี้ <ArrowRight size={16} />
        </Button>
      </div>
    </Modal>
  );
}
/** Only cloud child profiles (uuid ids) have a central assessment history; local and demo ids do not. */
function Practice({
  session,
  stages,
  onSave,
  onNext,
  onPause,
  onSwitchUi,
}: {
  session: Session;
  stages: Stage[];
  onSave: (a: Attempt) => void;
  onNext: () => void;
  onPause: () => void;
  onSwitchUi?: () => void;
}) {
  const stage = stages.find((s) => s.id === session.stageId);
  const item = stage?.items.find(
    (i) => i.id === session.itemIds[session.index],
  );
  const speaker = useSpeaker();
  const [showHelp, setShowHelp] = useState(false);
  const p = usePracticeItem({ session, item, onSave, stopSpeaker: speaker.stop });
  const {
    user, saved, choice, setChoice, support, setSupport, review, setReview, setRetries, demo,
    recording, requesting, elapsed, audio, recordedBlob, setAssessment,
    assessmentBusy, setAssessmentBusy, assessmentMessage, micError, record, resetAudio,
    attachPlayer, pauseRecording, stopRecording, chooseDemo,
  } = p;
  if (!stage || !item)
    return (
      <Empty
        title="ไม่พบกิจกรรมนี้"
        body="กลับไปเลือกชุดฝึกใหม่ได้ ข้อมูลรอบก่อนยังอยู่ในประวัติ"
        action={<Button onClick={onPause}>กลับหน้าหลัก</Button>}
      />
    );
  const isChoice = item.kind === "choice";
  const correct = p.correct;
  const read = () => {
    if (recording || requesting) return;
    pauseRecording();
    speaker.speak(item.sample);
    setSupport((s) => (s === "adult" ? "adult" : "modeled"));
  };
  const save = () => p.save();
  return (
    <div className="practice-shell">
      <div className="practice-toolbar">
        <button className="text-button" onClick={onPause} disabled={assessmentBusy}>
          <ArrowLeft size={17} />
          พักไว้ก่อน
        </button>
        <span style={{ color: stageInk(stage.color) }}>
          <Icon name={stage.icon} size={18} />
          {stage.label}
        </span>
        <span className="mission-counter">
          {session.index + 1}
          <em> / {session.itemIds.length}</em>
        </span>
        {onSwitchUi && (
          <button type="button" className="text-button" onClick={onSwitchUi} disabled={assessmentBusy}>
            ใช้หน้าเด็กแบบใหม่
          </button>
        )}
      </div>
      <div
        className="lesson-progress"
        aria-label={`กิจกรรมที่ ${session.index + 1} จาก ${session.itemIds.length}`}
      >
        <span
          style={{
            width: `${(session.index / session.itemIds.length) * 100}%`,
            background: stage.color,
          }}
        />
      </div>
      <div className="practice-heading">
        <span className="eyebrow">
          {getLevel(session.level).label} · ภารกิจของเรา
        </span>
        <h1>{item.title}</h1>
        <p>{item.instruction}</p>
        <div className="voice-instruction">
          <button
            className="text-button"
            disabled={recording || requesting || assessmentBusy}
            onClick={() => speaker.speak(item.instruction)}
          >
            <Volume2 size={16} />
            ฟังวิธีเล่น
          </button>
          {speaker.speaking && (
            <button className="voice-stop" onClick={speaker.stop}>
              <Square size={12} />
              หยุดเสียง
            </button>
          )}
          {speaker.loading && (
            <span className="muted" role="status">
              กำลังเตรียมเสียง…
            </span>
          )}
        </div>
      </div>
      <div className="practice-card">
        {isChoice ? (
          <>
            <button
              className={`listen-button ${speaker.speaking ? "playing" : ""}`}
              onClick={read}
            >
              <Volume2 size={30} />
              <span>ฟังเสียงอีกครั้ง</span>
            </button>
            <div className="choice-grid">
              {item.choices?.map((opt) => (
                <button
                  key={opt.id}
                  className={`choice-card ${choice === opt.id ? "chosen" : ""} ${choice !== null && opt.id === item.answer ? "answer-correct" : ""}`}
                  disabled={!!saved || assessmentBusy}
                  onClick={() => setChoice(opt.id)}
                  aria-label={`เลือก ${opt.label}`}
                  aria-pressed={choice === opt.id}
                >
                  {opt.art === "letter" ? (
                    <span
                      className={
                        opt.label.length > 3 ? "choice-word" : "big-letter"
                      }
                    >
                      {opt.label}
                    </span>
                  ) : (
                    <Art kind={opt.art} label={opt.label} />
                  )}
                  {opt.art !== "letter" && <span>{opt.label}</span>}
                  {choice === opt.id && (
                    <span className="choice-tick">
                      <Check size={16} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            {(choice !== null || saved) && (
              <div
                className={`feedback ${correct ? "positive" : "gentle"}`}
                role="status"
              >
                {correct ? <CheckCircle2 /> : <Heart />}
                <div>
                  <strong>
                    {saved
                      ? correct
                        ? "บันทึกแล้ว: เลือกภาพตรงกับเสียง"
                        : "บันทึกแล้ว: ข้อนี้ยังต้องฝึก"
                      : correct
                        ? "ใช่เลย ภาพนี้ตรงกับเสียงที่ได้ยิน"
                        : "ขอบคุณที่ลอง มาฟังแล้วเลือกอีกทีได้"}
                  </strong>
                  <p>
                    {saved
                      ? "บันทึกข้อนี้แล้ว กดปุ่มด้านล่างเพื่อไปต่อได้เลย"
                      : correct
                        ? "บันทึกคำตอบนี้แล้วไปภารกิจถัดไปกัน"
                        : "หรือบันทึกว่าข้อนี้ยังต้องฝึก แล้วค่อยกลับมาใหม่"}
                  </p>
                  <button
                    className="text-button feedback-voice"
                    onClick={() =>
                      speaker.speak(
                        correct ? VOICE_CUES.success : VOICE_CUES.retry,
                      )
                    }
                  >
                    <Volume2 size={14} />
                    ฟังกำลังใจ
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className={item.art === "mouth" ? "speaking-layout with-mouth" : "speaking-layout"}>
              <div className="speaking-media">
                {item.art === "mouth" ? (
                  <MouthCoach sound={session.sound} sample={item.sample} />
                ) : (
                  <div className="exercise-art">
                    <Art kind={item.art} />
                  </div>
                )}
              </div>
              <div className="speaking-controls">
                {item.segments && (
                  <div className="segments">
                    <span>{item.segments[0]}</span>
                    <b>+</b>
                    <span>{item.segments[1]}</span>
                    <b>=</b>
                    <span>{item.prompt}</span>
                  </div>
                )}
                {!["words", "story"].includes(session.stageId) &&
                  !item.hidePrompt &&
                  session.stageId !== "transfer" && (
                    <div className="exercise-prompt">{item.prompt}</div>
                  )}
                {item.subLabel && (
                  <p className="footnote centered">{item.subLabel}</p>
                )}
                <div className="sample-actions">
                  <Button
                    variant="secondary"
                    onClick={read}
                    disabled={recording || requesting || assessmentBusy}
                  >
                    <Volume2 size={18} />
                    ฟังตัวอย่าง
                  </Button>
                  <button
                    className="text-button"
                    onClick={() => {
                      setShowHelp(!showHelp);
                      setSupport((s) => (s === "adult" ? "adult" : "modeled"));
                    }}
                  >
                    <HelpCircle size={16} />
                    {showHelp ? "ซ่อนคำใบ้" : "ขอคำใบ้"}
                  </button>
                </div>
                {showHelp && (
                  <div className="hint">
                    <strong>ตัวอย่างที่ผู้ใหญ่ช่วยอ่านได้ “{item.prompt}”</strong>
                    <p>{item.hint}</p>
                  </div>
                )}
                {item.kind === "observation" ? (
                  <div className="observation-area">
                    <span className="pill green">
                      <Users size={15} />
                      เล่นด้วยกันนอกจอได้
                    </span>
                    <p>เมื่อเล่นแล้ว ให้ผู้ใหญ่เลือกสิ่งที่สังเกตได้</p>
                    <div className="review-options">
                      {(
                        [
                          { id: "achieved", label: "ทำได้ตามเป้าหมาย" },
                          { id: "practice", label: "ยังต้องช่วยฝึก" },
                          { id: "unavailable", label: "ยังประเมินไม่ได้" },
                        ] as const
                      ).map((r) => (
                        <label key={r.id}>
                          <input
                            type="radio"
                            name="observation"
                            value={r.id}
                            disabled={!!saved || assessmentBusy}
                            checked={review === r.id}
                            onChange={() => setReview(r.id)}
                          />
                          {r.label}
                        </label>
                      ))}
                    </div>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={support === "adult"}
                        disabled={!!saved}
                        onChange={(e) =>
                          setSupport(e.target.checked ? "adult" : "independent")
                        }
                      />
                      มีผู้ใหญ่ช่วยระหว่างกิจกรรม
                    </label>
                  </div>
                ) : (
                  <div className="record-area">
                    {!saved && (
                      <>
                        <button
                          className={`record-button ${recording ? "recording" : ""}`}
                          aria-label={recording ? "หยุดอัดเสียง" : "เริ่มอัดเสียง"}
                          onClick={() =>
                            recording ? stopRecording() : record()
                          }
                          disabled={requesting || assessmentBusy}
                        >
                          {recording ? (
                            <Square size={25} fill="currentColor" />
                          ) : (
                            <Mic size={29} />
                          )}
                        </button>
                        <strong>
                          {requesting
                            ? "กำลังขอสิทธิ์ไมค์…"
                            : recording
                              ? `กำลังอัด ${elapsed} วินาที · กดเพื่อหยุด`
                              : audio
                                ? "อัดเสียงแล้ว · กดเล่นเพื่อฟัง"
                                : "กดไมค์แล้วลองพูด"}
                        </strong>
                        {audio && (
                          <>
                            <audio
                              ref={attachPlayer}
                              controls
                              preload="auto"
                              src={audio}
                              onPlay={() => speaker.stop()}
                              aria-label="เสียงที่อัดไว้ในข้อนี้"
                            />
                            <button className="text-button" onClick={resetAudio} disabled={assessmentBusy}>
                              <RotateCcw size={15} />
                              อัดใหม่
                            </button>
                          </>
                        )}
                        {!recording && (
                          <button
                            disabled={assessmentBusy}
                            className={`demo-answer ${demo ? "active" : ""}`}
                            onClick={chooseDemo}
                          >
                            <MicOff size={15} />
                            {demo
                              ? "เลือกทดลองโดยไม่อัดเสียงแล้ว"
                              : "ทดลองตอบโดยไม่อัดเสียง"}
                          </button>
                        )}
                        {(audio || demo) && (
                          <label className="support-select">
                            รอบนี้หนูลองแบบไหน
                            <select
                              value={support}
                              onChange={(e) =>
                                setSupport(e.target.value as Attempt["support"])
                              }
                            >
                              <option value="independent">ลองพูดเอง</option>
                              <option value="modeled">ฟังตัวอย่างแล้วพูดตาม</option>
                              <option value="adult">มีผู้ใหญ่ช่วย</option>
                            </select>
                          </label>
                        )}
                      </>
                    )}
                    {saved && (
                      <div className="feedback positive" role="status">
                        <CheckCircle2 />
                        <div>
                          <strong>บันทึกความพยายามของเราแล้ว</strong>
                          <p>
                            {saved.mode === "demo"
                              ? "รอบนี้เป็นการจำลองคำตอบ · "
                              : "เสียงไม่ถูกเก็บถาวร · "}
                            ผลการพูดยังรอผู้ใหญ่ช่วยตรวจ
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {speaker.message && (
          <p className="notice" role="status">
            {speaker.message}
          </p>
        )}
        {micError && (
          <p className="notice" role="alert">
            <AlertCircle size={16} />
            {micError}
          </p>
        )}
        {item.kind === "speech" && audio && recordedBlob && !saved && user && CENTRAL_CHILD_ID.test(session.childId) && (
          <AssessmentControls session={session} item={item} blob={recordedBlob} onResult={setAssessment} onBusy={setAssessmentBusy} />
        )}
        {saved?.assessment && <AssessmentResultCard result={saved.assessment} />}
        {assessmentMessage && <p className="notice" role="alert">{assessmentMessage}</p>}
        <div className="practice-bottom">
          {!saved && isChoice && choice !== null && (
            <Button
              variant="secondary"
              disabled={assessmentBusy}
              onClick={() => {
                setChoice(null);
                setRetries((v) => v + 1);
              }}
            >
              <RotateCcw size={16} />
              ลองอีกครั้ง
            </Button>
          )}
          {!saved && (
            <Button
              onClick={save}
              disabled={
                assessmentBusy || (isChoice
                  ? choice === null
                  : item.kind === "observation"
                    ? review === "pending"
                    : (!audio && !demo) || recording || requesting)
              }
            >
              <Check size={17} />
              {assessmentBusy ? "กำลังบันทึก…" : isChoice ? "บันทึกคำตอบ" : "บันทึกการลองทำ"}
            </Button>
          )}
          {saved && (
            <Button onClick={onNext}>
              {session.index + 1 === session.itemIds.length
                ? "ดูสรุปรอบนี้"
                : "ภารกิจถัดไป"}
              <ArrowRight size={17} />
            </Button>
          )}
        </div>
      </div>
      <p className="practice-footnote">
        <ShieldCheck size={14} />
        ดาวให้กับการลองทำ · การส่งตรวจเสียงใช้เกณฑ์กลางและบันทึกผลแยกจากการตรวจของผู้ใหญ่
      </p>
    </div>
  );
}
function Summary({
  session,
  onReview,
  onProgress,
  onNext,
  nextLabel,
}: {
  nextLabel: string;
  session: Session;
  onReview: () => void;
  onProgress: () => void;
  onNext: () => void;
}) {
  const m = metrics([session]);
  const speaker = useSpeaker();
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("speech-adventure:chime", { detail: "complete" }),
    );
  }, []);
  return (
    <div className="summary-page">
      <div className="celebration-art" aria-hidden="true">
        <Art
          kind={SOUNDS[session.sound as keyof typeof SOUNDS]?.hero}
          animate
        />
        <span className="celebration-spark a">✦</span>
        <span className="celebration-spark b">✧</span>
        <span className="celebration-spark c">✦</span>
      </div>
      <span className="pill warm">
        <Star size={15} />
        ทุกความพยายามมีความหมาย
      </span>
      <h1>จบภารกิจรอบนี้แล้ว เก่งมาก!</h1>
      <p>
        {getLevel(session.level).label} · {session.stageLabel} ·{" "}
        {session.attempts.length} กิจกรรมที่เราได้ลอง
      </p>
      <div className="summary-voice">
        <button
          className="button secondary"
          onClick={() => speaker.speak(VOICE_CUES.complete)}
        >
          <Volume2 size={16} />
          ฟังคำชมจากพี่ปู
        </button>
        {speaker.speaking && (
          <button className="voice-stop" onClick={speaker.stop}>
            หยุดเสียง
          </button>
        )}
        {speaker.message && <p role="status">{speaker.message}</p>}
      </div>
      <div className="summary-stats">
        <div>
          <Star />
          <strong>+{m.participation}</strong>
          <small>ดาวความพยายาม</small>
        </div>
        <div>
          <Flag />
          <strong>ครบแล้ว</strong>
          <small>สถานะการทำกิจกรรม</small>
        </div>
        <div>
          <Ear />
          <strong>
            {m.listeningTotal
              ? `${m.listeningCorrect}/${m.listeningTotal}`
              : "ไม่มีข้อเลือกภาพ"}
          </strong>
          <small>
            {m.listeningTotal ? "ฟังและเลือกถูก" : "กิจกรรมในรอบนี้"}
          </small>
        </div>
      </div>
      <section className="panel summary-details">
        <h2>สิ่งที่ผู้ใหญ่ดูต่อได้</h2>
        <p>
          การทำครบคือได้ลองทุกข้อ ผลความชัดของการพูดยังต้องช่วยสังเกตแยกต่างหาก
        </p>
        <div className="summary-rows">
          <span>
            ลองพูดเอง<strong>{m.independent} ข้อ</strong>
          </span>
          <span>
            มีตัวอย่างหรือผู้ใหญ่ช่วย<strong>{m.assisted} ข้อ</strong>
          </span>
          <span>
            ผลการพูดที่รอตรวจ<strong>{m.pending} ข้อ</strong>
          </span>
        </div>
        <div className="attempt-list">
          {session.attempts.map((a, i) => (
            <div key={a.id}>
              <span className="list-number">{i + 1}</span>
              <span>
                {
                  getStages(session.track, session.sound, session.level)
                    .flatMap((s) => s.items)
                    .find((it) => it.id === a.itemId)?.title
                }
              </span>
              <span
                className={`status-tag ${a.kind === "choice" && a.choiceCorrect ? "green" : ""}`}
              >
                {attemptLabel(a)}
              </span>
            </div>
          ))}
        </div>
        {session.attempts.some((a) => a.kind !== "choice") && (
          <Button variant="secondary" onClick={onReview}>
            <Users size={16} />
            ให้ผู้ใหญ่ช่วยตรวจ
          </Button>
        )}
      </section>
      <RoundAdvice session={session} />
      <div className="summary-actions">
        <Button variant="secondary" onClick={onProgress}>
          <BarChart3 size={17} />
          ดูผลการฝึก
        </Button>
        <Button onClick={onNext}>
          {nextLabel} <ArrowRight size={17} />
        </Button>
      </div>
      <p className="footnote">
        เมื่อเข้าสู่ระบบและเลือกโปรไฟล์เด็ก รอบที่ฝึกจบจะแสดงในความก้าวหน้าและรายงานตามสิทธิ์
      </p>
    </div>
  );
}
function attemptLabel(a: Attempt) {
  return a.kind === "choice"
    ? a.choiceCorrect
      ? "เลือกตรงกับเสียง"
      : "ยังต้องฝึกฟัง"
    : a.review === "pending"
      ? "รอผู้ใหญ่ตรวจ"
      : a.review === "achieved"
        ? "ผู้ใหญ่ระบุว่าทำได้"
        : a.review === "practice"
          ? "ยังต้องช่วยฝึก"
          : "ยังประเมินไม่ได้";
}
function Progress({
  sessions,
  childName,
  onReview,
  onExport,
  onStart,
  allowExport,
}: {
  allowExport: boolean;
  sessions: Session[];
  childName: string;
  onReview: (id: string) => void;
  onExport: () => void;
  onStart: () => void;
}) {
  const [track, setTrack] = useState("all");
  const [detail, setDetail] = useState<string | null>(null);
  const filtered = sessions.filter((s) => track === "all" || s.track === track);
  const m = metrics(filtered);
  const selected = filtered.find((s) => s.id === detail);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    const key = d.toLocaleDateString("en-CA");
    return {
      label: d.toLocaleDateString("th-TH", { weekday: "short" }),
      count: filtered.filter(
        (s) => new Date(s.completedAt!).toLocaleDateString("en-CA") === key,
      ).length,
    };
  });
  const max = Math.max(3, ...days.map((d) => d.count));
  return (
    <>
      <SectionHead
        eyebrow="ทุกก้าวเล็ก ๆ มีความหมาย"
        title="มองเห็นทุกความพยายาม"
        body={`ผลการฝึกของ ${childName} · รายละเอียดที่บันทึกบนเครื่องนี้`}
        action={
          <div className="action-group">
            <Button
              variant="secondary"
              disabled={!allowExport}
              onClick={onExport}
            >
              <Download size={16} />
              สำรองข้อมูลการฝึก
            </Button>
            <Button
              variant="secondary"
              disabled={!allowExport}
              onClick={() => {
                if (allowExport) window.print();
              }}
            >
              <Printer size={16} />
              พิมพ์สรุป
            </Button>
          </div>
        }
      />
      <div className="print-heading">
        <h1>Speech Adventure รายงานการฝึก</h1>
        <p>
          {childName} · {new Date().toLocaleDateString("th-TH")} · ข้อมูลต้นแบบ
          ไม่ใช่ผลประเมินทางคลินิก
        </p>
      </div>
      <div className="filter-pills" aria-label="กรองเป้าหมาย">
        {[
          { id: "all", label: "ทุกเป้าหมาย" },
          ...Object.entries(TRACKS).map(([id, t]) => ({ id, label: t.label })),
        ].map((t) => (
          <button
            key={t.id}
            className={track === t.id ? "selected" : ""}
            onClick={() => setTrack(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="stats-grid">
        <Stat
          icon={<Flag />}
          label="ทำกิจกรรมครบ"
          value={`${m.sessions} รอบ`}
        />
        <Stat
          icon={<Ear />}
          color="green"
          label="ฟังและเลือกตรงกับเสียง"
          value={
            m.listeningTotal
              ? `${m.listeningCorrect}/${m.listeningTotal}`
              : "ยังไม่มีผล"
          }
        />
        <Stat
          icon={<Users />}
          color="orange"
          label="การพูดที่รอผู้ใหญ่ตรวจ"
          value={`${m.pending} ข้อ`}
          detail="ไม่รวมข้อที่ยังประเมินไม่ได้"
        />
      </div>
      <div className="two-column report-panels">
        <section className="panel">
          <div className="panel-title">
            <h2>ก้าวเล็ก ๆ ใน 7 วันที่ผ่านมา</h2>
            <span className="small-tag">รอบที่ทำครบ</span>
          </div>
          {days.filter((day) => day.count > 0).length <= 1 ? (
            <p className="footnote">{days.find((day) => day.count > 0)
              ? days.filter((day) => day.count > 0).map((day) => `${day.label} · ทำครบ ${day.count} รอบ`).join("")
              : "ยังไม่มีรอบฝึกที่ทำครบในช่วงนี้"}</p>
          ) : <div
            className="bar-chart"
            role="img"
            aria-label={days.map((d) => `${d.label} ${d.count} รอบ`).join(", ")}
          >
            {days.map((d, i) => (
              <div key={i} className="bar-col">
                <span>{d.count}</span>
                <div className="bar-track">
                  <div style={{ height: `${(d.count / max) * 100}%` }} />
                </div>
                <small>{d.label}</small>
              </div>
            ))}
          </div>}
          <p className="footnote">
            แสดงจากรอบที่บันทึกจริงในต้นแบบ ไม่ได้เติมข้อมูลตัวอย่าง
          </p>
        </section>
        <section className="panel">
          <h2>แยกผลให้เข้าใจตรงกัน</h2>
          <div className="metric-list">
            <span>
              <span className="mini-icon purple">
                <MessageCircle size={17} />
              </span>
              ลองพูดเอง<strong>{m.independent} ข้อ</strong>
            </span>
            <span>
              <span className="mini-icon orange">
                <Heart size={17} />
              </span>
              มีตัวอย่างหรือผู้ใหญ่ช่วย<strong>{m.assisted} ข้อ</strong>
            </span>
            <span>
              <span className="mini-icon green">
                <ShieldCheck size={17} />
              </span>
              ผู้ใหญ่ตรวจแล้ว<strong>{m.reviewed} ข้อ</strong>
            </span>
          </div>
          <p className="footnote">
            จำนวนครั้งที่พูดเองบอกระดับความช่วยเหลือ
            ยังไม่ได้ยืนยันว่าออกเสียงถูกต้อง
          </p>
        </section>
      </div>
      <div className="panel-title section-space">
        <h2>บันทึกการเดินทาง</h2>
        <span className="muted">{filtered.length} รอบ</span>
      </div>
      {!filtered.length ? (
        <Empty
          title="เรื่องราวของเรายังเริ่มได้อีกเยอะ"
          body="ลองทำกิจกรรมให้จบรอบ แล้วกลับมาดูความพยายามของเราได้ที่นี่"
          action={
            <Button onClick={onStart}>
              เริ่มเลือกกิจกรรม <ArrowRight size={16} />
            </Button>
          }
        />
      ) : (
        <div className="session-table">
          <div className="session-table-head">
            <span>กิจกรรม</span>
            <span>วันและจำนวนข้อ</span>
            <span>การตรวจผล</span>
            <span />
          </div>
          {[...filtered].reverse().map((s) => (
            <div className="session-table-row" key={s.id}>
              <span>
                <strong>{s.stageLabel}</strong>
                <small>
                  {getLevel(s.level).label} · {TRACKS[s.track].label} ·
                  กลุ่มเสียง {s.sound}
                </small>
              </span>
              <span>
                {date(s.completedAt!)}
                <small>{s.attempts.length} กิจกรรม</small>
              </span>
              <span className="status-tag">
                {s.attempts.some((a) => a.review === "pending")
                  ? "รอผู้ใหญ่ตรวจ"
                  : "มีผลบันทึกแล้ว"}
              </span>
              <button className="text-button" onClick={() => setDetail(s.id)}>
                ดูรายละเอียด <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="print-signatures">
        <p>
          ข้อสังเกตเพิ่มเติม __________________________________________________
        </p>
        <p>ผู้ตรวจ _______________________ ผู้ปกครอง _______________________</p>
      </div>
      {selected && (
        <Modal title="รายละเอียดรอบฝึก" wide onClose={() => setDetail(null)}>
          <h3>{selected.stageLabel}</h3>
          <p className="muted">
            {date(selected.completedAt!)} · {TRACKS[selected.track].label} ·{" "}
            {getLevel(selected.level).label} · กลุ่มเสียง {selected.sound}
          </p>
          <div className="detail-attempts">
            {selected.attempts.map((a, i) => {
              const item = getStages(
                selected.track,
                selected.sound,
                selected.level,
              )
                .flatMap((s) => s.items)
                .find((it) => it.id === a.itemId);
              return (
                <div key={a.id}>
                  <span className="list-number">{i + 1}</span>
                  <div>
                    <strong>
                      {item?.title} · {item?.prompt}
                    </strong>
                    <p>
                      {a.kind === "choice"
                        ? "ฟังและเลือก"
                        : a.mode === "demo"
                          ? "จำลองคำตอบ ไม่ได้อัดเสียง"
                          : a.mode === "recording"
                            ? "อัดเสียงในเครื่อง ไม่เก็บไฟล์ถาวร"
                            : "ผู้ใหญ่สังเกตระหว่างเล่น"}{" "}
                      ·{" "}
                      {a.support === "independent"
                        ? "ลองเอง"
                        : a.support === "modeled"
                          ? "ฟังตัวอย่าง"
                          : "มีผู้ใหญ่ช่วย"}
                    </p>
                    {a.assessment && <AssessmentResultCard result={a.assessment} />}
                  </div>
                  <span className="status-tag">{attemptLabel(a)}</span>
                </div>
              );
            })}
          </div>
          {selected.reviewNote && (
            <div className="review-note">
              <strong>ข้อสังเกตผู้ใหญ่</strong>
              <p>{selected.reviewNote}</p>
            </div>
          )}
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setDetail(null)}>
              ปิดรายละเอียด
            </Button>
            {selected.attempts.some((a) => a.kind !== "choice") && (
              <Button
                onClick={() => {
                  setDetail(null);
                  onReview(selected.id);
                }}
              >
                <Users size={16} />
                ตรวจผลรอบนี้
              </Button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
function ReviewModal({
  session,
  onClose,
  onSave,
}: {
  session: Session;
  onClose: () => void;
  onSave: (r: Record<string, Review>, note: string) => void;
}) {
  const attempts = session.attempts.filter((a) => a.kind !== "choice");
  const [reviews, setReviews] = useState<Record<string, Review>>(
    Object.fromEntries(attempts.map((a) => [a.id, a.review])),
  );
  const [note, setNote] = useState(session.reviewNote ?? "");
  const items = getStages(session.track, session.sound, session.level).flatMap(
    (s) => s.items,
  );
  return (
    <Modal title="ผู้ใหญ่ช่วยสังเกตและตรวจผล" wide onClose={onClose}>
      <p>
        บันทึกตามที่สังเกตระหว่างกิจกรรม เลือก “ยังประเมินไม่ได้”
        หากไม่ได้ฟังหรือยังไม่แน่ใจ
      </p>
      <p className="notice">
        นี่คือการบันทึกในต้นแบบ ไม่มีการยืนยันตัวตนผู้ตรวจ และไม่ได้ประเมินด้วย
        AI
      </p>
      <div className="review-items">
        {attempts.map((a, i) => (
          <label key={a.id}>
            <span>
              <strong>
                {i + 1}. {items.find((it) => it.id === a.itemId)?.title}
              </strong>
              <small>
                {items.find((it) => it.id === a.itemId)?.prompt}{" "}
                {a.mode === "demo" ? "· จำลองการตอบ" : ""}
              </small>
            </span>
            <select
              value={reviews[a.id]}
              onChange={(e) =>
                setReviews({ ...reviews, [a.id]: e.target.value as Review })
              }
            >
              <option value="pending">รอตรวจ</option>
              <option value="achieved">ทำได้ตามเป้าหมาย</option>
              <option value="practice">ยังต้องช่วยฝึก</option>
              <option value="unavailable">ยังประเมินไม่ได้</option>
            </select>
          </label>
        ))}
      </div>
      <label>
        ข้อสังเกตเพิ่มเติม
        <textarea
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เช่น พูดคำเดี่ยวได้ แต่ยังต้องมีตัวอย่างตอนพูดเป็นประโยค"
          rows={3}
        />
      </label>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          กลับก่อน
        </Button>
        <Button onClick={() => onSave(reviews, note.trim())}>
          <Check size={16} />
          บันทึกการสังเกต
        </Button>
      </div>
    </Modal>
  );
}
function Guide({
  onReset,
  onTry,
  onShowTips,
}: {
  onReset: () => void;
  /** Show the map's first-visit tips again. */
  onShowTips: () => void;
  /** "ลองเล่น 1 ข้อ": one real game item that saves nothing. */
  onTry: () => void;
}) {
  return (
    <>
      <SectionHead
        eyebrow="คู่มือสำหรับผู้ใหญ่"
        title="ลองเล่นด้วยกันอย่างเข้าใจ"
        body="คู่มือการจัดชุดฝึก การใช้เสียง และการดูผลในเครื่องนี้"
      />
      <div className="guide-layout">
        <div className="flex min-w-0 flex-col gap-5">
        <GuideWalkthrough onTry={onTry} onShowTips={onShowTips} />
        <GuideFaq />
        <section className="panel prose">
          <details>
            <summary>รายละเอียดระดับ เสียง และการเก็บข้อมูล</summary>
          <h2>สิ่งที่ต้นแบบทำได้</h2>
          <p>
            สามเป้าหมายการเรียน 4 ระดับเนื้อหา เส้นทางออกเสียง 6 ช่วง กลุ่มคำ ป
            ก ม การค้นหาคลัง ปรับชุดกิจกรรม พักและฝึกต่อ เก็บประวัติในเครื่อง
            และบันทึกการสังเกตของผู้ใหญ่
          </p>
          <h2>เลือกระดับอย่างไร</h2>
          <p>
            ระดับ 1–2 สำหรับเนื้อหาอนุบาล ระดับ 3 สำหรับประถมต้น และระดับ 4
            สำหรับประถมปลาย ทุกระดับเลือกเองได้ ไม่ล็อกตามอายุ เพิ่มความยาวของคำ
            ประโยค และการเล่าเรื่อง โดยเลือกย้อนช่วงพยางค์ได้เสมอ
          </p>
          <a href="/learning-studio/LEVELS_RESEARCH_TH.md" download>
            อ่านแนวคิดและงานวิจัยเรื่องระดับ
          </a>
          <h2>เสียงและเพลงของเรา</h2>
          <p>
            กดเปิดเพลงจากแถบด้านบนเพื่อเริ่มทำนองผจญภัย
            เพลงจะเบาลงตอนฟังตัวอย่างและเงียบขณะใช้ไมค์
            ปิดเพลงหรือปรับความดังได้เสมอ เสียงพี่ปูแบ่งเป็นวลีและเว้นจังหวะจริง
            แต่ยังเป็นเสียงสังเคราะห์
          </p>
          <h2>เสียงและข้อมูลอยู่ที่ไหน</h2>
          <p>
            เสียงไมค์ไม่ถูกส่งไปเซิร์ฟเวอร์
            ใช้ฟังซ้ำได้ในข้อนั้นและหายเมื่อเปลี่ยนข้อ
            แผนและรายละเอียดกิจกรรมเก็บในเบราว์เซอร์เครื่องนี้
            ล้างข้อมูลเบราว์เซอร์แล้วอาจหาย จึงมีปุ่มสำรองข้อมูลการฝึก
          </p>
          <h2>ผลแบบไหนเชื่อมกับการฝึกอะไร</h2>
          <p>
            ข้อเลือกภาพตรวจคำตอบได้ตรงตัว
            ส่วนการพูดใช้บันทึกความช่วยเหลือและผลสังเกตจากผู้ใหญ่
            ดาวแสดงความพยายาม ส่วนผลประเมินเสียงดูแยกได้พร้อมเวอร์ชันเกณฑ์และผลตรวจจากผู้ใหญ่
          </p>
          <h2>ก่อนนำไปใช้กับเด็กจริง</h2>
          <p>
            ตัวอย่างคำ ภาพสาธิตปาก และลำดับแบบฝึกยังต้องให้นักแก้ไขการพูดตรวจ
            ครูเลือกจุดเริ่มตามความสามารถเด็กได้ ช่วงอายุเป็นตัวช่วยการออกแบบ
            ไม่ใช่เกณฑ์วินิจฉัย
          </p>
          <h2>การเชื่อมต่อกับระบบหลัก</h2>
          <p>
            ห้องนี้รับโปรไฟล์ที่เลือกและสิทธิ์เริ่มฝึกจากระบบหลักแล้ว
            เมื่อเชื่อมโปรไฟล์เด็กแล้ว ระบบส่งสรุปรอบที่จบไปยังความก้าวหน้าและรายงาน
            งานที่ครูมอบหมาย การแจ้งเตือน อีเมล และการประเมินเสียงจริง
            เป็นส่วนที่ทีมจะเชื่อมต่อภายหลัง
          </p>
          </details>
        </section>
        </div>
        <aside>
          <section className="panel guide-download">
            <div className="guide-icon">
              <FileText size={32} />
            </div>
            <h2>เอกสารประกอบแบบฝึก</h2>
            <p>ที่มาของการแบ่งระดับและสื่อประกอบ</p>
            <a
              href="/learning-studio/LEVELS_RESEARCH_TH.md"
              download
              className="button secondary"
            >
              <Download size={16} />
              แนวคิดการแบ่งระดับ
            </a>
            <a
              href="/learning-studio/MEDIA_AUDIT_TH.md"
              download
              className="button secondary"
            >
              <Download size={16} />
              ภาพ เสียง และเพลงที่ปรับ
            </a>
          </section>
          <details className="panel reset-card">
            <summary>จัดการข้อมูลในเครื่อง</summary>
            <p>ล้างเฉพาะข้อมูลของโมดูลต้นแบบนี้ในเครื่อง</p>
            <Button variant="ghost" onClick={onReset}>
              <RotateCcw size={15} />
              ล้างข้อมูลต้นแบบ
            </Button>
          </details>
        </aside>
      </div>
      <div className="research-links">
        <h3>ที่มาของแนวคิด</h3>
        <a
          href="https://www.asha.org/practice-portal/clinical-topics/articulation-and-phonology/"
          target="_blank"
          rel="noreferrer"
        >
          ASHA แนวทางเรื่องเสียงพูด <ExternalLink size={13} />
        </a>
        <a
          href="https://www.cochrane.org/evidence/CD009383_non-speech-oral-motor-treatment-children-developmental-speech-sound-disorders"
          target="_blank"
          rel="noreferrer"
        >
          Cochrane กิจกรรมปากที่ไม่พูด <ExternalLink size={13} />
        </a>
        <a
          href="https://pmc.ncbi.nlm.nih.gov/articles/PMC6802861/"
          target="_blank"
          rel="noreferrer"
        >
          Speech Motor Chaining <ExternalLink size={13} />
        </a>
      </div>
    </>
  );
}
