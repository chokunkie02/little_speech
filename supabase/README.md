# Supabase — Speech Adventure

Backend foundation for migrating from localStorage to Supabase PostgreSQL.

## Current Status

The app defaults to localStorage. A configured Supabase project provides sign-in,
school and guardian access, shared progress, and platform usage reporting.
The school and shared progress flows also require the Supabase storage provider.

---

## Directory Structure

```
supabase/
├── migrations/
│   ├── 20260520_001_initial_schema.sql    — Enums, tables, indexes, constraints
│   ├── 20260520_002_rls_policies.sql      — RLS enabled + owner-only policies
│   ├── 20260520_003_views.sql             — child_stage_status, child_session_summary
│   ├── 20260520_004_helper_functions.sql  — is_own_child(), handle_updated_at() trigger
│   ├── 20260520_005_rls_observation_fix.sql — Fixes observation_notes RLS (child ownership)
│   └── 20260520_006_storage.sql           — audio-recordings bucket + storage RLS
├── seed/
│   └── seed.sql                           — Dev-only test data (all commented out by default)
└── README.md                              — This file
```

---

## Migration Order

Migrations **must** be applied in numeric order:

```
001 → 002 → 003 → 004 → 005 → 006
```

| File | What it does | Depends on |
|---|---|---|
| `001_initial_schema` | Creates all 4 tables, enums, indexes | — |
| `002_rls_policies` | Enables RLS + baseline owner-only policies | 001 |
| `003_views` | `child_stage_status`, `child_session_summary` views | 001 |
| `004_helper_functions` | `is_own_child()` function + `updated_at` triggers | 001, 002 |
| `005_rls_observation_fix` | Patches observation_notes to verify child ownership | 002, 004 |
| `006_storage` | Creates `audio-recordings` private bucket + storage RLS | 001, 004 |

---

## Setup

The platform usage dashboard needs the migrations through
`20261109000200_platform_usage.sql`. Apply pending migrations to the same Supabase
project configured for the app. The existing URL and public key are sufficient
for the web app. Run the database update using an account with project access.
Usage starts accumulating after the migration and app release.

### 1. Create a Supabase project

