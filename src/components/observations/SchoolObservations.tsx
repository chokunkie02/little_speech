"use client";

import { useEffect, useState } from "react";
import ObservationNoteForm from "@/components/observations/ObservationNoteForm";
import { getSupabaseClient } from "@/lib/supabase/client";
import { CATEGORY_META } from "@/types/observations";
import type { DbObservationNote } from "@/types/database";

type Note = Pick<DbObservationNote, "id" | "author_id" | "teacher_visibility" | "category" | "title" | "content" | "created_at">;

const noteDate = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" });

export default function SchoolObservations({
  childId, teacher, viewerId,
}: {
  childId: string;
  teacher: boolean;
  viewerId: string;
}) {
  const [notes, setNotes] = useState<Note[]>();
  const [revision, setRevision] = useState(0);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const client = getSupabaseClient();
    let active = true;
    let generation = 0;

    async function load() {
      const request = ++generation;
      const response = await client?.from("observation_notes")
        .select("id,author_id,teacher_visibility,category,title,content,created_at")
        .eq("child_id", childId)
        .not("teacher_visibility", "is", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
      if (!active || request !== generation) return;
      setLoadError(!response || !!response.error);
      setNotes(response?.data ?? []);
    }

    void load();
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
    };
  }, [childId, revision]);

  async function save(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกการเปลี่ยนแปลงไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">ข้อสังเกตครู</h2>
        {teacher && !adding && (
          <button type="button" className="rounded-xl border border-primary/30 px-3 py-1.5 text-sm font-semibold text-primary"
            onClick={() => setAdding(true)}>เพิ่มบันทึก</button>
        )}
      </div>
      {adding && teacher && (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">บันทึกใหม่เป็นส่วนตัว คุณเลือกแชร์ให้ผู้ปกครองที่เชื่อมอยู่ได้หลังบันทึก</p>
          <ObservationNoteForm busy={busy} maxContentLength={4000} onCancel={() => setAdding(false)}
            onSave={(note) => {
              void save(async () => {
                const client = getSupabaseClient();
                if (!client) throw new Error("เชื่อมต่อระบบไม่สำเร็จ");
                const { error } = await client.rpc("create_school_observation", {
                  p_child_id: childId, p_category: note.category, p_title: note.title, p_content: note.content,
                });
                if (error) throw new Error(error.message);
                setAdding(false);
              });
            }} />
        </div>
      )}
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      {loadError ? (
        <div className="flex gap-2 text-sm">
          <p role="alert" className="text-error">โหลดบันทึกไม่สำเร็จ</p>
          <button type="button" className="font-semibold text-primary"
            onClick={() => setRevision((value) => value + 1)}>ลองใหม่</button>
        </div>
      ) : !notes ? (
        <p role="status" className="text-sm text-text-muted">กำลังโหลดบันทึก…</p>
      ) : !notes.length ? (
        <p className="text-sm text-text-muted">{teacher ? "ยังไม่มีข้อสังเกต" : "ยังไม่มีข้อสังเกตที่ครูแชร์"}</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => {
            const shared = note.teacher_visibility === "shared";
            return (
              <li key={note.id} className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <span>{CATEGORY_META[note.category].label}</span>
                  <span>· {noteDate.format(new Date(note.created_at))}</span>
                  {teacher && <span className="rounded-full bg-bg px-2 py-0.5">{shared ? "แชร์แล้ว" : "ส่วนตัว"}</span>}
                </div>
                <p className="break-words text-sm font-semibold">{note.title}</p>
                <p className="whitespace-pre-wrap break-words text-sm text-text-muted">{note.content}</p>
                {teacher && note.author_id === viewerId && (
                  <button type="button" disabled={busy} className="text-sm font-semibold text-primary disabled:opacity-50"
                    onClick={() => void save(async () => {
                      const client = getSupabaseClient();
                      if (!client) throw new Error("เชื่อมต่อระบบไม่สำเร็จ");
                      const { error } = await client.rpc("set_school_observation_sharing", {
                        p_note_id: note.id, p_shared: !shared,
                      });
                      if (error) throw new Error(error.message);
                      setNotes((previous) => previous?.map((row) => row.id === note.id
                        ? { ...row, teacher_visibility: shared ? "private" : "shared" } : row));
                    })}>{shared ? "ยกเลิกการแชร์" : "แชร์ให้ผู้ปกครอง"}</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
