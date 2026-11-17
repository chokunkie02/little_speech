"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { School } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Alert, ButtonLink, DataLoadError, EmptyState, LoadingState, Page, PageHeader, Select } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useSchool } from "@/hooks/useSchool";
import { cn } from "@/lib/cn";
import { getSchoolOverview, type SchoolOverview } from "@/lib/schoolAdmin";

type SchoolContextValue = { orgId: string; overview: SchoolOverview; reload: () => void };
const SchoolContext = createContext<SchoolContextValue | null>(null);

/** Data for the selected school; only available inside <SchoolArea>. */
export function useSchoolArea() {
  const value = useContext(SchoolContext);
  if (!value) throw new Error("useSchoolArea must be used inside <SchoolArea>");
  return value;
}

const TABS = [
  { href: "/school", label: "ภาพรวม", exact: true },
  { href: "/school/classrooms", label: "ห้องเรียนและนักเรียน" },
  { href: "/school/teachers", label: "ครู" },
  { href: "/school/settings", label: "ตั้งค่า" },
];

const ORG_KEY = "speech-adventure-school";

function SubNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="เมนูจัดการโรงเรียน" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <li key={tab.href} className="shrink-0">
              <Link href={tab.href} aria-current={active ? "page" : undefined}
                className={cn("-mb-px inline-flex border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
                  active ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text")}>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Shell for every /school page: AppShell, school header with sub-navigation, and the school overview
 * loaded once and shared through useSchoolArea().
 */
export function SchoolArea({ title, description, actions, back, children }: {
  /** Page title under the school name; omit on the overview. */
  title?: string;
  description?: string;
  actions?: ReactNode;
  back?: { href: string; label: string };
  children: ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const { organizations } = useSchool();
  const schools = organizations.filter((organization) => organization.type === "school");
  const [chosen, setChosen] = useState<string>(() => {
    try { return localStorage.getItem(ORG_KEY) ?? ""; } catch { return ""; }
  });
  const orgId = schools.find((school) => school.id === chosen)?.id ?? schools[0]?.id;
  const [state, setState] = useState<{ orgId: string; revision: number; overview?: SchoolOverview; failed?: boolean }>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    getSchoolOverview(orgId).then(
      (overview) => { if (active) setState({ orgId, revision, overview }); },
      () => { if (active) setState((previous) => ({ orgId, revision, overview: previous?.orgId === orgId ? previous.overview : undefined, failed: true })); },
    );
    return () => { active = false; };
  }, [orgId, revision]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const current = state?.orgId === orgId ? state : undefined;

  let body: ReactNode;
  if (isLoading) body = <LoadingState variant="stats" rows={4} />;
  else if (!user) body = <EmptyState title="กรุณาเข้าสู่ระบบ" action={<ButtonLink href="/auth/signin?redirect=%2Fschool">เข้าสู่ระบบ</ButtonLink>} />;
  else if (!orgId) {
    body = (
      <EmptyState icon={<School size={22} />} title="บัญชีนี้ยังไม่ได้ดูแลโรงเรียนไหน"
        description="ลงทะเบียนโรงเรียนใหม่ หรือขอรหัสผู้ดูแลจากผู้ดูแลเดิมแล้วใช้ที่หน้าใช้รหัสเข้าร่วม"
        action={<><ButtonLink href="/register-school">ลงทะเบียนโรงเรียน</ButtonLink><ButtonLink href="/join" variant="outline">ใช้รหัสเข้าร่วม</ButtonLink></>} />
    );
  } else if (!current?.overview) {
    body = current?.failed ? <DataLoadError message="โหลดข้อมูลโรงเรียนไม่สำเร็จ" onRetry={reload} /> : <LoadingState variant="stats" rows={4} />;
  } else {
    body = (
      <SchoolContext.Provider value={{ orgId, overview: current.overview, reload }}>
        {current.failed && <DataLoadError message="โหลดข้อมูลล่าสุดไม่สำเร็จ" detail="กำลังแสดงข้อมูลจากครั้งก่อน" onRetry={reload} />}
        {children}
      </SchoolContext.Provider>
    );
  }

  const school = current?.overview?.school;
  return (
    <AppShell>
      <Page>
        <PageHeader
          icon={<School size={20} />}
          back={back}
          title={title ?? school?.name ?? "จัดการโรงเรียน"}
          description={description ?? (title && school ? school.name : school?.academic_year ? `ปีการศึกษา ${school.academic_year}` : undefined)}
          actions={<>
            {schools.length > 1 && (
              <Select aria-label="เลือกโรงเรียน" value={orgId} onChange={(event) => {
                setChosen(event.target.value);
                try { localStorage.setItem(ORG_KEY, event.target.value); } catch { /* per-device only */ }
              }}>
                {schools.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </Select>
            )}
            {actions}
          </>}
        />
        {orgId && !back && <SubNav />}
        {current?.overview && !current.overview.school.academic_year && !title && (
          <Alert tone="info" title="ตั้งปีการศึกษาปัจจุบันก่อนเริ่ม" action={<ButtonLink href="/school/settings" size="sm">ตั้งค่า</ButtonLink>}>
            ห้องเรียนที่สร้างจะผูกกับปีการศึกษานี้ เพื่อเลื่อนชั้นได้ตอนขึ้นปีใหม่
          </Alert>
        )}
        {body}
      </Page>
    </AppShell>
  );
}
