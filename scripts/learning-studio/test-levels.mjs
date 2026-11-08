import { build } from "esbuild";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
await build({
  entryPoints: [
    "src/features/learning-studio/domain.ts",
    "src/features/learning-studio/curriculum.ts",
    "src/features/learning-studio/SceneArt.tsx",
    "src/features/learning-studio/learning-levels.ts",
  ],
  bundle: true,
  platform: "node",
  format: "esm",
  outdir: ".learning-runtime/level-tests",
  jsx: "automatic",
});
const d = await import("../../.learning-runtime/level-tests/domain.js");
const { getStages } =
  await import("../../.learning-runtime/level-tests/curriculum.js");
const { LEVELS } =
  await import("../../.learning-runtime/level-tests/learning-levels.js");
const { SCENE_KINDS } =
  await import("../../.learning-runtime/level-tests/SceneArt.js");
const known = new Set([
  ...SCENE_KINDS,
  "crab",
  "snake",
  "eye",
  "mouth",
  "chicken",
  "crow",
  "cat",
  "fish",
  "cup",
  "ball",
  "hand",
  "aunt",
  "rice",
  "garden",
  "tree",
  "letter",
]);
let count = 0;
for (const level of LEVELS)
  for (const track of ["speech", "communication", "phonics"])
    for (const sound of ["ป", "ก", "ม"]) {
      const stages = getStages(track, sound, level.id),
        ids = new Set();
      assert.equal(stages.length, track === "speech" ? 6 : 3);
      for (const stage of stages) {
        assert.equal(stage.items.length, 3);
        for (const it of stage.items) {
          count++;
          assert(!ids.has(it.id));
          ids.add(it.id);
          assert.equal(it.stageId, stage.id);
          assert(known.has(it.art), `Unknown image ${it.art}`);
          if (it.kind === "choice") {
            assert(it.choices.some((o) => o.id === it.answer));
            assert.equal(
              new Set(it.choices.map((o) => o.id)).size,
              it.choices.length,
            );
            assert(it.choices.every((o) => known.has(o.art)));
            assert(
              !it.instruction.includes(it.sample),
              "Listening instruction leaks target",
            );
          }
        }
      }
    }
assert.equal(count, 432);
console.log(
  "PASS 432 activities across four levels, three goals and three sound groups have valid media and choice data",
);
for (const track of ["speech", "communication", "phonics"]) {
  const a = getStages(track, "ป", "starter")
    .flatMap((s) => s.items)
    .map((i) => i.prompt)
    .join("|");
  const b = getStages(track, "ป", "storyteller")
    .flatMap((s) => s.items)
    .map((i) => i.prompt)
    .join("|");
  assert.notEqual(a, b);
}
console.log(
  "PASS Higher content levels change real prompts in every learning goal",
);
const old = d.initialState();
delete old.plan.level;
const st = getStages("speech", "ป")[0];
let { state, session } = d.startSession(old, st, [st.items[0].id]);
delete session.level;
state = d.saveAttempt(state, session.id, {
  id: d.uid(),
  itemId: st.items[0].id,
  createdAt: d.now(),
  kind: "choice",
  mode: "choice",
  choiceCorrect: true,
  support: "independent",
  review: "achieved",
  retries: 0,
});
state = d.advanceSession(state, session.id).state;
const restored = d.readState(JSON.stringify(state));
assert.equal(restored.plan.level, "starter");
assert.equal(restored.sessions.length, 1);
assert.equal(
  getStages(
    restored.sessions[0].track,
    restored.sessions[0].sound,
    restored.sessions[0].level,
  )[0].items[0].id,
  st.items[0].id,
);
const higher = {
  ...restored,
  plan: { ...restored.plan, id: d.uid(), level: "storyteller" },
  activeSessionId: undefined,
};
const next = d.startSession(higher, getStages("speech", "ป", "storyteller")[0]);
assert.equal(next.session.level, "storyteller");
assert.equal(next.state.sessions[0].attempts[0].itemId, st.items[0].id);
assert.notEqual(next.session.itemIds[0], st.items[0].id);
assert.equal(
  d.readState(JSON.stringify(next.state)).sessions[1].level,
  "storyteller",
);
console.log(
  "PASS Old history survives migration and keeps its original level when a new level is selected",
);
const catalog = JSON.parse(
  await readFile("public/learning-studio/audio/catalog.json", "utf8"),
);
const sequence = catalog.entries.find((e) => e.text === "ปา ปี ปู ปา");
assert(sequence);
assert.equal(sequence.phrases.length, 4);
assert(sequence.phrases.slice(0, 3).every((p) => p.pauseAfterMs === 320));
const cue = catalog.entries.find((e) => e.kind === "guidance");
assert(cue.phrases.some((p) => p.pauseAfterMs >= 400));
assert.equal(catalog.pitch, "+0Hz");
console.log(
  "PASS Voice assets contain actual phrase directions and syllable pauses without pitch shifting",
);
