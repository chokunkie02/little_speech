// Thin wrapper around Supabase Auth.
// All functions return safe defaults when Supabase is not configured,
// so the rest of the app never needs to check isSupabaseConfigured() directly.

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { AuthResult, AuthSession, AuthUser, UserRole } from "@/types/auth";
import type { User, Session } from "@supabase/supabase-js";

// Keep a local reference to the constant without importing the value
// (avoids a circular-style import oddity with `as const` re-exports).
const FALLBACK_ROLE: UserRole = "parent";

function mapUser(u: User): AuthUser {
  return {
    id: u.id,
    email: u.email ?? "",
    createdAt: u.created_at,
    role: (u.user_metadata?.role as UserRole) ?? FALLBACK_ROLE,
    isPlatformAdmin: u.app_metadata?.platform_admin === true,
  };
}

function mapSession(s: Session): AuthSession {
  return {
    user: mapUser(s.user),
    accessToken: s.access_token,
    expiresAt: s.expires_at ?? null,
  };
}

export async function getInitialSession(): Promise<AuthSession | null> {
  if (!isSupabaseConfigured()) return null;
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) return null;
    return mapSession(data.session);
  } catch {
    return null;
  }
}

export function subscribeToAuthChanges(
  onSessionChange: (session: AuthSession | null) => void,
): () => void {
  if (!isSupabaseConfigured()) return () => {};
  const client = getSupabaseClient();
  if (!client) return () => {};

  const { data } = client.auth.onAuthStateChange((_event, session) => {
    onSessionChange(session ? mapSession(session) : null);
  });

  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "ยังไม่ได้ตั้งค่า Authentication" };
  }
  const client = getSupabaseClient();
  if (!client) return { success: false, error: "ยังไม่ได้ตั้งค่า Authentication" };

  try {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่" };
  }
}

export async function signUp(
  email: string,
  password: string,
  role: UserRole = "parent",
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "ยังไม่ได้ตั้งค่า Authentication" };
  }
  const client = getSupabaseClient();
  if (!client) return { success: false, error: "ยังไม่ได้ตั้งค่า Authentication" };

  try {
    const { error } = await client.auth.signUp({
      email,
      password,
      options: { data: { role } },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่" };
  }
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.auth.signOut();
  } catch {
    // Sign-out errors are non-fatal; local state is cleared by the caller.
  }
}
