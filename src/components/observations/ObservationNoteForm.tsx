"use client";

import { useState } from "react";
import type { ObservationNote, ObservationCategory, ObservationTargetType } from "@/types/observations";
import { CATEGORY_META } from "@/types/observations";

interface Props {
  targetType?: ObservationTargetType;
  targetId?: string;
  initialData?: Pick<ObservationNote, "category" | "title" | "content">;
  onSave: (data: { targetType: ObservationTargetType; targetId?: string; category: ObservationCategory; title: string; content: string }) => void;
  onCancel: () => void;
  compact?: boolean;
  busy?: boolean;
  maxContentLength?: number;
}

const CATEGORIES: ObservationCategory[] = ["pronunciation", "attention", "progress", "recommendation", "other"];

export default function ObservationNoteForm({ targetType = "general", targetId, initialData, onSave, onCancel, compact = false, busy = false, maxContentLength }: Props) {
  const [category, setCategory] = useState<ObservationCategory>(initialData?.category ?? "progress");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!title.trim()) { setError("กรุณาใส่หัวข้อบันทึก"); return; }
    if (!content.trim() || content.trim().length < 5) { setError("กรุณาเขียนเนื้อหาอย่างน้อย 5 ตัวอักษร"); return; }
    setError("");
    onSave({ targetType, targetId, category, title: title.trim(), content: content.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${compact ? "" : "p-4 bg-bg dark:bg-white/3 border border-border rounded-xl"}`}>

      {/* Category pills */}
      <div>
        <p className="text-xs font-semibold text-text-muted mb-2">หมวดหมู่</p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={{
                  backgroundColor: active ? meta.color : "transparent",
                  color: active ? "#fff" : meta.color,
                  border: `1.5px solid ${meta.color}`,
                  opacity: active ? 1 : 0.6,
                }}
                aria-pressed={active}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs font-semibold text-text-muted block mb-1" htmlFor="obs-title">
          หัวข้อ
        </label>
        <input
          id="obs-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="เช่น สังเกตการออกเสียงวันนี้"
          className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
        />
      </div>

      {/* Content */}
      <div>
        <label className="text-xs font-semibold text-text-muted block mb-1" htmlFor="obs-content">
          บันทึก
        </label>
        <textarea
          id="obs-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={compact ? 3 : 4}
          maxLength={maxContentLength}
          placeholder="เขียนสิ่งที่สังเกตได้หรือคำแนะนำสำหรับเด็ก..."
          className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all resize-none leading-relaxed"
        />
      </div>

      {error && (
        <p className="text-xs text-error">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="px-4 py-2 rounded-xl text-sm font-medium text-text-muted border border-border hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={busy}
          className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all active:scale-[0.97]"
        >
          {busy ? "กำลังบันทึก…" : "บันทึก"}
        </button>
      </div>
    </form>
  );
}
