"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, CalendarRange, ChartColumn, ClipboardList, FileText, GraduationCap, Inbox, KeyRound, LayoutDashboard,
  Map as MapIcon, Printer, QrCode, School, Sparkles, Trophy, UserRound, Users,
} from "lucide-react";
import { Button, ButtonLink, Card, CardContent, toast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useChildProfile } from "@/hooks/useChildProfile";
import { seedStudioDemo } from "@/lib/demo/studioDemo";

const DEMO_NAME = "น้องมะลิ (ตัวอย่าง)";

const PARENT_STOPS = [
  { href: "/training", icon: <MapIcon size={18} />, title: "ห้องฝึก", text: "แผนวันนี้ เส้นทาง 6 ช่วง และคลังกิจกรรม" },
  { href: "/progress", icon: <ChartColumn size={18} />, title: "ความก้าวหน้า", text: "รอบที่ฝึก วันที่ฝึก และแยกตามแนวทาง" },
  { href: "/rewards", icon: <Trophy size={18} />, title: "รางวัล", text: "ดาวความพยายามและตราที่ได้" },
  { href: "/report", icon: <FileText size={18} />, title: "รายงาน", text: "เลือกช่วงเวลาแล้วพิมพ์เป็น PDF" },
];

const ROLES = [
  {
    icon: <UserRound size={20} />, title: "ผู้ปกครอง", color: "#5548D4", lead: "ฝึกกับลูกที่บ้าน",
    items: [
      [<LayoutDashboard key="i" size={16} />, "หน้าหลักบอกว่าวันนี้ฝึกอะไรต่อ"],
      [<QrCode key="i" size={16} />, "สแกนใบเชิญจากโรงเรียน หรือชวนคนในบ้านด้วย QR"],
      [<ChartColumn key="i" size={16} />, "ความก้าวหน้า รางวัล และรายงานของลูก"],
    ],
  },
  {
    icon: <GraduationCap size={20} />, title: "ครู", color: "#2E86C9", lead: "ดูแลนักเรียนทั้งห้อง",
    items: [
      [<ClipboardList key="i" size={16} />, "รายชื่อนักเรียนในห้อง เลขที่ และผู้ปกครองที่เชื่อมแล้ว"],
      [<Printer key="i" size={16} />, "พิมพ์ใบเชิญ QR ทั้งห้องในครั้งเดียว"],
      [<Inbox key="i" size={16} />, "อนุมัติผู้ปกครองในกล่องข้อความ และดูผลฝึกรายคน"],
    ],
  },
  {
    icon: <School size={20} />, title: "ผู้ดูแลโรงเรียน", color: "#1F9D6E", lead: "จัดการทั้งโรงเรียน",
    items: [
      [<BookOpen key="i" size={16} />, "สร้างห้องหลายห้องพร้อมกัน วางรายชื่อจาก Excel"],
      [<Users key="i" size={16} />, "รหัสสำหรับครู อนุมัติครูและเลือกห้องให้"],
      [<CalendarRange key="i" size={16} />, "เลื่อนชั้นสิ้นปีการศึกษา และย้อนกลับได้"],
    ],
  },
] as const;

