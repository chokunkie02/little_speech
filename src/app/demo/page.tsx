"use client";

import DisplayIcon from "@/components/ui/DisplayIcon";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useChildProfile } from "@/hooks/useChildProfile";
import { usePhonicsProgress } from "@/hooks/usePhonicsProgress";
import {
  mockTrainingStages,
  mockTargetSounds,
} from "@/data/speechAdventureMockData";
import { BADGE_DEFINITIONS } from "@/lib/rewards/rewardDefinitions";
import { getPhonicsUnits } from "@/data/kindergartenCurriculum";
import { loadDemoProgress } from "@/lib/demo/speechAdventureDemoData";
import { DEMO_ATTEMPT_COUNT } from "@/lib/demo/speechAdventureDemoData";

// ── Shared helpers ─────────────────────────────────────────────────────────────

function BadgeIcon({ iconPath, color, size = 18 }: { iconPath: string; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPath.split("M").filter(Boolean).map((segment, i) => (
        <path key={i} d={`M${segment}`} />
      ))}
    </svg>
  );
}

function Section({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">{label}</p>
      {children}
    </section>
  );
}

function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`bg-surface border border-border rounded-2xl p-5 ${className}`} style={style}>
      {children}
    </div>
  );
}

function Btn({ href, children, variant = "primary", amber = false }: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "outline";
  amber?: boolean;
}) {
  const base = "inline-flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl text-sm transition-all active:scale-[0.98]";
  const cls = amber
    ? variant === "primary"
      ? `${base} bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-300/30`
      : `${base} border border-amber-400 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20`
    : variant === "primary"
    ? `${base} bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20`
    : `${base} border border-primary/30 text-primary hover:bg-primary/8`;
  return <Link href={href} className={cls}>{children}</Link>;
}

// ── Shared sections (used in both modes) ──────────────────────────────────────

