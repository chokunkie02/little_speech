"use client";

import { useEffect, useState } from "react";
import {
  ArrowRightLeft, ChartColumn, ClipboardPaste, GraduationCap, ListOrdered, MoreHorizontal, Pencil, Plus, Printer, RefreshCw, UserMinus, Users,
} from "lucide-react";
import SchoolGuardianMembers from "@/components/layout/SchoolGuardianMembers";
import { AddStudentDialog, EditStudentDialog, ImportStudentsDialog } from "./StudentDialogs";
import {
  Avatar, Badge, Button, ButtonLink, Checkbox, ConfirmDialog, DataLoadError, DropdownMenu, EmptyState, FilterBar, FormField, Input,
  LoadingState, ResponsiveDataView, Select, Sheet, toast, type DataColumn, type MenuItem,
} from "@/components/ui";
import { issueJoinCode } from "@/lib/joinCodes";
import {
  listClassroomStudents, moveStudents, renumberClassroom, setStudentNumber, setStudentsStatus, type RosterStudent,
} from "@/lib/schoolAdmin";
import { formatRelativeTime } from "@/lib/thaiDate";

function NumberCell({ classroomId, student, onChanged }: { classroomId: string; student: RosterStudent; onChanged: () => void }) {
  const [value, setValue] = useState(student.student_number?.toString() ?? "");
  return (
    <Input
      aria-label={`เลขที่ของ ${student.name}`}
      value={value}
      inputMode="numeric"
      className="h-8! w-16! px-2 text-center tabular-nums"
      onChange={(event) => setValue(event.target.value.replace(/\D/g, "").slice(0, 3))}
      onBlur={async () => {
        const next = value ? Number(value) : null;
        if (next === student.student_number) return;
        try {
          await setStudentNumber(classroomId, student.child_id, next);
          onChanged();
        } catch (cause) {
          setValue(student.student_number?.toString() ?? "");
          toast.error("เปลี่ยนเลขที่ไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
        }
      }}
    />
  );
}

export type ClassroomRosterProps = {
  classroomId: string;
  classroomName: string;
  archived?: boolean;
  /** "admin" can move students between rooms and mark them moved out / graduated. */
  mode: "admin" | "teacher";
  /** Rooms students can be moved to (admin only). */
  otherRooms?: { id: string; name: string }[];
  /** Called after any change, e.g. to refresh counts in the page header. */
  onChanged?: () => void;
};

/** Student list of one classroom: add, paste/import, numbers, slips, guardians, progress. */
export function ClassroomRoster({ classroomId, classroomName, archived = false, mode, otherRooms = [], onChanged }: ClassroomRosterProps) {
  const [roster, setRoster] = useState<{ revision: number; students?: RosterStudent[]; failed?: boolean }>();
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<RosterStudent | null>(null);
  const [guardiansOf, setGuardiansOf] = useState<RosterStudent | null>(null);
  const [confirm, setConfirm] = useState<null | "renumber" | "move" | "moved_out" | "graduated">(null);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const admin = mode === "admin";

  useEffect(() => {
    let active = true;
    listClassroomStudents(classroomId).then(
      (students) => { if (active) setRoster({ revision, students }); },
      () => { if (active) setRoster({ revision, failed: true }); },
    );
    return () => { active = false; };
  }, [classroomId, revision]);

  const refresh = () => { setRevision((value) => value + 1); onChanged?.(); };
  const students = roster?.students ?? [];
  const term = search.trim().toLocaleLowerCase("th");
  const visible = students.filter((student) => !term || [student.name, student.nickname, student.student_code, String(student.student_number ?? "")]
    .some((value) => value?.toLocaleLowerCase("th").includes(term)));
  const chosen = students.filter((student) => selected.has(student.child_id));
  const allVisibleSelected = visible.length > 0 && visible.every((student) => selected.has(student.child_id));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  /** Opens a printable slip. `rotate` revokes the old code first (lost or leaked slip). */
  async function slip(childId: string, rotate = false) {
    const tab = window.open("about:blank", "_blank");
    try {
      const code = await issueJoinCode({ kind: "guardian", childId, rotate });
      if (rotate) toast.success("ออกรหัสใหม่แล้ว", "ใบเชิญเดิมใช้ไม่ได้แล้ว");
      if (tab) tab.location.href = `/join/slip?code=${encodeURIComponent(code.code)}`;
    } catch (cause) {
      tab?.close();
      toast.error("เตรียมใบเชิญไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
    }
  }

  async function runConfirm() {
    setBusy(true);
    try {
      if (confirm === "renumber") {
        await renumberClassroom(classroomId);
        toast.success("จัดเลขที่ตามชื่อแล้ว");
      } else if (confirm === "move") {
        const count = await moveStudents(chosen.map((student) => student.child_id), target);
        toast.success(`ย้ายนักเรียน ${count} คนแล้ว`, `ไป ${otherRooms.find((room) => room.id === target)?.name}`);
      } else if (confirm) {
        const count = await setStudentsStatus(chosen.map((student) => student.child_id), confirm);
        toast.success(`${confirm === "graduated" ? "บันทึกจบการศึกษา" : "บันทึกย้ายออก"} ${count} คนแล้ว`, "ผู้ปกครองยังดูผลการฝึกเดิมได้");
      }
      setSelected(new Set());
      setConfirm(null);
      refresh();
    } catch (cause) {
      toast.error("ทำรายการไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  const menu = (student: RosterStudent): MenuItem[] => [
    { label: "ดูความก้าวหน้า", icon: <ChartColumn size={15} />, onSelect: () => { window.location.assign(`/progress?child=${encodeURIComponent(student.child_id)}`); } },
    { label: "ผู้ปกครองที่เชื่อม", icon: <Users size={15} />, onSelect: () => setGuardiansOf(student) },
    { label: "พิมพ์ใบเชิญผู้ปกครอง", icon: <Printer size={15} />, onSelect: () => void slip(student.child_id) },
    { label: "แก้ข้อมูล", icon: <Pencil size={15} />, onSelect: () => setEditing(student) },
  ];

  const selectColumn: DataColumn<RosterStudent> = {
    key: "select",
    header: <Checkbox aria-label="เลือกทั้งหมด" checked={allVisibleSelected}
      onChange={() => setSelected(allVisibleSelected ? new Set() : new Set(visible.map((student) => student.child_id)))} />,
    hideOnMobile: true,
    cell: (student) => <Checkbox aria-label={`เลือก ${student.name}`} checked={selected.has(student.child_id)} onChange={() => toggle(student.child_id)} />,
  };
  const columns: DataColumn<RosterStudent>[] = [
    ...(admin ? [selectColumn] : []),
    { key: "number", header: "เลขที่", cell: (student) => <NumberCell key={`${student.child_id}:${student.student_number}`} classroomId={classroomId} student={student} onChanged={refresh} /> },
    {
      key: "name", header: "ชื่อ-นามสกุล", hideOnMobile: true,
      cell: (student) => (
        <span className="flex items-center gap-3">
          <Avatar name={student.name} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-display font-medium text-text">{student.name}</span>
            {student.nickname && <span className="block text-caption text-text-muted">{student.nickname}</span>}
          </span>
        </span>
      ),
    },
    { key: "code", header: "รหัส", cell: (student) => student.student_code ? <span className="font-mono text-[0.8125rem] tracking-wide tabular-nums">{student.student_code}</span> : <span className="text-text-muted">—</span> },
    {
      key: "guardians", header: "ผู้ปกครอง",
      cell: (student) => (
        <button type="button" onClick={() => setGuardiansOf(student)} className="rounded-full" aria-label={`ผู้ปกครองของ ${student.name}`}>
          {student.guardians > 0 ? <Badge tone="success" dot>เชื่อมแล้ว {student.guardians}</Badge> : <Badge tone="warning" dot>ยังไม่เชื่อม</Badge>}
        </button>
      ),
    },
    {
      key: "practice", header: "ฝึกล่าสุด",
      cell: (student) => student.last_practice_at
        ? <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-info" />{formatRelativeTime(student.last_practice_at)}</span>
        : <span className="text-text-muted">ยังไม่เคยฝึก</span>,
    },
    {
      key: "actions", header: <span className="sr-only">ตัวเลือก</span>, align: "right", hideOnMobile: true,
      cell: (student) => <DropdownMenu label={`ตัวเลือกของ ${student.name}`} trigger={<MoreHorizontal size={18} aria-hidden="true" />} items={menu(student)} />,
    },
  ];

  if (!roster) return <LoadingState variant="table" rows={5} label="กำลังโหลดรายชื่อ…" />;
  if (roster.failed) return <DataLoadError message="โหลดรายชื่อไม่สำเร็จ" onRetry={() => setRevision((value) => value + 1)} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button icon={<Plus size={16} aria-hidden="true" />} onClick={() => setAdding(true)} disabled={archived}>เพิ่มนักเรียน</Button>
        <Button variant="outline" icon={<ClipboardPaste size={16} aria-hidden="true" />} onClick={() => setImporting(true)} disabled={archived}>วาง/นำเข้ารายชื่อ</Button>
        {students.length > 1 && <Button variant="ghost" icon={<ListOrdered size={16} aria-hidden="true" />} onClick={() => setConfirm("renumber")}>จัดเลขที่ตามชื่อ</Button>}
        {students.length > 0 && <ButtonLink variant="ghost" href={`/classrooms/${classroomId}/slips`} icon={<Printer size={16} aria-hidden="true" />}>พิมพ์ใบเชิญทั้งห้อง</ButtonLink>}
      </div>

      {students.length === 0 ? (
        <EmptyState icon={<Users size={22} />} title="ยังไม่มีนักเรียนในห้องนี้" description="เพิ่มทีละคน หรือคัดลอกตารางจาก Excel มาวางทีเดียวทั้งห้อง"
          action={<><Button icon={<Plus size={16} aria-hidden="true" />} onClick={() => setAdding(true)} disabled={archived}>เพิ่มนักเรียน</Button>
            <Button variant="outline" onClick={() => setImporting(true)} disabled={archived}>วางรายชื่อ</Button></>} />
      ) : (
        <>
          <FilterBar search={{ value: search, onChange: setSearch, placeholder: "ค้นหาชื่อ ชื่อเล่น รหัส หรือเลขที่" }}
            resultText={`${visible.length} จาก ${students.length} คน`} />
          {admin && chosen.length > 0 && (
            <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-card border border-primary/30 bg-primary-soft p-3 shadow-raised">
              <span className="text-sm font-semibold text-primary-text">เลือก {chosen.length} คน</span>
              <div className="flex flex-1 flex-wrap justify-end gap-2">
                <Button size="sm" variant="outline" icon={<ArrowRightLeft size={14} aria-hidden="true" />} onClick={() => setConfirm("move")} disabled={!otherRooms.length}>ย้ายห้อง</Button>
                <Button size="sm" variant="outline" icon={<UserMinus size={14} aria-hidden="true" />} onClick={() => setConfirm("moved_out")}>ย้ายออก</Button>
                <Button size="sm" variant="outline" icon={<GraduationCap size={14} aria-hidden="true" />} onClick={() => setConfirm("graduated")}>จบการศึกษา</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>ยกเลิกเลือก</Button>
              </div>
            </div>
          )}
          <ResponsiveDataView
            caption={`รายชื่อนักเรียนห้อง ${classroomName}`}
            rows={visible}
            columns={columns}
            rowKey={(student) => student.child_id}
            mobileTitle={(student) => admin ? (
              <label className="flex items-start gap-2">
                <Checkbox checked={selected.has(student.child_id)} onChange={() => toggle(student.child_id)} aria-label={`เลือก ${student.name}`} className="mt-1" />
                <span>{student.name}{student.nickname && <span className="text-text-muted"> ({student.nickname})</span>}</span>
              </label>
            ) : <span>{student.name}{student.nickname && <span className="text-text-muted"> ({student.nickname})</span>}</span>}
            mobileAside={(student) => <DropdownMenu label={`ตัวเลือกของ ${student.name}`} trigger={<MoreHorizontal size={18} aria-hidden="true" />} items={menu(student)} />}
            empty={<EmptyState title="ไม่พบนักเรียนที่ตรงกับคำค้น" />}
          />
        </>
      )}

      <AddStudentDialog classroomId={classroomId} classroomName={classroomName} open={adding} onClose={() => setAdding(false)} onAdded={refresh} />
      <ImportStudentsDialog classroomId={classroomId} classroomName={classroomName} open={importing} onClose={() => setImporting(false)} onAdded={refresh} />
      <EditStudentDialog key={editing?.child_id} student={editing} onClose={() => setEditing(null)} onSaved={refresh} />
      <Sheet open={Boolean(guardiansOf)} onClose={() => { setGuardiansOf(null); refresh(); }} title={`ผู้ปกครองของ ${guardiansOf?.name ?? ""}`}
        description="ถอดผู้ปกครองที่ไม่เกี่ยวข้องออกได้ ถ้าใบเชิญหาย ใช้ปุ่มพิมพ์ใบเชิญ ถ้าใบเชิญหลุดไปถึงคนอื่น ให้ออกรหัสใหม่">
        {guardiansOf && (
          <div className="space-y-4">
            <SchoolGuardianMembers key={guardiansOf.child_id} childId={guardiansOf.child_id} mode="staff" />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" icon={<Printer size={16} aria-hidden="true" />} onClick={() => void slip(guardiansOf.child_id)}>พิมพ์ใบเชิญ</Button>
              <Button variant="ghost" icon={<RefreshCw size={16} aria-hidden="true" />} onClick={() => void slip(guardiansOf.child_id, true)}>ออกรหัสใหม่และพิมพ์</Button>
            </div>
          </div>
        )}
      </Sheet>
      <ConfirmDialog
        open={confirm !== null}
        tone={confirm === "move" || confirm === "renumber" ? "primary" : "danger"}
        loading={busy}
        title={confirm === "renumber" ? "จัดเลขที่ตามชื่อ?" : confirm === "move" ? `ย้ายนักเรียน ${chosen.length} คน` :
          confirm === "graduated" ? `บันทึกจบการศึกษา ${chosen.length} คน?` : `บันทึกย้ายออก ${chosen.length} คน?`}
        description={confirm === "renumber" ? "เลขที่ทุกคนในห้องจะเรียงใหม่ 1, 2, 3… ตามลำดับชื่อภาษาไทย เลขที่เดิมจะถูกแทนที่" :
          confirm === "move" ? "นักเรียนจะได้เลขที่ต่อท้ายในห้องใหม่ ผลการฝึกและผู้ปกครองที่เชื่อมไว้ยังอยู่ครบ" :
          `${chosen.map((student) => student.name).slice(0, 3).join(", ")}${chosen.length > 3 ? " และคนอื่น ๆ" : ""} จะออกจากรายชื่อห้องและโรงเรียน ผู้ปกครองยังดูผลการฝึกเดิมได้`}
        confirmLabel={confirm === "renumber" ? "จัดเลขที่" : confirm === "move" ? "ย้ายห้อง" : "บันทึก"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void runConfirm()}
      >
        {confirm === "move" && (
          <FormField label="ย้ายไปห้อง" required>
            <Select value={target} onChange={(event) => setTarget(event.target.value)}>
              <option value="" disabled>เลือกห้อง</option>
              {otherRooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
            </Select>
          </FormField>
        )}
      </ConfirmDialog>
    </div>
  );
}
