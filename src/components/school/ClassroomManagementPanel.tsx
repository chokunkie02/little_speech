"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SchoolGuardianMembers from "@/components/layout/SchoolGuardianMembers";
import { isSupabaseProviderRequested } from "@/lib/config/storageProvider";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { Classroom, UserDisplayInfo, StudentParentLinkInfo, ParentLinkStatus } from "@/types/school";
import { PARENT_LINK_STATUS_LABELS } from "@/types/school";
import { useSchool } from "@/hooks/useSchool";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  classroom: Classroom;
  onClose: () => void;
}

// ── Icon helpers ──────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// ── Parent link status badge ───────────────────────────────────────────────────

const PARENT_STATUS_CLASSES: Record<ParentLinkStatus, string> = {
  no_parent_email: "bg-border/40 text-text-muted border-border/60",
  missing_invite:  "bg-warning/8 text-warning border-warning/20",
  pending:         "bg-warning/10 text-warning border-warning/20",
  accepted:        "bg-success/10 text-success border-success/20",
  revoked:         "bg-error/8 text-error/70 border-error/20",
};

function ParentStatusBadge({ status }: { status: ParentLinkStatus }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${PARENT_STATUS_CLASSES[status]}`}>
      {PARENT_LINK_STATUS_LABELS[status]}
    </span>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function ClassroomManagementPanel({ classroom, onClose }: Props) {
  const {
    listChildrenForClassroom,
    listTeachersForClassroom,
    assignTeacher,
    removeTeacher,
    addChild,
    removeChild,
    findTeacherByEmail,
    resolveUserDisplays,
    resolveStudentProfiles,
    archiveStudent,
    listStudentParentLinks,
    ensureParentInvitationForChild,
  } = useSchool();
  const { profiles, sharedProfiles } = useChildProfile();
  const { user } = useAuth();

  const students = listChildrenForClassroom(classroom.id);
  const teachers = listTeachersForClassroom(classroom.id);

  // ── Parent link state ─────────────────────────────────────────────────────────
  const [parentLinks, setParentLinks] = useState<StudentParentLinkInfo[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [createInviteBusy, setCreateInviteBusy] = useState<string | null>(null); // childId
  const [guardianRosterId, setGuardianRosterId] = useState<string | null>(null);
  const schoolOnline = isSupabaseProviderRequested() && isSupabaseConfigured();
  const [parentLinkError, setParentLinkError] = useState<string | null>(null);

  // ── Student name resolution ───────────────────────────────────────────────────
  // Primary: resolve directly from child_profiles via school repo (works for imported students)
  // Fallback: in-memory profiles from useChildProfile (works for manually-linked children)
  const [studentNameMap, setStudentNameMap] = useState<Map<string, { name: string; nickname: string | null }>>(new Map());

  const studentIdsKey = students.map((s) => s.childId).sort().join(",");
  useEffect(() => {
    const ids = students.map((s) => s.childId);
    let cancelled = false;
    resolveStudentProfiles(ids)
      .then((m) => { if (!cancelled) setStudentNameMap(m); })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentIdsKey]);

  const refreshParentLinks = useCallback(() => {
    let cancelled = false;
    listStudentParentLinks(classroom.id, classroom.organizationId)
      .then((links) => { if (!cancelled) setParentLinks(links); })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroom.id, classroom.organizationId, studentIdsKey]);

  useEffect(() => {
    return refreshParentLinks();
  }, [refreshParentLinks]);

  // In-memory profile fallback (for local mode / same-user children)
  const allProfiles = [...profiles, ...sharedProfiles];
  const fallbackNameMap = new Map(allProfiles.map((p) => [p.id, p.name]));

  function getStudentDisplay(childId: string): string {
    const resolved = studentNameMap.get(childId);
    if (resolved) {
      return resolved.nickname
        ? `${resolved.name} (${resolved.nickname})`
        : resolved.name;
    }
    return fallbackNameMap.get(childId) ?? childId.slice(0, 8) + "…";
  }

  // ── Teacher display map ───────────────────────────────────────────────────────
  const [teacherDisplays, setTeacherDisplays] = useState<Map<string, UserDisplayInfo>>(new Map());
  const teacherIdsKey = teachers.map((t) => t.teacherUserId).sort().join(",");
  useEffect(() => {
    const ids = teachers.map((t) => t.teacherUserId);
    let cancelled = false;
    resolveUserDisplays(ids)
      .then((m) => { if (!cancelled) setTeacherDisplays(m); })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherIdsKey]);

  // ── Teacher email search form ─────────────────────────────────────────────────
  type SearchState = "idle" | "not-found" | UserDisplayInfo;
  const [teacherEmail, setTeacherEmail] = useState("");
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchBusy, setSearchBusy] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);
  const [teacherError, setTeacherError] = useState("");

  async function handleSearchTeacher(e: React.FormEvent) {
    e.preventDefault();
    const email = teacherEmail.trim();
    if (!email) return;
    setSearchBusy(true);
    setSearchState("idle");
    setTeacherError("");
    try {
      const found = await findTeacherByEmail(email);
      setSearchState(found ?? "not-found");
    } catch {
      setSearchState("not-found");
    } finally {
      setSearchBusy(false);
    }
  }

  async function handleConfirmAddTeacher() {
    if (typeof searchState !== "object") return;
    setAssignBusy(true);
    setTeacherError("");
    try {
      await assignTeacher(classroom.id, searchState.userId);
      setTeacherEmail("");
      setSearchState("idle");
    } catch (err) {
      setTeacherError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setAssignBusy(false);
    }
  }

  async function handleRemoveTeacher(teacherUserId: string) {
    try { await removeTeacher(classroom.id, teacherUserId); } catch { /* silent */ }
  }

  // ── Add student form ──────────────────────────────────────────────────────────
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [childIdInput, setChildIdInput] = useState("");
  const [studentBusy, setStudentBusy] = useState(false);
  const [studentError, setStudentError] = useState("");

  const enrolledIds = new Set(students.map((s) => s.childId));

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    const cid = (selectedProfileId || childIdInput).trim();
    if (!cid) return;
    setStudentBusy(true);
    setStudentError("");
    try {
      await addChild(classroom.id, cid);
      setSelectedProfileId("");
      setChildIdInput("");
    } catch (err) {
      setStudentError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setStudentBusy(false);
    }
  }

  async function handleRemoveStudent(childId: string) {
    try { await removeChild(classroom.id, childId); } catch { /* silent */ }
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/invite/accept?token=${token}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  }

  async function handleCreateParentInvite(info: StudentParentLinkInfo) {
    if (!info.parentEmail || !user) return;
    setCreateInviteBusy(info.childId);
    setParentLinkError(null);
    try {
      await ensureParentInvitationForChild(info.childId, info.parentEmail, user.id, user.email ?? undefined);
      refreshParentLinks();
    } catch (err) {
      setParentLinkError(err instanceof Error ? err.message : "สร้างคำเชิญไม่สำเร็จ");
    } finally {
      setCreateInviteBusy(null);
    }
  }

  const parentLinkMap = new Map(parentLinks.map((l) => [l.childId, l]));

  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState("");

  async function handleArchiveStudent(childId: string) {
    setArchiveBusy(true);
    setArchiveError("");
    try {
      await archiveStudent(childId);
      setConfirmArchiveId(null);
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setArchiveBusy(false);
    }
  }

  const meta = [
    classroom.gradeLevel  ? `ชั้น ${classroom.gradeLevel}`  : null,
    classroom.academicYear ? `ปี ${classroom.academicYear}` : null,
  ].filter(Boolean).join(" · ");

  const isResultFound = typeof searchState === "object";

  return (
    // Modal overlay — fixed position so it's always visible regardless of scroll
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[88vh] flex flex-col bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-text">{classroom.name}</h2>
            {meta && <p className="text-xs text-text-muted mt-0.5">{meta}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-black/5 dark:hover:bg-white/10 transition-all flex-shrink-0 mt-0.5"
          >
            <XIcon />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-7">

          {/* ── Teachers ──────────────────────────────────────────────── */}
          <section>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              ครูผู้สอน ({teachers.length})
            </p>

            {teachers.length > 0 ? (
              <ul className="space-y-2 mb-3">
                {teachers.map((t) => {
                  const display = teacherDisplays.get(t.teacherUserId);
                  return (
                    <li
                      key={t.teacherUserId}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-border"
                    >
                      <div className="min-w-0">
                        {display ? (
                          <span className="text-xs text-text truncate block">{display.email}</span>
                        ) : (
                          <span className="text-xs font-mono text-text-muted truncate block" title={t.teacherUserId}>
                            {t.teacherUserId.slice(0, 8)}…
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveTeacher(t.teacherUserId)}
                        aria-label="ลบครู"
                        className="flex-shrink-0 text-text-muted hover:text-error transition-colors p-1 rounded"
                      >
                        <TrashIcon />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-text-muted italic mb-3">ยังไม่มีครูผู้สอน</p>
            )}

            {/* Email search */}
            <form onSubmit={handleSearchTeacher} className="flex gap-2">
              <input
                type="email"
                value={teacherEmail}
                onChange={(e) => { setTeacherEmail(e.target.value); setSearchState("idle"); setTeacherError(""); }}
                placeholder="ค้นหาครูด้วยอีเมล"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-border bg-surface text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="submit"
                disabled={searchBusy || !teacherEmail.trim()}
                className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-all disabled:opacity-50 flex-shrink-0 flex items-center gap-1"
              >
                <SearchIcon />
                {searchBusy ? "…" : "ค้นหา"}
              </button>
            </form>

            {isResultFound && (
              <div className="mt-2 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-300 truncate">
                    {(searchState as UserDisplayInfo).email}
                  </p>
                  {(searchState as UserDisplayInfo).role && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {(searchState as UserDisplayInfo).role}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleConfirmAddTeacher}
                  disabled={assignBusy}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {assignBusy ? "…" : "เพิ่มครู"}
                </button>
              </div>
            )}

            {searchState === "not-found" && (
              <p className="mt-2 text-xs text-text-muted italic">
                ไม่พบผู้ใช้นี้ในระบบ กรุณาส่งคำเชิญก่อน
              </p>
            )}

            {teacherError && <p className="text-xs text-error mt-1">{teacherError}</p>}
          </section>

          {/* ── Students ──────────────────────────────────────────────── */}
          <section>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              นักเรียน ({students.length})
            </p>

            {parentLinkError && (
              <p className="text-xs text-error mb-2">{parentLinkError}</p>
            )}

            {students.length > 0 ? (
              <ul className="space-y-2 mb-3">
                {students.map((s) => {
                  const parentInfo = parentLinkMap.get(s.childId);
                  const canCreate = parentInfo?.parentLinkStatus === "missing_invite" && parentInfo.parentEmail;
                  const hasToken  = parentInfo?.invitationToken && parentInfo.parentLinkStatus === "pending";

                  return (
                    <li key={s.childId} className="rounded-xl border border-border bg-black/[0.03] dark:bg-white/[0.03] overflow-hidden">
                      {/* Student name row */}
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="text-xs text-text truncate min-w-0">
                          {getStudentDisplay(s.childId)}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleRemoveStudent(s.childId)}
                            className="text-xs text-text-muted hover:text-text transition-colors px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                          >
                            นำออกจากห้อง
                          </button>
                          <button
                            onClick={() => { setConfirmArchiveId(s.childId); setArchiveError(""); }}
                            className="text-xs text-error/70 hover:text-error transition-colors px-2 py-1 rounded-lg hover:bg-error/5"
                          >
                            ลบนักเรียน
                          </button>
                        </div>
                      </div>

                      {/* Parent link row */}
                      {parentInfo && (
                        <div className="px-3 pb-2 border-t border-border/40 pt-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-medium text-text-muted">ผู้ปกครอง</span>
                            <ParentStatusBadge status={parentInfo.parentLinkStatus} />
                            {parentInfo.parentEmail && (
                              <span className="text-[10px] text-text-muted truncate max-w-[120px]">
                                {parentInfo.parentEmail}
                              </span>
                            )}
                            {/* Copy link */}
                            {hasToken && (
                              <button
                                onClick={() => copyInviteLink(parentInfo.invitationToken!)}
                                className="flex items-center gap-0.5 text-[10px] text-primary hover:text-primary/80 transition-colors"
                              >
                                <CopyIcon />
                                {copiedToken === parentInfo.invitationToken ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
                              </button>
                            )}
                            {/* Create invite */}
                            {canCreate && (
                              <button
                                onClick={() => void handleCreateParentInvite(parentInfo)}
                                disabled={createInviteBusy === s.childId}
                                className="flex items-center gap-0.5 text-[10px] text-secondary hover:text-secondary/80 transition-colors disabled:opacity-50"
                              >
                                <LinkIcon />
                                {createInviteBusy === s.childId ? "กำลังสร้าง…" : "สร้างคำเชิญ"}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {schoolOnline && (
                        <div className="space-y-2 border-t border-border/40 px-3 py-2">
                          <button className="text-xs font-semibold text-primary"
                            aria-expanded={guardianRosterId === s.childId}
                            onClick={() => setGuardianRosterId(guardianRosterId === s.childId ? null : s.childId)}>
                            {guardianRosterId === s.childId ? "ซ่อนรายชื่อผู้ปกครอง" : "ดูผู้ปกครองที่เชื่อม"}
                          </button>
                          <Link className="ml-3 text-xs font-semibold text-primary"
                            href={`/report?child=${encodeURIComponent(s.childId)}`}>ดูรายงานความก้าวหน้า</Link>
                          {guardianRosterId === s.childId &&
                            <SchoolGuardianMembers childId={s.childId} mode="staff" onChanged={() => { refreshParentLinks(); }} />}
                        </div>
                      )}

                      {confirmArchiveId === s.childId && (
                        <div className="px-3 pb-3 pt-0 border-t border-border/50 bg-error/5">
                          <p className="text-xs text-text mt-2 mb-2">
                            ต้องการลบนักเรียนคนนี้ออกจากระบบโรงเรียนหรือไม่?{" "}
                            <span className="text-text-muted">ข้อมูลการฝึกจะไม่ถูกลบทันที</span>
                          </p>
                          {archiveError && (
                            <p className="text-xs text-error mb-2">{archiveError}</p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleArchiveStudent(s.childId)}
                              disabled={archiveBusy}
                              className="px-3 py-1.5 rounded-lg bg-error text-white text-xs font-semibold hover:bg-error/90 transition-all disabled:opacity-50"
                            >
                              {archiveBusy ? "กำลังลบ…" : "ยืนยันลบ"}
                            </button>
                            <button
                              onClick={() => { setConfirmArchiveId(null); setArchiveError(""); }}
                              disabled={archiveBusy}
                              className="px-3 py-1.5 rounded-lg border border-border text-text-muted text-xs hover:text-text hover:bg-black/5 dark:hover:bg-white/10 transition-all disabled:opacity-50"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-text-muted italic mb-3">ยังไม่มีนักเรียน</p>
            )}

            <form onSubmit={handleAddStudent} className="space-y-2">
              {allProfiles.length > 0 && (
                <select
                  value={selectedProfileId}
                  onChange={(e) => { setSelectedProfileId(e.target.value); setChildIdInput(""); }}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">— เลือกเด็กจากโปรไฟล์ —</option>
                  {allProfiles.map((p) => (
                    <option key={p.id} value={p.id} disabled={enrolledIds.has(p.id)}>
                      {p.name}{enrolledIds.has(p.id) ? " (อยู่แล้ว)" : ""}
                    </option>
                  ))}
                </select>
              )}

              {!selectedProfileId && (
                <input
                  type="text"
                  value={childIdInput}
                  onChange={(e) => setChildIdInput(e.target.value)}
                  placeholder={allProfiles.length > 0 ? "หรือใส่ Child ID โดยตรง" : "Child ID ของนักเรียน (UUID)"}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              )}

              <button
                type="submit"
                disabled={studentBusy || !(selectedProfileId || childIdInput.trim())}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-white text-xs font-semibold hover:bg-secondary/90 transition-all disabled:opacity-50"
              >
                {studentBusy ? "กำลังเพิ่ม…" : "เพิ่มนักเรียน"}
              </button>
            </form>
            {studentError && <p className="text-xs text-error mt-1">{studentError}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
