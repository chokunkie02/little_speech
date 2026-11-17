// Who the person is: asked at sign-up (and once after sign-in for older accounts), editable in settings.
// Stored in account_profiles; others only ever see "ชื่อ นามสกุล".

export const TITLES = ["นาย", "นาง", "นางสาว", "ครู", "ดร."] as const;
export type Title = (typeof TITLES)[number];

export type AccountDetails = {
  title: Title | null;
  firstName: string;
  lastName: string;
  phone: string | null;
};

export type SignUpDetails = AccountDetails & { acceptedTerms: boolean };

export type DetailErrors = Partial<Record<"firstName" | "lastName" | "phone" | "acceptedTerms" | "email" | "password", string>>;

export function normalizePhone(value: string) {
  return value.replace(/[^0-9]/g, "");
}

/** Read the shared fields from a form (names match AccountFields). */
export function readAccountDetails(form: FormData): AccountDetails {
  const title = String(form.get("title") ?? "");
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  return {
    title: (TITLES as readonly string[]).includes(title) ? (title as Title) : null,
    firstName: String(form.get("firstName") ?? "").trim(),
    lastName: String(form.get("lastName") ?? "").trim(),
    phone: phone || null,
  };
}

export function validateAccountDetails(details: AccountDetails): DetailErrors {
  const errors: DetailErrors = {};
  if (!details.firstName) errors.firstName = "กรอกชื่อ";
  else if (details.firstName.length > 60) errors.firstName = "ชื่อยาวเกิน 60 ตัวอักษร";
  if (!details.lastName) errors.lastName = "กรอกนามสกุล";
  else if (details.lastName.length > 60) errors.lastName = "นามสกุลยาวเกิน 60 ตัวอักษร";
  if (details.phone && !/^0[0-9]{8,9}$/.test(details.phone)) errors.phone = "ใช้เบอร์ไทย 9–10 หลัก ขึ้นต้นด้วย 0 เช่น 081-234-5678";
  return errors;
}

export function validateCredentials(email: string, password: string, signup: boolean): DetailErrors {
  const errors: DetailErrors = {};
  if (!email) errors.email = "กรอกอีเมล";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "รูปแบบอีเมลไม่ถูกต้อง เช่น name@gmail.com";
  if (!password) errors.password = "กรอกรหัสผ่าน";
  else if (signup && password.length < 8) errors.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
  return errors;
}

/** Focus the first invalid field in DOM order so phone users see what to fix. */
export function focusFirstError(form: HTMLFormElement, errors: DetailErrors) {
  const names = Object.keys(errors);
  const first = [...form.elements].find((element) => names.includes((element as HTMLInputElement).name)) as HTMLElement | undefined;
  first?.focus();
}

const COMMON_DOMAINS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com", "live.com", "obec.go.th"];

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

/** "name@gmial.com" → "name@gmail.com" (only for near misses of common providers). */
export function suggestEmail(email: string): string | null {
  const [local, domain] = email.trim().toLowerCase().split("@");
  if (!local || !domain || COMMON_DOMAINS.includes(domain)) return null;
  const match = COMMON_DOMAINS.find((candidate) => distance(domain, candidate) <= 2);
  return match ? `${local}@${match}` : null;
}

/** Supabase Auth messages are English; show Thai, with a next step where there is one. */
export function thaiAuthError(message: string | undefined, signup: boolean): string {
  if (message && /[฀-๿]/.test(message)) return message; // already Thai (our own messages)
  const text = (message ?? "").toLowerCase();
  if (text.includes("already registered") || text.includes("already been registered") || text.includes("user already exists"))
    return "อีเมลนี้มีบัญชีอยู่แล้ว เข้าสู่ระบบแทน หรือใช้ \"ลืมรหัสผ่าน\"";
  if (text.includes("invalid login credentials")) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (text.includes("email not confirmed")) return "ยังไม่ได้ยืนยันอีเมล ตรวจกล่องจดหมายแล้วกดลิงก์ยืนยัน";
  if (text.includes("password should be") || text.includes("weak password")) return "รหัสผ่านง่ายเกินไป ใช้อย่างน้อย 8 ตัวอักษร ผสมตัวเลข";
  if (text.includes("rate limit") || text.includes("too many")) return "ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่";
  if (text.includes("invalid email") || text.includes("unable to validate email")) return "รูปแบบอีเมลไม่ถูกต้อง";
  if (text.includes("signups not allowed") || text.includes("signup is disabled")) return "ระบบปิดรับสมัครชั่วคราว";
  if (text.includes("fetch") || text.includes("network")) return "เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่";
  return signup ? "สมัครไม่สำเร็จ ลองอีกครั้ง" : "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง";
}
