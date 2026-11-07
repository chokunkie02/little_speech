"use client";

import { useEffect, useState } from "react";
import { downloadSchoolAttemptAudio } from "@/lib/storage/supabase/audioStorage";

export default function SchoolAttemptAudio({ attemptId }: { attemptId: string }) {
  const [source, setSource] = useState<string | null>();
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;

    async function load() {
      try {
        const audio = await downloadSchoolAttemptAudio(attemptId, controller.signal);
        if (controller.signal.aborted) return;
        if (!audio) {
          setSource(null);
          return;
        }
        objectUrl = URL.createObjectURL(audio);
        setSource(objectUrl);
      } catch {
        if (!controller.signal.aborted) setSource(null);
      }
    }

    void load();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attemptId, retry]);

  return (
    <div className="mt-2 rounded-xl border border-border bg-bg p-3">
      {source === undefined ? (
        <p role="status" className="text-sm text-text-muted">กำลังโหลดเสียง…</p>
      ) : source === null ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <p role="alert" className="text-text-muted">เปิดเสียงบันทึกไม่ได้</p>
          <button type="button" className="font-semibold text-primary"
            onClick={() => { setSource(undefined); setRetry((value) => value + 1); }}>ลองใหม่</button>
        </div>
      ) : (
        <audio aria-label="เสียงที่บันทึก" className="w-full max-w-md" controls src={source}
          onError={() => setSource(null)} />
      )}
    </div>
  );
}
