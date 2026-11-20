"use client";

import type { ReactNode } from "react";
import {
  ArrowRight, BookOpenCheck, CalendarCheck, Ear, FileText, HeartHandshake, KeyRound, Languages, MessageCircle, Mic,
  QrCode, School, ShieldCheck, Smile, Sparkles, Star, Trophy, UserCheck, Users,
} from "lucide-react";
import { ButtonLink, Card, CardContent } from "@/components/ui";
import { Art } from "@/features/learning-studio/Art";
import { useAuth } from "@/hooks/useAuth";
import { useChildProfile } from "@/hooks/useChildProfile";
import { cn } from "@/lib/cn";

function SectionHeading({ id, eyebrow, title, description }: { id: string; eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-caption font-semibold text-primary-text">{eyebrow}</p>
      <h2 id={id} className="mt-1.5 font-display text-[1.75rem] font-semibold leading-tight text-text sm:text-[2.25rem]">{title}</h2>
      {description && <p className="mt-2.5 text-[1.0625rem] text-text-muted">{description}</p>}
    </div>
  );
}

function IconChip({ children, tone = "primary" }: { children: ReactNode; tone?: "primary" | "success" | "warning" | "info" }) {
  const tones = {
    primary: "bg-primary-soft text-primary-text",
    success: "bg-success-soft text-success-text",
    warning: "bg-warning-soft text-warning-text",
    info: "bg-info-soft text-info-text",
  };
  return <span aria-hidden="true" className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] ring-1 ring-inset ring-current/10", tones[tone])}>{children}</span>;
}

// ── Hero ────────────────────────────────────────────────────────────────────────

