"use client";

import { useState } from "react";
import SchoolTeacherInvitations from "@/components/school/SchoolTeacherInvitations";
import { isSupabaseProviderRequested } from "@/lib/config/storageProvider";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import ClassroomCard from "@/components/school/ClassroomCard";
import ClassroomManagementPanel from "@/components/school/ClassroomManagementPanel";
import StudentImportWizard from "@/components/school/StudentImportWizard";
import { useSchool } from "@/hooks/useSchool";
import { useAuth } from "@/hooks/useAuth";
import { ORG_TYPE_LABELS, type OrganizationType } from "@/types/school";

function BuildingIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <rect x="9" y="13" width="6" height="9" />
    </svg>
  );
}

function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function UploadIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export default function SchoolAdminPage() {
  const { user } = useAuth();
  const {
    organizations,
    listClassrooms,
    listChildrenForClassroom,
    listTeachersForClassroom,
    createOrganization,
    createClassroom,
  } = useSchool();

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);

  // Create org form state
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<OrganizationType>("school");
  const [orgBusy, setOrgBusy] = useState(false);
  const [orgError, setOrgError] = useState("");

  // Create classroom form state
  const [roomName, setRoomName] = useState("");
  const [roomGrade, setRoomGrade] = useState("");
  const [roomYear, setRoomYear] = useState("");
  const [roomBusy, setRoomBusy] = useState(false);
  const [roomError, setRoomError] = useState("");

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId) ?? organizations[0] ?? null;
  const classrooms = selectedOrg ? listClassrooms(selectedOrg.id) : [];
  const selectedClassroom = classrooms.find((c) => c.id === selectedClassroomId) ?? null;

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !orgName.trim()) return;
    setOrgBusy(true);
    setOrgError("");
    try {
      await createOrganization({ name: orgName.trim(), type: orgType, createdBy: user.id });
      setOrgName("");
      setShowCreateOrg(false);
    } catch (err) {
      setOrgError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setOrgBusy(false);
    }
  }

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrg || !roomName.trim()) return;
    setRoomBusy(true);
    setRoomError("");
    try {
      await createClassroom({
        organizationId: selectedOrg.id,
        name:           roomName.trim(),
        gradeLevel:     roomGrade.trim() || undefined,
        academicYear:   roomYear.trim() || undefined,
      });
      setRoomName("");
      setRoomGrade("");
      setRoomYear("");
      setShowCreateRoom(false);
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setRoomBusy(false);
    }
  }

  return (
    <>
    {showImportWizard && selectedOrg && (
      <StudentImportWizard
        organizationId={selectedOrg.id}
        classrooms={classrooms}
        onClose={() => setShowImportWizard(false)}
      />
    )}
    {selectedClassroom && (
      <ClassroomManagementPanel
        classroom={selectedClassroom}
        onClose={() => setSelectedClassroomId(null)}
      />
    )}
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
              <BuildingIcon size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text">จัดการโรงเรียน</h1>
              <p className="text-sm text-text-muted mt-0.5">องค์กรและห้องเรียนของคุณ</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateOrg(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.97]"
          >
            <PlusIcon size={15} />
            สร้างองค์กร
          </button>
        </div>

        {/* Create org form */}
        {showCreateOrg && (
          <form
            onSubmit={handleCreateOrg}
            className="bg-surface border border-border rounded-2xl p-5 space-y-4"
          >
            <h2 className="text-sm font-semibold text-text">สร้างองค์กรใหม่</h2>
            <div className="space-y-3">
              <div>
                <label htmlFor="org-name" className="block text-xs font-medium text-text-muted mb-1">
                  ชื่อองค์กร
                </label>
                <input
                  id="org-name"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="เช่น โรงเรียนสาธิต"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label htmlFor="org-type" className="block text-xs font-medium text-text-muted mb-1">
                  ประเภท
                </label>
                <select
                  id="org-type"
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value as OrganizationType)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {(Object.keys(ORG_TYPE_LABELS) as OrganizationType[]).map((t) => (
                    <option key={t} value={t}>{ORG_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
            </div>
            {orgError && <p className="text-xs text-error">{orgError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={orgBusy}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {orgBusy ? "กำลังสร้าง…" : "สร้าง"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreateOrg(false); setOrgError(""); }}
                className="px-4 py-2 rounded-xl border border-border text-sm text-text-muted hover:text-text hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        )}

        {/* No organizations */}
        {organizations.length === 0 && !showCreateOrg && (
          <div className="bg-surface border border-dashed border-border rounded-2xl p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4 text-primary">
              <BuildingIcon size={26} />
            </div>
            <h2 className="text-base font-semibold text-text mb-1">ยังไม่มีองค์กร</h2>
            <p className="text-sm text-text-muted max-w-xs mx-auto">
              สร้างองค์กรแรกเพื่อเริ่มจัดการห้องเรียนและนักเรียน
            </p>
          </div>
        )}

        {/* Org tabs + classrooms */}
        {organizations.length > 0 && (
          <div className="space-y-4">
            {/* Org selector tabs */}
            {organizations.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => { setSelectedOrgId(org.id); setSelectedClassroomId(null); }}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                      (selectedOrg?.id === org.id)
                        ? "bg-primary/10 text-primary"
                        : "text-text-muted hover:text-text hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    {org.name}
                  </button>
                ))}
              </div>
            )}

            {selectedOrg && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-text">{selectedOrg.name}</h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      {ORG_TYPE_LABELS[selectedOrg.type]}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowImportWizard(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm text-text-muted hover:text-text hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                    >
                      <UploadIcon size={14} />
                      นำเข้านักเรียน
                    </button>
                    <button
                      onClick={() => setShowCreateRoom(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm text-text-muted hover:text-text hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                    >
                      <PlusIcon size={14} />
                      เพิ่มห้องเรียน
                    </button>
                  </div>
                </div>

                {/* Create classroom form */}
                {showCreateRoom && (
                  <form
                    onSubmit={handleCreateRoom}
                    className="bg-surface border border-border rounded-2xl p-5 space-y-4"
                  >
                    <h3 className="text-sm font-semibold text-text">สร้างห้องเรียนใหม่</h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-3">
                        <label htmlFor="room-name" className="block text-xs font-medium text-text-muted mb-1">
                          ชื่อห้อง
                        </label>
                        <input
                          id="room-name"
                          type="text"
                          value={roomName}
                          onChange={(e) => setRoomName(e.target.value)}
                          placeholder="เช่น ป.1/1"
                          required
                          className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div>
                        <label htmlFor="room-grade" className="block text-xs font-medium text-text-muted mb-1">
                          ชั้นเรียน (ไม่บังคับ)
                        </label>
                        <input
                          id="room-grade"
                          type="text"
                          value={roomGrade}
                          onChange={(e) => setRoomGrade(e.target.value)}
                          placeholder="ป.1"
                          className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div>
                        <label htmlFor="room-year" className="block text-xs font-medium text-text-muted mb-1">
                          ปีการศึกษา (ไม่บังคับ)
                        </label>
                        <input
                          id="room-year"
                          type="text"
                          value={roomYear}
                          onChange={(e) => setRoomYear(e.target.value)}
                          placeholder="2567"
                          className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>
                    {roomError && <p className="text-xs text-error">{roomError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={roomBusy}
                        className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                      >
                        {roomBusy ? "กำลังสร้าง…" : "สร้าง"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowCreateRoom(false); setRoomError(""); }}
                        className="px-4 py-2 rounded-xl border border-border text-sm text-text-muted hover:text-text hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </form>
                )}

                {/* Classrooms grid */}
                {classrooms.length === 0 && !showCreateRoom ? (
                  <div className="bg-surface border border-dashed border-border rounded-2xl p-8 text-center">
                    <p className="text-sm text-text-muted">ยังไม่มีห้องเรียน กดปุ่ม &ldquo;เพิ่มห้องเรียน&rdquo; เพื่อเริ่ม</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {classrooms.map((room) => (
                      <ClassroomCard
                        key={room.id}
                        classroom={room}
                        students={listChildrenForClassroom(room.id)}
                        teachers={listTeachersForClassroom(room.id)}
                        onManage={(id) => setSelectedClassroomId(
                          selectedClassroomId === id ? null : id,
                        )}
                      />
                    ))}
                  </div>
                )}

                {selectedOrg?.type === "school" && isSupabaseProviderRequested() && isSupabaseConfigured() && (
                  <SchoolTeacherInvitations key={selectedOrg.id} organizationId={selectedOrg.id} />
                )}
                {/* Classroom panel is rendered as a modal overlay at the page root */}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
    </>
  );
}