function PracticeFlowSection({ amber = false }: { amber?: boolean }) {
  const steps = [
    { step: "1", title: "ดูคำสั่ง", desc: amber ? "อ่านโจทย์และฟังเสียงตัวอย่าง" : "อ่านหรือฟังคำสั่งของภารกิจ", color: amber ? "#F59E0B" : "#A29BFE" },
    { step: "2", title: "ฟังเสียง", desc: "กดฟังเสียงตัวอย่างก่อนพูดตาม", color: amber ? "#FB923C" : "#6C63FF" },
    { step: "3", title: "พูดตาม", desc: amber ? "ลองพูดหรือเลือกคำตอบ" : "กดไมโครโฟนแล้วออกเสียง", color: amber ? "#4CAF82" : "#4CAF82" },
    { step: "4", title: "รับผล", desc: "ได้รับดาวและคำชมทันที", color: "#FFB347" },
  ];
  return (
    <Section id="practice" label="การฝึกแต่ละกิจกรรม">
      <Card>
        <h3 className="text-base font-bold text-text mb-4">ขั้นตอนการฝึก</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          {steps.map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold text-sm" style={{ backgroundColor: item.color }}>
                {item.step}
              </div>
              <p className="text-sm font-semibold text-text">{item.title}</p>
              <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </Section>
  );
}

function AISection() {
  return (
    <Section id="ai" label="สถาปัตยกรรม AI-ready">
      <Card className="border-primary/15" style={{ background: "linear-gradient(135deg, rgba(108,99,255,0.04) 0%, transparent 60%)" }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-text mb-1">พร้อมเชื่อมต่อ AI จริง</h3>
            <p className="text-sm text-text-muted leading-relaxed">
              ระบบออกแบบมาให้สลับจาก mock evaluation เป็น AI จริงได้ง่าย
              ผ่าน evaluation provider interface — เพียงเปลี่ยน provider ไม่ต้องแก้ logic การฝึก
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {["Provider Interface", "Mock API", "Real-time Audio", "Score Analysis"].map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full bg-primary/6 text-primary text-xs font-medium">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </Section>
  );
}

// ── Phonics Showcase ───────────────────────────────────────────────────────────

function PhonicsShowcase() {
  const { summary, completedLessonIds, completedUnitIds, isHydrated } = usePhonicsProgress();
  const units = getPhonicsUnits();

  const starsEarned = isHydrated ? (summary?.totalAttempts ? Math.min(summary.totalAttempts * 2, 99) : 0) : null;
  const completedLessons = isHydrated ? summary.completedLessonIds.length : null;
  const completedUnits = isHydrated ? summary.completedUnitIds.length : null;
  const hasProgress = isHydrated && summary.totalAttempts > 0;

  const PHONICS_MILESTONES = [
    { icon: "sprout", name: "เริ่มเรียนเสียงไทยแล้ว", desc: "ฝึกกิจกรรมแรกในสวนเสียง", done: isHydrated && summary.totalAttempts >= 1 },
    { icon: "star", name: "ผ่านบทเรียนแรก", desc: "ผ่านบทเรียนสำเร็จเป็นครั้งแรก", done: isHydrated && completedLessonIds.size >= 1 },
    { icon: "listen", name: "นักฟังเสียงตัวน้อย", desc: "ผ่าน 3 บทเรียนขึ้นไป", done: isHydrated && completedLessonIds.size >= 3 },
    { icon: "shuffle", name: "นักผสมเสียง", desc: "ผ่านระดับผสมเสียง K4", done: isHydrated && completedUnitIds.has("K4") },
    { icon: "book", name: "นักอ่านคำง่าย", desc: "ผ่านระดับคำง่าย K5", done: isHydrated && completedUnitIds.has("K5") },
    { icon: "award", name: "เก็บดาวจากสวนเสียง", desc: "สะสมดาวจากการเรียน", done: isHydrated && summary.totalAttempts >= 5 },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* ── Hero ── */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-300/30">
          <span className="text-3xl" aria-hidden="true"><DisplayIcon name="star" /></span>
        </div>
        <h1 className="text-3xl font-bold text-text">สวนเสียง</h1>
        <p className="text-lg text-text-muted max-w-xl mx-auto leading-relaxed">
          เรียนเสียงไทยสำหรับเด็กปฐมวัย ผ่าน 7 ระดับที่เรียงจากง่ายไปยาก
          ฟังก่อน แล้วลองพูดตามนะ
        </p>
        <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
          <Btn href="/training" amber>เริ่มเรียนเลย</Btn>
          <Btn href="/progress" variant="outline" amber>ดูความก้าวหน้า</Btn>
        </div>
      </div>

      {/* ── Live stats (if any progress) ── */}
      {hasProgress && (
        <Section id="stats" label="ผลงานของน้อง">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "ครั้งที่ฝึก", value: summary.totalAttempts, color: "text-amber-500" },
              { label: "บทเรียนผ่าน", value: completedLessons ?? 0, color: "text-amber-500" },
              { label: "ระดับผ่าน", value: `${completedUnits ?? 0}/${units.length}`, color: "text-amber-500" },
            ].map((s) => (
              <div key={s.label} className="bg-surface border border-border rounded-2xl p-4 text-center">
                <p className={`text-2xl font-bold ${s.color} tabular-nums`}>{s.value}</p>
                <p className="text-xs text-text-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted text-center mt-2">เก่งมาก น้องสะสมดาวได้แล้ว</p>
        </Section>
      )}

      {/* ── 7 Units ── */}
      <Section id="curriculum" label="7 ระดับ สวนเสียง">
        <Card>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-text">K1–K7 เรียงจากง่ายไปยาก</h3>
              <p className="text-sm text-text-muted mt-0.5">ทุกระดับรองรับ 4 รูปแบบกิจกรรม ไม่ซ้ำกัน</p>
            </div>
            <Btn href="/library" variant="outline" amber>ดูเนื้อหา</Btn>
          </div>
          <div className="space-y-2">
            {units.map((unit, i) => (
              <div key={unit.id} className="flex items-center gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                    {unit.id}
                  </div>
                  {i < units.length - 1 && <div className="w-px h-3 bg-border mt-1" aria-hidden="true" />}
                </div>
                <div className="flex-1 flex items-center gap-3 bg-bg dark:bg-white/3 rounded-xl px-3 py-2.5 border border-border">
                  <span className="text-base flex-shrink-0" aria-hidden="true"><DisplayIcon name={unit.icon} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text">{unit.title}</p>
                    <p className="text-xs text-text-muted">{unit.description}</p>
                  </div>
                  <span className="text-xs text-text-muted flex-shrink-0">
                    {unit.lessons.length} บทเรียน
                  </span>
                  {isHydrated && completedUnitIds.has(unit.id) && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-bold flex-shrink-0">✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* ── Activity types ── */}
      <Section id="activities" label="รูปแบบกิจกรรม">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: "listen", name: "ฟังและเลือก", desc: "ฟังเสียงแล้วแตะตัวอักษรที่ถูกต้อง เหมาะกับผู้เริ่มต้น" },
            { icon: "mic", name: "พูดตาม", desc: "ฟังเสียงตัวอย่างแล้วพูดตาม ระบบบันทึกและประเมินเสียง" },
            { icon: "shuffle", name: "ผสมเสียง", desc: "เรียนผสมพยัญชนะ + สระ = พยางค์ ด้วยภาพสมการ" },
            { icon: "book", name: "คำและประโยค", desc: "ฝึกออกเสียงคำสั้นและประโยคง่ายๆ ในชีวิตประจำวัน" },
          ].map((a) => (
            <Card key={a.name}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 text-xl" aria-hidden="true">
                  <DisplayIcon name={a.icon} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text">{a.name}</h3>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{a.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* ── Practice flow ── */}
      <PracticeFlowSection amber />

      {/* ── Milestones ── */}
      <Section id="milestones" label="ความสำเร็จ">
        <Card>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-text">ผลงานของน้อง</h3>
              <p className="text-sm text-text-muted mt-0.5">สะสมความสำเร็จจากการเรียนในสวนเสียง</p>
            </div>
            <Btn href="/rewards" variant="outline" amber>ดูทั้งหมด</Btn>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PHONICS_MILESTONES.map((m) => (
              <div
                key={m.name}
                className={`flex flex-col items-center text-center p-4 rounded-2xl border transition-all ${
                  m.done
                    ? "bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-700/40"
                    : "bg-bg dark:bg-white/2 border-dashed border-border/60 opacity-50"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 text-2xl ${
                  m.done ? "bg-amber-100 dark:bg-amber-900/40" : "bg-gray-100 dark:bg-white/6"
                }`} aria-hidden="true">
                  <DisplayIcon name={m.icon} />
                </div>
                <p className={`text-xs font-bold leading-tight mb-0.5 ${m.done ? "text-text" : "text-text-muted"}`}>{m.name}</p>
                <p className="text-xs text-text-muted/70 leading-snug">{m.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* ── AI section ── */}
      <AISection />

      {/* ── Footer ── */}
      <div className="text-center text-xs text-text-muted/60 pt-4 pb-8">
        <p>Speech Adventure — Prototype v0.1</p>
        <p className="mt-0.5">Built with Next.js, React, TypeScript, and Tailwind CSS</p>
      </div>
    </div>
  );
}

// ── Speech Clarity Showcase ────────────────────────────────────────────────────

function SpeechClarityShowcase() {
  const handleLoadDemo = () => {
    loadDemoProgress();
    window.location.href = "/progress";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* ── Hero ── */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-text">Speech Adventure</h1>
        <p className="text-lg text-text-muted max-w-xl mx-auto leading-relaxed">
          ระบบฝึกออกเสียงพยัญชนะไทยสำหรับเด็ก
          ออกแบบให้เด็กพัฒนาการออกเสียงได้อย่างมีความสุขและมั่นใจ
        </p>
        <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
          <Btn href="/training">เริ่มฝึกเลย</Btn>
          <Btn href="/progress" variant="outline">ดูความก้าวหน้า</Btn>
        </div>
      </div>

      {/* ── Who it's for ── */}
      <Section id="audience" label="สำหรับใคร">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-text mb-1">เด็ก (4–10 ปี)</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              เด็กที่ต้องการพัฒนาการออกเสียงพยัญชนะภาษาไทยให้ชัดเจนขึ้น ผ่านกิจกรรมที่สนุกและเหมาะกับวัย
            </p>
          </Card>
          <Card>
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4CAF82" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-text mb-1">ผู้ปกครอง</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              ติดตามพัฒนาการของบุตรหลานผ่านรายงานที่เข้าใจง่าย พร้อมบันทึกสังเกตการณ์ส่วนตัว
            </p>
          </Card>
          <Card>
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5BC0EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-text mb-1">ครูและผู้เชี่ยวชาญด้านการพูด</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              ใช้เป็นเครื่องมือเสริมในการสอน ดูรายงานผลฝึกแบบละเอียดและจุดที่ต้องเน้น
            </p>
          </Card>
        </div>
      </Section>

      {/* ── Training Journey ── */}
      <Section id="training" label="เส้นทางการฝึก">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div>
              <h3 className="text-base font-bold text-text">7 ระดับ ตามลำดับความยาก</h3>
              <p className="text-sm text-text-muted mt-0.5">เริ่มจากประเมิน → ฝึกทีละขั้น → วัดผลอีกครั้ง</p>
            </div>
            <Btn href="/training" variant="outline">ดูแผนที่ฝึก</Btn>
          </div>
          <div className="space-y-2">
            {mockTrainingStages.map((stage, i) => (
              <div key={stage.id} className="flex items-center gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs" style={{ backgroundColor: `${stage.accentColor}14`, color: stage.accentColor }}>
                    {i + 1}
                  </div>
                  {i < mockTrainingStages.length - 1 && <div className="w-px h-3 bg-border mt-1" aria-hidden="true" />}
                </div>
                <div className="flex-1 flex items-center gap-3 bg-bg dark:bg-white/3 rounded-xl px-3 py-2.5 border border-border">
                  <span className="text-base flex-shrink-0" aria-hidden="true"><DisplayIcon name={stage.icon} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text">{stage.name}</p>
                    <p className="text-xs text-text-muted">{stage.shortGoal}</p>
                  </div>
                  <span className="text-xs text-text-muted flex-shrink-0">{stage.starsTotal} ดาว</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* ── Target Sounds ── */}
      <Section id="sounds" label="เสียงเป้าหมาย">
        <Card>
          <h3 className="text-base font-bold text-text mb-3">รองรับ 4 เสียงพยัญชนะ</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {mockTargetSounds.map((sound) => (
              <div key={sound.id} className="flex flex-col items-center bg-bg dark:bg-white/3 rounded-xl p-4 border border-border">
                <span className="text-2xl font-bold text-primary mb-1">{sound.label}</span>
                <span className="text-xs text-text-muted">{sound.description}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-3">
            แต่ละเสียงมีเนื้อหาครบ 7 ระดับ รวม {mockTargetSounds.length * 7 * 5} ภารกิจ
          </p>
        </Card>
      </Section>

      {/* ── Practice flow ── */}
      <PracticeFlowSection />

      {/* ── Progress ── */}
      <Section id="progress" label="รายงานความก้าวหน้า">
        <Card>
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-base font-bold text-text">Dashboard สำหรับผู้ปกครอง</h3>
            <Btn href="/progress" variant="outline">ดูหน้า Progress</Btn>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
            {[
              { label: "คะแนนเฉลี่ย", value: "73%", color: "text-success" },
              { label: "ครั้งที่ฝึก", value: "31", color: "text-info" },
              { label: "ดาวสะสม", value: "68", color: "text-secondary" },
              { label: "ระดับผ่าน", value: "5/7", color: "text-primary" },
            ].map((stat) => (
              <div key={stat.label} className="bg-bg dark:bg-white/3 border border-border rounded-xl p-3 text-center">
                <p className="text-xs text-text-muted mb-1">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color} leading-none`}>{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-level-pretest/8 border border-level-pretest/20 rounded-xl p-3 text-center">
              <p className="text-xs font-medium text-level-pretest mb-1">Pre-test</p>
              <p className="text-2xl font-bold text-level-pretest">48%</p>
            </div>
            <div className="bg-success/8 border border-success/20 rounded-xl p-3 text-center">
              <p className="text-xs font-medium text-success mb-1">Review</p>
              <p className="text-2xl font-bold text-success">81%</p>
            </div>
          </div>
          <div className="mt-3 text-center">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/10 text-success text-sm font-semibold">
              +33 คะแนนพัฒนาการ
            </span>
          </div>
        </Card>
      </Section>

      {/* ── Rewards ── */}
      <Section id="rewards" label="รางวัลและเหรียญตรา">
        <Card>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-text">10 เหรียญตรา</h3>
              <p className="text-sm text-text-muted mt-0.5">สร้างแรงบันดาลใจให้เด็กฝึกต่อเนื่อง</p>
            </div>
            <Btn href="/rewards" variant="outline">ดูรางวัล</Btn>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {BADGE_DEFINITIONS.slice(0, 5).map((badge) => (
              <div key={badge.id} className="flex flex-col items-center text-center p-3 bg-bg dark:bg-white/3 rounded-xl border border-border">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: `${badge.color}14` }}>
                  <BadgeIcon iconPath={badge.iconPath} color={badge.color} size={16} />
                </div>
                <p className="text-xs font-semibold text-text leading-tight">{badge.name}</p>
                <p className="text-xs text-text-muted/60 mt-0.5 leading-snug">{badge.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* ── Report ── */}
      <Section id="report" label="รายงานสำหรับผู้ปกครอง">
        <Card>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-text">สรุปอัตโนมัติ</h3>
              <p className="text-sm text-text-muted mt-0.5">รายงานที่อ่านง่าย พร้อมคำแนะนำสำหรับผู้ปกครอง</p>
            </div>
            <Btn href="/report" variant="outline">ดูรายงาน</Btn>
          </div>
          <div className="space-y-2">
            <div className="bg-bg dark:bg-white/3 border border-border rounded-xl p-3">
              <p className="text-sm font-semibold text-text">น้องกำลังอยู่ในระดับ Level 3</p>
            </div>
            <div className="flex items-start gap-2 text-sm text-text">
              <span className="text-primary flex-shrink-0 mt-0.5 font-bold">·</span>
              ฝึกรวม 31 ครั้ง · คะแนนเฉลี่ย 73%
            </div>
            <div className="flex items-start gap-2 text-sm text-text">
              <span className="text-success flex-shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF82" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
              พัฒนาการจาก Pre-test ถึง Review: +33 คะแนน
            </div>
          </div>
        </Card>
      </Section>

      {/* ── AI section ── */}
      <AISection />

      {/* ── Demo Data CTA ── */}
      <Section id="try" label="ลองใช้งาน">
        <Card className="text-center space-y-4">
          <div>
            <h3 className="text-base font-bold text-text mb-1">ลองดูข้อมูลตัวอย่าง</h3>
            <p className="text-sm text-text-muted">
              โหลดข้อมูลสาธิต {DEMO_ATTEMPT_COUNT} ครั้ง ครอบคลุม 7 ระดับการฝึก เพื่อดูรายงานความก้าวหน้าแบบเต็มรูปแบบ
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={handleLoadDemo}
              className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm shadow-primary/20"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              โหลดข้อมูลสาธิต
            </button>
            <Btn href="/training" variant="outline">เริ่มฝึกเลย</Btn>
            <Btn href="/library" variant="outline">ดูเนื้อหาทั้งหมด</Btn>
          </div>
        </Card>
      </Section>

      {/* ── Footer ── */}
      <div className="text-center text-xs text-text-muted/60 pt-4 pb-8">
        <p>Speech Adventure — Prototype v0.1</p>
        <p className="mt-0.5">Built with Next.js, React, TypeScript, and Tailwind CSS</p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DemoShowcasePage() {
  const { profile, isHydrated } = useChildProfile();

  // After hydration: if child is in phonics mode, show phonics showcase.
  // Before hydration (and for speech_clarity): show speech clarity showcase.
  const isPhonicsMode = isHydrated && profile?.trainingMode === "kindergarten_phonics";

  return (
    <AppShell>
      <aside className="mx-auto mt-4 max-w-4xl rounded-xl border border-border bg-surface p-4 text-sm text-text-muted">
        ตัวอย่างเส้นทางเดิม · สำหรับลองดูรูปแบบกิจกรรมและรายงาน ส่วนนักเรียนใช้เมนู «ฝึกและเรียน» เพื่อเปิดห้องฝึกปัจจุบัน
      </aside>
      {isPhonicsMode ? <PhonicsShowcase /> : <SpeechClarityShowcase />}
    </AppShell>
  );
}
