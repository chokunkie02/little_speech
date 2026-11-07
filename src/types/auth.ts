// Auth domain types for Speech Adventure.
// Supabase-specific shapes are mapped here so the rest of the app
// never imports from @supabase/supabase-js directly.

// ── User roles ────────────────────────────────────────────────────────────────
// Foundation only — organization/classroom system is not implemented yet.
// Stored in Supabase user_metadata.role. Defaults to "parent" when absent.

export type UserRole = "parent" | "teacher" | "therapist" | "school_admin";

export const DEFAULT_ROLE: UserRole = "parent";

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
  /** Always present — defaults to "parent" for existing users with no stored role. */
  role: UserRole;
  isPlatformAdmin?: boolean;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  expiresAt: number | null;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

export type AuthLoadingState = "initializing" | "ready";

export interface AuthContextValue {
  user: AuthUser | null;
  session: AuthSession | null;
  loadingState: AuthLoadingState;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  /** role defaults to "parent" when omitted. */
  signUp: (email: string, password: string, role?: UserRole) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}
