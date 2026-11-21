// Generate a few comparison clips with Gemini TTS so the team can judge a warmer voice before
// replacing all 160 studio clips. Runs on this computer only; the web app never calls Gemini.
//
//   node scripts/learning-studio/gemini-voice-samples.mjs
//   VOICE_GEMINI_MODEL=gemini-3.8-flash-tts VOICE_SAMPLE_LINES=1,3,5 node scripts/learning-studio/gemini-voice-samples.mjs
//
// Needs VOICE_GEMINI_API_KEY in .env.local. Sends only the fixed script lines below (no child data).
// Writes .learning-runtime/voice-samples/ (git-ignored) with an index.html to compare old and new.
//
// Free tier: about 10 requests per day per model. The prompt uses Google's structured TTS format: the
// voice is described in sections and only the text under "#### TRANSCRIPT" is spoken. (A plain
// "Say warmly: …" prompt made this model read the instructions aloud: 24 s for the word "ปู".)
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const MODEL = process.env.VOICE_GEMINI_MODEL || "gemini-3.8-flash-tts";
const OUT = ".learning-runtime/voice-samples";
const VOICES = [
  { name: "Sulafat", note: "อบอุ่น" },
  { name: "Achernar", note: "นุ่ม" },
  { name: "Leda", note: "สดใส อายุน้อย" },
];
const ALL_LINES = [
  { text: "ปู", delivery: "Say the single word once, clearly and slowly, so a child can copy it." },
  { text: "กระเป๋า", delivery: "Say the single word once, clearly and slowly, so a child can copy it." },
  { text: "ปูอยู่ในกล่อง", delivery: "Say the short phrase once, clearly, at a calm pace." },
  { text: "ไม่เป็นไรเลยจ้ะ มาฟังอีกครั้ง แล้วค่อย ๆ ลองกันใหม่นะ", delivery: "Gentle and reassuring, after the child made a mistake." },
  { text: "จบภารกิจรอบนี้แล้ว เก่งมากจ้ะ พักสักนิด แล้วค่อยไปผจญภัยกันต่อนะ", delivery: "Happy and proud, praising the child at the end of a round." },
];
const picked = (process.env.VOICE_SAMPLE_LINES || "").split(",").map(Number).filter(Boolean);
const LINES = ALL_LINES.map((line, index) => ({ ...line, number: index + 1 })).filter(
  (line) => !picked.length || picked.includes(line.number),
);
const prompt = (line) => `# AUDIO PROFILE: พี่ปู
A kind, cheerful young Thai woman who loves children.

## THE SCENE
She is sitting next to a 4-year-old, helping the child practise Thai words.

### DIRECTOR'S NOTES
Style: warm, soft, bright and encouraging, with a gentle smile in the voice.
Pace: slightly slow and very clear.
Accent: natural Central Thai with correct tones.
This line: ${line.delivery}

#### TRANSCRIPT
${line.text}`;
/** A clip far longer than its text was probably read with the instructions. */
const tooLong = (seconds, text) => seconds > 2.5 + [...text.replace(/\s/g, "")].length * 0.25;

const env = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].trim()]),
);
const key = env.VOICE_GEMINI_API_KEY;
if (!key) throw new Error("ยังไม่ได้ใส่ VOICE_GEMINI_API_KEY ใน .env.local");
const catalog = JSON.parse(await readFile("public/learning-studio/audio/catalog.json", "utf8"));
await mkdir(OUT, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function speak(line, voiceName) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt(line) }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      }),
    });
    if (response.status === 429) {
      const body = await response.clone().json().catch(() => ({}));
      const daily = (body.error?.details ?? []).some((detail) =>
        (detail.violations ?? []).some((violation) => /PerDay/.test(violation.quotaId ?? "")),
      );
      if (daily) throw new Error("rate limit (daily free quota for this model is used up; try tomorrow or another model)");
    }
    if (response.status === 429 || response.status >= 500) {
      const wait = 15000 * attempt;
      console.log(`  ${response.status}, waiting ${wait / 1000}s (free-tier limit)`);
      await sleep(wait);
      continue;
    }
    const body = await response.json();
    if (!response.ok) throw new Error(`Gemini ${response.status}: ${JSON.stringify(body).slice(0, 200)}`);
    const data = body.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData;
    if (!data) throw new Error("Gemini returned no audio");
    return { bytes: Buffer.from(data.data, "base64"), mime: data.mimeType };
  }
  throw new Error("Gemini kept refusing (rate limit); try again later");
}

