"use client";

import { useState } from "react";
import { BookOpen, GraduationCap, MoreHorizontal, Pencil, Plus, School, Trash2, Users } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import {
  Alert, Avatar, Badge, Button, Card, CardContent, CardFooter, CardHeader, Checkbox, ConfirmDialog, DataLoadError,
  Dialog, DropdownMenu, EmptyState, FilterBar, FormField, Input, LoadingState, PageHeader, Pagination,
  ResponsiveDataView, SearchPicker, Section, Select, Sheet, StatCard, StatusBadge, Switch, Tabs, Textarea,
  ThaiDateInput, Tooltip, toast, type DataColumn, type PickerOption,
} from "@/components/ui";
import { formatRelativeTime, formatThaiDate } from "@/lib/thaiDate";

type Room = { id: string; name: string; grade: string; students: number; teacher: string; linked: number };

const rooms: Room[] = [
  { id: "1", name: "ป.1/1", grade: "ป.1", students: 32, teacher: "ครูสมศรี ใจดี", linked: 28 },
  { id: "2", name: "ป.1/2", grade: "ป.1", students: 30, teacher: "ครูมานพ รักเรียน", linked: 12 },
  { id: "10", name: "ป.1/10", grade: "ป.1", students: 0, teacher: "—", linked: 0 },
];

const people: PickerOption[] = [
  { id: "t1", label: "ครูสมศรี ใจดี", description: "somsri@school.ac.th", avatarName: "สมศรี ใจดี" },
  { id: "t2", label: "ครูมานพ รักเรียน", description: "manop@school.ac.th", avatarName: "มานพ รักเรียน", disabled: true, disabledReason: "อยู่ในห้องนี้แล้ว" },
  { id: "t3", label: "ครูวิไล สอนดี", description: "wilai@school.ac.th", avatarName: "วิไล สอนดี" },
];

const columns: DataColumn<Room>[] = [
  { key: "name", header: "ห้อง", cell: (room) => <span className="font-semibold">{room.name}</span>, hideOnMobile: true },
  { key: "teacher", header: "ครูประจำห้อง", cell: (room) => room.teacher },
  { key: "students", header: "นักเรียน", align: "right", cell: (room) => <span className="tabular-nums">{room.students}</span> },
  {
    key: "linked", header: "ผู้ปกครองเชื่อมแล้ว", align: "right",
    cell: (room) => <span className="tabular-nums">{room.linked}/{room.students}</span>,
  },
];

