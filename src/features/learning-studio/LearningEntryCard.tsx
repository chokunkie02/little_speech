"use client";
import Link from "next/link";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { useStudioContext } from "./useStudioContext";
import {
  createStudioState,
  studioStorageKey,
  STUDIO_STATE_EVENT,
} from "./integration";
import { metrics } from "./domain";
const serverSnapshot = () => "";
export function LearningEntryCard() {
  const { user, profile, ready, canPractice, staffHome } =
    useStudioContext();
  const key = studioStorageKey(user?.id, profile?.id);
  const subscribe = useCallback(
    (listener: () => void) => {
      const update = (event: Event) => {
        if (
          event instanceof StorageEvent &&
          event.key !== null &&
          event.key !== key
        )
          return;
        if (event instanceof CustomEvent && event.detail?.storageKey !== key)
          return;
        listener();
      };
      window.addEventListener("storage", update);
      window.addEventListener(STUDIO_STATE_EVENT, update);
      return () => {
        window.removeEventListener("storage", update);
        window.removeEventListener(STUDIO_STATE_EVENT, update);
      };
    },
    [key],
  );
  const snapshot = useCallback(() => {
    try {
      return localStorage.getItem(key) || "";
    } catch {
      return "";
    }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const summary = useMemo(
    () =>
      metrics(
        createStudioState(
          raw || null,
          profile ? { id: profile.id, name: profile.name } : undefined,
        ).sessions,
      ),
    [raw, profile],
  );
  if (!ready || staffHome) return null;
  return (
    <section
      className="rounded-3xl border border-primary/20 bg-surface p-6"
      aria-label="ห้องผจญภัยฝึกพูด"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm text-primary">
            <Sparkles size={18} />
            ห้องการเรียนรู้ใหม่
          </p>
          <h2 className="text-xl font-bold">
            ฟัง ลองพูด แล้วเล่าเรื่องไปด้วยกัน
          </h2>
          <p className="text-sm text-text-muted">
            4 ระดับ · เสียงตัวอย่าง · ภาพสาธิตรูปปาก · ฝึกพยางค์ คำ และประโยค
          </p>
          <p className="text-xs text-text-muted">
            {profile ? `โปรไฟล์ ${profile.name}` : "โหมดทดลอง: น้องมีนา"} ·
            ฝึกครบ {summary.sessions} รอบในเครื่องนี้ · รอผู้ใหญ่สังเกต{" "}
            {summary.pending} ข้อ
          </p>
        </div>
        {canPractice ? (
          <Link
            href="/learning"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-white"
          >
            เข้าห้องผจญภัย
            <ArrowRight size={16} />
          </Link>
        ) : (
          <p className="max-w-xs text-sm text-text-muted">
            ยังไม่ได้รับสิทธิ์เริ่มฝึกสำหรับเด็กคนนี้
          </p>
        )}
      </div>
      {canPractice && (
        <Link
          href="/learning#progress"
          className="mt-4 inline-flex items-center gap-2 text-sm text-primary"
        >
          <BookOpen size={16} />
          ดูผลจากห้องนี้ (เก็บเฉพาะเครื่อง)
        </Link>
      )}
    </section>
  );
}
