// Checks that ASSESSMENT_OPENAI_API_KEY in .env.local works, without starting the app or printing the key.
// Only calls GET /v1/models, which is free. Usage: npm run assessment:check-openai
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TRANSCRIBE_MODELS = ["gpt-4o-transcribe", "gpt-4o-mini-transcribe", "whisper-1"];

function readEnv(file) {
  const env = {};
  let text;
  try {
    text = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    return env;
  }
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return env;
}

// Same precedence as Next.js: a variable already set in the OS/shell wins over .env.local.
const fileEnv = readEnv(".env.local");
const env = { ...fileEnv, ...process.env };
class CheckFailed extends Error {}
const fail = (message) => {
  throw new CheckFailed(message);
};

try {
  await check();
} catch (error) {
  if (!(error instanceof CheckFailed)) throw error;
  console.error(`✗ ${error.message}`);
  // Let pending sockets close before exiting; process.exit() here can crash Node on Windows.
  process.exitCode = 1;
}

async function check() {
const NAME = "ASSESSMENT_OPENAI_API_KEY";
if (process.env[NAME]) {
  console.warn(`! ${NAME} ถูกตั้งไว้ใน environment ของเครื่อง (Windows/shell) ค่านี้จะทับค่าใน .env.local ทั้งใน Next.js และสคริปต์นี้`);
  if (fileEnv[NAME] && fileEnv[NAME] !== process.env[NAME])
    console.warn("  คีย์ใน .env.local จึงยังไม่ถูกใช้ ให้ลบตัวแปรของเครื่องออก แล้วเปิด terminal ใหม่");
}
if (process.env.OPENAI_API_KEY)
  console.log("• OPENAI_API_KEY ของเครื่องถูกข้ามไป ระบบประเมินใช้ ASSESSMENT_OPENAI_API_KEY แยกต่างหาก ไม่ต้องลบตัวแปรนั้น");

const exposed = Object.keys(env).filter((name) => /^NEXT_PUBLIC_.*OPENAI/i.test(name));
if (exposed.length) fail(`ห้ามใช้ ${exposed.join(", ")} เพราะจะหลุดไปฝั่ง browser ให้ใช้ ${NAME} แทน`);

const key = env[NAME] ?? "";
if (!key || key === "sk-your-openai-key-here")
  fail(`ยังไม่ได้ใส่ ${NAME} ใน .env.local`);
if (key.startsWith("sk-or-"))
  fail("นี่เป็นคีย์ของ OpenRouter (sk-or-…) ใช้กับ api.openai.com ไม่ได้ ต้องใช้คีย์ของ OpenAI โดยตรง");
if (/\s/.test(key) || !key.startsWith("sk-"))
  fail("รูปแบบคีย์ไม่ถูกต้อง: ต้องขึ้นต้นด้วย sk- และไม่มีช่องว่างหรือเครื่องหมายคำพูด");
console.log(`• พบ ${NAME} จาก${process.env[NAME] ? "ตัวแปรของเครื่อง" : " .env.local"} (ยาว ${key.length} ตัวอักษร)`);
console.log(`• ASSESSMENT_SPEECH_PROVIDER=${env.ASSESSMENT_SPEECH_PROVIDER || "(ไม่ได้ตั้ง)"}`);

let response;
try {
  response = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  });
} catch (error) {
  fail(`ต่อ api.openai.com ไม่ได้: ${error instanceof Error ? error.message : error}`);
}

if (response.status === 401) fail("คีย์ใช้ไม่ได้ (401): คีย์ผิด ถูกลบ หรือคัดลอกไม่ครบ");
if (response.status === 403) fail("คีย์ไม่มีสิทธิ์ (403): ให้เจ้าของคีย์เปิดสิทธิ์ Models/Audio ใน project");
if (response.status === 429) fail("ถูกจำกัด (429): โควตาหรือเครดิตของบัญชีอาจหมด ให้เจ้าของคีย์ตรวจ Billing");
if (!response.ok) fail(`OpenAI ตอบ ${response.status}`);

const { data = [] } = await response.json();
const ids = new Set(data.map((model) => model.id));
console.log("✓ คีย์ใช้งานได้");

const configured = env.OPENAI_ASSESSMENT_TRANSCRIBE_MODEL || "gpt-4o-transcribe";
for (const id of TRANSCRIBE_MODELS)
  console.log(`  ${ids.has(id) ? "✓" : "–"} ${id}${id === configured ? "  (โมเดลที่ตั้งไว้)" : ""}`);
if (!ids.has(configured))
  fail(`คีย์นี้ยังเข้าถึง ${configured} ไม่ได้ ให้เลือกโมเดลที่มี ✓ ใน OPENAI_ASSESSMENT_TRANSCRIBE_MODEL`);
}
