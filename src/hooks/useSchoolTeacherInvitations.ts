"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { SchoolTeacherInvitation } from "@/types/school";

export function useSchoolTeacherInvitations(organizationId: string | null) {
  const [result, setResult] = useState<{ id: string; rows: SchoolTeacherInvitation[]; failed: boolean }>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!organizationId || !client) return;
    const id = organizationId;
    const supabase = client;
    let active = true;
    let generation = 0;
    async function load() {
      const request = ++generation;
      const { data, error } = await supabase.rpc("list_school_teacher_invitations", { p_organization_id: id });
      if (active && request === generation) {
        setResult({ id, rows: data ?? [], failed: !!error });
      }
    }

    void load();
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
    };
  }, [organizationId, revision]);

  const current = result?.id === organizationId ? result : undefined;
  return { current, reload: () => setRevision((value) => value + 1) };
}
