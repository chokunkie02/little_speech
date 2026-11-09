import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { Database } from "@/types/supabase";

const emailField = z.string().trim().toLowerCase().email().max(254);
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("prepare"), organizationId: z.string().uuid(), email: emailField }),
  z.object({ action: z.literal("activate"), email: emailField, code: z.string().trim().regex(/^[a-f0-9]{56,64}$/i), password: z.string().min(8).max(72) }),
]);
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

function fail(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service || process.env.ENABLE_MANUAL_PARENT_ACTIVATION !== "true") {
    return fail("โรงเรียนยังไม่ได้เปิดการเตรียมบัญชีด้วยรหัส", 503);
  }
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("กรุณาตรวจอีเมล รหัสเปิดใช้ และรหัสผ่าน", 400);
  const data = parsed.data;
  const admin = createClient<Database>(url, service, options);

  if (data.action === "prepare") {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return fail("กรุณาเข้าสู่ระบบผู้ดูแลโรงเรียน", 401);
    const caller = createClient<Database>(url, anon, { ...options, global: { headers: { Authorization: authorization } } });
    const lookup = await caller.rpc("lookup_parent_setup", { p_organization_id: data.organizationId, p_email: data.email });
    if (lookup.error || !lookup.data) return fail("บัญชีนี้ไม่มีสิทธิ์เตรียมบัญชีในโรงเรียนนี้", 403);
    if (lookup.data.incompatible) return fail("อีเมลนี้ใช้กับบัญชีบทบาทอื่น กรุณาใช้อีเมลสำหรับบัญชีผู้ปกครอง", 409);
    if (lookup.data.pending_elsewhere) return fail("บัญชีนี้รอเปิดใช้กับโรงเรียนอื่น ให้ผู้ปกครองใช้รหัสจากโรงเรียนที่เตรียมบัญชี", 409);
    if (lookup.data.exists && !lookup.data.pending_id) return Response.json({ existing: true });
    if (!lookup.data.pending_id) {
      const created = await admin.auth.admin.createUser({
        email: data.email,
        password: randomBytes(32).toString("base64url"),
        user_metadata: { role: "parent" },
        app_metadata: { parent_activation_pending: true, parent_activation_school: data.organizationId },
      });
      if (created.error?.code === "email_exists" || created.error?.code === "user_already_exists") {
        return fail("อีเมลนี้มีบัญชีแล้ว กรุณาลองตรวจสถานะอีกครั้ง", 409);
      }
      if (created.error) return fail("เตรียมบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง", 502);
    }
    const issued = await admin.auth.admin.generateLink({ type: "recovery", email: data.email });
    if (issued.error || !issued.data.properties) return fail("ออกรหัสไม่สำเร็จ กดเตรียมบัญชีอีกครั้งเพื่อออกรหัสใหม่", 502);
    return Response.json({ code: issued.data.properties.hashed_token }, { headers: { "Cache-Control": "no-store" } });
  }

  const matches = await admin.rpc("matches_parent_activation", { p_email: data.email, p_code: data.code });
  if (!matches.data || matches.error) return fail("อีเมลหรือรหัสเปิดใช้ไม่ถูกต้อง หรือรหัสหมดอายุแล้ว", 400);
  const verifier = createClient<Database>(url, anon, options);
  const verified = await verifier.auth.verifyOtp({ token_hash: data.code, type: "recovery" });
  const user = verified.data.user;
  if (verified.error || user?.email?.toLowerCase() !== data.email || user.app_metadata.parent_activation_pending !== true) {
    return fail("อีเมลหรือรหัสเปิดใช้ไม่ถูกต้อง หรือรหัสหมดอายุแล้ว", 400);
  }
  const updated = await admin.auth.admin.updateUserById(user.id, {
    password: data.password,
    app_metadata: { parent_activation_pending: false },
  });
  if (updated.error) return fail("ตั้งรหัสผ่านไม่สำเร็จ กรุณาขอรหัสเปิดใช้ใหม่จากโรงเรียน", 502);
  return Response.json({ activated: true }, { headers: { "Cache-Control": "no-store" } });
}