export function Hero() {
  const { user } = useAuth();
  const { hasProfile } = useChildProfile();
  const start = user ? { href: "/dashboard", label: "ไปหน้าหลัก" }
    : hasProfile ? { href: "/training", label: "ฝึกต่อ" } : { href: "/onboarding", label: "เริ่มทดลองฝึก" };

  return (
    <section aria-labelledby="hero-heading" className="hero-night relative overflow-hidden rounded-[2rem] px-5 py-10 sm:px-10 lg:px-14 lg:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgb(255_255_255/0.18)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(110deg,transparent_40%,#000_95%)]" />
      <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-14">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-caption font-semibold text-white/90 ring-1 ring-inset ring-white/15">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#FFD58A]" />ระบบฝึกพูดสำหรับเด็กไทย
          </p>
          <h1 id="hero-heading" className="mt-4 font-display text-[2.25rem] font-semibold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.5rem]">
            ฝึกพูดทีละขั้น<br /><span className="bg-[linear-gradient(90deg,#FFE3A8,#F2B23A)] bg-clip-text text-transparent">ที่บ้านและที่โรงเรียน</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">
            ฟังเสียงตัวอย่าง ดูท่าปาก แล้วลองพูดตาม รอบละไม่กี่นาที ผู้ปกครองและครูเห็นความก้าวหน้าเดียวกัน
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <ButtonLink href={start.href} size="lg" className="btn-gold px-7">{start.label}</ButtonLink>
            <ButtonLink href="/demo" size="lg" variant="inverse-outline" className="border-white/25 bg-white/10">ดูตัวอย่างระบบ</ButtonLink>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-white/75">
            {["ลองได้ทันทีไม่ต้องสมัคร", "เสียงที่อัดไม่ถูกอัปโหลด", "ใช้ได้ทั้งมือถือและคอมพิวเตอร์"].map((item) => (
              <li key={item} className="flex items-center gap-1.5"><span aria-hidden="true" className="text-[#FFD58A]">✓</span>{item}</li>
            ))}
          </ul>
          {!user && (
            <p className="mt-5 text-sm text-white/75">
              มีใบเชิญหรือ QR จากโรงเรียน?{" "}
              <a href="/join" className="font-semibold text-white underline underline-offset-4">ใช้รหัสเข้าร่วม</a>
            </p>
          )}
        </div>

        <div aria-hidden="true" className="relative mx-auto hidden w-full max-w-[23rem] lg:block">
          <div className="rounded-[1.75rem] bg-white/95 p-5 text-[#15132E] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.7)] ring-1 ring-white/40">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[#F0EEFC] px-2.5 py-1 text-[0.6875rem] font-semibold text-[#4A3DC8]">ฝึกคำ · เสียง ก</span>
              <span className="text-[0.6875rem] font-medium text-[#625F7C]">2 / 5</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EEEDF6]"><div className="h-full w-2/5 rounded-full bg-[linear-gradient(90deg,#8D80FF,#5548D4)]" /></div>
            <div className="mx-auto mt-4 w-48 [&_svg]:h-auto [&_svg]:w-full"><Art kind="chicken" label="" /></div>
            <p className="mt-1 text-center font-display text-5xl font-semibold">ไก่</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-[0.75rem] font-semibold">
              <span className="flex flex-col items-center gap-1 rounded-[0.9rem] bg-[#F2F1F8] p-2.5 text-[#625F7C]"><Ear size={18} />ฟัง</span>
              <span className="flex flex-col items-center gap-1 rounded-[0.9rem] bg-[#F2F1F8] p-2.5 text-[#625F7C]"><Smile size={18} />ดูปาก</span>
              <span className="flex flex-col items-center gap-1 rounded-[0.9rem] bg-[linear-gradient(180deg,#7A6CF5,#5548D4)] p-2.5 text-white shadow-[0_10px_20px_-12px_#5548D4]"><Mic size={18} />พูดตาม</span>
            </div>
          </div>
          <div className="absolute -left-10 top-16 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-[#15132E] shadow-[0_18px_40px_-20px_rgb(0_0_0/0.6)]">
            <span className="grid size-8 place-items-center rounded-full bg-[linear-gradient(180deg,#FFD58A,#F2B23A)] text-[#3A2300]"><Star size={15} className="fill-current" /></span>
            <span className="text-xs leading-tight"><span className="block font-display text-sm font-semibold">+3 ดาว</span>ได้ทุกครั้งที่ลอง</span>
          </div>
          <div className="absolute -bottom-6 -right-6 flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-[#15132E] shadow-[0_18px_40px_-20px_rgb(0_0_0/0.6)]">
            <span className="relative grid size-10 place-items-center">
              <span className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(#5548D4 57%, #EEEDF6 0)", WebkitMask: RING_MASK, mask: RING_MASK }} />
              <span className="font-display text-xs font-semibold">4/7</span>
            </span>
            <span className="text-xs leading-tight"><span className="block font-display text-sm font-semibold">ฝึก 4 วัน</span>ในสัปดาห์นี้</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const RING_MASK = "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))";

export function StatsStrip() {
  const stats = [
    { value: "3", label: "แนวทางการฝึก" },
    { value: "6", label: "ช่วงจากฟังจนใช้จริง" },
    { value: "ป ก ม", label: "เสียงเป้าหมาย" },
    { value: "4", label: "ระดับ อนุบาล–ประถม" },
  ];
  return (
    <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-y-4 rounded-[1.25rem] border border-border bg-surface px-2 py-4 shadow-card sm:grid-cols-4 sm:divide-x sm:divide-border">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col px-2 text-center">
          <dt className="order-2 text-caption text-text-muted">{stat.label}</dt>
          <dd className="font-display text-[1.75rem] font-semibold leading-tight text-text">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── How it works ────────────────────────────────────────────────────────────────

const STEPS = [
  { icon: <Sparkles size={20} />, title: "เลือกแนวทางและเสียง", text: "ฝึกออกเสียง พูดเพื่อสื่อสาร หรือเสียงกับตัวอักษร เลือกระดับให้เหมาะกับวัยได้เอง" },
  { icon: <Ear size={20} />, title: "ฟัง ดูปาก แล้วลองพูด", text: "แต่ละรอบมีไม่กี่กิจกรรม มีเสียงตัวอย่าง ภาพท่าปาก และคำใบ้เมื่อต้องการ" },
  { icon: <HeartHandshake size={20} />, title: "ผู้ใหญ่ช่วยสังเกต", text: "เสียงที่อัดใช้ฟังทบทวนในเครื่องเท่านั้น ไม่มีคะแนน AI ผู้ใหญ่เป็นคนช่วยดูว่าพูดชัดขึ้นไหม" },
  { icon: <CalendarCheck size={20} />, title: "เห็นความสม่ำเสมอ", text: "รอบที่ฝึกจบเข้าความก้าวหน้า รายงาน และรางวัลทันที ทั้งของผู้ปกครองและครู" },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="space-y-8">
      <SectionHeading id="how-heading" eyebrow="วิธีการฝึก" title="ง่าย สั้น และทำได้ทุกวัน" description="ออกแบบให้ผู้ปกครองเริ่มได้ทันที ไม่ต้องมีความรู้เฉพาะทาง" />
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <Card className="relative h-full overflow-hidden">
              <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1 font-display text-[4.5rem] font-semibold leading-none text-primary/[0.07]">{index + 1}</span>
              <CardContent className="relative space-y-3">
                <span aria-hidden="true" className="btn-primary grid size-11 place-items-center rounded-[0.9rem] text-primary-foreground">{step.icon}</span>
                <p className="text-caption font-semibold text-primary-text">ขั้นที่ {index + 1}</p>
                <h3 className="font-display text-lg font-medium leading-snug text-text">{step.title}</h3>
                <p className="text-sm text-text-muted">{step.text}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}

const CHAPTERS = ["ฟังแยกเสียง", "ดูปากและพูดตาม", "ฝึกพยางค์", "ฝึกคำ", "วลีและประโยค", "ลองใช้จริง"];

const CHAPTER_COLORS = ["#7B6CF6", "#5B8DEF", "#2E9BC9", "#1F9D6E", "#D2861B", "#C24D7A"];

export function Journey() {
  return (
    <section aria-labelledby="journey-heading" className="space-y-8">
      <SectionHeading id="journey-heading" eyebrow="เส้นทางการฝึก" title="6 ช่วง จากฟังไปจนถึงใช้จริง" description="เริ่มช่วงไหนก็ได้ พักแล้วกลับมาทำต่อได้เสมอ" />
      <ol className="relative grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
        <span aria-hidden="true" className="absolute left-[8%] right-[8%] top-6 hidden h-1 rounded-full bg-[linear-gradient(90deg,#7B6CF6,#2E9BC9,#1F9D6E,#D2861B,#C24D7A)] opacity-40 lg:block" />
        {CHAPTERS.map((chapter, index) => (
          <li key={chapter} className="relative flex flex-col items-center text-center">
            <span className="grid size-12 place-items-center rounded-full font-display text-lg font-semibold text-white shadow-[0_10px_22px_-12px_currentColor] ring-4 ring-bg"
              style={{ background: CHAPTER_COLORS[index], color: "#fff" }}>{index + 1}</span>
            <span className="mt-3 font-display text-[0.9375rem] font-medium text-text">{chapter}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── For families ────────────────────────────────────────────────────────────────

const PREVIEW_WEEKS = [1, 2, 2, 3, 2, 4, 3, 5];

function ProgressPreview() {
  const max = Math.max(...PREVIEW_WEEKS);
  return (
    <Card aria-label="ตัวอย่างหน้าความก้าวหน้า" className="overflow-hidden shadow-[0_30px_60px_-36px_rgb(36_27_102/0.55)]">
      <div className="hero-night flex items-center justify-between px-5 py-3.5">
        <p className="font-display text-sm font-medium">ความก้าวหน้า · น้องมะลิ</p>
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[0.6875rem] font-semibold">ตัวอย่าง</span>
      </div>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["13", "รอบที่ฝึกจบ"], ["4/7", "วันที่ฝึกใน 7 วัน"], ["39", "ดาวความพยายาม"]].map(([value, label]) => (
            <div key={label} className="rounded-control bg-surface-muted p-2.5">
              <p className="font-display text-2xl font-semibold tabular-nums text-text">{value}</p>
              <p className="text-caption text-text-muted">{label}</p>
            </div>
          ))}
        </div>
        <div aria-hidden="true">
          <p className="mb-2 text-caption text-text-muted">รอบที่ฝึกจบในแต่ละสัปดาห์</p>
          <div className="flex h-20 items-end gap-1.5 border-b border-border">
            {PREVIEW_WEEKS.map((value, index) => (
              <div key={index} className="flex flex-1 justify-center">
                <span className={cn("w-full max-w-7 rounded-t-[6px]", index === PREVIEW_WEEKS.length - 1 ? "bg-[linear-gradient(180deg,#8D80FF,#5548D4)]" : "bg-primary/30")}
                  style={{ height: `${(value / max) * 72}px` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 rounded-control bg-primary-soft/60 p-3 text-sm">
          <Sparkles size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-primary-text" />
          <p className="text-text">ฝึกได้สม่ำเสมอดีมาก ลองเพิ่มแนวทางพูดเพื่อสื่อสาร เพื่อใช้เสียงในสถานการณ์จริง</p>
        </div>
      </CardContent>
    </Card>
  );
}

const FAMILY_FEATURES = [
  { icon: <CalendarCheck size={20} />, tone: "success" as const, title: "ความสม่ำเสมอรายสัปดาห์", text: "เห็นว่าฝึกกี่วัน กี่รอบ และแนวทางไหนบ้าง พร้อมข้อแนะนำขั้นต่อไป" },
  { icon: <Trophy size={20} />, tone: "warning" as const, title: "ดาวและตราความพยายาม", text: "ได้ดาวทุกครั้งที่ลอง ตรานับจากความตั้งใจ ไม่ได้นับจากคะแนน" },
  { icon: <FileText size={20} />, tone: "info" as const, title: "รายงานพิมพ์ได้", text: "เลือกช่วงเวลาแล้วบันทึกเป็น PDF ส่งให้ครูหรือนักแก้ไขการพูด" },
  { icon: <Users size={20} />, tone: "primary" as const, title: "ดูร่วมกันทั้งบ้าน", text: "ชวนพ่อแม่หรือญาติด้วย QR ไม่ต้องรู้อีเมลของกันและกัน" },
];

export function ForFamilies() {
  return (
    <section aria-labelledby="family-heading" className="grid items-center gap-8 lg:grid-cols-2">
      <div className="space-y-5">
        <div>
          <p className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-caption font-semibold text-primary-text">สำหรับผู้ปกครอง</p>
          <h2 id="family-heading" className="mt-1.5 font-display text-[1.75rem] font-semibold leading-tight text-text sm:text-[2.25rem]">รู้ว่าลูกฝึกไปถึงไหน<br className="hidden sm:block" /> โดยไม่ต้องเดา</h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {FAMILY_FEATURES.map((feature) => (
            <li key={feature.title} className="flex gap-3">
              <IconChip tone={feature.tone}>{feature.icon}</IconChip>
              <div>
                <h3 className="font-display text-[0.9375rem] font-medium text-text">{feature.title}</h3>
                <p className="mt-0.5 text-sm text-text-muted">{feature.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <ProgressPreview />
    </section>
  );
}

// ── For schools ─────────────────────────────────────────────────────────────────

const SCHOOL_FLOW = [
  { icon: <School size={20} />, who: "โรงเรียน", text: "สมัครใช้งาน ทีมงานอนุมัติ แล้วสร้างห้องเรียนและนำเข้ารายชื่อนักเรียนจากตาราง" },
  { icon: <UserCheck size={20} />, who: "ครู", text: "สมัครด้วยรหัสโรงเรียน ผู้ดูแลโรงเรียนอนุมัติและเลือกห้องให้ในกล่องข้อความ" },
  { icon: <QrCode size={20} />, who: "ใบเชิญรายคน", text: "ครูพิมพ์ใบเชิญ QR ของนักเรียนแต่ละคนส่งกลับบ้าน ไม่ต้องคัดลอกลิงก์หรือพิมพ์อีเมล" },
  { icon: <KeyRound size={20} />, who: "ผู้ปกครอง", text: "สแกน QR สมัครและยินยอมตาม PDPA ในหน้าเดียว แล้วเริ่มฝึกกับลูกได้ทันที" },
];

export function ForSchools() {
  return (
    <section aria-labelledby="school-heading" className="space-y-8">
      <SectionHeading id="school-heading" eyebrow="สำหรับโรงเรียน" title="เชื่อมโรงเรียน ครู และผู้ปกครอง ด้วยรหัสเดียว"
        description="ไม่มีการพิมพ์อีเมลของคนอื่น ทุกคนเข้าร่วมด้วยรหัสหรือ QR และคนที่ดูแลเป็นผู้อนุมัติ" />
      <ol className="grid gap-3 md:grid-cols-4">
        {SCHOOL_FLOW.map((step, index) => (
          <li key={step.who} className="relative">
            <Card className="h-full">
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <IconChip tone="info">{step.icon}</IconChip>
                  <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-caption font-semibold tabular-nums text-text-muted">ขั้น {index + 1}</span>
                </div>
                <h3 className="font-display text-lg font-medium text-text">{step.who}</h3>
                <p className="text-sm text-text-muted">{step.text}</p>
              </CardContent>
            </Card>
            {index < SCHOOL_FLOW.length - 1 && (
              <span aria-hidden="true" className="absolute -right-3.5 top-1/2 z-10 hidden size-7 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface text-primary-text shadow-card md:grid"><ArrowRight size={14} /></span>
            )}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap justify-center gap-2.5">
        <ButtonLink href="/register-school" icon={<School size={16} aria-hidden="true" />}>สมัครสำหรับโรงเรียน</ButtonLink>
        <ButtonLink href="/join" variant="outline" icon={<KeyRound size={16} aria-hidden="true" />}>มีรหัสแล้ว ใช้รหัสเข้าร่วม</ButtonLink>
      </div>
    </section>
  );
}

// ── Trust ───────────────────────────────────────────────────────────────────────

const TRUST = [
  { icon: <Languages size={20} />, title: "เนื้อหาภาษาไทยโดยเฉพาะ", text: "คำ ภาพ และเสียงตัวอย่างทำมาสำหรับเด็กไทย ไม่ได้แปลจากระบบต่างประเทศ" },
  { icon: <BookOpenCheck size={20} />, title: "ไม่ใช่การวินิจฉัย", text: "ระบบนับความพยายามและความสม่ำเสมอ ไม่ให้คะแนนความชัดด้วย AI ข้อกังวลเรื่องการพูดควรปรึกษาผู้เชี่ยวชาญ" },
  { icon: <ShieldCheck size={20} />, title: "ข้อมูลเด็กปลอดภัย", text: "เสียงที่อัดไม่ถูกอัปโหลด ผู้ปกครองยินยอมก่อนเชื่อมกับโรงเรียน และขอลบข้อมูลได้ทุกเมื่อ" },
  { icon: <MessageCircle size={20} />, title: "ได้แรงบันดาลใจจากนักแก้ไขการพูด", text: "ลำดับการฝึกจากฟัง ดูปาก พยางค์ คำ ไปจนถึงใช้จริง ตามแนวปฏิบัติที่ใช้กันทั่วไป" },
];

export function Trust() {
  return (
    <section aria-labelledby="trust-heading" className="space-y-8">
      <SectionHeading id="trust-heading" eyebrow="ทำไมต้อง Speech Adventure" title="ออกแบบมาเพื่อเด็กไทยและครอบครัวไทย" />
      <ul className="grid gap-3 sm:grid-cols-2">
        {TRUST.map((item) => (
          <li key={item.title}>
            <Card className="h-full">
              <CardContent className="flex gap-3">
                <IconChip tone="success">{item.icon}</IconChip>
                <div>
                  <h3 className="font-display text-lg font-medium text-text">{item.title}</h3>
                  <p className="mt-1 text-sm text-text-muted">{item.text}</p>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      <p className="text-center text-caption text-text-muted">Speech Adventure เป็นต้นแบบเพื่อการศึกษาที่อยู่ระหว่างการพัฒนา</p>
    </section>
  );
}

// ── Final call to action ────────────────────────────────────────────────────────

export function FinalCta() {
  const { user } = useAuth();
  const { hasProfile, profile } = useChildProfile();
  const name = profile?.nickname || profile?.name?.split(" ")[0];
  return (
    <section aria-labelledby="cta-heading" className="hero-night relative overflow-hidden rounded-[2rem] px-6 py-14 text-center">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgb(255_255_255/0.18)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(circle_at_center,#000,transparent_75%)]" />
      <h2 id="cta-heading" className="relative font-display text-[1.75rem] font-semibold leading-tight sm:text-[2.5rem]">
        {hasProfile && name ? `พร้อมฝึกต่อกับ${name}แล้วหรือยัง?` : "เริ่มฝึกรอบแรกได้เลย"}
      </h2>
      <p className="relative mx-auto mt-3 max-w-lg text-white/80">
        {user ? "กลับไปที่หน้าหลักเพื่อฝึกต่อและดูความก้าวหน้า"
          : "ทดลองได้ทันทีโดยไม่ต้องสมัคร ข้อมูลเก็บในเครื่องนี้ หรือสมัครเพื่อเก็บผลไว้และดูร่วมกับครู"}
      </p>
      <div className="relative mt-7 flex flex-wrap justify-center gap-2.5">
        {user ? <ButtonLink href="/dashboard" size="lg" className="btn-gold px-7">ไปหน้าหลัก</ButtonLink> : (
          <>
            <ButtonLink href={hasProfile ? "/training" : "/onboarding"} size="lg" className="btn-gold px-7">{hasProfile ? "ฝึกต่อ" : "เริ่มทดลองฝึก"}</ButtonLink>
            <ButtonLink href="/auth/signup" size="lg" variant="inverse-outline" className="border-white/25 bg-white/10">สมัครใช้งาน</ButtonLink>
          </>
        )}
      </div>
    </section>
  );
}
