"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ChevronLeft, Printer } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Alert, Button, Card, CardContent, Checkbox, LoadingState, Page, PageHeader } from "@/components/ui";
import { issueJoinCode, joinUrl } from "@/lib/joinCodes";
import { listClassroomStudents, type RosterStudent } from "@/lib/schoolAdmin";
import { formatThaiDate } from "@/lib/thaiDate";
import { formatJoinCode } from "@/types/joinCodes";

type Slip = { student: RosterStudent; code: string; expiresAt: string };

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
      <Card className="print:hidden"><CardContent>
        {!slips ? (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={onlyUnlinked} onChange={(event) => setOnlyUnlinked(event.target.checked)} />
              เฉพาะนักเรียนที่ยังไม่มีผู้ปกครองเชื่อม ({students.filter((student) => student.guardians === 0).length} คน)
            </label>
            {error && <Alert tone="error">{error}</Alert>}
            <Button onClick={prepare} disabled={!chosen.length} loading={progress > 0 && progress < chosen.length}
              loadingText={`กำลังเตรียม ${progress}/${chosen.length}…`}>
              เตรียมใบเชิญ {chosen.length} ใบ
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button icon={<Printer size={16} aria-hidden="true" />} onClick={() => window.print()}>พิมพ์ {slips.length} ใบ</Button>
            <p className="text-sm text-text-muted">ตัดตามเส้นประ แล้วให้นักเรียนนำกลับบ้าน · ใบเดิมที่ยังไม่หมดอายุใช้ได้ต่อ</p>
          </div>
        )}
      </CardContent></Card>

      {slips && (
        // On screen: a sheet of paper so the layout matches what comes out of the printer.
        <div className="mx-auto grid max-w-4xl gap-4 rounded-card bg-white p-4 shadow-card ring-1 ring-border sm:grid-cols-2 sm:p-8 print:max-w-none print:grid-cols-2 print:gap-0 print:p-0 print:shadow-none print:ring-0">
          {slips.map(({ student, code, expiresAt }) => (
            <article key={student.child_id} className="break-inside-avoid space-y-3 rounded-card border-2 border-dashed border-slate-300 bg-white p-4 text-slate-900 print:rounded-none">
              <div>
                <p className="text-xs font-semibold text-[#5548D4]">Speech Adventure · ใบเชิญผู้ปกครอง</p>
                <p className="text-lg font-bold">{student.student_number ? `${student.student_number}. ` : ""}{student.name}</p>
              </div>
              <div className="flex items-center gap-4">
                <QRCodeSVG value={joinUrl(code)} size={104} level="M" role="img" aria-label={`QR ของ ${student.name}`} />
                <div className="space-y-1 text-sm">
                  <p>สแกน QR หรือกรอกรหัส</p>
                  <p className="font-mono text-xl font-bold tracking-[0.15em]">{formatJoinCode(code)}</p>
                  <p className="text-xs text-slate-600">ใช้ได้ถึง {formatThaiDate(expiresAt)}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">สมัครด้วยอีเมลและรหัสผ่าน แล้วยืนยันว่าเป็นผู้ปกครอง ก็ดูผลและฝึกกับลูกที่บ้านได้ทันที</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
