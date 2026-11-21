"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Gauge, Inbox, Plus, School, UserX } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { JoinCodeCard } from "@/components/join/JoinCodeCard";
import { useInbox } from "@/components/inbox/InboxProvider";
import {
  Alert, Avatar, Badge, Button, ButtonLink, DataLoadError, Dialog, EmptyState, FilterBar, FormField, Input, LoadingState,
  Page, Pagination, ResponsiveDataView, Section, Sheet, Tabs, toast, type DataColumn,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { createSchoolByPlatform } from "@/lib/joinCodes";
import { getSupabaseClient } from "@/lib/supabase/client";
import { formatThaiDate } from "@/lib/thaiDate";
import type { PlatformSchool, PlatformSchoolAdmins } from "@/types/school";
import PlatformUsage from "./PlatformUsage";

const PAGE_SIZE = 10;
const number = new Intl.NumberFormat("th-TH");
const longDate = new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// ── One school (side panel) ─────────────────────────────────────────────────

function SchoolDetails({ school, onChanged }: { school: PlatformSchool; onChanged: () => void }) {
  const [admins, setAdmins] = useState<{ id: string; data?: PlatformSchoolAdmins; failed?: boolean }>();
  const [revision, setRevision] = useState(0);
  const [name, setName] = useState(school.name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getSupabaseClient()?.rpc("get_platform_school_admins", { p_organization_id: school.id }).then(
      ({ data, error }) => { if (active) setAdmins({ id: school.id, data: data ?? undefined, failed: Boolean(error) || !data }); },
      () => { if (active) setAdmins({ id: school.id, failed: true }); },
    );
    return () => { active = false; };
  }, [school.id, revision]);

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client) return;
    setSaving(true);
    try {
      const { error } = await client.rpc("rename_platform_school", { p_organization_id: school.id, p_name: name });
      if (error) throw new Error(error.message);
      toast.success("บันทึกชื่อโรงเรียนแล้ว");
      onChanged();
    } catch (cause) {
      toast.error("บันทึกไม่สำเร็จ", cause instanceof Error ? cause.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  const current = admins?.id === school.id ? admins : undefined;
  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {[
          ["ห้องเรียน", school.classroom_count], ["ครู", school.teacher_count],
          ["นักเรียน", school.student_count], ["ฝึกเสร็จ 7 วัน", school.recent_sessions],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[0.9rem] border border-border bg-surface-muted/60 px-3.5 py-3">
            <dt className="text-caption text-text-muted">{label}</dt>
            <dd className="mt-0.5 font-display text-2xl font-semibold leading-tight tabular-nums text-text">{number.format(Number(value))}</dd>
          </div>
        ))}
      </dl>

      <Section title="ผู้ดูแลโรงเรียน" description="ผู้ดูแลทุกบัญชีมีสิทธิ์เท่ากันภายในโรงเรียนนี้">
        {!current ? <LoadingState variant="list" rows={1} /> : current.failed ? (
          <DataLoadError message="โหลดรายชื่อผู้ดูแลไม่สำเร็จ" onRetry={() => setRevision((value) => value + 1)} />
        ) : current.data && current.data.admins.length > 0 ? (
          <ul className="divide-y divide-border rounded-control border border-border">
            {current.data.admins.map(({ email }) => (
              <li key={email} className="flex items-center justify-between gap-2.5 px-3 py-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-2.5"><Avatar name={email} size="sm" /><span className="break-all">{email}</span></span>
                <Badge tone="success" dot>ใช้งาน</Badge>
              </li>
            ))}
          </ul>
        ) : <Alert tone="warning" title="ยังไม่มีผู้ดูแล">ส่งรหัสผู้ดูแลด้านล่างให้ผู้ดูแลคนแรก</Alert>}
        <JoinCodeCard
          kind="school_admin"
          organizationId={school.id}
          title="รหัสผู้ดูแลโรงเรียน (ใช้ได้ครั้งเดียว)"
          description="ส่งทาง LINE หรือให้สแกนจากจอ ใช้แล้วเป็นผู้ดูแลทันที และคุณจะได้แจ้งเตือน (ใช้ได้ 7 วัน)"
        />
      </Section>

      <Section title="แก้ชื่อโรงเรียน">
        <form className="flex flex-wrap items-end gap-2" onSubmit={rename}>
          <FormField label="ชื่อโรงเรียน" className="min-w-0 flex-1">
            <Input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
          </FormField>
          <Button type="submit" variant="outline" loading={saving} disabled={!name.trim() || name.trim() === school.name}>บันทึก</Button>
        </form>
      </Section>
    </div>
  );
}

