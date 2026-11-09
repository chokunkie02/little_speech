"use client";

import DisplayIcon from "@/components/ui/DisplayIcon";
import { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import {
  mockTargetSounds,
  mockTrainingStages,
  mockPracticeItemsBySound,
} from "@/data/speechAdventureMockData";
import { getPhonicsUnits } from "@/data/kindergartenCurriculum";
import type { PracticeItem, PracticeItemType } from "@/types/speechAdventure";
import type { PhonicsUnit, PhonicsActivityType } from "@/types/phonics";

// ── Speech Clarity labels ──────────────────────────────────────────────────────

const TYPE_LABELS: Record<PracticeItemType, { label: string; skill: string }> = {
  test: { label: "แบบทดสอบ", skill: "ประเมินระดับเสียง" },
  oral_motor: { label: "กล้ามเนื้อปาก", skill: "เตรียมกล้ามเนื้อการพูด" },
  sound_choice: { label: "เลือกเสียง", skill: "จดจำและแยกแยะเสียง" },
  sound_production: { label: "ออกเสียง", skill: "ผลิตเสียงพยัญชนะ" },
  word: { label: "คำ", skill: "ออกเสียงคำ" },
  sentence: { label: "ประโยค", skill: "ออกเสียงประโยค" },
};

// ── Kindergarten Phonics labels ────────────────────────────────────────────────

const PHONICS_ACTIVITY_LABELS: Record<PhonicsActivityType, string> = {
  listen_and_choose: "ฟังและเลือก",
  say_after_me: "พูดตาม",
  blend_sounds: "ผสมเสียง",
  simple_word: "คำง่าย",
  final_consonant: "ตัวสะกด",
  short_sentence: "ประโยค",
};

const STAGE_ORDER = [
  "pretest",
  "level-1",
  "level-2",
  "level-3",
  "level-4",
  "level-5",
  "review",
];

function getStageInfo(stageSlug: string) {
  return mockTrainingStages.find((s) => s.slug === stageSlug);
}

// ── Stage Content Card (Speech Clarity) ───────────────────────────────────────

function StageContentCard({
  stageSlug,
  items,
}: {
  stageSlug: string;
  items: PracticeItem[];
}) {
  const stage = getStageInfo(stageSlug);
  if (!stage) return null;

  const typeInfo = items.length > 0 ? TYPE_LABELS[items[0].type] : null;
  const samplePrompts = items.slice(0, 3).map((i) => i.target);

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Stage header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-border"
        style={{ backgroundColor: `${stage.accentColor}08` }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
          style={{ backgroundColor: `${stage.accentColor}14` }}
        >
          <span style={{ color: stage.accentColor, fontSize: "14px" }}>
            <DisplayIcon name={stage.icon} />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text leading-tight">{stage.name}</p>
          <p className="text-xs text-text-muted truncate">{stage.shortGoal}</p>
        </div>
        <Link
          href={`/training/${stage.slug}`}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ backgroundColor: stage.accentColor }}
        >
          เริ่ม
        </Link>
      </div>

      {/* Content details */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-text-muted">{items.length} ภารกิจ</span>
          {typeInfo && (
            <>
              <span className="text-text-muted/30" aria-hidden="true">·</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/6 text-xs font-medium text-text-muted">
                {typeInfo.label}
              </span>
            </>
          )}
          {typeInfo && (
            <>
              <span className="text-text-muted/30" aria-hidden="true">·</span>
              <span className="text-xs text-text-muted">{typeInfo.skill}</span>
            </>
          )}
          <span className="text-text-muted/30" aria-hidden="true">·</span>
          <span className="text-xs text-text-muted">{stage.starsTotal} ดาว</span>
        </div>
        {samplePrompts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map((prompt, i) => (
              <span
                key={i}
                className="inline-block px-2 py-0.5 rounded-md bg-bg dark:bg-white/4 border border-border text-xs text-text"
              >
                {prompt}
              </span>
            ))}
            {items.length > 3 && (
              <span className="text-xs text-text-muted self-center">
                +{items.length - 3}
              </span>
            )}
          </div>
        )}
        {items.length === 0 && (
          <p className="text-xs text-text-muted/60 italic">
            ยังไม่มีเนื้อหาสำหรับระดับนี้
          </p>
        )}
      </div>
    </div>
  );
}