export default function UiKitPreview() {
  const [tab, setTab] = useState<"buttons" | "forms" | "data" | "feedback">("buttons");
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notify, setNotify] = useState(true);
  const [birth, setBirth] = useState("");
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<PickerOption[]>([]);
  const [now] = useState(() => Date.now());

  const visibleRooms = rooms.filter((room) =>
    (!grade || room.grade === grade) && (!search || room.name.includes(search) || room.teacher.includes(search)));

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      <PageHeader
        icon={<School size={20} />}
        title="UI Kit"
        description="คอมโพเนนต์กลางของ Speech Adventure (หน้านี้มีเฉพาะตอนพัฒนา)"
        back={{ href: "/", label: "หน้าแรก" }}
        actions={<><ThemeToggle /><Button icon={<Plus size={16} aria-hidden="true" />}>ปุ่มหลัก</Button></>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="ห้องเรียน" value={12} icon={<School size={20} />} />
        <StatCard label="ครู" value={18} icon={<GraduationCap size={20} />} tone="info" />
        <StatCard label="นักเรียน" value={356} icon={<Users size={20} />} tone="success" hint="+12 จากเดือนก่อน" />
        <StatCard label="ผู้ปกครองยังไม่เชื่อม" value={41} icon={<BookOpen size={20} />} tone="warning" />
      </div>

      <Tabs
        label="หมวดคอมโพเนนต์"
        value={tab}
        onValueChange={setTab}
        items={[
          { value: "buttons", label: "ปุ่มและป้าย" },
          { value: "forms", label: "ฟอร์ม" },
          { value: "data", label: "ข้อมูล", count: visibleRooms.length },
          { value: "feedback", label: "การแจ้งผล" },
        ]}
      >
        {tab === "buttons" && (
          <div className="space-y-6">
            <Section title="ปุ่ม">
              <div className="flex flex-wrap items-center gap-2">
                <Button>บันทึก</Button>
                <Button variant="secondary">รอง</Button>
                <Button variant="outline">ยกเลิก</Button>
                <Button variant="ghost">ซ่อน</Button>
                <Button variant="danger" icon={<Trash2 size={16} aria-hidden="true" />}>ลบ</Button>
                <Button variant="link">ลิงก์</Button>
                <Button loading loadingText="กำลังบันทึก…">บันทึก</Button>
                <Button size="sm">เล็ก</Button>
                <Button size="lg">ใหญ่</Button>
                <Tooltip content="แก้ไขห้องเรียน">
                  <Button size="icon" variant="outline" aria-label="แก้ไข"><Pencil size={16} aria-hidden="true" /></Button>
                </Tooltip>
                <DropdownMenu label="ตัวเลือกเพิ่มเติม" trigger={<MoreHorizontal size={18} aria-hidden="true" />} items={[
                  { label: "แก้ไข", icon: <Pencil size={15} />, onSelect: () => toast.info("เลือก แก้ไข") },
                  { label: "ลบห้อง", icon: <Trash2 size={15} />, danger: true, onSelect: () => setConfirm(true) },
                ]} />
              </div>
            </Section>
            <Section title="ป้ายสถานะ">
              <div className="flex flex-wrap gap-2">
                <Badge>ทั่วไป</Badge>
                <Badge tone="primary">หลัก</Badge>
                <Badge tone="success" dot>สำเร็จ</Badge>
                <Badge tone="warning" dot>ระวัง</Badge>
                <Badge tone="error" dot>ผิดพลาด</Badge>
                <Badge tone="info">ข้อมูล</Badge>
                {(["pending", "review", "accepted", "rejected", "expired", "revoked"] as const).map((status) => (
                  <StatusBadge key={status} status={status} />
                ))}
              </div>
            </Section>
            <Section title="Avatar">
              <div className="flex items-center gap-3">
                <Avatar name="สมศรี ใจดี" size="sm" />
                <Avatar name="มานพ รักเรียน" />
                <Avatar name="Kanokwan P" size="lg" />
              </div>
            </Section>
          </div>
        )}

        {tab === "forms" && (
          <Card>
            <CardHeader title="เพิ่มนักเรียน" description="ตัวอย่างฟอร์มที่ใช้ FormField" />
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField label="ชื่อ-นามสกุล" required hint="ใช้ชื่อจริงตามทะเบียน">
                <Input placeholder="เด็กชายก้อง ใจดี" />
              </FormField>
              <FormField label="ชื่อเล่น" error="ชื่อเล่นยาวเกิน 20 ตัวอักษร">
                <Input defaultValue="ก้องกก้องกก้องกก้องกก้องก" />
              </FormField>
              <FormField label="ห้อง">
                <Select defaultValue="">
                  <option value="" disabled>เลือกห้อง</option>
                  {rooms.map((room) => <option key={room.id}>{room.name}</option>)}
                </Select>
              </FormField>
              <FormField label="วันเกิด" hint={birth ? `เลือก ${birth}` : "ไม่บังคับ"}>
                <ThaiDateInput label="วันเกิด" value={birth} onChange={setBirth} />
              </FormField>
              <FormField label="หมายเหตุ" className="sm:col-span-2">
                <Textarea placeholder="ข้อมูลเพิ่มเติมสำหรับครู" />
              </FormField>
              <FormField label="แจ้งเตือนผู้ปกครองเมื่อมีผลฝึกใหม่" hint="ส่งเข้ากล่องข้อความของผู้ปกครอง" inline>
                <Switch checked={notify} onCheckedChange={setNotify} />
              </FormField>
              <FormField label="ยินยอมให้เก็บเสียงเพื่อประเมินผล" inline>
                <Checkbox defaultChecked />
              </FormField>
              <div className="space-y-1.5 sm:col-span-2">
                <p className="text-sm font-medium">เลือกครูเข้าห้อง (SearchPicker)</p>
                <SearchPicker
                  label="ค้นหาครู"
                  placeholder="พิมพ์ชื่อหรืออีเมลครู"
                  search={async (query) => people.filter((person) => person.label.includes(query) || person.description?.includes(query))}
                  onSelect={(option) => setPicked((list) => list.some((item) => item.id === option.id) ? list : [...list, option])}
                />
                {picked.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {picked.map((person) => <Badge key={person.id} tone="primary">{person.label}</Badge>)}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline">ยกเลิก</Button>
              <Button onClick={() => toast.success("เพิ่มนักเรียนแล้ว", "ก้อง ใจดี อยู่ในห้อง ป.1/1")}>บันทึก</Button>
            </CardFooter>
          </Card>
        )}

        {tab === "data" && (
          <div className="space-y-3">
            <FilterBar
              search={{ value: search, onChange: setSearch, placeholder: "ค้นหาห้องหรือครู" }}
              filters={[{ key: "grade", label: "ทุกชั้น", value: grade, onChange: setGrade, options: [{ value: "ป.1", label: "ป.1" }, { value: "ป.2", label: "ป.2" }] }]}
              onClear={() => { setSearch(""); setGrade(""); }}
              resultText={`${visibleRooms.length} ห้อง`}
            />
            <ResponsiveDataView
              caption="ห้องเรียนทั้งหมด"
              rows={visibleRooms}
              columns={columns}
              rowKey={(room) => room.id}
              mobileTitle={(room) => room.name}
              mobileAside={(room) => room.students === 0 ? <Badge tone="warning">ยังไม่มีนักเรียน</Badge> : null}
              onRowClick={() => setSheet(true)}
              empty={<EmptyState icon={<School size={22} />} title="ไม่พบห้องที่ตรงกับตัวกรอง"
                action={<Button variant="outline" onClick={() => { setSearch(""); setGrade(""); }}>ล้างตัวกรอง</Button>} />}
            />
            <Pagination page={page} pageSize={20} total={53} onPageChange={setPage} />
          </div>
        )}

        {tab === "feedback" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => toast.success("บันทึกแล้ว")}>Toast สำเร็จ</Button>
              <Button variant="outline" onClick={() => toast.error("บันทึกไม่สำเร็จ", "อีเมลนี้มีบัญชีแล้ว")}>Toast ผิดพลาด</Button>
              <Button variant="outline" onClick={() => setDialog(true)}>เปิด Dialog</Button>
              <Button variant="outline" onClick={() => setSheet(true)}>เปิด Sheet</Button>
              <Button variant="danger" onClick={() => setConfirm(true)}>ยืนยันการลบ</Button>
            </div>
            <Alert tone="info" title="ปีการศึกษา 2569">ตั้งปีการศึกษาปัจจุบันก่อนสร้างห้องเรียน</Alert>
            <Alert tone="success">เชื่อมผู้ปกครองครบทุกคนแล้ว</Alert>
            <Alert tone="warning" title="ใบเชิญจะหมดอายุใน 3 วัน" action={<Button size="sm" variant="outline">ออกรหัสใหม่</Button>} />
            <DataLoadError onRetry={() => toast.info("ลองโหลดใหม่")} />
            <EmptyState icon={<Users size={22} />} title="ยังไม่มีนักเรียนในห้องนี้" description="เพิ่มทีละคนหรือนำเข้าจากไฟล์ Excel"
              action={<><Button icon={<Plus size={16} aria-hidden="true" />}>เพิ่มนักเรียน</Button><Button variant="outline">นำเข้าไฟล์</Button></>} />
            <LoadingState variant="list" rows={2} />
            <LoadingState variant="stats" rows={4} />
            <p className="text-sm text-text-muted">
              วันที่: {formatThaiDate(now)} · {formatThaiDate(now, "long")} · {formatRelativeTime(now - 5 * 60000, new Date(now))} · {formatRelativeTime(now - 86400000, new Date(now))}
            </p>
          </div>
        )}
      </Tabs>

      <Dialog open={dialog} onClose={() => setDialog(false)} title="สร้างห้องเรียน" description="สร้างหลายห้องในชั้นเดียวกันได้ทีเดียว"
        footer={<><Button variant="outline" onClick={() => setDialog(false)}>ยกเลิก</Button><Button onClick={() => { setDialog(false); toast.success("สร้าง 3 ห้องแล้ว"); }}>สร้าง 3 ห้อง</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="ชั้น" required><Select defaultValue="ป.1"><option>ป.1</option><option>ป.2</option></Select></FormField>
          <FormField label="จำนวนห้อง" required><Input type="number" defaultValue={3} min={1} max={20} /></FormField>
        </div>
        <p className="mt-3 text-sm text-text-muted">จะได้ห้อง ป.1/1, ป.1/2, ป.1/3</p>
      </Dialog>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="ป.1/1" description="ครูสมศรี ใจดี · นักเรียน 32 คน">
        <div className="space-y-3">
          {["ก้อง ใจดี", "ข้าวหอม มีสุข", "แก้ว ใสสะอาด"].map((name, i) => (
            <div key={name} className="flex items-center gap-3">
              <Avatar name={name} size="sm" />
              <span className="flex-1 text-sm">{i + 1}. {name}</span>
              <StatusBadge status={i === 1 ? "pending" : "accepted"} />
            </div>
          ))}
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirm}
        tone="danger"
        title="ลบห้อง ป.1/10?"
        description="ห้องนี้ยังไม่มีนักเรียน จึงลบได้ทันที การลบย้อนกลับไม่ได้"
        confirmLabel="ลบห้อง"
        loading={deleting}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setDeleting(true);
          setTimeout(() => { setDeleting(false); setConfirm(false); toast.success("ลบห้อง ป.1/10 แล้ว"); }, 800);
        }}
      />
    </main>
  );
}
