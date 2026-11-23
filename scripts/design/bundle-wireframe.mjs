// Packs a wireframe in docs/design/wireframes and every image it uses into one HTML file that can
// be sent by chat or email and opened by double-click. Screenshots are re-encoded as WebP to keep it small.
// Fonts still load from Google Fonts, so the reader needs internet for the intended typefaces.
//
//   node scripts/design/bundle-wireframe.mjs                  (kid-practice.html)
//   node scripts/design/bundle-wireframe.mjs family-pages     (family-pages.html)
//
// Writes .learning-runtime/share/<name>-share.html (git-ignored; regenerate after changes).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DIR = "docs/design/wireframes";
const NAME = (process.argv[2] ?? "kid-practice").replace(/\.html$/, "");
const OUT = `.learning-runtime/share/${NAME}-share.html`;
let html = await readFile(path.join(DIR, `${NAME}.html`), "utf8");

const cache = new Map();
async function dataUri(rel) {
  if (cache.has(rel)) return cache.get(rel);
  const file = path.join(DIR, rel);
  let uri;
  if (rel.endsWith(".svg")) uri = `data:image/svg+xml;base64,${(await readFile(file)).toString("base64")}`;
  else if (rel.endsWith(".jpg")) uri = `data:image/jpeg;base64,${(await readFile(file)).toString("base64")}`;
  else if (rel.endsWith(".png")) {
    // Phone captures are 2x (780 px wide); desktop captures are 1440 px. Both are shown much smaller.
    const width = rel.startsWith("before/pc/") ? 1100 : 600;
    const webp = await sharp(file).resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    uri = `data:image/webp;base64,${webp.toString("base64")}`;
  } else throw new Error(`Unknown asset type: ${rel}`);
  cache.set(rel, uri);
  return uri;
}

const refs = [...new Set([...html.matchAll(/(?:src|href)="((?:art|before)\/[^"]+)"/g)].map((m) => m[1]))];
for (const rel of refs) {
  const uri = await dataUri(rel);
  html = html.replaceAll(`"${rel}"`, `"${uri}"`);
}
html = html.replace("<title>", "<title>[ไฟล์เดียว] ");
await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, html);
console.log(`${refs.length} images packed → ${OUT} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB)`);