// ── Create school ───────────────────────────────────────────────────────────

function CreateSchoolDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog open={open} onClose={onClose} dismissible={!busy} title="เพิ่มโรงเรียน"
      description="ใช้เมื่อเพิ่มโรงเรียนให้เอง โดยปกติโรงเรียนจะลงทะเบียนเองที่หน้า ลงทะเบียนโรงเรียน">
      <form id="create-school" className="space-y-3" onSubmit={async (event) => {
        event.preventDefault();
        const name = String(new FormData(event.currentTarget).get("name"));
        setBusy(true);
        setError("");
        try {
          const id = await createSchoolByPlatform(name);
          toast.success("เพิ่มโรงเรียนแล้ว", "ส่งรหัสผู้ดูแลให้ผู้ดูแลคนแรกจากรายละเอียดโรงเรียน");
          onCreated(id);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "เพิ่มโรงเรียนไม่สำเร็จ");
        } finally {
          setBusy(false);
        }
      }}>
        <FormField label="ชื่อโรงเรียน" required>
          <Input name="name" required maxLength={120} autoFocus />
        </FormField>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose} disabled={busy}>ยกเลิก</Button>
          <Button type="submit" loading={busy}>เพิ่มโรงเรียน</Button>
        </div>
      </form>
    </Dialog>
  );
}

// ── Schools tab ─────────────────────────────────────────────────────────────

