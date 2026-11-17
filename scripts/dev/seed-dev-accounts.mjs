// Creates (or resets) one confirmed account per role on a LOCAL Supabase, for clicking through the UI.
//
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/dev/seed-dev-accounts.mjs
//
// Refuses to run against anything but localhost. Accounts (password for all: DEV_PASSWORD below):
//   dev-parent@speechadventure.test     parent
//   dev-parent2@speechadventure.test    parent (second family, for approval flows)
//   dev-teacher@speechadventure.test    teacher
//   dev-school@speechadventure.test     school_admin
//   dev-platform@speechadventure.test   platform admin
//   dev-applicant@speechadventure.test  school_admin (approved via the "register a school" flow, owns โรงเรียนบ้านสวน)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

export const DEV_PASSWORD = "DevOnly-2569!";

function fromEnvFile(name) {
  try {
    const line = readFileSync(".env.local", "utf8").split(/\r?\n/).find((row) => row.startsWith(name + "="));
    return line?.slice(name.length + 1).trim();
  } catch {
    return undefined;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || fromEnvFile("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fromEnvFile("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
  console.error("Refusing to run: this script is for a local Supabase only (" + url + ")");
  process.exit(1);
}

const accounts = [
  { email: "dev-parent@speechadventure.test", title: "นาง", first: "มาลี", last: "ใจดี (ทดสอบ)", phone: "0810000001", role: "parent" },
  { email: "dev-parent2@speechadventure.test", title: "นาย", first: "สมชาย", last: "ใจดี (ทดสอบ)", phone: "0810000002", role: "parent" },
  { email: "dev-teacher@speechadventure.test", title: "ครู", first: "สมศรี", last: "สอนดี (ทดสอบ)", phone: "0810000003", role: "teacher" },
  { email: "dev-school@speechadventure.test", title: "นาย", first: "ประเสริฐ", last: "บริหาร (ทดสอบ)", phone: "0810000004", role: "school_admin" },
  { email: "dev-platform@speechadventure.test", title: null, first: "แอดมิน", last: "ระบบ (ทดสอบ)", phone: null, role: "parent", platformAdmin: true },
  { email: "dev-applicant@speechadventure.test", title: "ดร.", first: "วิไล", last: "ผู้อำนวยการ (ทดสอบ)", phone: "0810000006", role: "school_admin" },
];

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = supabase.auth.admin;
const { data: list, error: listError } = await admin.listUsers({ perPage: 1000 });
if (listError) throw listError;

for (const account of accounts) {
  const attributes = {
    password: DEV_PASSWORD,
    email_confirm: true,
    user_metadata: { role: account.role, full_name: `${account.first} ${account.last}` },
    app_metadata: account.platformAdmin ? { platform_admin: true } : {},
  };
  const existing = list.users.find((user) => user.email === account.email);
  const result = existing
    ? await admin.updateUserById(existing.id, attributes)
    : await admin.createUser({ email: account.email, ...attributes });
  if (result.error) {
    console.error(account.email, "failed:", result.error.message);
    process.exitCode = 1;
  } else {
    const profile = await supabase.rpc("write_account_profile", {
      p_user_id: result.data.user.id, p_title: account.title, p_first_name: account.first, p_last_name: account.last,
      p_phone: account.phone, p_accept_terms: true,
    });
    if (profile.error) {
      console.error(account.email, "profile failed:", profile.error.message);
      process.exitCode = 1;
    }
    console.log((existing ? "updated " : "created ") + account.email + " (" + (account.platformAdmin ? "platform admin" : account.role) + ")");
  }
}
