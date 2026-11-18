// Gives the dev accounts from seed-dev-accounts.mjs something to test with, on a LOCAL Supabase only:
//
//   โรงเรียนทดสอบระบบประเมิน (dev)   owner dev-school, teacher dev-teacher
//   └ ห้อง อนุบาล 2/1 (ทดสอบ)         primary teacher dev-teacher
//     └ น้องฟ้า (ทดสอบ)                school child, guardian dev-parent  → teacher "รอตรวจ" queue, school criteria
//   น้องบ้าน (ทดสอบ)                   family child of dev-parent (no school) → central criteria
//
// Rows are written the same way the app's own functions write them (school_management /
// join_codes migrations). Fixed ids make it safe to run again; existing rows are left alone.
//
//   node scripts/dev/seed-dev-accounts.mjs     (first)
//   node scripts/dev/seed-test-school.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url.replace(/\/$/, ""))) {
  console.error(`Refusing to seed ${url}: this script only runs against a local Supabase.`);
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const ORG = "00000000-0000-4000-8000-00000000a001";
const ROOM = "00000000-0000-4000-8000-00000000b001";
const SCHOOL_CHILD = "00000000-0000-4000-8000-00000000c001";
const HOME_CHILD = "00000000-0000-4000-8000-00000000c002";

const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
const idOf = (email) => {
  const user = list.users.find((user) => user.email === email);
  if (!user) {
    console.error(`${email} not found. Run node scripts/dev/seed-dev-accounts.mjs first.`);
    process.exit(1);
  }
  return user.id;
};
const school = idOf("dev-school@speechadventure.test");
const teacher = idOf("dev-teacher@speechadventure.test");
const parent = idOf("dev-parent@speechadventure.test");

async function ensure(table, match, row, label) {
  let query = db.from(table).select("*", { count: "exact", head: true });
  for (const [column, value] of Object.entries(match)) query = query.eq(column, value);
  const { count, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  if (count) return console.log(`exists  ${label}`);
  const insert = await db.from(table).insert({ ...match, ...row });
  if (insert.error) throw new Error(`${table}: ${insert.error.message}`);
  console.log(`created ${label}`);
}

const childDefaults = { age: 5, target_sound: "ป", selected_sound_id: "ป", training_goal: "", avatar_emoji: "🧒" };

await ensure("organizations", { id: ORG }, { name: "โรงเรียนทดสอบระบบประเมิน (dev)", type: "school", created_by: school }, "school โรงเรียนทดสอบระบบประเมิน (dev)");
await ensure("organization_members", { organization_id: ORG, user_id: school }, { role: "owner", status: "active" }, "dev-school as owner");
await ensure("organization_members", { organization_id: ORG, user_id: teacher }, { role: "teacher", status: "active" }, "dev-teacher as teacher");
await ensure("classrooms", { id: ROOM }, { organization_id: ORG, name: "อนุบาล 2/1 (ทดสอบ)" }, "classroom อนุบาล 2/1 (ทดสอบ)");
await ensure("classroom_teachers", { classroom_id: ROOM, teacher_user_id: teacher }, { is_primary: true }, "dev-teacher as primary teacher");
await ensure(
  "child_profiles",
  { id: SCHOOL_CHILD },
  { ...childDefaults, user_id: school, organization_id: ORG, name: "ด.ญ.ฟ้า ทดสอบ", nickname: "น้องฟ้า (ทดสอบ)", student_code: "DEV-001" },
  "school child น้องฟ้า (ทดสอบ)",
);
await ensure("classroom_students", { classroom_id: ROOM, child_id: SCHOOL_CHILD }, { student_number: 1 }, "น้องฟ้า in อนุบาล 2/1, number 1");
await ensure(
  "child_access",
  { child_id: SCHOOL_CHILD, user_id: parent },
  {
    role: "guardian",
    granted_by: teacher,
    can_view_progress: true,
    can_view_audio: true,
    can_assign_practice: false,
    can_edit_child: false,
    can_export_report: true,
  },
  "dev-parent as guardian of น้องฟ้า",
);
await ensure(
  "child_profiles",
  { id: HOME_CHILD },
  { ...childDefaults, user_id: parent, organization_id: null, name: "น้องบ้าน (ทดสอบ)", target_sound: "ก", selected_sound_id: "ก" },
  "family child น้องบ้าน (ทดสอบ) of dev-parent",
);
console.log("Done. Sign in as dev-parent, dev-teacher or dev-school (local only).");
