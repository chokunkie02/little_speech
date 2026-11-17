"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Archive, ArchiveRestore, GraduationCap, MoreHorizontal, Pencil, Plus, School, Trash2, Users } from "lucide-react";
import { SchoolArea, useSchoolArea } from "@/components/school-admin/SchoolArea";
import {
  Alert, Badge, Button, Card, ConfirmDialog, Dialog, DropdownMenu, EmptyState, FilterBar, FormField, Input, Select,
  Switch, Textarea, toast,
} from "@/components/ui";
import {
  compareClassrooms, createClassrooms, deleteClassroom, GRADES, nextRoomNames, setClassroomArchived, updateClassroom,
  type OverviewClassroom,
} from "@/lib/schoolAdmin";

// ── create several rooms ────────────────────────────────────────────────────

function CreateRoomsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { overview, orgId, reload } = useSchoolArea();
  const [grade, setGrade] = useState("ป.1");
  const [count, setCount] = useState(1);
  const [custom, setCustom] = useState(false);
  const [names, setNames] = useState("");
  const [busy, setBusy] = useState(false);
  const year = overview.school.academic_year;
  const existing = overview.classrooms.filter((room) => !room.archived_at && room.academic_year === year).map((room) => room.name);
  const preview = custom
    ? names.split("\n").map((name) => name.trim()).filter(Boolean)
    : nextRoomNames(grade, Math.max(1, Math.min(20, count)), existing);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await createClassrooms(orgId, grade, preview);
      if (result.created.length) toast.success(`สร้าง ${result.created.length} ห้องแล้ว`, result.created.map((room) => room.name).join(", "));
      if (result.skipped.length) toast.error(`ข้าม ${result.skipped.length} ห้อง`, result.skipped.map((room) => `${room.name}: ${room.reason}`).join(" · "));
      reload();
      onClose();
    } catch (cause) {
      toast.error("สร้างห้องไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} dismissible={!busy} title="สร้างห้องเรียน"
      description={year ? `ปีการศึกษา ${year} · สร้างหลายห้องในชั้นเดียวกันได้ทีเดียว` : undefined}>
      {!year ? <Alert tone="warning" title="ยังไม่ได้ตั้งปีการศึกษา">ตั้งปีการศึกษาที่หน้าตั้งค่าก่อนสร้างห้อง</Alert> : (
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="ชั้น" required>
              <Select value={grade} onChange={(event) => setGrade(event.target.value)}>
                {GRADES.map((option) => <option key={option}>{option}</option>)}
              </Select>
            </FormField>
            {!custom && (
              <FormField label="จำนวนห้อง" required hint="ต่อจากห้องที่มีอยู่แล้ว">
                <Input type="number" min={1} max={20} value={count} onChange={(event) => setCount(Number(event.target.value))} />
              </FormField>
            )}
          </div>
          <FormField label="ตั้งชื่อห้องเอง" inline hint="เช่น ห้องพิเศษ หรือชื่อที่ไม่ได้เป็นตัวเลข">
            <Switch checked={custom} onCheckedChange={setCustom} />
          </FormField>
          {custom && (
            <FormField label="ชื่อห้อง (บรรทัดละ 1 ห้อง)" required>
              <Textarea value={names} onChange={(event) => setNames(event.target.value)} rows={4} placeholder={"ป.1/EP\nป.1/พิเศษ"} />
            </FormField>
          )}
          <div className="rounded-control bg-surface-muted p-3 text-sm">
            <p className="text-caption text-text-muted">จะสร้าง {preview.length} ห้อง</p>
            <p className="mt-1 break-words font-semibold text-text">{preview.join(", ") || "—"}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>ยกเลิก</Button>
            <Button type="submit" loading={busy} disabled={!preview.length}>สร้าง {preview.length} ห้อง</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

// ── edit one room ───────────────────────────────────────────────────────────

function EditRoomDialog({ room, onClose }: { room: OverviewClassroom | null; onClose: () => void }) {
  const { reload } = useSchoolArea();
  const [busy, setBusy] = useState(false);
  if (!room) return null;
  return (
    <Dialog open onClose={onClose} dismissible={!busy} title={`แก้ไขห้อง ${room.name}`}>
      <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        try {
          await updateClassroom(room.id, String(form.get("name")), String(form.get("grade")));
          toast.success("บันทึกแล้ว");
          reload();
          onClose();
        } catch (cause) {
          toast.error("บันทึกไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
        } finally {
          setBusy(false);
        }
      }}>
        <FormField label="ชื่อห้อง" required hint={`เดิม: ${room.name}`}>
          <Input name="name" defaultValue={room.name} required maxLength={40} />
        </FormField>
        <FormField label="ชั้น" hint={`เดิม: ${room.grade_level ?? "ไม่ระบุ"}`}>
          <Select name="grade" defaultValue={room.grade_level ?? ""}>
            <option value="">ไม่ระบุ</option>
            {GRADES.map((option) => <option key={option}>{option}</option>)}
          </Select>
        </FormField>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>ยกเลิก</Button>
          <Button type="submit" loading={busy}>บันทึก</Button>
        </div>
      </form>
    </Dialog>
  );
}

// ── page ────────────────────────────────────────────────────────────────────

function RoomCard({ room, onEdit, onDelete }: { room: OverviewClassroom; onEdit: () => void; onDelete: () => void }) {
  const router = useRouter();
  const { reload } = useSchoolArea();
  const primary = room.teachers.find((teacher) => teacher.is_primary) ?? room.teachers[0];
  return (
    <Card interactive className={room.archived_at ? "opacity-70" : undefined}>
      <div className="flex items-start justify-between gap-2 p-4 pb-2">
        <Link href={`/school/classrooms/${room.id}`} className="min-w-0 flex-1 rounded-md">
          <p className="text-card-title break-words text-text">{room.name}</p>
          <p className="text-caption text-text-muted">{[room.grade_level, room.academic_year && `ปี ${room.academic_year}`].filter(Boolean).join(" · ")}</p>
        </Link>
        <DropdownMenu label={`ตัวเลือกห้อง ${room.name}`} trigger={<MoreHorizontal size={18} aria-hidden="true" />} items={[
          { label: "แก้ไขชื่อและชั้น", icon: <Pencil size={15} />, onSelect: onEdit },
          room.archived_at
            ? { label: "นำกลับมาใช้", icon: <ArchiveRestore size={15} />, onSelect: () => void setClassroomArchived(room.id, false).then(() => { toast.success("นำห้องกลับมาใช้แล้ว"); reload(); }, (error) => toast.error("ทำรายการไม่สำเร็จ", error.message)) }
            : { label: "เก็บเข้าคลัง", icon: <Archive size={15} />, onSelect: () => void setClassroomArchived(room.id, true).then(() => { toast.success(`เก็บห้อง ${room.name} แล้ว`, "นำกลับมาได้จาก “แสดงห้องที่เก็บแล้ว”"); reload(); }, (error) => toast.error("ทำรายการไม่สำเร็จ", error.message)) },
          { label: "ลบห้อง", icon: <Trash2 size={15} />, danger: true, onSelect: onDelete },
        ]} />
      </div>
      <button type="button" onClick={() => router.push(`/school/classrooms/${room.id}`)} className="block w-full space-y-2 px-4 pb-4 text-left">
        <p className="flex items-center gap-1.5 text-sm text-text">
          <GraduationCap size={15} className="text-text-muted" aria-hidden="true" />
          {primary ? <>{primary.name}{room.teachers.length > 1 && <span className="text-text-muted"> +{room.teachers.length - 1}</span>}</> : <Badge tone="warning">ยังไม่มีครู</Badge>}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Badge icon={<Users size={12} />}>{room.student_count} คน</Badge>
          {room.student_count > 0 && (
            <Badge tone={room.linked_count === room.student_count ? "success" : "warning"}>ผู้ปกครอง {room.linked_count}/{room.student_count}</Badge>
          )}
          {room.archived_at && <Badge tone="neutral">เก็บแล้ว</Badge>}
        </div>
      </button>
    </Card>
  );
}

function Classrooms() {
  const { overview, reload } = useSchoolArea();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<OverviewClassroom | null>(null);
  const [deleting, setDeleting] = useState<OverviewClassroom | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const term = search.trim().toLocaleLowerCase("th");
  const rooms = overview.classrooms
    .filter((room) => showArchived || !room.archived_at)
    .filter((room) => !grade || room.grade_level === grade)
    .filter((room) => !term || room.name.toLocaleLowerCase("th").includes(term)
      || room.teachers.some((teacher) => teacher.name.toLocaleLowerCase("th").includes(term)))
    .sort(compareClassrooms);
  const groups = rooms.reduce<Map<string, OverviewClassroom[]>>((map, room) => {
    const key = room.grade_level ?? "ไม่ระบุชั้น";
    map.set(key, [...(map.get(key) ?? []), room]);
    return map;
  }, new Map());
  const usedGrades = [...new Set(overview.classrooms.map((room) => room.grade_level).filter((value): value is string => Boolean(value)))]
    .sort((a, b) => GRADES.indexOf(a) - GRADES.indexOf(b));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <FilterBar className="min-w-0 flex-1"
          search={{ value: search, onChange: setSearch, placeholder: "ค้นหาห้องหรือชื่อครู" }}
          filters={[{ key: "grade", label: "ทุกชั้น", value: grade, onChange: setGrade, options: usedGrades.map((value) => ({ value, label: value })) }]}
          onClear={() => { setSearch(""); setGrade(""); }}
          resultText={`${rooms.length} ห้อง`}
        />
        <Button icon={<Plus size={16} aria-hidden="true" />} onClick={() => setCreating(true)}>สร้างห้องเรียน</Button>
      </div>
      <label className="flex w-fit items-center gap-2 text-sm text-text-muted">
        <Switch checked={showArchived} onCheckedChange={setShowArchived} aria-label="แสดงห้องที่เก็บแล้ว" />
        แสดงห้องที่เก็บแล้ว
      </label>

      {overview.classrooms.length === 0 ? (
        <EmptyState icon={<School size={22} />} title="ยังไม่มีห้องเรียน" description="สร้างได้ทีละหลายห้อง เช่น ป.1/1 ถึง ป.1/3 ในครั้งเดียว"
          action={<Button icon={<Plus size={16} aria-hidden="true" />} onClick={() => setCreating(true)}>สร้างห้องเรียน</Button>} />
      ) : rooms.length === 0 ? (
        <EmptyState title="ไม่พบห้องที่ตรงกับตัวกรอง" action={<Button variant="outline" onClick={() => { setSearch(""); setGrade(""); }}>ล้างตัวกรอง</Button>} />
      ) : [...groups.entries()].map(([groupName, groupRooms]) => (
        <section key={groupName} className="space-y-2" aria-labelledby={`grade-${groupName}`}>
          <h2 id={`grade-${groupName}`} className="text-section-title">{groupName} <span className="text-sm font-normal text-text-muted">· {groupRooms.length} ห้อง</span></h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {groupRooms.map((room) => <RoomCard key={room.id} room={room} onEdit={() => setEditing(room)} onDelete={() => setDeleting(room)} />)}
          </div>
        </section>
      ))}

      <CreateRoomsDialog open={creating} onClose={() => setCreating(false)} />
      <EditRoomDialog key={editing?.id} room={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        tone="danger"
        title={`ลบห้อง ${deleting?.name ?? ""}?`}
        description={deleting && deleting.student_count > 0
          ? `ห้องนี้มีนักเรียน ${deleting.student_count} คน ลบไม่ได้ ย้ายนักเรียนออกก่อน หรือเลือก “เก็บเข้าคลัง” แทน`
          : "ลบได้เฉพาะห้องที่ยังไม่มีนักเรียน การลบย้อนกลับไม่ได้ ถ้าแค่ไม่ใช้แล้วให้เลือก “เก็บเข้าคลัง”"}
        confirmLabel="ลบห้อง"
        loading={busyDelete}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          setBusyDelete(true);
          try {
            await deleteClassroom(deleting.id);
            toast.success(`ลบห้อง ${deleting.name} แล้ว`);
            reload();
            setDeleting(null);
          } catch (cause) {
            toast.error("ลบไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
          } finally {
            setBusyDelete(false);
          }
        }}
      />
    </div>
  );
}

export default function ClassroomsPage() {
  return <SchoolArea title="ห้องเรียนและนักเรียน"><Classrooms /></SchoolArea>;
}
