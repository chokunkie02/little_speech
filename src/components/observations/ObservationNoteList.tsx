"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { ObservationNote, ObservationCategory, ObservationTargetType } from "@/types/observations";
import { CATEGORY_META } from "@/types/observations";
import ObservationNoteCard from "./ObservationNoteCard";
import ObservationNoteForm from "./ObservationNoteForm";

interface Props {
  notes: ObservationNote[];
  onAdd: (data: { targetType: ObservationTargetType; targetId?: string; category: ObservationCategory; title: string; content: string }) => void;
  onEdit: (id: string, changes: { title: string; content: string; category: ObservationCategory }) => void;
  onDelete: (id: string) => void;
  targetType?: ObservationTargetType;
  targetId?: string;
  maxVisible?: number;
}

const ALL_CATEGORIES: ObservationCategory[] = ["pronunciation", "attention", "progress", "recommendation", "other"];

export default function ObservationNoteList({ notes, onAdd, onEdit, onDelete, targetType = "general", targetId, maxVisible = 8 }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ObservationCategory | "all">("all");
  const [showAll, setShowAll] = useState(false);

  const filteredNotes = activeFilter === "all"
    ? notes
    : notes.filter((n) => n.category === activeFilter);

  const sorted = [...filteredNotes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const visible = showAll ? sorted : sorted.slice(0, maxVisible);
  const hasMore = sorted.length > maxVisible && !showAll;

  const usedCategories = [...new Set(notes.map((n) => n.category))];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-text">บันทึกของผู้ปกครอง / ครู</h3>
          {notes.length > 0 && (
            <p className="text-xs text-text-muted mt-0.5">{notes.length} บันทึก</p>
          )}
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-xl hover:bg-primary/8 transition-all"
          >
            <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
            เพิ่มบันทึก
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <ObservationNoteForm
          targetType={targetType}
          targetId={targetId}
          onSave={(data) => {
            onAdd(data);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Category filter — only show when there are 2+ categories */}
      {usedCategories.length >= 2 && !showForm && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
              activeFilter === "all"
                ? "bg-text text-surface border-text"
                : "bg-transparent text-text-muted border-border hover:border-text-muted"
            }`}
          >
            ทั้งหมด ({notes.length})
          </button>
          {ALL_CATEGORIES.filter((c) => usedCategories.includes(c)).map((cat) => {
            const meta = CATEGORY_META[cat];
            const count = notes.filter((n) => n.category === cat).length;
            const active = activeFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveFilter(cat)}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={{
                  backgroundColor: active ? meta.color : "transparent",
                  color: active ? "#fff" : meta.color,
                  border: `1.5px solid ${meta.color}`,
                  opacity: active ? 1 : 0.65,
                }}
              >
                {meta.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 && !showForm ? (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
          <p className="text-sm font-semibold text-text-muted mb-1">ยังไม่มีบันทึก</p>
          <p className="text-xs text-text-muted/70 mb-4">
            บันทึกสิ่งที่สังเกตได้ระหว่างการฝึก เพื่อติดตามพัฒนาการของเด็ก
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            + เพิ่มบันทึกแรก
          </button>
        </div>
      ) : filteredNotes.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-4">ไม่มีบันทึกในหมวดหมู่นี้</p>
      ) : (
        <div className="space-y-3">
          {visible.map((note) => (
            <ObservationNoteCard
              key={note.id}
              note={note}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full text-xs font-semibold text-text-muted py-2.5 rounded-xl border border-dashed border-border hover:border-primary/30 hover:text-primary transition-all"
            >
              แสดงเพิ่มเติม ({sorted.length - maxVisible} บันทึก)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
