"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChartColumn, FileText, NotebookPen, Play } from "lucide-react";
import ObservationNoteList from "@/components/observations/ObservationNoteList";
import SchoolObservations from "@/components/observations/SchoolObservations";
import { Alert, ButtonLink, DataLoadError, EmptyState, LoadingState, Page, PageHeader, Tabs } from "@/components/ui";
import { useObservationNotes } from "@/hooks/useObservationNotes";
import { useLearningResults } from "@/hooks/useLearningResults";
import { summarize } from "@/lib/learning/results";
import { ProgressOverview } from "./ProgressOverview";
import { SessionHistory } from "./SessionHistory";

type Tab = "overview" | "history" | "notes";

function FamilyNotes() {
  const { notes, addNote, updateNote, deleteNote } = useObservationNotes();
  return <ObservationNoteList notes={notes} onAdd={addNote} onEdit={updateNote} onDelete={deleteNote} />;
}

export type ProgressViewProps = {
  childId: string;
  childName: string;
  /** family = the selected child in this account; school = a student opened by staff or a guardian. */
  mode: "family" | "school";
  teacher?: boolean;
  viewerId?: string;
  canPractice?: boolean;
  back?: { href: string; label: string };
  reportHref: string;
  /** Folded "old practice" section for this child, rendered under the history list. */
  legacy?: ReactNode;
};

export function ProgressView({ childId, childName, mode, teacher = false, viewerId, canPractice, back, reportHref, legacy }: ProgressViewProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const { results, status, online, retry } = useLearningResults(childId);
  const summary = useMemo(() => summarize(results), [results]);
  const deviceOnly = results.filter((result) => result.savedTo === "device").length;

  return (
    <Page>
      <PageHeader back={back} icon={<ChartColumn size={20} />} title="ความก้าวหน้า"
        description={childName}
        actions={<>
          <ButtonLink href={reportHref} variant="outline" icon={<FileText size={16} aria-hidden="true" />}>รายงาน</ButtonLink>
          {canPractice && <ButtonLink href="/training" icon={<Play size={16} className="fill-current" aria-hidden="true" />}>ไปฝึก</ButtonLink>}
        </>} />

      {status === "error" && <DataLoadError message="โหลดผลฝึกจากระบบไม่สำเร็จ" detail="ที่แสดงอยู่คือผลที่เก็บในเครื่องนี้" onRetry={retry} />}
      {online && deviceOnly > 0 && status !== "error" && (
        <Alert tone="info">มี {deviceOnly} รอบที่ยังอยู่ในเครื่องนี้ เปิดห้องฝึกอีกครั้งเพื่อส่งผลเข้าระบบ</Alert>
      )}

      <Tabs label="มุมมองความก้าวหน้า" value={tab} onValueChange={setTab}
        items={[
          { value: "overview", label: "ภาพรวม" },
          { value: "history", label: "ประวัติการฝึก", count: results.length || undefined },
          { value: "notes", label: "บันทึกของผู้ใหญ่" },
        ]}>
        {tab === "overview" && (
          status === "loading" && !results.length ? <LoadingState variant="stats" rows={4} />
            : !results.length ? (
              <div className="space-y-5">
                <EmptyState icon={<ChartColumn size={22} />} title="ยังไม่มีรอบที่ฝึกจบ"
                  description={canPractice ? "ฝึกจบรอบแรกในห้องฝึก แล้วกลับมาดูภาพรวมที่นี่" : "เมื่อเด็กฝึกจบรอบแรก ภาพรวมจะแสดงที่นี่"}
                  action={canPractice && <ButtonLink href="/training">เริ่มฝึก</ButtonLink>} />
                {legacy}
              </div>
            ) : <ProgressOverview summary={summary} />
        )}
        {tab === "history" && (
          <div className="space-y-5">
            {status === "loading" && !results.length ? <LoadingState variant="table" rows={5} /> : <SessionHistory results={results} />}
            {legacy}
          </div>
        )}
        {tab === "notes" && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <NotebookPen size={16} aria-hidden="true" />
              {mode === "school" ? "ข้อสังเกตที่ครูและผู้ปกครองบันทึกไว้" : "สิ่งที่สังเกตเห็นระหว่างฝึก เก็บไว้ดูพัฒนาการ"}
            </p>
            {mode === "school" && viewerId ? <SchoolObservations childId={childId} teacher={teacher} viewerId={viewerId} /> : <FamilyNotes />}
          </div>
        )}
      </Tabs>
    </Page>
  );
}
