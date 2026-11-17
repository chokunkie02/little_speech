"use client";

import type { ReactNode } from "react";
import {
  ArrowRight, BookOpenCheck, CalendarCheck, Ear, FileText, HeartHandshake, KeyRound, Languages, MessageCircle, Mic,
  QrCode, School, ShieldCheck, Smile, Sparkles, Star, Trophy, UserCheck, Users,
} from "lucide-react";
import { Badge, ButtonLink, Card, CardContent } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useChildProfile } from "@/hooks/useChildProfile";
import { cn } from "@/lib/cn";

function SectionHeading({ id, eyebrow, title, description }: { id: string; eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-caption font-semibold text-primary-text">{eyebrow}</p>
      <h2 id={id} className="mt-1 text-2xl font-bold text-text sm:text-3xl">{title}</h2>
      {description && <p className="mt-2 text-text-muted">{description}</p>}
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
  return <span aria-hidden="true" className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-control", tones[tone])}>{children}</span>;
}

// ── Hero ────────────────────────────────────────────────────────────────────────

export function Hero() {
  const { user } = useAuth();
  const { hasProfile } = useChildProfile();
  const start = user ? { href: "/dashboard", label: "ไปหน้าหลัก" }
    : hasProfile ? { href: "/training", label: "ฝึกต่อ" } : { href: "/onboarding", label: "เริ่มทดลองฝึก" };

  return (
    <section aria-labelledby="hero-heading" className="overflow-hidden rounded-overlay bg-gradient-to-br from-primary to-[#2E2690] px-5 py-9 text-white sm:px-9 lg:px-12 lg:py-12">
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_19rem] lg:gap-12">
        <div className="max-w-xl">
          <p className="text-sm font-semibold text-white/80">Speech Adventure · ระบบฝึกพูดสำหรับเด็กไทย</p>
          <h1 id="hero-heading" className="mt-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">ฝึกพูดทีละขั้น<br />ที่บ้านและที่โรงเรียน</h1>
          <p className="mt-3 text-base leading-relaxed text-white/85 sm:text-lg">
            ฟังเสียงตัวอย่าง ดูท่าปาก แล้วลองพูดตาม รอบละไม่กี่นาที ผู้ปกครองและครูเห็นความก้าวหน้าเดียวกัน
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <ButtonLink href={start.href} size="lg" variant="inverse">{start.label}</ButtonLink>
            <ButtonLink href="/demo" size="lg" variant="inverse-outline">ดูตัวอย่างระบบ</ButtonLink>
          </div>
          {!user && (
            <p className="mt-4 text-sm text-white/80">
              มีใบเชิญหรือ QR จากโรงเรียน?{" "}
              <a href="/join" className="font-semibold text-white underline underline-offset-2">ใช้รหัสเข้าร่วม</a>
            </p>
          )}
        </div>
        <Card className="hidden text-text lg:block">
          <CardContent className="space-y-3 text-center">
            <Badge tone="primary">ตัวอย่างกิจกรรม · เสียง ก</Badge>
            <p className="text-5xl font-bold">กา</p>
            <div className="grid grid-cols-3 gap-2 text-caption font-semibold text-text-muted">
              <span className="flex flex-col items-center gap-1 rounded-control bg-surface-muted p-2"><Ear size={18} aria-hidden="true" />ฟัง</span>
              <span className="flex flex-col items-center gap-1 rounded-control bg-surface-muted p-2"><Smile size={18} aria-hidden="true" />ดูปาก</span>
              <span className="flex flex-col items-center gap-1 rounded-control bg-surface-muted p-2"><Mic size={18} aria-hidden="true" />พูดตาม</span>
            </div>
            <p className="flex items-center justify-center gap-1 text-caption text-warning-text"><Star size={14} className="fill-current" aria-hidden="true" />ได้ดาวทุกครั้งที่ลอง</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function StatsStrip() {
  const stats = [
    { value: "3", label: "แนวทางการฝึก" },
    { value: "ป ก ม", label: "เสียงเป้าหมาย" },
    { value: "4", label: "ระดับเนื้อหา อนุบาล–ประถม" },
  ];
  return (
    <dl className="grid grid-cols-3 divide-x divide-border rounded-card border border-border bg-surface py-3">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col px-2 text-center">
          <dt className="order-2 text-caption text-text-muted">{stat.label}</dt>
          <dd className="text-lg font-bold text-text">{stat.value}</dd>
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
            <Card className="h-full">
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <IconChip>{step.icon}</IconChip>
                  <span className="text-caption font-semibold tabular-nums text-text-muted">0{index + 1}</span>
                </div>
                <h3 className="text-card-title text-text">{step.title}</h3>
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

export function Journey() {
  return (
    <section aria-labelledby="journey-heading" className="space-y-6">
      <SectionHeading id="journey-heading" eyebrow="เส้นทางการฝึก" title="6 ช่วง จากฟังไปจนถึงใช้จริง" description="เริ่มช่วงไหนก็ได้ พักแล้วกลับมาทำต่อได้เสมอ" />
      <ol className="flex flex-wrap justify-center gap-2">
        {CHAPTERS.map((chapter, index) => (
          <li key={chapter} className="flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-1.5 pr-4 text-sm font-medium text-text">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-caption font-bold text-primary-text">{index + 1}</span>
            {chapter}
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
    <Card aria-label="ตัวอย่างหน้าความก้าวหน้า" className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <p className="text-sm font-semibold text-text">ความก้าวหน้า · น้องมะลิ</p>
        <Badge tone="neutral">ตัวอย่าง</Badge>
      </div>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["13", "รอบที่ฝึกจบ"], ["4/7", "วันที่ฝึกใน 7 วัน"], ["39", "ดาวความพยายาม"]].map(([value, label]) => (
            <div key={label} className="rounded-control bg-surface-muted p-2.5">
              <p className="text-xl font-bold tabular-nums text-text">{value}</p>
              <p className="text-caption text-text-muted">{label}</p>
            </div>
          ))}
        </div>
        <div aria-hidden="true">
          <p className="mb-2 text-caption text-text-muted">รอบที่ฝึกจบในแต่ละสัปดาห์</p>
          <div className="flex h-20 items-end gap-1.5 border-b border-border">
            {PREVIEW_WEEKS.map((value, index) => (
              <div key={index} className="flex flex-1 justify-center">
                <span className={cn("w-full max-w-6 rounded-t-[4px]", index === PREVIEW_WEEKS.length - 1 ? "bg-primary" : "bg-primary/45")}
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
          <p className="text-caption font-semibold text-primary-text">สำหรับผู้ปกครอง</p>
          <h2 id="family-heading" className="mt-1 text-2xl font-bold text-text sm:text-3xl">รู้ว่าลูกฝึกไปถึงไหน โดยไม่ต้องเดา</h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {FAMILY_FEATURES.map((feature) => (
            <li key={feature.title} className="flex gap-3">
              <IconChip tone={feature.tone}>{feature.icon}</IconChip>
              <div>
                <h3 className="text-sm font-semibold text-text">{feature.title}</h3>
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
                <div className="flex items-center gap-2">
                  <IconChip tone="info">{step.icon}</IconChip>
                  <span className="text-caption font-semibold tabular-nums text-text-muted">ขั้น {index + 1}</span>
                </div>
                <h3 className="text-card-title text-text">{step.who}</h3>
                <p className="text-sm text-text-muted">{step.text}</p>
              </CardContent>
            </Card>
            {index < SCHOOL_FLOW.length - 1 && (
              <ArrowRight size={18} aria-hidden="true" className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-bg text-text-muted md:block" />
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
                  <h3 className="text-card-title text-text">{item.title}</h3>
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
    <section aria-labelledby="cta-heading" className="rounded-overlay border border-primary/20 bg-primary-soft/50 px-6 py-12 text-center">
      <h2 id="cta-heading" className="text-2xl font-bold text-text sm:text-3xl">
        {hasProfile && name ? `พร้อมฝึกต่อกับ${name}แล้วหรือยัง?` : "เริ่มฝึกรอบแรกได้เลย"}
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-text-muted">
        {user ? "กลับไปที่หน้าหลักเพื่อฝึกต่อและดูความก้าวหน้า"
          : "ทดลองได้ทันทีโดยไม่ต้องสมัคร ข้อมูลเก็บในเครื่องนี้ หรือสมัครเพื่อเก็บผลไว้และดูร่วมกับครู"}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        {user ? <ButtonLink href="/dashboard" size="lg">ไปหน้าหลัก</ButtonLink> : (
          <>
            <ButtonLink href={hasProfile ? "/training" : "/onboarding"} size="lg">{hasProfile ? "ฝึกต่อ" : "เริ่มทดลองฝึก"}</ButtonLink>
            <ButtonLink href="/auth/signup" size="lg" variant="outline">สมัครใช้งาน</ButtonLink>
          </>
        )}
      </div>
    </section>
  );
}
