// Captures the current practice screens (guest mode, phone size) as the "before" side of the
// kid-friendly wireframes. Drives a headless Edge/Chrome through the DevTools protocol; no packages.
//
//   npm run dev                                   (in another window)
//   node scripts/design/capture-practice-screens.mjs
//
// Writes docs/design/wireframes/before/*.png
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE = process.env.SITE ?? "http://localhost:3000";
const OUT = "docs/design/wireframes/before";
const PORT = 9333;
const PROFILE = path.resolve(`.learning-runtime/capture-profile-${Date.now()}`);
const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
];
const browserPath = BROWSERS.find((candidate) => existsSync(candidate));
if (!browserPath) throw new Error("No Edge or Chrome found");

await rm(PROFILE, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const browser = spawn(browserPath, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--mute-audio",
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
  "about:blank",
]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  target = await fetch(`http://127.0.0.1:${PORT}/json/list`)
    .then((response) => response.json())
    .then((list) => list.find((entry) => entry.type === "page"))
    .catch(() => null);
}
if (!target) throw new Error("Browser did not start");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});
let nextId = 0;
const pending = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, (message) => (message.error ? reject(new Error(`${method}: ${message.error.message}`)) : resolve(message.result)));
    socket.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });

async function go(url) {
  await send("Page.navigate", { url: `${SITE}${url}` });
  await sleep(3500);
}
/** Click the nth visible button whose text contains `text`. */
async function click(text, nth = 0) {
  const ok = await evaluate(`(() => {
    const items = [...document.querySelectorAll("button, a, [role=button]")]
      .filter((el) => el.offsetParent !== null && ((el.innerText || "") + " " + (el.getAttribute("aria-label") || "")).includes(${JSON.stringify(text)}));
    const el = items[${nth}];
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    el.click();
    return true;
  })()`);
  if (!ok) {
    const seen = await evaluate(`[...document.querySelectorAll("button")].filter((b) => b.offsetParent !== null).map((b) => (b.innerText || b.getAttribute("aria-label") || "").trim()).filter(Boolean).slice(0, 40)`);
    throw new Error(`No button "${text}" (#${nth}). Visible: ${seen.join(" | ")}`);
  }
  await sleep(1500);
}
async function shot(name, { full = false } = {}) {
  await evaluate("window.scrollTo(0, 0)");
  await sleep(300);
  let params = { format: "png" };
  if (full) {
    const height = await evaluate("Math.min(document.documentElement.scrollHeight, 4000)");
    params = { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height, scale: 1 } };
  }
  const { data } = await send("Page.captureScreenshot", params);
  await writeFile(path.join(OUT, `${name}.png`), Buffer.from(data, "base64"));
  console.log(`saved ${name}.png`);
}

try {
  await go("/training#path");
  await shot("01-path", { full: true });

  // Speech item: ดูปากและพูดตาม (stage 2)
  await click("เริ่มตรงนี้", 1);
  await shot("02-start-round");
  await click("พร้อมแล้ว เริ่มเลย");
  await shot("03-speech-item", { full: true });
  await click("ทดลองตอบโดยไม่อัดเสียง");
  await shot("04-speech-answered", { full: true });

  // Picture choice: ฟังแยกเสียง (stage 1), then finish the round for the summary
  await go("/training#path");
  await click("เริ่มตรงนี้", 0);
  const dialog = await evaluate(`[...document.querySelectorAll("button")].some((b) => b.innerText.includes("พร้อมแล้ว เริ่มเลย"))`);
  if (dialog) await click("พร้อมแล้ว เริ่มเลย");
  await shot("05-choice-item", { full: true });
  for (let item = 0; item < 3; item++) {
    await click("เลือก ");
    if (item === 0) await shot("06-choice-answered", { full: true });
    await click("บันทึกคำตอบ");
    await click(item < 2 ? "ภารกิจถัดไป" : "ดูสรุปรอบนี้");
  }
  await shot("07-round-summary", { full: true });

  // Syllables (stage 3) and words (stage 4)
  for (const [index, name] of [[2, "08-syllable-item"], [3, "09-word-item"]]) {
    await go("/training#path");
    await click("เริ่มตรงนี้", index);
    const start = await evaluate(`[...document.querySelectorAll("button")].some((b) => b.innerText.includes("พร้อมแล้ว เริ่มเลย"))`);
    if (start) await click("พร้อมแล้ว เริ่มเลย");
    await shot(name, { full: true });
  }
} finally {
  socket.close();
  // Edge starts helper processes; end the whole tree so the throwaway profile is released.
  if (process.platform === "win32") spawn("taskkill", ["/PID", String(browser.pid), "/T", "/F"]);
  else browser.kill();
}
