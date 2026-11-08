import { build } from "esbuild";
import { readFile, stat } from "node:fs/promises";
import assert from "node:assert/strict";
await build({
  entryPoints: [
    "src/features/learning-studio/curriculum.ts",
    "src/features/learning-studio/audio-manifest.ts",
    "src/features/learning-studio/useSpeaker.ts",
  ],
  bundle: true,
  platform: "node",
  format: "esm",
  outdir: ".learning-runtime/asset-tests",
});
const { getStages } =
  await import("../../.learning-runtime/asset-tests/curriculum.js");
const { AUDIO_FILES } =
  await import("../../.learning-runtime/asset-tests/audio-manifest.js");
const { VOICE_CUES } =
  await import("../../.learning-runtime/asset-tests/useSpeaker.js");
const catalog = JSON.parse(
  await readFile("public/learning-studio/audio/catalog.json", "utf8"),
);
for (const level of ["starter", "explorer", "builder", "storyteller"])
  for (const track of ["speech", "communication", "phonics"])
    for (const sound of ["ป", "ก", "ม"])
      for (const stage of getStages(track, sound, level))
        for (const item of stage.items)
          for (const text of [item.sample, item.instruction])
            assert(AUDIO_FILES[text], `Missing audio: ${text}`);
for (const text of Object.values(VOICE_CUES))
  assert(AUDIO_FILES[text], `Missing narration: ${text}`);
assert.equal(catalog.entries.length, 160);
for (const clip of catalog.entries) {
  assert.equal(AUDIO_FILES[clip.text], clip.path);
  assert(clip.duration > 0);
  assert.equal((await stat("public" + clip.path)).size, clip.bytes);
  assert(clip.bytes > 1000);
}
console.log(
  "PASS All activity samples, instructions and narration have bundled audio (160 valid files)",
);