export function DemoTour() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { profiles, saveProfile, selectChild } = useChildProfile();
  const [busy, setBusy] = useState(false);
  const existing = profiles.find((profile) => profile.name === DEMO_NAME);

  async function openParentDemo() {
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const child = existing ?? {
        id: globalThis.crypto?.randomUUID?.() ?? `demo-${Date.now()}`,
        name: DEMO_NAME, nickname: "มะลิ", age: 5, targetSound: "ก",
        trainingGoal: "3x-week", trainingMode: "speech_clarity" as const, createdAt: now, updatedAt: now,
      };
      if (!existing) await saveProfile(child);
      selectChild(child.id);
      const rounds = seedStudioDemo({ id: child.id, name: child.name, age: child.age, targetSound: child.targetSound, initialTrack: "speech" });
      toast.success(`ใส่ผลฝึกตัวอย่าง ${rounds} รอบให้${child.nickname ?? "น้องมะลิ"}แล้ว`);
      router.push("/progress");
    } catch {
      toast.error("เปิดตัวอย่างไม่สำเร็จ ลองอีกครั้ง");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-12">
      <header className="mx-auto max-w-2xl space-y-3 text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-caption font-semibold text-primary-text"><Sparkles size={13} aria-hidden="true" />ตัวอย่างระบบ</p>
        <h1 className="font-display text-[2.25rem] font-semibold leading-tight tracking-tight text-text sm:text-5xl">ลองดูก่อนใช้งานจริง</h1>
        <p className="text-[1.0625rem] text-text-muted">เปิดมุมมองผู้ปกครองพร้อมผลฝึกตัวอย่าง 3 สัปดาห์ หรือดูว่าโรงเรียนและครูใช้งานอย่างไร</p>
      </header>

      <section aria-labelledby="parent-demo-heading" className="hero-night relative overflow-hidden rounded-[1.75rem] p-6 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgb(255_255_255/0.18)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(110deg,transparent_40%,#000_95%)]" />
        <div className="relative grid gap-7 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-center">
          <div className="space-y-4">
            <p className="text-caption font-semibold text-[#FFD58A]">แนะนำให้เริ่มตรงนี้</p>
            <h2 id="parent-demo-heading" className="font-display text-[1.75rem] font-semibold leading-tight">ลองเป็นผู้ปกครอง</h2>
            <p className="text-sm leading-relaxed text-white/80">
              สร้าง &quot;{DEMO_NAME}&quot; พร้อมผลฝึก 14 รอบ แล้วเปิดดูความก้าวหน้า รางวัล และรายงานได้เหมือนของจริง
              ข้อมูลอยู่ในเบราว์เซอร์นี้เท่านั้น ไม่ถูกส่งเข้าระบบ
            </p>
            {user ? (
              <p className="rounded-control bg-white/10 px-3 py-2.5 text-sm text-white/85 ring-1 ring-inset ring-white/15">คุณเข้าสู่ระบบอยู่ ตัวอย่างนี้ใช้ได้เมื่อยังไม่เข้าสู่ระบบ เพื่อไม่ให้ผลตัวอย่างปนกับข้อมูลจริง</p>
            ) : (
              <Button size="lg" className="btn-gold px-6" loading={busy} loadingText="กำลังเตรียมตัวอย่าง…" disabled={isLoading} onClick={openParentDemo}
                icon={<Sparkles size={18} aria-hidden="true" />}>
                {existing ? "ใส่ผลตัวอย่างใหม่แล้วเปิดดู" : "เปิดตัวอย่างผู้ปกครอง"}
              </Button>
            )}
          </div>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {PARENT_STOPS.map((stop, index) => (
              <li key={stop.href} className="flex gap-3 rounded-[1.1rem] bg-white/10 p-4 ring-1 ring-inset ring-white/15 backdrop-blur-sm">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[0.8rem] bg-white/15 text-[#FFD58A]">{stop.icon}</span>
                <div className="min-w-0">
                  <p className="font-display font-medium"><span className="mr-1.5 text-white/50">{index + 1}</span>{stop.title}</p>
                  <p className="mt-0.5 text-caption text-white/70">{stop.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="roles-heading" className="space-y-4">
        <h2 id="roles-heading" className="font-display text-2xl font-semibold text-text">แต่ละบทบาทเห็นอะไร</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {ROLES.map((role) => (
            <Card key={role.title} className="relative overflow-hidden">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ background: role.color }} />
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[0.9rem] text-white" style={{ background: role.color }}>{role.icon}</span>
                  <div>
                    <h3 className="font-display text-lg font-medium text-text">{role.title}</h3>
                    <p className="text-caption text-text-muted">{role.lead}</p>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {role.items.map(([icon, text]) => (
                    <li key={text} className="flex gap-2.5 text-sm text-text">
                      <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-[0.6rem] bg-surface-muted text-text-muted">{icon}</span>
                      <span className="pt-1">{text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="start-heading" className="flex flex-col items-center gap-3 rounded-[1.75rem] border border-border bg-gradient-to-b from-primary-soft to-surface p-10 text-center shadow-card">
        <h2 id="start-heading" className="font-display text-[1.75rem] font-semibold text-text">พร้อมใช้งานจริงแล้ว?</h2>
        <p className="max-w-lg text-sm text-text-muted">โรงเรียนสมัครแล้วรอทีมงานอนุมัติ ครูและผู้ปกครองเข้าร่วมด้วยรหัสหรือ QR ที่ได้รับ</p>
        <div className="flex flex-wrap justify-center gap-2.5">
          <ButtonLink href="/register-school" icon={<School size={16} aria-hidden="true" />}>สมัครสำหรับโรงเรียน</ButtonLink>
          <ButtonLink href="/join" variant="outline" icon={<KeyRound size={16} aria-hidden="true" />}>ใช้รหัสเข้าร่วม</ButtonLink>
          <ButtonLink href="/auth/signup" variant="ghost">สมัครเป็นผู้ปกครอง</ButtonLink>
        </div>
      </section>
    </div>
  );
}
