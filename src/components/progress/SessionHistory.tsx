"use client";

import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { Badge, EmptyState, FilterBar, Pagination, ResponsiveDataView, type DataColumn } from "@/components/ui";
import { formatThaiDate } from "@/lib/thaiDate";
import { TRACK_LABELS, TRACK_ORDER, type LearningResult } from "@/lib/learning/results";

const PAGE_SIZE = 15;

function choiceText(result: LearningResult) {
  return result.choiceCount ? `${result.correctChoices}/${result.choiceCount}` : "—";
}

const columns: DataColumn<LearningResult>[] = [
  { key: "date", header: "วันที่", cell: (row) => <span className="whitespace-nowrap">{formatThaiDate(row.completedAt, "datetime")}</span> },
  { key: "stage", header: "ช่วงที่ฝึก", hideOnMobile: true, cell: (row) => <span className="font-medium text-text">{row.stageLabel}</span> },
  { key: "track", header: "แนวทาง", cell: (row) => TRACK_LABELS[row.track] },
  { key: "sound", header: "เสียง", cell: (row) => row.sound },
  { key: "activities", header: "กิจกรรม", align: "right", cell: (row) => <span className="tabular-nums">{row.activities}</span> },
  { key: "choices", header: "เลือกตรงเสียง", align: "right", cell: (row) => <span className="tabular-nums">{choiceText(row)}</span> },
];

export function SessionHistory({ results }: { results: LearningResult[] }) {
  const [track, setTrack] = useState("");
  const [sound, setSound] = useState("");
  const [page, setPage] = useState(1);

  const sounds = useMemo(() => [...new Set(results.map((result) => result.sound))].sort((a, b) => a.localeCompare(b, "th")), [results]);
  const tracks = useMemo(() => TRACK_ORDER.filter((key) => results.some((result) => result.track === key)), [results]);
  const filtered = results.filter((result) => (!track || result.track === track) && (!sound || result.sound === sound));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!results.length) {
    return <EmptyState icon={<History size={22} />} title="ยังไม่มีรอบที่ฝึกจบ" description="รอบที่ฝึกจบในห้องฝึกจะแสดงที่นี่" />;
  }

  return (
    <div className="space-y-3">
      <FilterBar
        filters={[
          { key: "track", label: "ทุกแนวทาง", value: track, onChange: (value) => { setTrack(value); setPage(1); },
            options: tracks.map((key) => ({ value: key, label: TRACK_LABELS[key] })) },
          { key: "sound", label: "ทุกเสียง", value: sound, onChange: (value) => { setSound(value); setPage(1); },
            options: sounds.map((key) => ({ value: key, label: `เสียง ${key}` })) },
        ]}
        onClear={() => { setTrack(""); setSound(""); setPage(1); }}
        resultText={`${filtered.length} รอบ`} />
      <ResponsiveDataView rows={rows} columns={columns} rowKey={(row) => row.id} caption="รอบที่ฝึกจบ"
        mobileTitle={(row) => row.stageLabel}
        mobileAside={(row) => row.savedTo === "device" ? <Badge tone="warning">ยังอยู่ในเครื่องนี้</Badge> : null}
        empty={<p className="py-6 text-center text-sm text-text-muted">ไม่มีรอบที่ตรงกับตัวกรอง</p>} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
    </div>
  );
}
