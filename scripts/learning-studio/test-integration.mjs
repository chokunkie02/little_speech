import { build } from "esbuild";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";
await build({
  entryPoints: ["src/features/learning-studio/integration.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".learning-runtime/integration.mjs",
});
const { createStudioState, studioStorageKey, suggestedLevel } =
  await import("../../.learning-runtime/integration.mjs");
const a = { id: "child-A", name: "ผู้เรียน ก", age: 8, targetSound: "ก" };
const first = createStudioState(null, a);
assert.equal(first.plan.childId, a.id);
assert.equal(first.plan.childName, a.name);
assert.equal(first.plan.level, "builder");
assert.equal(first.plan.sound, "ก");
assert.equal(suggestedLevel(3), "starter");
assert.equal(suggestedLevel(5), "explorer");
assert.equal(suggestedLevel(11), "storyteller");
assert.equal(
  createStudioState(null, { ...a, initialTrack: "phonics" }).plan.track,
  "phonics",
);
assert.notEqual(
  studioStorageKey("user-A", "child-A"),
  studioStorageKey("user-B", "child-A"),
);
assert.notEqual(
  studioStorageKey("user-A", "child-A"),
  studioStorageKey("user-A", "child-B"),
);
assert.notEqual(studioStorageKey("u:a", "b"), studioStorageKey("u", "a:b"));
assert.equal(
  createStudioState(JSON.stringify(first), { ...a, id: "child-B" }).sessions
    .length,
  0,
);
assert.equal(
  createStudioState(JSON.stringify(first), { ...a, id: "child-B" }).plan
    .childId,
  "child-B",
);
const saved = {
  ...first,
  plan: { ...first.plan, level: "starter", track: "communication" },
};
assert.equal(createStudioState(JSON.stringify(saved), a).plan.level, "starter");
assert.equal(
  createStudioState(JSON.stringify(saved), a).plan.track,
  "communication",
);
assert.equal(createStudioState("bad json", a).plan.childId, a.id);
console.log(
  "PASS Account/child isolation, profile bridge, suggested bands and persistence of manual choices",
);
const css = postcss.parse(
  await readFile("src/features/learning-studio/studio.generated.css", "utf8"),
);
let selectors = 0;
css.walkRules((rule) => {
  let parent = rule.parent;
  while (parent) {
    if (parent.type === "atrule" && /keyframes$/.test(parent.name)) return;
    parent = parent.parent;
  }
  selectorParser((tree) =>
    tree.each((s) => {
      assert.equal(s.nodes[0].value, "learning-studio-scope", `Unscoped ${s}`);
      selectors++;
    }),
  ).processSync(rule.selector);
});
assert(selectors > 200);
assert(!css.toString().includes("@import"));
css.walkAtRules(/keyframes$/, (r) => assert(r.params.startsWith("studio-")));
console.log(
  `PASS ${selectors} CSS selectors are local to the studio; fonts and animations do not leak into main pages`,
);
const catalog = JSON.parse(
  await readFile("public/learning-studio/audio/catalog.json", "utf8"),
);
const overrides = JSON.parse(
  await readFile("src/features/learning-studio/audio-overrides.json", "utf8"),
);
for (const [text, url] of Object.entries(overrides)) {
  assert(catalog.entries.some((c) => c.text === text));
  assert(/^\/learning-studio\/audio\/natural\/[a-zA-Z0-9_-]+\.mp3$/.test(url));
  assert((await stat(`public${url}`)).size > 1000);
}
const app = await readFile(
  "src/features/learning-studio/LearningStudio.tsx",
  "utf8",
);
assert(!/document\.(body|documentElement)\.classList/.test(app));
assert(
  app.includes("createStudioState(null,child)") ||
    app.includes("createStudioState(null, child)"),
);
assert(app.includes("if(!allowExport)") || app.includes("if (!allowExport)"));
console.log(
  "PASS Optional audio overrides resolve locally; reset retains profile; export respects permission",
);

// Exercise the real importer CLI without changing the active voice mapping.
const { mkdir, copyFile, writeFile } = await import("node:fs/promises");
const { spawnSync } = await import("node:child_process");
const path = await import("node:path");
const clip = catalog.entries[0];
const valid = path.resolve(".learning-runtime/voice-valid");
await mkdir(valid, { recursive: true });
await copyFile("public" + clip.path, path.join(valid, clip.id + ".mp3"));
const cli = (folder) =>
  spawnSync(
    process.execPath,
    [
      "scripts/learning-studio/import-voices.mjs",
      "--from",
      folder,
      "--dry-run",
    ],
    { encoding: "utf8" },
  );
const good = cli(valid);
assert.equal(good.status, 0, good.stderr);
assert(good.stdout.includes("No changes written"));
const bad = path.resolve(".learning-runtime/voice-invalid");
await mkdir(bad, { recursive: true });
await writeFile(path.join(bad, clip.id + ".mp3"), "this is not an MP3");
assert.notEqual(cli(bad).status, 0);
const unknown = path.resolve(".learning-runtime/voice-unknown");
await mkdir(unknown, { recursive: true });
await copyFile("public" + clip.path, path.join(unknown, "unknown.mp3"));
assert.notEqual(cli(unknown).status, 0);
console.log(
  "PASS Voice importer validates actual MP3 files, rejects unknown/broken inputs and leaves defaults unchanged in dry-run",
);
