import { getSupabaseClient } from "@/lib/supabase/client";

export async function assessmentRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const session = await getSupabaseClient()?.auth.getSession();
  const token = session?.data.session?.access_token;
  if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อนใช้การประเมินกลาง");
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(path, {
    ...options,
    headers,
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "ติดต่อระบบประเมินไม่สำเร็จ");
  return body as T;
}
