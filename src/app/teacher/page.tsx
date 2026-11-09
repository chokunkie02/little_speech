"use client";

import GuardianLinkSection from "@/components/teacher/GuardianLinkSection";
import AppShell from "@/components/layout/AppShell";
import TeacherChildProgressCard from "@/components/teacher/TeacherChildProgressCard";
import { useTeacherChildren } from "@/hooks/useTeacherChildren";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useSpeechProgress } from "@/hooks/useSpeechProgress";
import { useSchool } from "@/hooks/useSchool";
import { useAuth } from "@/hooks/useAuth";

function GraduationCapIcon({ size = 20 }: { size?: number }) {
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
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function InfoIcon({ size = 16 }: { size?: number }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

function isNeedsPractice(lastActivityAt: string | null, totalAttempts: number): boolean {
  return (
    totalAttempts === 0 ||
    (lastActivityAt !== null &&
      Date.now() - new Date(lastActivityAt).getTime() > 7 * 86400000)
  );
}

function ClassroomBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-secondary/10 text-secondary text-xs font-medium">
      {name}
    </span>
  );
}

export default function TeacherDashboardPage() {
  const { children, isHydrated } = useTeacherChildren();
  const { selectChild } = useChildProfile();
  const { switchChildProgress } = useSpeechProgress();
  const { user } = useAuth();
  const { listClassroomsForTeacher, listChildrenForClassroom } = useSchool();

  const myClassrooms = user ? listClassroomsForTeacher(user.id) : [];

  const needsPracticeCount = isHydrated
    ? children.filter((c) =>
        isNeedsPractice(c.lastActivityAt, c.progressSummary.totalAttempts),
      ).length
    : 0;

  const totalAttempts = isHydrated
    ? children.reduce((sum, c) => sum + c.progressSummary.totalAttempts, 0)
    : 0;

  const hasViewOnlyChildren = isHydrated
    ? children.some((c) => !c.grant.permissions.canStartPractice)
    : false;

  function handleSelectChild(childId: string) {
    selectChild(childId);
    switchChildProgress(childId);
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
            <GraduationCapIcon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text">แดชบอร์ดครู</h1>
            <p className="text-sm text-text-muted mt-0.5">ภาพรวมเด็กที่ได้รับมอบหมาย</p>
          </div>
        </div>

        {/* Classroom grouping section */}
        {myClassrooms.length > 0 && (
          <section aria-label="ห้องเรียนของฉัน">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              ห้องเรียนของฉัน
            </p>
            <div className="space-y-3">
              {myClassrooms.map((room) => {
                const roomStudentIds = new Set(
                  listChildrenForClassroom(room.id).map((s) => s.childId),
                );
                const roomChildren = children.filter((c) =>
                  roomStudentIds.has(c.child.id),
                );
                return (
                  <div key={room.id} className="bg-surface border border-border rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ClassroomBadge name={room.name} />
                      {room.gradeLevel && (
                        <span className="text-xs text-text-muted">ชั้น {room.gradeLevel}</span>
                      )}
                      {room.academicYear && (
                        <span className="text-xs text-text-muted">ปี {room.academicYear}</span>
                      )}
                      <span className="ml-auto text-xs text-text-muted">
                        {roomStudentIds.size} เด็ก
                      </span>
                    </div>
                    {roomChildren.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {roomChildren.map((c) => (
                          <button
                            key={c.grant.id}
                            onClick={() => handleSelectChild(c.child.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/8 hover:bg-primary/15 text-primary text-xs font-medium transition-colors"
                          >
                            {c.child.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <GuardianLinkSection key={`${user?.id}:${room.id}`} classroomId={room.id} classroomName={room.name} />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Summary stats — only when there are children */}
        {isHydrated && children.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary leading-none">{children.length}</p>
              <p className="text-xs text-text-muted mt-1.5">เด็กทั้งหมด</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-secondary leading-none">{needsPracticeCount}</p>
              <p className="text-xs text-text-muted mt-1.5">ควรฝึกเพิ่ม</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-info leading-none">{totalAttempts}</p>
              <p className="text-xs text-text-muted mt-1.5">ฝึกรวม (ครั้ง)</p>
            </div>
          </div>
        )}

        {/* Children grid */}
        {(myClassrooms.length === 0 || children.length > 0) && (
          <section aria-label="รายชื่อเด็กที่ได้รับมอบหมาย">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              เด็กที่ได้รับมอบหมาย
            </p>

            {!isHydrated ? (
              /* Skeleton while hydrating */
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="bg-surface border border-border rounded-2xl p-5 h-52 animate-pulse"
                    aria-hidden="true"
                  />
                ))}
              </div>
            ) : children.length === 0 ? (
              <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                  <GraduationCapIcon size={19} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-text">ยังไม่มีห้องเรียนหรือนักเรียนที่ได้รับมอบหมาย</h2>
                  <p className="mt-1 text-xs text-text-muted">ให้ผู้ดูแลโรงเรียนจัดคุณเข้าห้องเรียนก่อน แล้วจึงเพิ่มนักเรียนและเชื่อมผู้ปกครองได้</p>
                </div>
              </div>
            ) : (
              /* Children cards */
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {children.map((data) => (
                  <TeacherChildProgressCard
                    key={data.grant.id}
                    data={data}
                    onSelect={handleSelectChild}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Permission notice for view-only children */}
        {hasViewOnlyChildren && (
          <div className="bg-info/8 border border-info/20 rounded-xl px-4 py-3 flex items-start gap-3 text-info">
            <span className="flex-shrink-0 mt-0.5">
              <InfoIcon size={16} />
            </span>
            <p className="text-sm text-text">
              บางเด็กมีสิทธิ์เพียง &ldquo;ดูความก้าวหน้า&rdquo; ไม่สามารถเริ่มฝึกได้
              กรุณาติดต่อผู้ปกครองเพื่อขยายสิทธิ์
            </p>
          </div>
        )}

      </div>
    </AppShell>
  );
}