Go to [https://supabase.com](https://supabase.com) and create a new project.

### 2. Configure env vars

```bash
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# from your project: Settings → API
```

### 3. Run migrations

**Option A — Supabase CLI (recommended)**

```bash
# Link to your project
npx supabase link --project-ref <your-project-ref>

# Apply all pending migrations
npx supabase db push

# Or reset to a clean state (drops + re-applies everything + seed)
npx supabase db reset
```

**Option B — Supabase Dashboard SQL Editor**

Paste each pending file in filename order into the SQL editor at
`https://supabase.com/dashboard/project/<ref>/sql`.

### 4. Regenerate TypeScript types (after schema changes)

```bash
npx supabase gen types typescript --project-id <your-project-ref> \
  > src/types/supabase.ts
```

The generated file replaces the hand-written placeholder in `src/types/supabase.ts`.

---

## Schema Overview

### Tables

| Table | localStorage key | Description |
|---|---|---|
| `child_profiles` | `speech-adventure-profile-v1` | One profile per authenticated user (MVP) |
| `practice_sessions` | `speech-adventure-progress-v1` → sessions | Practice session lifecycle (active → completed/abandoned) |
| `practice_attempts` | `speech-adventure-progress-v1` → attempts | Individual scored attempts |
| `observation_notes` | `speech-adventure-observations-v1` | Therapist / parent notes |

### Views

| View | Purpose |
|---|---|
| `child_stage_status` | Per-child, per-stage attempt aggregates (count, best score, is_passed) |
| `child_session_summary` | Per-child session totals and average score |

### Helper Functions

#### `is_own_child(p_child_id uuid) → boolean`

Returns `true` when `p_child_id` is a child profile that belongs to `auth.uid()`.

- `SECURITY DEFINER` — reads `child_profiles` bypassing RLS for the lookup
- `STABLE` — evaluated once per row by the query planner
- `set search_path = public` — prevents search_path injection
- Used by RLS policies on `practice_sessions`, `practice_attempts`, and `observation_notes`

```sql
-- Example: "can the current user access this session?"
select is_own_child('550e8400-e29b-41d4-a716-446655440000');
```

---

## RLS Summary

All tables have Row Level Security enabled. The core isolation rule:

```
auth.uid()  →  child_profiles.user_id  →  child_id (FK on all child tables)
```

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `child_profiles` | own `user_id` | own `user_id` | own `user_id` | own `user_id` |
| `practice_sessions` | `is_own_child(child_id)` | `is_own_child(child_id)` | `is_own_child(child_id)` | `is_own_child(child_id)` |
| `practice_attempts` | `is_own_child(child_id)` | `is_own_child(child_id)` | `is_own_child(child_id)` | `is_own_child(child_id)` |
| `observation_notes` | `is_own_child(child_id)` | child + `author_id` | child + `author_id` | child + `author_id` |

> **Note on observation_notes:** Migration 005 corrects the Phase 23 policy that only
> checked `author_id`. Any user could previously create notes on any child — 005 fixes this.

---

## Supabase Storage

### `audio-recordings` (private bucket)

Created by migration 006. Stays empty until Phase 5 (audio upload feature).

```
audio-recordings/
└── {child_id}/          ← enforced by storage RLS (must be own child)
    └── {attempt_id}.webm
```

| Setting | Value |
|---|---|
| Public | `false` (signed URLs only) |
| Max file size | 10 MB |
| Allowed types | `audio/webm`, `audio/ogg`, `audio/mp4`, `audio/mpeg`, `audio/wav` |
| Owner download | Yes (RLS: first folder = own child_id) |
| Owner upload | Yes (RLS: first folder = own child_id) |
| Client delete | Yes (RLS: same constraint) |
| Service-role delete | Always (bypass RLS — for retention cleanup jobs) |

Referenced by `practice_attempts.audio_path` column (nullable until Phase 5).

---

## Activating Supabase as the Storage Provider (Phase 26+)

1. Complete setup steps 1–4 above
2. Implement the repository classes in `src/lib/storage/supabase/`:
   - `SupabaseProgressRepository.ts` — remove the `throw new Error(...)` stub
   - `SupabaseProfileRepository.ts` — remove the `throw new Error(...)` stub
   - `SupabaseObservationRepository.ts` — remove the `throw new Error(...)` stub
3. In `src/app/layout.tsx`, detect `NEXT_PUBLIC_STORAGE_BACKEND === "supabase"`
   and pass the Supabase repositories as `overrides` to `<RepositoryProvider>`
4. Set `NEXT_PUBLIC_STORAGE_BACKEND=supabase` in `.env.local`
5. The localStorage repositories remain untouched — not injected when Supabase is active

---

## localStorage → Supabase Field Mapping

| localStorage key | Supabase table | Notes |
|---|---|---|
| `speech-adventure-profile-v1` | `child_profiles` | Add `user_id` from auth |
| `speech-adventure-progress-v1` → sessions | `practice_sessions` | Drop `attemptIds[]` — use JOIN |
| `speech-adventure-progress-v1` → attempts | `practice_attempts` | `target_id` stays as text during migration |
| `speech-adventure-observations-v1` | `observation_notes` | `target_id` migrates from string → uuid |
| `speech-adventure-selected-sound-v1` | `child_profiles.selected_sound_id` | Merged into profile row |

See `docs/architecture/database-schema.md` for full column-level mapping.

---

## RLS Testing

RLS policies must be tested with the **anon key** (not service_role) to activate them.

```bash
# Run integration tests against local Supabase
npx supabase start           # starts local Supabase stack
npx supabase db reset        # clean slate with seed data
# ... run your test suite ...
npx supabase stop
```

See `docs/architecture/rls-strategy.md` for the full test checklist.