// ── Sound Section (Speech Clarity) ────────────────────────────────────────────

function SoundSection({
  soundId,
  soundLabel,
  soundDescription,
  isDefault,
}: {
  soundId: string;
  soundLabel: string;
  soundDescription: string;
  isDefault: boolean;
}) {
  const content = mockPracticeItemsBySound[soundId];
  const totalItems = content
    ? STAGE_ORDER.reduce((sum, slug) => sum + (content[slug]?.length ?? 0), 0)
    : 0;

  return (
    <section aria-label={`เนื้อหาเสียง ${soundLabel}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-primary">{soundLabel}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-text">เสียง /{soundLabel}/</h3>
            {isDefault && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                ปัจจุบัน
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted">{soundDescription}</p>
          <p className="text-xs text-text-muted mt-0.5">
            {totalItems} ภารกิจ · {STAGE_ORDER.length} ระดับ
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {STAGE_ORDER.map((stageSlug) => {
          const items = content?.[stageSlug] ?? [];
          return (
            <StageContentCard
              key={`${soundId}-${stageSlug}`}
              stageSlug={stageSlug}
              items={items}
            />
          );
        })}
      </div>
    </section>
  );
}

// ── Phonics Unit Card (Kindergarten) ──────────────────────────────────────────

function PhonicsUnitCard({ unit }: { unit: PhonicsUnit }) {
  const totalLessons = unit.lessons.length;
  const totalItems = unit.lessons.reduce((n, l) => n + l.items.length, 0);
  const activityTypes = [
    ...new Set(unit.lessons.flatMap((l) => l.items.map((i) => i.type))),
  ];
  const samplePrompts = (unit.lessons[0]?.items ?? []).slice(0, 3).map((i) => i.prompt);
  const firstLesson = unit.lessons[0];
  const ctaHref = firstLesson ? `/training/phonics/${unit.id}/${firstLesson.id}` : null;

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Unit header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-amber-50/60 dark:bg-amber-950/20">
        <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-base flex-shrink-0">
          <DisplayIcon name={unit.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400">
              {unit.id}
            </span>
            <p className="text-sm font-semibold text-text leading-tight truncate">
              {unit.title}
            </p>
          </div>
          <p className="text-xs text-text-muted truncate">{unit.description}</p>
        </div>
        {ctaHref ? (
          <Link
            href={ctaHref}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            เริ่มเรียน
          </Link>
        ) : (
          <span className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted/50 bg-border/30 cursor-not-allowed">
            เร็วๆ นี้
          </span>
        )}
      </div>

      {/* Content details */}
      <div className="px-4 py-3 space-y-2">
        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-text-muted">{totalLessons} บทเรียน</span>
          <span className="text-text-muted/30" aria-hidden="true">·</span>
          <span className="text-xs text-text-muted">{totalItems} กิจกรรม</span>
        </div>

        {/* Activity type chips */}
        {activityTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activityTypes.map((type) => (
              <span
                key={type}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/40 text-xs font-medium text-amber-700 dark:text-amber-400"
              >
                {PHONICS_ACTIVITY_LABELS[type] ?? type}
              </span>
            ))}
          </div>
        )}

        {/* Sample prompts */}
        {samplePrompts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map((prompt, i) => (
              <span
                key={i}
                className="inline-block px-2 py-0.5 rounded-md bg-bg dark:bg-white/4 border border-border text-xs text-text font-medium"
              >
                {prompt}
              </span>
            ))}
            {totalItems > 3 && (
              <span className="text-xs text-text-muted self-center">
                +{totalItems - 3}
              </span>
            )}
          </div>
        )}

        {totalItems === 0 && (
          <p className="text-xs text-text-muted/60 italic">
            ยังไม่มีเนื้อหาสำหรับหน่วยนี้
          </p>
        )}
      </div>
    </div>
  );
}

// ── Phonics Content Section (Kindergarten) ────────────────────────────────────

function PhonicsContent() {
  const units = getPhonicsUnits();
  const totalLessons = units.reduce((n, u) => n + u.lessons.length, 0);
  const totalItems = units.reduce(
    (n, u) => n + u.lessons.reduce((m, l) => m + l.items.length, 0),
    0,
  );
  const allTypes = [
    ...new Set(
      units.flatMap((u) => u.lessons.flatMap((l) => l.items.map((i) => i.type))),
    ),
  ] as PhonicsActivityType[];

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs font-medium text-text-muted mb-2">ระดับการเรียน</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 leading-none">
            {units.length}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs font-medium text-text-muted mb-2">บทเรียนทั้งหมด</p>
          <p className="text-2xl font-bold text-info leading-none">{totalLessons}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs font-medium text-text-muted mb-2">กิจกรรมทั้งหมด</p>
          <p className="text-2xl font-bold text-success leading-none">{totalItems}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs font-medium text-text-muted mb-2">ประเภทกิจกรรม</p>
          <p className="text-2xl font-bold text-secondary leading-none">{allTypes.length}</p>
        </div>
      </div>

      {/* Unit cards grid */}
      <section aria-label="หน่วยการเรียน K1–K7">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          หน่วยการเรียน K1–K7
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {units.map((unit) => (
            <PhonicsUnitCard key={unit.id} unit={unit} />
          ))}
        </div>
      </section>

      {/* Unit sequence overview */}
      <section aria-label="ลำดับการเรียน">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          ลำดับการเรียน
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {units.map((unit) => (
            <div
              key={unit.id}
              className="flex items-start gap-2.5 bg-surface border border-border rounded-xl p-3"
            >
              <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5 bg-amber-400 dark:bg-amber-500" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text leading-tight">
                  {unit.id} · {unit.title}
                </p>
                <p className="text-xs text-text-muted mt-0.5 leading-snug">
                  {unit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Activity type legend */}
      <section aria-label="ประเภทกิจกรรมเสียงไทย">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          ประเภทกิจกรรม
        </p>
        <div className="flex flex-wrap gap-2">
          {allTypes.map((type) => (
            <div
              key={type}
              className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2"
            >
              <span className="text-xs font-semibold text-text">
                {PHONICS_ACTIVITY_LABELS[type] ?? type}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type ContentMode = "speech_clarity" | "kindergarten_phonics";

export default function LibraryPage() {
  const [contentMode, setContentMode] = useState<ContentMode>("speech_clarity");
  const [selectedSound, setSelectedSound] = useState<string | "all">("all");

  const soundsToShow =
    selectedSound === "all"
      ? mockTargetSounds
      : mockTargetSounds.filter((s) => s.id === selectedSound);

  const totalSpeechContent = mockTargetSounds.reduce(
    (sum, s) =>
      sum +
      STAGE_ORDER.reduce(
        (s2, slug) =>
          s2 + (mockPracticeItemsBySound[s.id]?.[slug]?.length ?? 0),
        0
      ),
    0
  );

  const headerSubtitle =
    contentMode === "kindergarten_phonics"
      ? "เรียนเสียงไทย · 7 ระดับ · เรียงจากง่ายไปยาก"
      : `เนื้อหา ${totalSpeechContent} ภารกิจสำหรับ ${mockTargetSounds.length} เสียงเป้าหมาย · ${STAGE_ORDER.length} ระดับ`;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* Page header */}
        <header>
          <nav className="text-xs text-text-muted mb-2" aria-label="Breadcrumb">
            <Link href="/dashboard" className="hover:text-primary transition-colors">
              หน้าหลัก
            </Link>
            <span className="mx-1.5 text-disabled">/</span>
            <span className="text-text font-medium">เนื้อหาการฝึก</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-text">เนื้อหาการฝึกทั้งหมด</h1>
              <p className="text-sm text-text-muted mt-0.5">{headerSubtitle}</p>
            </div>
            <Link
              href="/training"
              className="flex-shrink-0 inline-flex items-center gap-2 border border-primary text-primary font-semibold px-4 py-2 rounded-xl text-sm hover:bg-primary/8 transition-all active:scale-[0.98]"
            >
              ไปฝึก
            </Link>
          </div>
        </header>

        {/* Mode tabs */}
        <div
          className="flex gap-1.5 p-1 bg-bg dark:bg-white/4 rounded-xl border border-border w-fit"
          role="tablist"
          aria-label="เลือกโหมดเนื้อหา"
        >
          <button
            type="button"
            role="tab"
            aria-selected={contentMode === "speech_clarity"}
            onClick={() => setContentMode("speech_clarity")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              contentMode === "speech_clarity"
                ? "bg-surface text-primary shadow-sm border border-primary/15"
                : "text-text-muted hover:text-text"
            }`}
          >
            <DisplayIcon name="target" className="mr-1" /> ฝึกเสียงให้ชัด
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={contentMode === "kindergarten_phonics"}
            onClick={() => setContentMode("kindergarten_phonics")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              contentMode === "kindergarten_phonics"
                ? "bg-amber-500 text-white shadow-sm shadow-amber-300/30"
                : "text-text-muted hover:text-text"
            }`}
          >
            <DisplayIcon name="star" className="mr-1" /> เรียนเสียงไทย
          </button>
        </div>

        {/* ── Speech Clarity content ── */}
        {contentMode === "speech_clarity" && (
          <>
            {/* Sound filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedSound("all")}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedSound === "all"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-muted hover:text-text hover:bg-gray-100 dark:hover:bg-white/8"
                }`}
              >
                ทั้งหมด
              </button>
              {mockTargetSounds.map((sound) => (
                <button
                  key={sound.id}
                  type="button"
                  onClick={() => setSelectedSound(sound.id)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedSound === sound.id
                      ? "bg-primary text-white shadow-sm"
                      : "text-text-muted hover:text-text hover:bg-gray-100 dark:hover:bg-white/8"
                  }`}
                >
                  เสียง {sound.label}
                </button>
              ))}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="bg-surface border border-border rounded-xl p-4">
                <p className="text-xs font-medium text-text-muted mb-2">เสียงเป้าหมาย</p>
                <p className="text-2xl font-bold text-primary leading-none">
                  {mockTargetSounds.length}
                </p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-4">
                <p className="text-xs font-medium text-text-muted mb-2">ระดับการฝึก</p>
                <p className="text-2xl font-bold text-info leading-none">
                  {STAGE_ORDER.length}
                </p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-4">
                <p className="text-xs font-medium text-text-muted mb-2">ภารกิจทั้งหมด</p>
                <p className="text-2xl font-bold text-success leading-none">
                  {totalSpeechContent}
                </p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-4">
                <p className="text-xs font-medium text-text-muted mb-2">ประเภทกิจกรรม</p>
                <p className="text-2xl font-bold text-secondary leading-none">
                  {Object.keys(TYPE_LABELS).length}
                </p>
              </div>
            </div>

            {/* Sound sections */}
            <div className="space-y-8">
              {soundsToShow.map((sound) => (
                <SoundSection
                  key={sound.id}
                  soundId={sound.id}
                  soundLabel={sound.label}
                  soundDescription={sound.description}
                  isDefault={sound.isSelected}
                />
              ))}
            </div>

            {/* Stage legend */}
            <section aria-label="คำอธิบายระดับ">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                คำอธิบายระดับ
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {mockTrainingStages.map((stage) => (
                  <div
                    key={stage.id}
                    className="flex items-start gap-2.5 bg-surface border border-border rounded-xl p-3"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: stage.accentColor }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text leading-tight">
                        {stage.name}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5 leading-snug">
                        {stage.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Activity type legend */}
            <section aria-label="ประเภทกิจกรรม">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                ประเภทกิจกรรม
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  Object.entries(TYPE_LABELS) as [PracticeItemType, { label: string; skill: string }][]
                ).map(([type, info]) => (
                  <div
                    key={type}
                    className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2"
                  >
                    <span className="text-xs font-semibold text-text">{info.label}</span>
                    <span className="text-text-muted/30" aria-hidden="true">·</span>
                    <span className="text-xs text-text-muted">{info.skill}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ── Kindergarten Phonics content ── */}
        {contentMode === "kindergarten_phonics" && <PhonicsContent />}

        <div className="pb-4" />
      </div>
    </AppShell>
  );
}
