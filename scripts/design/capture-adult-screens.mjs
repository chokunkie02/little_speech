// Captures the studio's adult tabs at phone size (guest, full page) as the "before" side of the
// family-pages wireframe. Drives headless Edge/Chrome through the DevTools protocol; no packages.
//
//   npm run dev                                         (in another window)
//   node scripts/design/capture-adult-screens.mjs
//
// Writes docs/design/wireframes/before/adult/<tab>.jpg. The computer-size "before" images in
// before/pc/adult/ are screenshots of a signed-in test account (real data), taken by hand.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE = process.env.SITE ?? "http://localhost:3000";
const OUT = "docs/design/wireframes/before/adult";
const TABS = ["home", "path", "library", "progress", "plan", "guide"];
const PORT = 9336;
const PROFILE = path.resolve(`.learning-runtime/capture-adult-${Date.now()}`);
const browserPath = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].find((candidate) => existsSync(candidate));
if (!browserPath) throw new Error("No Edge or Chrome found");

await mkdir(OUT, { recursive: true });
const browser = spawn(browserPath, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, "--no-first-run", "--mute-audio", "about:blank"]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  target = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json()).then((l) => l.find((e) => e.type === "page")).catch(() => null);
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
    pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    socket.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
  for (const tab of TABS) {
    await send("Page.navigate", { url: `${SITE}/training?t=${tab}#${tab}` });
    await sleep(4000);
    const height = await evaluate("Math.min(document.documentElement.scrollHeight, 3400)");
    const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 78, captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height, scale: 1 } });
    await writeFile(path.join(OUT, `${tab}.jpg`), Buffer.from(data, "base64"));
    console.log(`saved ${tab}.jpg (${height}px)`);
  }
} finally {
  socket.close();
  if (process.platform === "win32") spawn("taskkill", ["/PID", String(browser.pid), "/T", "/F"]);
  else browser.kill();
  setTimeout(() => rm(PROFILE, { recursive: true, force: true }).catch(() => {}), 1500);
}
