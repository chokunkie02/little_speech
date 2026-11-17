"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { FileUp } from "lucide-react";
import { Alert, Badge, Button, Dialog, FormField, Input, Table, TBody, TD, TH, THead, TR, Textarea, ThaiDateInput, isCompleteDate, toast } from "@/components/ui";
import {
  addClassroomStudents, parseStudentTable, updateStudent, type AddStudentsResult, type NewStudentRow, type RosterStudent,
} from "@/lib/schoolAdmin";
import { formatThaiDate } from "@/lib/thaiDate";

/** Add one student by name (no UUIDs, no age field — birth date is optional). */
export function AddStudentDialog({ classroomId, classroomName, open, onClose, onAdded }: {
  classroomId: string; classroomName: string; open: boolean; onClose: () => void; onAdded: () => void;
}) {
  const [birth, setBirth] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const keepOpen = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "again";
    const row: NewStudentRow = {
      name: String(form.get("name")),
      nickname: String(form.get("nickname") ?? ""),
      student_code: String(form.get("code") ?? ""),
      birth_date: isCompleteDate(birth) ? birth : undefined,
    };
    setBusy(true);
    setError("");
    try {
      const result = await addClassroomStudents(classroomId, [row]);
      if (result.skipped.length) throw new Error(result.skipped[0].reason);
      toast.success("เพิ่มนักเรียนแล้ว", `${row.name} · ${classroomName}`);
      onAdded();
      if (keepOpen) {
        (event.target as HTMLFormElement).reset();
        setBirth("");
      } else onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "เพิ่มนักเรียนไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} dismissible={!busy} title="เพิ่มนักเรียน" description={`ห้อง ${classroomName} · เลขที่จะต่อท้ายให้อัตโนมัติ`}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <FormField label="ชื่อ-นามสกุล" required className="sm:col-span-2">
          <Input name="name" required maxLength={120} placeholder="เด็กชายก้อง ใจดี" autoFocus />
        </FormField>
        <FormField label="ชื่อเล่น"><Input name="nickname" maxLength={60} /></FormField>
        <FormField label="รหัสนักเรียน" hint="ไม่บังคับ"><Input name="code" maxLength={40} /></FormField>
        <FormField label="วันเกิด" hint="ไม่บังคับ ถ้าไม่กรอก ระบบประมาณอายุจากชั้น" className="sm:col-span-2">
          <ThaiDateInput label="วันเกิด" value={birth} onChange={setBirth} />
        </FormField>
        {error && <Alert tone="error" className="sm:col-span-2">{error}</Alert>}
        <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>ปิด</Button>
          <Button type="submit" variant="secondary" value="again" loading={busy}>บันทึกและเพิ่มคนต่อไป</Button>
          <Button type="submit" loading={busy}>บันทึก</Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Paste from Excel / Google Sheets or pick a CSV; preview, then add all valid rows. */
export function ImportStudentsDialog({ classroomId, classroomName, open, onClose, onAdded }: {
  classroomId: string; classroomName: string; open: boolean; onClose: () => void; onAdded: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AddStudentsResult>();
  const rows = parseStudentTable(text);

  function close() {
    setText("");
    setResult(undefined);
    onClose();
  }

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(csv|txt|tsv)$/i.test(file.name)) {
      toast.error("รองรับไฟล์ .csv", "ถ้าเป็นไฟล์ Excel ให้คัดลอกตารางมาวางในช่องด้านล่างได้เลย");
      return;
    }
    setText(await file.text());
    setResult(undefined);
  }

  async function submit() {
    setBusy(true);
    try {
      const outcome = await addClassroomStudents(classroomId, rows);
      setResult(outcome);
      if (outcome.added) {
        toast.success(`เพิ่มนักเรียน ${outcome.added} คนแล้ว`);
        onAdded();
      }
    } catch (cause) {
      toast.error("นำเข้าไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={close} dismissible={!busy} size="lg" title="วางหรือนำเข้ารายชื่อ"
      description={`ห้อง ${classroomName} · แถวที่มีปัญหาจะถูกข้ามพร้อมบอกเหตุผล แถวอื่นยังเพิ่มได้ตามปกติ`}>
      {result ? (
        <div className="space-y-4">
          <Alert tone={result.skipped.length ? "warning" : "success"} title={`เพิ่มแล้ว ${result.added} คน${result.skipped.length ? ` · ข้าม ${result.skipped.length} แถว` : ""}`} />
          {result.skipped.length > 0 && (
            <Table>
              <THead><tr><TH>แถว</TH><TH>ชื่อ</TH><TH>เหตุผล</TH></tr></THead>
              <TBody>{result.skipped.map((item) => (
                <TR key={item.row}><TD className="tabular-nums">{item.row}</TD><TD>{item.name || "—"}</TD><TD className="text-warning-text">{item.reason}</TD></TR>
              ))}</TBody>
            </Table>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setText(""); setResult(undefined); }}>นำเข้าอีกชุด</Button>
            <Button onClick={close}>เสร็จ</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <FormField label="วางตารางจาก Excel หรือ Google Sheets" hint="แถวแรกเป็นหัวตารางได้ เช่น เลขที่ · รหัส · ชื่อ · นามสกุล · ชื่อเล่น · วันเกิด (วว/ดด/ปปปป พ.ศ.) ถ้าไม่มีหัวตาราง ระบบอ่านคอลัมน์แรกเป็นชื่อ-นามสกุล และคอลัมน์ที่สองเป็นชื่อเล่น">
            <Textarea value={text} onChange={(event) => { setText(event.target.value); setResult(undefined); }} rows={6}
              placeholder={"เลขที่\tชื่อ\tนามสกุล\tชื่อเล่น\n1\tเด็กชายก้อง\tใจดี\tก้อง"} className="font-mono text-xs" />
          </FormField>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-primary">
            <FileUp size={16} aria-hidden="true" />
            หรือเลือกไฟล์ .csv
            <input type="file" accept=".csv,.tsv,.txt,text/csv" className="sr-only" onChange={(event) => void readFile(event)} />
          </label>
          {rows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">ตัวอย่าง {rows.length} คน</p>
              <div className="max-h-64 overflow-auto">
                <Table>
                  <THead><tr><TH>เลขที่</TH><TH>ชื่อ-นามสกุล</TH><TH>ชื่อเล่น</TH><TH>รหัส</TH><TH>วันเกิด</TH></tr></THead>
                  <TBody>{rows.slice(0, 100).map((row, index) => (
                    <TR key={index}>
                      <TD className="tabular-nums">{row.student_number ?? <Badge>อัตโนมัติ</Badge>}</TD>
                      <TD>{row.name}</TD><TD>{row.nickname ?? ""}</TD><TD>{row.student_code ?? ""}</TD>
                      <TD>{row.birth_date ? formatThaiDate(row.birth_date) : ""}</TD>
                    </TR>
                  ))}</TBody>
                </Table>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close} disabled={busy}>ยกเลิก</Button>
            <Button onClick={() => void submit()} loading={busy} disabled={!rows.length || rows.length > 300}>
              {rows.length > 300 ? "ครั้งละไม่เกิน 300 คน" : `เพิ่ม ${rows.length} คน`}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

export function EditStudentDialog({ student, onClose, onSaved }: { student: RosterStudent | null; onClose: () => void; onSaved: () => void }) {
  const [birth, setBirth] = useState(student?.birth_date ?? "");
  const [busy, setBusy] = useState(false);
  if (!student) return null;
  return (
    <Dialog open onClose={onClose} dismissible={!busy} title={`แก้ข้อมูล ${student.name}`}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        try {
          await updateStudent(student.child_id, {
            name: String(form.get("name")), nickname: String(form.get("nickname") ?? ""),
            studentCode: String(form.get("code") ?? ""), birthDate: isCompleteDate(birth) ? birth : null,
          });
          toast.success("บันทึกแล้ว");
          onSaved();
          onClose();
        } catch (cause) {
          toast.error("บันทึกไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
        } finally {
          setBusy(false);
        }
      }}>
        <FormField label="ชื่อ-นามสกุล" required className="sm:col-span-2"><Input name="name" defaultValue={student.name} required maxLength={120} /></FormField>
        <FormField label="ชื่อเล่น"><Input name="nickname" defaultValue={student.nickname ?? ""} maxLength={60} /></FormField>
        <FormField label="รหัสนักเรียน"><Input name="code" defaultValue={student.student_code ?? ""} maxLength={40} /></FormField>
        <FormField label="วันเกิด" className="sm:col-span-2" hint={student.birth_date ? undefined : `ตอนนี้ใช้อายุประมาณ ${student.age} ปี`}>
          <ThaiDateInput label="วันเกิด" value={birth} onChange={setBirth} />
        </FormField>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>ยกเลิก</Button>
          <Button type="submit" loading={busy}>บันทึก</Button>
        </div>
      </form>
    </Dialog>
  );
}
