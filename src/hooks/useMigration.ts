"use client";

import { useState, useCallback, useMemo } from "react";
import { useIsClient } from "@/hooks/useIsClient";
import {
  migrateToSupabase,
  getMigrationFlag,
  type MigrationState,
  type MigrationProgress,
  type MigrationFlag,
} from "@/lib/sync/migrateToSupabase";
import { useAuth } from "@/hooks/useAuth";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseMigrationReturn {
  migrationState: MigrationState;
  migrationProgress: MigrationProgress;
  previousMigration: MigrationFlag | null;
  startMigration: () => Promise<void>;
}

const INITIAL_PROGRESS: MigrationProgress = {
  state: "idle",
  currentDomain: null,
  completedDomains: [],
  totalRecords: 0,
  uploadedRecords: 0,
  errorMessage: null,
  completedAt: null,
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMigration(): UseMigrationReturn {
  const { user } = useAuth();
  const [migrationState, setMigrationState] = useState<MigrationState>("idle");
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress>(INITIAL_PROGRESS);
  const isClient = useIsClient();
  const finished = migrationState === "success";

  // localStorage flag: read on the client only (SSR-safe), and again once a migration succeeds.
  const previousMigration = useMemo<MigrationFlag | null>(
    () => (isClient || finished ? getMigrationFlag() : null),
    [isClient, finished],
  );

  const startMigration = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;
    if (migrationState !== "idle") return;

    const handleProgress = (p: MigrationProgress) => {
      setMigrationState(p.state);
      setMigrationProgress(p);
    };

    // Kick off with "checking" immediately
    handleProgress({ ...INITIAL_PROGRESS, state: "checking" });

    await migrateToSupabase(userId, handleProgress);
  }, [user, migrationState]);

  return { migrationState, migrationProgress, previousMigration, startMigration };
}