function Schools() {
  const { inbox } = useInbox();
  const [result, setResult] = useState<{ revision: number; schools?: PlatformSchool[]; failed?: boolean }>();
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<{ term: string; ids: Set<string> }>();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string>();
  const [creating, setCreating] = useState(false);
  const term = query.trim().normalize("NFC").toLocaleLowerCase("th");

  useEffect(() => {
    let active = true;
    getSupabaseClient()?.rpc("list_platform_schools").then(
      ({ data, error }) => { if (active) setResult({ revision, schools: data ?? undefined, failed: Boolean(error) || !data }); },
      () => { if (active) setResult({ revision, failed: true }); },
    );
    return () => { active = false; };
  }, [revision]);

  // Server search also matches admin emails and pending admin codes, not just names.
  useEffect(() => {
    if (!term) return;
    let active = true;
    const timer = window.setTimeout(() => {
      getSupabaseClient()?.rpc("search_platform_school_ids", { p_query: term }).then(
        ({ data }) => { if (active) setMatches({ term, ids: new Set(data ?? []) }); },
        () => { if (active) setMatches({ term, ids: new Set() }); },
      );
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [term]);

  const reload = () => setRevision((value) => value + 1);
  const waiting = inbox?.to_review.filter((request) => request.kind === "school").length ?? 0;
  const schools = result?.schools;

  if (!result) return <LoadingState variant="stats" rows={4} label="กำลังโหลดโรงเรียน…" />;
  if (!schools) return <DataLoadError message="โหลดข้อมูลโรงเรียนไม่สำเร็จ" onRetry={reload} />;

  const searched = term && matches?.term === term ? matches : undefined;
  const filtered = schools
    .filter((school) => !term || (searched ? searched.ids.has(school.id) : school.name.toLocaleLowerCase("th").includes(term)))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const total = (key: "admin_count" | "teacher_count" | "student_count" | "recent_sessions") =>
    schools.reduce((sum, school) => sum + school[key], 0);
  const selected = schools.find((school) => school.id === selectedId);
  const maxSessions = Math.max(1, ...schools.map((school) => school.recent_sessions));
  const noAdmin = schools.filter((school) => school.admin_count === 0).length;

  const columns: DataColumn<PlatformSchool>[] = [
    {
      key: "name", header: "โรงเรียน", hideOnMobile: true, cell: (school) => (
        <span className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[0.8rem] bg-primary-soft text-primary-text"><School size={18} /></span>
          <span className="min-w-0">
            <span className="block font-display text-[0.9375rem] font-medium text-text">{school.name}</span>
            <span className="block text-caption text-text-muted">เพิ่มเมื่อ {formatThaiDate(school.created_at)}</span>
          </span>
        </span>
      ),
    },
    { key: "classrooms", mobileStat: true, header: "ห้อง", align: "right", cell: (school) => <span className="tabular-nums">{school.classroom_count}</span> },
    { key: "teachers", mobileStat: true, header: "ครู", align: "right", cell: (school) => <span className="tabular-nums">{school.teacher_count}</span> },
    { key: "students", mobileStat: true, header: "นักเรียน", align: "right", cell: (school) => <span className="tabular-nums">{number.format(school.student_count)}</span> },
    {
      key: "sessions", mobileStat: true, header: "ฝึก 7 วัน", align: "right", cell: (school) => (
        <span className="inline-flex items-center justify-end gap-2.5">
          <span aria-hidden="true" className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-surface-muted sm:block">
            <span className="block h-full rounded-full bg-gradient-to-r from-[#7FC8EE] to-info" style={{ width: `${(school.recent_sessions / maxSessions) * 100}%` }} />
          </span>
          <span className="tabular-nums">{number.format(school.recent_sessions)}</span>
        </span>
      ),
    },
    {
      key: "admins", header: "ผู้ดูแล", cell: (school) => school.admin_count > 0
        ? <Badge tone="success" dot>{school.admin_count} คน</Badge>
        : <Badge tone="warning" dot>ยังไม่มีผู้ดูแล</Badge>,
    },
  ];

  return (
    <div className="space-y-5">
      <section aria-label="ภาพรวมทั้งระบบ" className="hero-night relative overflow-hidden rounded-[1.5rem] p-5 sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgb(255_255_255/0.18)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(120deg,transparent_35%,#000_90%)]" />
        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-center">
          <dl className="grid grid-cols-2 gap-y-4 sm:grid-cols-4 sm:divide-x sm:divide-white/15">
            {[
              ["โรงเรียน", schools.length], ["ครู", total("teacher_count")],
              ["นักเรียน", total("student_count")], ["ฝึกเสร็จใน 7 วัน", total("recent_sessions")],
            ].map(([label, value]) => (
              <div key={label} className="pr-3 sm:px-5 sm:first:pl-0">
                <dt className="text-caption text-white/70">{label}</dt>
                <dd className="mt-1 font-display text-[2.25rem] font-semibold leading-none tabular-nums">{number.format(Number(value))}</dd>
              </div>
            ))}
          </dl>
          <div className="rounded-[1.1rem] bg-white/10 p-4 ring-1 ring-inset ring-white/15 backdrop-blur-sm">
            <p className="font-display font-medium">สิ่งที่รอคุณ</p>
            <ul className="mt-2 space-y-2 text-sm text-white/85">
              <li className="flex items-center gap-2"><Inbox size={15} aria-hidden="true" className="shrink-0 text-[#FFD58A]" />
                {waiting > 0 ? `โรงเรียนขอใช้งาน ${waiting} แห่ง` : "ไม่มีโรงเรียนรอพิจารณา"}</li>
              <li className="flex items-center gap-2"><UserX size={15} aria-hidden="true" className="shrink-0 text-[#FFD58A]" />
                {noAdmin > 0 ? `${noAdmin} โรงเรียนยังไม่มีผู้ดูแล` : "ทุกโรงเรียนมีผู้ดูแลแล้ว"}</li>
            </ul>
            {waiting > 0 && <ButtonLink href="/inbox" size="sm" block className="btn-gold mt-3">ไปพิจารณา</ButtonLink>}
          </div>
        </div>
      </section>

      <Section title={`โรงเรียนในระบบ · ${number.format(schools.length)}`} action={<Button size="sm" icon={<Plus size={14} aria-hidden="true" />} onClick={() => setCreating(true)}>เพิ่มโรงเรียน</Button>}>
        <FilterBar
          search={{ value: query, onChange: (value) => { setQuery(value); setPage(1); }, placeholder: "ชื่อโรงเรียน รหัส หรืออีเมลผู้ดูแล" }}
          onClear={() => { setQuery(""); setPage(1); }}
          resultText={term && !searched ? "กำลังค้นหา…" : `${number.format(filtered.length)} โรงเรียน · ใหม่ล่าสุดก่อน`}
        />
        <ResponsiveDataView
          caption="โรงเรียนในระบบ"
          rows={visible}
          columns={columns}
          rowKey={(school) => school.id}
          mobileTitle={(school) => school.name}
          onRowClick={(school) => setSelectedId(school.id)}
          empty={schools.length === 0
            ? <EmptyState icon={<School size={22} />} title="ยังไม่มีโรงเรียน" description="เมื่อโรงเรียนลงทะเบียน คำขอจะเข้ากล่องข้อความของคุณ" />
            : <EmptyState icon={<School size={22} />} title="ไม่พบโรงเรียนที่ตรงกับคำค้น"
                action={<Button variant="outline" onClick={() => setQuery("")}>ล้างคำค้นหา</Button>} />}
        />
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      </Section>

      <Sheet open={Boolean(selected)} onClose={() => setSelectedId(undefined)}
        title={selected?.name ?? ""} description={selected ? `เพิ่มเมื่อ ${formatThaiDate(selected.created_at)}` : undefined}>
        {selected && <SchoolDetails key={selected.id} school={selected} onChanged={reload} />}
      </Sheet>
      <CreateSchoolDialog open={creating} onClose={() => setCreating(false)}
        onCreated={(id) => { setCreating(false); reload(); setSelectedId(id); }} />
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PlatformAdminPage() {
  const { user, isLoading } = useAuth();
  const [view, setView] = useState<"schools" | "usage">("schools");

  return (
    <AppShell>
      <Page>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-caption font-semibold tracking-wide text-primary-text">แอดมินระบบ · {longDate.format(new Date())}</p>
            <h1 className="text-page-title text-text">ภาพรวมระบบ</h1>
            <p className="text-[0.9375rem] text-text-muted">โรงเรียนทั้งหมด คำขอใช้งาน และข้อมูลการใช้งานเว็บ</p>
          </div>
          {user?.isPlatformAdmin && (
            <ButtonLink href="/platform/assessment" variant="outline" icon={<Gauge size={16} aria-hidden="true" />}>ศูนย์ประเมิน</ButtonLink>
          )}
        </header>
        {isLoading ? <LoadingState variant="stats" rows={4} /> : !user ? (
          <EmptyState title="กรุณาเข้าสู่ระบบ" action={<ButtonLink href="/auth/signin?redirect=%2Fplatform">เข้าสู่ระบบ</ButtonLink>} />
        ) : !user.isPlatformAdmin ? (
          <Alert tone="error" title="บัญชีนี้ไม่มีสิทธิ์แอดมินระบบ" />
        ) : (
          <Tabs label="มุมมองแอดมินระบบ" value={view} onValueChange={setView}
            items={[{ value: "schools", label: "โรงเรียน" }, { value: "usage", label: "การใช้งานเว็บ" }]}>
            {view === "schools" ? <Schools key={user.id} /> : <PlatformUsage />}
          </Tabs>
        )}
      </Page>
    </AppShell>
  );
}
