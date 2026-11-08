"use client";
import "./studio.generated.css";
import "./host-theme.css";
import Link from "next/link";
import {
  createStudioState,
  studioStorageKey,
  type StudioChild,
} from "./integration";
import React, { useState, useEffect, useRef, useEffectEvent } from "react";
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
  Sun,
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
  Settings2,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
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
}
export function LearningStudio({
  onEvent,
  child,
  accountId,
  allowExport = true,
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
  const stateRef = useRef(state);
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [toast, setToast] = useState("");
  const [preview, setPreview] = useState<{ item: Item; stage: Stage } | null>(
    null,
  );
  const [startRequest, setStartRequest] = useState<{
    stage: Stage;
    ids?: string[];
  } | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
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
  const stats = metrics(completed);
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
    if (stage.items.some((i) => i.kind !== "choice"))
      setStartRequest({ stage, ids });
    else start(stage, ids);
  };
  const continueLearning = () => {
    if (active) {
      go("practice");
      return;
    }
    const ordered = [
      ...stages.slice(currentIndex),
      ...stages.slice(0, currentIndex),
    ];
    const next =
      ordered.find(
        (s) =>
          !completed.some(
            (x) => x.planId === state.plan.id && x.stageId === s.id,
          ),
      ) ?? currentStage;
    begin(next);
  };
  const chooseLevel = (level: LearningLevelId) => {
    if (level === getLevel(state.plan.level).id) return;
    const plan = {
      ...state.plan,
      level,
      id: uid(),
      createdAt: now(),
      selectedItems: [],
    };
    commit(
      { ...state, plan, activeSessionId: undefined },
      { type: "plan.saved", payload: plan },
    );
    setToast(
      "เลือกระดับ " +
        getLevel(level).label +
        " แล้ว ประวัติรอบที่จบยังอยู่ในผลการฝึก",
    );
  };
  const sessionForSummary = state.sessions.find(
    (s) => s.id === state.lastCompletedId && s.childId === state.plan.childId,
  );
  const reviewSession = state.sessions.find((s) => s.id === reviewId);
  const nav = [
    { id: "home", label: "บ้านการเรียน" },
    { id: "path", label: "เส้นทางของฉัน" },
    { id: "library", label: "คลังกิจกรรม" },
    { id: "progress", label: "ผลการฝึก" },
    { id: "plan", label: "จัดชุดฝึก" },
    { id: "guide", label: "คู่มือ" },
  ] as const;
  return (
    <div className="app-shell">
      <audio
        data-sample-player="true"
        className="sample-audio-element"
        preload="none"
        aria-hidden="true"
      />
      <div className="main-shell">
        <header className="studio-header print:hidden">
          <div className="studio-header-row">
            <Link href="/training" className="studio-back">
              <ArrowLeft size={17} /> กลับหน้าแผนฝึก
            </Link>
            <MusicRoom />
          </div>
          <nav aria-label="เมนูห้องฝึกการพูด" className="studio-nav">
            {nav.map((item) => (
              <button key={item.id} type="button" onClick={() => go(item.id)}
                aria-current={route === item.id ? "page" : undefined}>
                <Icon name={item.id} size={17} />
                {item.label}
              </button>
            ))}
          </nav>
          <p className="studio-storage-note">ผลฝึกจากห้องนี้บันทึกในเบราว์เซอร์ของบัญชีที่ใช้งาน</p>
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
              <SectionHead
                eyebrow="A LITTLE PRACTICE, A BIG ADVENTURE"
                title={`วันนี้ลองอะไรดี ${state.plan.childName}`}
                body="ฟังให้คุ้น ลองพูด แล้วค่อย ๆ เล่าเรื่องไปด้วยกัน"
                action={
                  <span className="date-label">
                    <Sun size={18} /> พร้อมสำหรับก้าวเล็ก ๆ วันนี้
                  </span>
                }
              />
              <LevelPicker
                value={state.plan.level}
                onChange={chooseLevel}
                compact
              />
              <section className="hero">
                <div className="hero-copy">
                  <span className="pill warm">
                    <Sparkles size={14} /> โลกแห่งการฝึกพูด
                  </span>
                  <h2>
                    ทุกเสียงเล็ก ๆ<br />
                    มีเรื่องราวให้ค้นพบ<span>.</span>
                  </h2>
                  <p>
                    มาเล่นกับเพื่อนตัวน้อย ฟังเสียงที่คุ้นเคย
                    <br />
                    แล้วลองเล่าเรื่องในแบบของเรา
                  </p>
                  <Button onClick={continueLearning}>
                    {active ? <RefreshCw size={17} /> : <Play size={17} />}{" "}
                    {active ? "กลับมาฝึกต่อ" : "เริ่มภารกิจวันนี้"}
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
                <div className="hero-art">
                  <Landscape />
                  <div className="hero-bubble">
                    <Heart size={14} fill="currentColor" /> เก่งขึ้นทีละนิด
                  </div>
                  <Art
                    kind={SOUNDS[state.plan.sound as keyof typeof SOUNDS]?.hero}
                    animate
                  />
                  <div className="hero-star one">✦</div>
                  <div className="hero-star two">✧</div>
                </div>
              </section>
              <div className="stats-grid">
                <Stat
                  icon={<Flag />}
                  label="รอบที่ฝึกครบ"
                  value={
                    <>
                      {stats.sessions}
                      <em> รอบ</em>
                    </>
                  }
                />
                <Stat
                  icon={<Star />}
                  color="orange"
                  label="ดาวความพยายาม"
                  value={
                    <>
                      {stats.participation}
                      <em> ดวง</em>
                    </>
                  }
                  detail="ให้เมื่อทำกิจกรรม ไม่ใช่คะแนนความชัด"
                />
                <Stat
                  icon={<Ear />}
                  color="green"
                  label="ฟังแล้วเลือกภาพ"
                  value={
                    stats.listeningTotal
                      ? `${stats.listeningCorrect}/${stats.listeningTotal}`
                      : "ยังไม่มีผล"
                  }
                  detail={
                    stats.listeningTotal
                      ? "จำนวนที่ตอบตรงกับเสียง"
                      : "เริ่มจากเกมฟังกันได้เลย"
                  }
                />
              </div>
              <div className="two-column">
                <section className="panel plan-card">
                  <div className="panel-title">
                    <h2>แผนเล็ก ๆ ของวันนี้</h2>
                    <button className="text-button" onClick={() => go("plan")}>
                      ปรับแผน <Settings2 size={15} />
                    </button>
                  </div>
                  <div className="current-plan">
                    <span className="plan-symbol">
                      {state.plan.track === "speech" ? (
                        state.plan.sound
                      ) : (
                        <Icon name={TRACKS[state.plan.track].icon} />
                      )}
                    </span>
                    <div>
                      <span className="muted">
                        {TRACKS[state.plan.track].label}
                      </span>
                      <h3>
                        {state.plan.track === "speech"
                          ? `ผจญภัยไปกับเสียง ${state.plan.sound}`
                          : TRACKS[state.plan.track].description}
                      </h3>
                      <p>
                        {getLevel(state.plan.level).label} · {stages.length}{" "}
                        ช่วงการเรียนรู้
                      </p>
                    </div>
                  </div>
                  <div className="plan-facts">
                    <span>
                      <Users size={15} />
                      {state.plan.adultSupport
                        ? "มีผู้ใหญ่เล่นด้วย"
                        : "ลองเองแล้วขอช่วยได้"}
                    </span>
                    <span>
                      <BookOpen size={15} />
                      {stages.reduce((sum, s) => sum + s.items.length, 0)}{" "}
                      กิจกรรมพร้อมลอง
                    </span>
                  </div>
                </section>
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
                    อ่านวิธีเล่นด้วยกัน <ArrowRight size={15} />
                  </button>
                </section>
              </div>
              <div className="panel-title section-space">
                <div>
                  <h2>เส้นทางของเรา</h2>
                  <p className="muted">เลือกช่วงที่พร้อม แล้วเริ่มได้เลย</p>
                </div>
                <button className="text-button" onClick={() => go("path")}>
                  ดูเส้นทางทั้งหมด <ArrowRight size={16} />
                </button>
              </div>
              <div className="stage-grid">
                {stages.slice(0, 3).map((stage, i) => (
                  <StageCard
                    key={stage.id}
                    stage={stage}
                    index={i}
                    done={completed.some(
                      (s) =>
                        s.planId === state.plan.id && s.stageId === stage.id,
                    )}
                    onClick={() => begin(stage)}
                  />
                ))}
              </div>
              <div className="bottom-note">
                <ShieldCheck size={16} />
                กิจกรรมเพื่อทดลองการใช้งาน ผลการพูดต้องให้ผู้ใหญ่ช่วยสังเกต
                ไม่มีการประเมินเสียงด้วย AI จริงในต้นแบบนี้
              </div>
            </>
          )}
          {route === "path" && (
            <>
              <SectionHead
                eyebrow="MY LEARNING JOURNEY"
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
                    ทำกิจกรรมครบ{" "}
                    {
                      stages.filter((st) =>
                        completed.some(
                          (s) =>
                            s.planId === state.plan.id && s.stageId === st.id,
                        ),
                      ).length
                    }
                    /{stages.length} ช่วง · “ทำครบ” แสดงการเข้าร่วม
                    ไม่ใช่การผ่านทักษะ
                  </p>
                </div>
              </div>
              <div className="journey">
                {stages.map((stage, i) => {
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
                      <div className="journey-card">
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
                            CHAPTER {String(i + 1).padStart(2, "0")}
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
                          </div>
                        </div>
                        <Button
                          variant={done ? "secondary" : "primary"}
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
          )}
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
              <Practice
                key={active.id + ":" + active.index}
                session={active}
                stages={getStages(active.track, active.sound, active.level)}
                onPause={() => {
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
                  if (r.done) go("summary");
                }}
              />
            ) : (
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
          {route === "guide" && <Guide onReset={() => setResetOpen(true)} />}
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
      {startRequest && (
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
              เสียงไม่ถูกอัปโหลด และไม่เก็บถาวร
            </span>
            <span>
              <Users size={18} />
              ผลการพูดใช้ผู้ใหญ่ช่วยสังเกต
            </span>
          </div>
          <p className="footnote">
            เสียงที่อัดหายเมื่อเปลี่ยนข้อหรือปิดหน้า
            ส่วนผลการทำกิจกรรมเก็บเฉพาะเครื่องนี้
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
            ล้างแผนและผลในต้นแบบนี้เพื่อเริ่มทดสอบใหม่ สามารถส่งออก JSON
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
  );
}
function StageCard({
  stage,
  index,
  done,
  onClick,
}: {
  stage: Stage;
  index: number;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button className="stage-card" onClick={onClick}>
      <div className="stage-card-top">
        <span
          className="stage-icon"
          style={{ background: stage.color + "19", color: stage.color }}
        >
          <Icon name={stage.icon} size={24} />
        </span>
        <span className="chapter">
          {done ? (
            <CheckCircle2 size={19} />
          ) : (
            String(index + 1).padStart(2, "0")
          )}
        </span>
      </div>
      <h3>{stage.label}</h3>
      <p>{stage.description}</p>
      <div className="stage-card-bottom">
        <span>{stage.items.length} กิจกรรม</span>
        <span className="round-arrow">
          <ArrowRight size={18} />
        </span>
      </div>
    </button>
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
        eyebrow="MAKE IT THEIR OWN"
        title="จัดชุดฝึกให้เหมาะกับเรา"
        body="เลือกเป้าหมายและจุดเริ่ม ผู้ใหญ่ปรับให้เหมาะกับเด็กได้เสมอ"
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.childName.trim()) {
            setError("ใส่ชื่อเล่นก่อนบันทึกแผน");
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
                <span className="step-number">1</span>เริ่มจากเป้าหมายไหน
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
                <span className="step-number">2</span>รู้จักเพื่อนตัวน้อย
              </h2>
              <div className="form-row">
                <label>
                  ชื่อเล่น
                  <input
                    value={draft.childName}
                    maxLength={30}
                    onChange={(e) => update({ childName: e.target.value })}
                    placeholder="ชื่อเล่นของเด็ก"
                    required
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
                ช่วงวัยเป็นข้อมูลในแผน เลือกระดับเนื้อหาด้านล่างตามความพร้อมได้
              </p>
              <h3>
                {draft.track === "speech"
                  ? "เลือกเสียงเป้าหมาย"
                  : "เลือกกลุ่มคำตัวอย่าง"}
              </h3>
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
            <section className="panel form-section">
              <h2>
                <span className="step-number">3</span>เลือกจุดเริ่มและกิจกรรม
              </h2>
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
            </section>
          </div>
          <aside className="plan-preview panel">
            <span className="eyebrow">แผนที่กำลังจัด</span>
            <Art kind={SOUNDS[draft.sound as keyof typeof SOUNDS].hero} />
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
              แผนนี้ใช้ในต้นแบบเท่านั้น ยังไม่ได้ส่งงานให้ครูหรือระบบโรงเรียน
            </p>
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
          </aside>
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
        eyebrow="LITTLE THINGS TO TRY"
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
        <select
          aria-label="กรองช่วงฝึก"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">ทุกช่วงการฝึก</option>
          {stages.map((s) => (
            <option value={s.id} key={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="muted">{items.length} กิจกรรม</span>
      </div>
      <div className="library-grid">
        {items.map(({ item, stage }) => (
          <button
            className="library-card"
            key={item.id}
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
              <span className="small-tag" style={{ color: stage.color }}>
                {stage.label}
              </span>
            </div>
            <div className="library-info">
              <h3>{item.title}</h3>
              <p>{item.prompt}</p>
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
      <h2>{item.title}</h2>
      <p className="preview-prompt">{item.prompt}</p>
      <p>{item.instruction}</p>
      <p className="footnote">{item.hint}</p>
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
function Practice({
  session,
  stages,
  onSave,
  onNext,
  onPause,
}: {
  session: Session;
  stages: Stage[];
  onSave: (a: Attempt) => void;
  onNext: () => void;
  onPause: () => void;
}) {
  const stage = stages.find((s) => s.id === session.stageId);
  const item = stage?.items.find(
    (i) => i.id === session.itemIds[session.index],
  );
  const speaker = useSpeaker();
  const [choice, setChoice] = useState<string | null>(
    () =>
      session.attempts.find((a) => a.itemId === session.itemIds[session.index])
        ?.choiceId ?? null,
  );
  const [showHelp, setShowHelp] = useState(false);

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
  const [micError, setMicError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const urlRef = useRef("");
  const recordedPlayer = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );
  const mounted = useRef(true);
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("speech-adventure:recording", {
        detail: recording || requesting,
      }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("speech-adventure:recording", { detail: false }),
      );
    };
  }, [recording, requesting]);
  const saved = item
    ? session.attempts.find((a) => a.itemId === item.id)
    : undefined;
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
    speaker.stop();
    recordedPlayer.current?.pause();
    window.dispatchEvent(
      new CustomEvent("speech-adventure:recording", { detail: true }),
    );
    setMicError("");
    setRequesting(true);
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setMicError("เครื่องนี้ยังอัดเสียงไม่ได้ ใช้ปุ่มทดลองโดยไม่อัดเสียงได้");
      window.dispatchEvent(
        new CustomEvent("speech-adventure:recording", { detail: false }),
      );
      setRequesting(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const media = new MediaRecorder(stream);
      mediaRef.current = media;
      const parts: BlobPart[] = [];
      media.ondataavailable = (e) => {
        if (e.data.size) parts.push(e.data);
      };
      media.onstop = () => {
        clearInterval(timerRef.current);
        stream.getTracks().forEach((t) => t.stop());
        if (!mounted.current) return;
        const blob = new Blob(parts, { type: media.mimeType || "audio/webm" });
        if (!blob.size) {
          setMicError("ยังไม่ได้เสียง ลองอีกครั้งหรือใช้โหมดทดลอง");
          setRecording(false);
          return;
        }
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(blob);
        setAudio(urlRef.current);
        setRecording(false);
        setDemo(false);
      };
      media.onerror = () => {
        clearInterval(timerRef.current);
        stream.getTracks().forEach((t) => t.stop());
        setMicError("อัดเสียงไม่สำเร็จ ลองใหม่ได้");
        setRecording(false);
      };
      setAudio("");
      setDemo(false);
      setElapsed(0);
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
      setRecording(false);
      window.dispatchEvent(
        new CustomEvent("speech-adventure:recording", { detail: false }),
      );
      setMicError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "ยังไม่ได้รับสิทธิ์ไมค์ เลือกอนุญาตจากเบราว์เซอร์ หรือใช้โหมดทดลองได้"
          : "เปิดไมค์ไม่สำเร็จ ตรวจว่าเสียบไมค์แล้ว หรือใช้โหมดทดลองได้",
      );
    } finally {
      if (mounted.current) setRequesting(false);
    }
  }
  function resetAudio() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = "";
    setAudio("");
    setDemo(false);
    setRetries((v) => v + 1);
  }
  if (!stage || !item)
    return (
      <Empty
        title="ไม่พบกิจกรรมนี้"
        body="กลับไปเลือกชุดฝึกใหม่ได้ ข้อมูลรอบก่อนยังอยู่ในประวัติ"
        action={<Button onClick={onPause}>กลับหน้าหลัก</Button>}
      />
    );
  const isChoice = item.kind === "choice";
  const correct = saved?.choiceCorrect ?? choice === item.answer;
  const read = () => {
    if (recording || requesting) return;
    recordedPlayer.current?.pause();
    speaker.speak(item.sample);
    setSupport((s) => (s === "adult" ? "adult" : "modeled"));
  };
  const save = () => {
    if (isChoice && correct)
      window.dispatchEvent(
        new CustomEvent("speech-adventure:chime", { detail: "success" }),
      );
    onSave({
      id: uid(),
      itemId: item.id,
      createdAt: now(),
      kind: item.kind,
      mode: isChoice
        ? "choice"
        : item.kind === "observation"
          ? "observation"
          : demo
            ? "demo"
            : "recording",
      choiceId: isChoice ? (choice ?? undefined) : undefined,
      choiceCorrect: isChoice ? correct : undefined,
      support: isChoice ? "independent" : support,
      review: isChoice
        ? "achieved"
        : item.kind === "observation"
          ? review
          : "pending",
      retries,
    });
  };
  return (
    <div className="practice-shell">
      <div className="practice-toolbar">
        <button className="text-button" onClick={onPause}>
          <ArrowLeft size={17} />
          พักไว้ก่อน
        </button>
        <span style={{ color: stage.color }}>
          <Icon name={stage.icon} size={18} />
          {stage.label}
        </span>
        <span className="mission-counter">
          {session.index + 1}
          <em> / {session.itemIds.length}</em>
        </span>
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
            disabled={recording || requesting}
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
                  disabled={!!saved}
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
            {item.art === "mouth" ? (
              <MouthCoach sound={session.sound} sample={item.sample} />
            ) : (
              <div className="exercise-art">
                <Art kind={item.art} />
              </div>
            )}
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
                disabled={recording || requesting}
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
                        disabled={!!saved}
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
                        recording ? mediaRef.current?.stop() : record()
                      }
                      disabled={requesting}
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
                            ? "ลองฟังเสียงของเรา"
                            : "กดไมค์แล้วลองพูด"}
                    </strong>
                    {audio && (
                      <>
                        <audio
                          ref={recordedPlayer}
                          controls
                          src={audio}
                          onPlay={() => speaker.stop()}
                          aria-label="เสียงที่อัดไว้ในข้อนี้"
                        />
                        <button className="text-button" onClick={resetAudio}>
                          <RotateCcw size={15} />
                          อัดใหม่
                        </button>
                      </>
                    )}
                    {!recording && (
                      <button
                        className={`demo-answer ${demo ? "active" : ""}`}
                        onClick={() => {
                          setDemo(true);
                          setAudio("");
                          setMicError("");
                        }}
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
        <div className="practice-bottom">
          {!saved && isChoice && choice !== null && (
            <Button
              variant="secondary"
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
                isChoice
                  ? choice === null
                  : item.kind === "observation"
                    ? review === "pending"
                    : (!audio && !demo) || recording || requesting
              }
            >
              <Check size={17} />
              {isChoice ? "บันทึกคำตอบ" : "บันทึกการลองทำ"}
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
        ดาวให้กับการลองทำ · ไม่มีคะแนน AI · เสียงใช้เฉพาะข้อนี้ในเครื่อง
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
      <div className="celebration-art">
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
              : "—"}
          </strong>
          <small>
            {m.listeningTotal ? "ฟังและเลือกถูก" : "รอบนี้ไม่มีกิจกรรมเลือกภาพ"}
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
        ครูและผู้ปกครองในระบบหลักยังไม่ได้รับผลจากต้นแบบนี้
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
        eyebrow="EVERY LITTLE STEP COUNTS"
        title="มองเห็นทุกความพยายาม"
        body={`ผลการฝึกของ ${childName} · ข้อมูลต้นแบบในเครื่องนี้`}
        action={
          <div className="action-group">
            <Button
              variant="secondary"
              disabled={!allowExport}
              onClick={onExport}
            >
              <Download size={16} />
              ส่งออก JSON
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
          <div
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
          </div>
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
}: {
  onReset: () => void;
}) {
  return (
    <>
      <SectionHead
        eyebrow="A GUIDE FOR GROWN-UPS"
        title="ลองเล่นด้วยกันอย่างเข้าใจ"
        body="คู่มือการจัดชุดฝึก การใช้เสียง และการดูผลในเครื่องนี้"
      />
      <div className="guide-layout">
        <section className="panel prose">
          <h2>เริ่มทดลองในไม่กี่นาที</h2>
          <ol>
            <li>เปิดจัดชุดฝึก เลือกเป้าหมาย เสียง ช่วงวัย และจุดเริ่ม</li>
            <li>เลือกช่วงฝึกจากเส้นทาง หรือเลือกทีละข้อในคลังกิจกรรม</li>
            <li>กิจกรรมฟังให้เลือกภาพ กิจกรรมพูดให้อัดเสียงหรือกดจำลองคำตอบ</li>
            <li>บันทึกทุกข้อและกดดูสรุปรอบ ผลการพูดจะรอผู้ใหญ่ตรวจ</li>
            <li>เปิดผลการฝึกเพื่อตรวจรายข้อ พิมพ์ หรือส่งออกข้อมูล JSON</li>
          </ol>
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
            ผลกิจกรรมและแผนเก็บในเบราว์เซอร์เครื่องนี้
            ล้างข้อมูลเบราว์เซอร์แล้วอาจหาย จึงมีปุ่มส่งออก JSON
          </p>
          <h2>ผลแบบไหนเชื่อมกับการฝึกอะไร</h2>
          <p>
            ข้อเลือกภาพตรวจคำตอบได้ตรงตัว
            ส่วนการพูดใช้บันทึกความช่วยเหลือและผลสังเกตจากผู้ใหญ่
            ดาวแสดงการลองทำ ไม่ใช้แทนคะแนนความชัด และไม่มีคะแนน AI สุ่ม
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
            มีสรุปจำนวนรอบในหน้าฝึก ผลชุดใหม่ยังไม่ซิงก์ข้ามเครื่อง
            งานที่ครูมอบหมาย การแจ้งเตือน อีเมล และการประเมินเสียงจริง
            เป็นส่วนที่ทีมจะเชื่อมต่อภายหลัง
          </p>
        </section>
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
          <section className="panel reset-card">
            <h3>เริ่มทดสอบรอบใหม่</h3>
            <p>ล้างเฉพาะข้อมูลของโมดูลต้นแบบนี้ในเครื่อง</p>
            <Button variant="ghost" onClick={onReset}>
              <RotateCcw size={15} />
              ล้างข้อมูลต้นแบบ
            </Button>
          </section>
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