const rows = [];
let limited = false;
const wavSeconds = (bytes) => {
  const rate = bytes.readUInt32LE(28); // byte rate
  let offset = 12;
  while (offset < bytes.length - 8) {
    const id = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    if (id === "data") return size / rate;
    offset += 8 + size;
  }
  return 0;
};
for (const line of LINES) {
  const current = catalog.entries.find((entry) => entry.text === line.text);
  const row = { text: line.text, current: null, voices: [] };
  if (current) {
    const name = `${line.number}-current.mp3`;
    await copyFile(path.join("public", current.path), path.join(OUT, name));
    row.current = name;
  }
  for (const voice of VOICES) {
    const name = `${line.number}-${voice.name}.wav`;
    const entry = { ...voice, file: name, seconds: 0, suspect: false };
    row.voices.push(entry);
    // Clips already made in an earlier run are kept, so a rate-limited run can simply be repeated.
    const existing = await readFile(path.join(OUT, name)).catch(() => null);
    if (existing) {
      entry.seconds = wavSeconds(existing);
      entry.suspect = tooLong(entry.seconds, line.text);
      continue;
    }
    if (limited) {
      entry.file = null;
      continue;
    }
    console.log(`${line.number} ${voice.name}: ${line.text}`);
    let audio;
    try {
      audio = await speak(line, voice.name);
    } catch (error) {
      if (!/rate limit/.test(error.message)) throw error;
      console.log(`  ${error.message}. The page lists what exists.`);
      limited = true;
      entry.file = null;
      continue;
    }
    if (!/wav/i.test(audio.mime)) throw new Error(`Unexpected audio type ${audio.mime}`);
    await writeFile(path.join(OUT, name), audio.bytes);
    entry.seconds = wavSeconds(audio.bytes);
    entry.suspect = tooLong(entry.seconds, line.text);
    console.log(`  ${entry.seconds.toFixed(1)} s${entry.suspect ? "  ⚠ too long: it may have read the instructions" : ""}`);
    await sleep(10000); // free tier allows only a few TTS requests per minute
  }
  rows.push(row);
}

const escape = (text) => text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
const player = (label, file, extra = "") =>
  `<div class="clip"><span class="who">${label}</span>${file ? `<audio controls preload="metadata" src="${file}"></audio>` : "<small>ยังไม่ได้สร้าง (ติดโควตาฟรี)</small>"}${extra}</div>`;
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>เทียบเสียงพี่ปู</title>
<style>body{font-family:'Noto Sans Thai',Tahoma,sans-serif;background:#0f1424;color:#e6e9f2;margin:20px;line-height:1.6}
h1{font-size:20px;margin:0 0 4px}p.lead{color:#9aa6c4;font-size:13px;margin:0 0 18px}
section{background:#161d33;border:1px solid #2a3350;border-radius:14px;padding:14px 16px;margin-bottom:14px}
h2{font-size:19px;margin:0 0 10px;font-weight:600}.clips{display:flex;flex-wrap:wrap;gap:10px}
.clip{background:#0f1424;border:1px solid #2a3350;border-radius:12px;padding:10px 12px;display:grid;gap:6px;min-width:230px;flex:1}
.clip.old{border-style:dashed}.who{font-size:13px;font-weight:600}.who small,small{color:#9aa6c4;font-weight:400}
audio{width:100%;height:36px}.warn{color:#ffb347}</style>
<h1>เทียบเสียงพี่ปู</h1>
<p class="lead">เสียงเดิม (Microsoft) กับ Gemini ${escape(MODEL)} · ฟังแต่ละข้อ แล้วดูว่าเสียงไหนนุ่ม อบอุ่น ร่าเริง และออกเสียงไทยถูกต้อง โดยเฉพาะคำฝึก</p>
${rows
  .map(
    (row) => `<section><h2>“${escape(row.text)}”</h2><div class="clips">
${row.current ? player("เสียงเดิม <small>Microsoft</small>", row.current).replace('class="clip"', 'class="clip old"') : ""}
${row.voices
  .map((voice) =>
    player(
      `${voice.name} <small>${voice.note}</small>`,
      voice.file,
      voice.file ? `<small>${voice.seconds.toFixed(1)} วินาที${voice.suspect ? ' · <span class="warn">⚠ ยาวผิดปกติ อาจอ่านคำสั่งออกมาด้วย</span>' : ""}</small>` : "",
    ),
  )
  .join("\n")}
</div></section>`,
  )
  .join("\n")}`;
await writeFile(path.join(OUT, "index.html"), html);
console.log(`Done: ${path.resolve(OUT, "index.html")}`);
