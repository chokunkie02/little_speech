// Checks that ASSESSMENT_ANTHROPIC_API_KEY in .env.local works, without starting the app or printing the
// key. Only looks up the configured model (GET /v1/models/{id}), which is free.
// Usage: npm run assessment:check-claude
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const NAME = "ASSESSMENT_ANTHROPIC_API_KEY";
const DEFAULT_MODEL = "claude-opus-5-5";

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
  process.exitCode = 1;
}

async function check() {
  if (process.env[NAME]) console.warn(`! ${NAME} ถูกตั้งไว้ใน environment ของเครื่อง ค่านี้จะทับค่าใน .env.local`);
  const exposed = Object.keys(env).filter((name) => /^NEXT_PUBLIC_.*(ANTHROPIC|CLAUDE)/i.test(name));
  if (exposed.length) fail(`ห้ามใช้ ${exposed.join(", ")} เพราะจะหลุดไปฝั่ง browser ให้ใช้ ${NAME} แทน`);

  const key = env[NAME] ?? "";
  if (!key) fail(`ยังไม่ได้ใส่ ${NAME} ใน .env.local`);
  if (/\s/.test(key) || !key.startsWith("sk-ant-"))
    fail("รูปแบบคีย์ไม่ถูกต้อง: คีย์ของ Anthropic ขึ้นต้นด้วย sk-ant- และไม่มีช่องว่างหรือเครื่องหมายคำพูด");
  if (!key.startsWith("sk-ant-api"))
    console.warn("! คีย์นี้ไม่ได้ขึ้นต้นด้วย sk-ant-api… ซึ่งเป็นรูปแบบ API key ปกติจากหน้า API Keys ใน Claude Console จะลองเรียกดู");
  const model = (env.ASSESSMENT_CLAUDE_MODEL || DEFAULT_MODEL).trim();
  console.log(`• พบ ${NAME} (ยาว ${key.length} ตัวอักษร) · โมเดล ${model}`);

  const client = new Anthropic({ apiKey: key, maxRetries: 0, timeout: 15000 });
  try {
    const info = await client.models.retrieve(model);
    console.log(`✓ คีย์ใช้งานได้ และเข้าถึง ${info.display_name ?? info.id} ได้`);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) fail("คีย์ใช้ไม่ได้ (401): คีย์ผิด ถูกลบ หรือไม่ใช่ API key ของ Claude Console");
    if (error instanceof Anthropic.PermissionDeniedError) fail("คีย์ไม่มีสิทธิ์ (403): ให้เจ้าของคีย์ตรวจ workspace และสิทธิ์ของคีย์");
    if (error instanceof Anthropic.NotFoundError) fail(`ไม่พบโมเดล ${model} สำหรับคีย์นี้ (404): ลองตั้ง ASSESSMENT_CLAUDE_MODEL เป็นโมเดลอื่น`);
    if (error instanceof Anthropic.RateLimitError) fail("ถูกจำกัด (429): เครดิตหรือโควตาอาจหมด ให้เจ้าของคีย์ตรวจ Billing");
    if (error instanceof Anthropic.APIConnectionError) fail(`ต่อ api.anthropic.com ไม่ได้: ${error.message}`);
    if (error instanceof Anthropic.APIError) fail(`Anthropic ตอบ ${error.status}: ${error.message}`);
    throw error;
  }
}
