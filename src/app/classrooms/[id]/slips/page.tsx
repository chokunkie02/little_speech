"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ChevronLeft, Mic, Printer, Scissors, Users, UserX } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Alert, Button, Card, CardContent, LoadingState, Page, PageHeader } from "@/components/ui";
import { cn } from "@/lib/cn";
import { issueJoinCode, joinUrl } from "@/lib/joinCodes";
import { listClassroomStudents, type RosterStudent } from "@/lib/schoolAdmin";
import { formatThaiDate } from "@/lib/thaiDate";
import { formatJoinCode } from "@/types/joinCodes";

type Slip = { student: RosterStudent; code: string; expiresAt: string };

/** One printed slip. `sample` draws a placeholder QR for the on-screen preview. */
function SlipCard({ name, number, code, expiresAt, sample = false }: { name: string; number?: number | null; code: string; expiresAt?: string; sample?: boolean }) {
  return (
    <article className="relative break-inside-avoid overflow-hidden rounded-[1rem] border-2 border-dashed border-slate-300 bg-white text-slate-900 [print-color-adjust:exact] print:rounded-none">
      <div className="flex items-center gap-2 bg-[#F0EEFC] px-4 py-2">
        <span aria-hidden="true" className="grid size-6 place-items-center rounded-md bg-[#5548D4] text-white"><Mic size={13} /></span>
        <p className="text-xs font-semibold text-[#4A3DC8]">Speech Adventure · ใบเชิญผู้ปกครอง</p>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-lg font-bold leading-tight">{number ? `${number}. ` : ""}{name}</p>
        <div className="flex items-center gap-4">
          <div className="rounded-lg border border-slate-200 p-1.5">
            {sample
              ? <div aria-hidden="true" className="relative grid size-[104px] place-items-center">
                  <QRCodeSVG value="https://example.com/sample" size={104} level="M" className="opacity-25" />
                  <span className="absolute rounded-full bg-white px-2 py-0.5 text-[0.6875rem] font-semibold text-slate-700 shadow">ตัวอย่าง</span>
                </div>
              : <QRCodeSVG value={joinUrl(code)} size={104} level="M" role="img" aria-label={`QR ของ ${name}`} />}
          </div>
          <div className="min-w-0 space-y-1 text-sm">
            <p className="text-slate-600">สแกน QR หรือกรอกรหัส</p>
            <p className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xl font-bold tracking-[0.15em]">{sample ? code : formatJoinCode(code)}</p>
            {expiresAt && <p className="text-xs text-slate-600">ใช้ได้ถึง {formatThaiDate(expiresAt)}</p>}
          </div>
        </div>
        <ol className="grid grid-cols-3 gap-1.5 text-[0.6875rem] leading-tight text-slate-700">
          {["สแกนหรือกรอกรหัส", "สมัครด้วยอีเมล", "ยืนยันว่าเป็นผู้ปกครอง"].map((step, index) => (
            <li key={step} className="flex items-start gap-1"><span className="grid size-4 shrink-0 place-items-center rounded-full bg-[#5548D4] text-[0.625rem] font-bold text-white">{index + 1}</span>{step}</li>
          ))}
        </ol>
      </div>
    </article>
  );
}

/** Printable invite slips (QR + code) for a whole classroom; reuses each student's active code. Used by school admins and teachers. */
export default function ClassroomSlipsPage() {
  const { id } = useParams<{ id: string }>();
  const [students, setStudents] = useState<RosterStudent[] | null>();
  const [onlyUnlinked, setOnlyUnlinked] = useState(true);
  const [slips, setSlips] = useState<Slip[]>();
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listClassroomStudents(id).then((rows) => { if (active) setStudents(rows); }, () => { if (active) setStudents(null); });
    return () => { active = false; };
  }, [id]);

  const chosen = (students ?? []).filter((student) => !onlyUnlinked || student.guardians === 0);

  async function prepare() {
    setError("");
    setProgress(0);
    const ready: Slip[] = [];
    try {
      for (const student of chosen) {
        const code = await issueJoinCode({ kind: "guardian", childId: student.child_id });
        ready.push({ student, code: code.code, expiresAt: code.expires_at });
        setProgress(ready.length);
      }
      setSlips(ready);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "เตรียมใบเชิญไม่สำเร็จ");
    }
  }

  return (
    <AppShell>
      <Page className="print:max-w-none print:space-y-0 print:p-0">
        <div className="space-y-4 print:hidden">
          <button type="button" onClick={() => window.history.back()}
            className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-text-muted transition-colors hover:text-primary">
            <ChevronLeft size={16} aria-hidden="true" />กลับไปหน้าห้องเรียน
          </button>
          <PageHeader icon={<Printer size={20} />} title="พิมพ์ใบเชิญผู้ปกครอง"
            description="ใบละหนึ่งนักเรียน มี QR และรหัส 8 ตัว ให้นักเรียนนำกลับบ้าน" />
        </div>
        {students === undefined ? <LoadingState variant="list" rows={2} label="กำลังโหลดรายชื่อ…" />
          : students === null ? <Alert tone="error" title="โหลดรายชื่อไม่สำเร็จ หรือไม่มีสิทธิ์ดูห้องนี้" />
            : <SlipsBody students={students} onlyUnlinked={onlyUnlinked} setOnlyUnlinked={setOnlyUnlinked} chosen={chosen}
              slips={slips} progress={progress} error={error} prepare={() => void prepare()} />}
      </Page>
    </AppShell>
  );
}

