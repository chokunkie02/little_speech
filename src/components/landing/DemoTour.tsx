"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, CalendarRange, ChartColumn, ClipboardList, FileText, GraduationCap, Inbox, KeyRound, LayoutDashboard,
  Map as MapIcon, Printer, QrCode, School, Sparkles, Trophy, UserRound, Users,
} from "lucide-react";
import { Alert, Badge, Button, ButtonLink, Card, CardContent, CardHeader, toast } from "@/components/ui";
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
    icon: <UserRound size={20} />, title: "ผู้ปกครอง",
    items: [
      [<LayoutDashboard key="i" size={16} />, "หน้าหลักบอกว่าวันนี้ฝึกอะไรต่อ"],
      [<QrCode key="i" size={16} />, "สแกนใบเชิญจากโรงเรียน หรือชวนคนในบ้านด้วย QR"],
      [<ChartColumn key="i" size={16} />, "ความก้าวหน้า รางวัล และรายงานของลูก"],
    ],
  },
  {
    icon: <GraduationCap size={20} />, title: "ครู",
    items: [
      [<ClipboardList key="i" size={16} />, "รายชื่อนักเรียนในห้อง เลขที่ และผู้ปกครองที่เชื่อมแล้ว"],
      [<Printer key="i" size={16} />, "พิมพ์ใบเชิญ QR ทั้งห้องในครั้งเดียว"],
      [<Inbox key="i" size={16} />, "อนุมัติผู้ปกครองในกล่องข้อความ และดูผลฝึกรายคน"],
    ],
  },
  {
    icon: <School size={20} />, title: "ผู้ดูแลโรงเรียน",
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
      <header className="mx-auto max-w-2xl space-y-2 text-center">
        <Badge tone="primary" icon={<Sparkles size={12} />}>ตัวอย่างระบบ</Badge>
        <h1 className="text-3xl font-bold text-text sm:text-4xl">ลองดูก่อนใช้งานจริง</h1>
        <p className="text-text-muted">เปิดมุมมองผู้ปกครองพร้อมผลฝึกตัวอย่าง 3 สัปดาห์ หรือดูว่าโรงเรียนและครูใช้งานอย่างไร</p>
      </header>

      <Card className="overflow-hidden border-primary/25">
        <CardContent className="grid gap-6 bg-primary-soft/40 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-3">
            <h2 className="text-section-title text-text">ลองเป็นผู้ปกครอง</h2>
            <p className="text-sm text-text-muted">
              สร้าง &quot;{DEMO_NAME}&quot; พร้อมผลฝึก 14 รอบ แล้วเปิดดูความก้าวหน้า รางวัล และรายงานได้เหมือนของจริง
              ข้อมูลอยู่ในเบราว์เซอร์นี้เท่านั้น ไม่ถูกส่งเข้าระบบ
            </p>
            {user ? (
              <Alert tone="info">คุณเข้าสู่ระบบอยู่ ตัวอย่างนี้ใช้ได้เมื่อยังไม่เข้าสู่ระบบ เพื่อไม่ให้ผลตัวอย่างปนกับข้อมูลจริง</Alert>
            ) : (
              <Button size="lg" loading={busy} loadingText="กำลังเตรียมตัวอย่าง…" disabled={isLoading} onClick={openParentDemo}
                icon={<Sparkles size={18} aria-hidden="true" />}>
                {existing ? "ใส่ผลตัวอย่างใหม่แล้วเปิดดู" : "เปิดตัวอย่างผู้ปกครอง"}
              </Button>
            )}
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {PARENT_STOPS.map((stop) => (
              <li key={stop.href} className="flex gap-3 rounded-card border border-border bg-surface p-3">
                <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary-text">{stop.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-text">{stop.title}</p>
                  <p className="text-caption text-text-muted">{stop.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <section aria-labelledby="roles-heading" className="space-y-4">
        <h2 id="roles-heading" className="text-section-title text-text">แต่ละบทบาทเห็นอะไร</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {ROLES.map((role) => (
            <Card key={role.title}>
              <CardHeader title={<span className="flex items-center gap-2"><span className="text-primary-text">{role.icon}</span>{role.title}</span>} />
              <CardContent>
                <ul className="space-y-2.5">
                  {role.items.map(([icon, text]) => (
                    <li key={text} className="flex gap-2.5 text-sm text-text-muted">
                      <span aria-hidden="true" className="mt-0.5 shrink-0 text-text-muted">{icon}</span>{text}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="start-heading" className="flex flex-col items-center gap-3 rounded-overlay border border-border bg-surface p-8 text-center">
        <h2 id="start-heading" className="text-section-title text-text">พร้อมใช้งานจริงแล้ว?</h2>
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