function SlipsBody({ students, onlyUnlinked, setOnlyUnlinked, chosen, slips, progress, error, prepare }: {
  students: RosterStudent[];
  onlyUnlinked: boolean;
  setOnlyUnlinked: (value: boolean) => void;
  chosen: RosterStudent[];
  slips?: Slip[];
  progress: number;
  error: string;
  prepare: () => void;
}) {
  return (
    <>
      {!slips ? (
        <div className="grid gap-5 print:hidden lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <Card><CardContent className="space-y-5 sm:p-6">
            <div>
              <h2 className="font-display text-lg font-medium text-text">พิมพ์ให้ใครบ้าง</h2>
              <p className="text-sm text-text-muted">ใบเดิมที่ยังไม่หมดอายุจะใช้รหัสเดิม ไม่ต้องกลัวพิมพ์ซ้ำ</p>
            </div>
            <div role="radiogroup" aria-label="นักเรียนที่จะพิมพ์ใบเชิญ" className="grid gap-3 sm:grid-cols-2">
              {[
                { value: true, label: "ยังไม่มีผู้ปกครองเชื่อม", count: students.filter((student) => student.guardians === 0).length, icon: <UserX size={19} />, note: "แนะนำ" },
                { value: false, label: "ทั้งห้อง", count: students.length, icon: <Users size={19} />, note: undefined },
              ].map((option) => {
                const on = onlyUnlinked === option.value;
                return (
                  <button key={option.label} type="button" role="radio" aria-checked={on} onClick={() => setOnlyUnlinked(option.value)}
                    className={cn("relative flex items-center gap-3 rounded-[1rem] border p-4 text-left transition-colors",
                      on ? "border-primary bg-primary-soft/60 ring-1 ring-primary" : "border-border bg-surface hover:border-primary/40")}>
                    <span aria-hidden="true" className={cn("grid size-11 shrink-0 place-items-center rounded-[0.9rem]", on ? "btn-primary text-primary-foreground" : "bg-surface-muted text-text-muted")}>{option.icon}</span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5 font-display font-medium text-text">{option.label}
                        {option.note && <span className="rounded-full bg-[linear-gradient(180deg,#FFD58A,#F2B23A)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[#3A2300]">{option.note}</span>}</span>
                      <span className="block font-display text-2xl font-semibold leading-tight tabular-nums text-text">{option.count} <span className="text-sm font-normal text-text-muted">คน</span></span>
                    </span>
                  </button>
                );
              })}
            </div>
            {error && <Alert tone="error">{error}</Alert>}
            <Button size="lg" onClick={prepare} disabled={!chosen.length} loading={progress > 0 && progress < chosen.length}
              loadingText={`กำลังเตรียม ${progress}/${chosen.length}…`}>
              เตรียมใบเชิญ {chosen.length} ใบ
            </Button>
          </CardContent></Card>
          <div className="space-y-2">
            <p className="text-caption font-semibold text-text-muted">ตัวอย่างใบเชิญ</p>
            <SlipCard sample name={chosen[0]?.name ?? "ชื่อนักเรียน"} number={chosen[0]?.student_number} code="XXXX-XXXX" />
            <p className="flex items-center gap-1.5 text-caption text-text-muted"><Scissors size={13} aria-hidden="true" />กระดาษ A4 ได้ 6–8 ใบ ตัดตามเส้นประ</p>
          </div>
        </div>
      ) : (
        <Card className="print:hidden"><CardContent className="flex flex-wrap items-center gap-3">
          <Button icon={<Printer size={16} aria-hidden="true" />} onClick={() => window.print()}>พิมพ์ {slips.length} ใบ</Button>
          <p className="text-sm text-text-muted">ตัดตามเส้นประ แล้วให้นักเรียนนำกลับบ้าน · ใบเดิมที่ยังไม่หมดอายุใช้ได้ต่อ</p>
        </CardContent></Card>
      )}

      {slips && (
        // On screen: a sheet of paper so the layout matches what comes out of the printer.
        <div className="mx-auto grid max-w-4xl gap-4 rounded-card bg-white p-4 shadow-card ring-1 ring-border sm:grid-cols-2 sm:p-8 print:max-w-none print:grid-cols-2 print:gap-0 print:p-0 print:shadow-none print:ring-0">
          {slips.map(({ student, code, expiresAt }) => (
            <SlipCard key={student.child_id} name={student.name} number={student.student_number} code={code} expiresAt={expiresAt} />
          ))}
        </div>
      )}
    </>
  );
}
