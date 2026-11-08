import { build } from "esbuild";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir(".learning-runtime", { recursive: true });
await build({
  entryPoints: [
    "src/features/learning-studio/domain.ts",
    "src/features/learning-studio/curriculum.ts",
  ],
  bundle: true,
  platform: "node",
  format: "esm",
  outdir: ".learning-runtime/tests",
});
const d = await import("../../.learning-runtime/tests/domain.js");
const { getStages } =
  await import("../../.learning-runtime/tests/curriculum.js");
let checks = 0;
function check(name, fn) {
  fn();
  checks++;
  console.log("PASS " + name);
}
check("Malformed or incompatible saved state recovers safely", () => {
  for (const raw of ["x", "null", "{}", '{"schemaVersion":2}'])
    assert.equal(d.readState(raw).schemaVersion, 1);
  const s = d.initialState();
  s.plan.selectedItems = "bad";
  assert.deepEqual(d.readState(JSON.stringify(s)).sessions, []);
});
check(
  "All three goals and all sound groups have valid unique activities",
  () => {
    for (const track of ["speech", "communication", "phonics"])
      for (const sound of ["ป", "ก", "ม"]) {
        const stages = getStages(track, sound);
        assert.equal(stages.length, track === "speech" ? 6 : 3);
        const ids = new Set();
        for (const stage of stages) {
          assert.equal(stage.items.length, 3);
          for (const it of stage.items) {
            assert(!ids.has(it.id));
            ids.add(it.id);
            assert.equal(it.stageId, stage.id);
            if (it.kind === "choice") {
              assert(it.choices.some((c) => c.id === it.answer));
              assert.equal(
                new Set(it.choices.map((c) => c.id)).size,
                it.choices.length,
              );
            }
          }
        }
      }
  },
);
check("Cannot advance without saving an answer", () => {
  const s = d.startSession(d.initialState(), getStages("speech", "ป")[0]);
  const a = d.advanceSession(s.state, s.session.id);
  assert.equal(a.done, false);
  assert.equal(a.state.sessions[0].index, 0);
});
check(
  "Saving twice is idempotent and completing does not duplicate results",
  () => {
    const st = getStages("speech", "ป")[0];
    let { state, session } = d.startSession(d.initialState(), st);
    for (const item of st.items) {
      const answer = {
        id: d.uid(),
        itemId: item.id,
        createdAt: d.now(),
        kind: "choice",
        mode: "choice",
        choiceCorrect: true,
        support: "independent",
        review: "achieved",
        retries: 0,
      };
      state = d.saveAttempt(state, session.id, answer);
      state = d.saveAttempt(state, session.id, answer);
      state = d.advanceSession(state, session.id).state;
    }
    assert.equal(state.sessions[0].attempts.length, 3);
    assert.equal(state.sessions[0].status, "completed");
    assert.equal(state.activeSessionId, undefined);
    assert.equal(d.metrics(state.sessions).listeningCorrect, 3);
    assert.equal(d.advanceSession(state, session.id).done, false);
  },
);
check("Pause and reload resume the exact saved mission", () => {
  const st = getStages("speech", "ป")[0];
  let { state, session } = d.startSession(d.initialState(), st);
  state = d.saveAttempt(state, session.id, {
    id: d.uid(),
    itemId: st.items[0].id,
    createdAt: d.now(),
    kind: "choice",
    mode: "choice",
    choiceCorrect: false,
    support: "independent",
    review: "achieved",
    retries: 0,
  });
  state = d.advanceSession(state, session.id).state;
  const restored = d.readState(JSON.stringify(state));
  const resumed = d.startSession(restored, st);
  assert.equal(resumed.session.id, session.id);
  assert.equal(resumed.session.index, 1);
});
check(
  "A one-item library trial is not replaced by an existing three-item round",
  () => {
    const st = getStages("speech", "ป")[0];
    const a = d.startSession(d.initialState(), st);
    const b = d.startSession(a.state, st, [st.items[2].id]);
    assert.notEqual(a.session.id, b.session.id);
    assert.deepEqual(b.session.itemIds, [st.items[2].id]);
    assert.throws(() => d.startSession(a.state, st, ["missing"]));
  },
);
check("Speech participation is independent of adult mastery review", () => {
  const st = getStages("speech", "ป")[1];
  let { state, session } = d.startSession(d.initialState(), st, [
    st.items[0].id,
  ]);
  state = d.saveAttempt(state, session.id, {
    id: d.uid(),
    itemId: st.items[0].id,
    createdAt: d.now(),
    kind: "speech",
    mode: "demo",
    support: "modeled",
    review: "pending",
    retries: 0,
  });
  state = d.advanceSession(state, session.id).state;
  assert.equal(d.metrics(state.sessions).pending, 1);
  assert.equal(d.metrics(state.sessions).listeningTotal, 0);
  assert.equal(d.metrics(state.sessions).participation, 1);
  state = d.reviewSession(state, session.id, "unavailable", "ไม่ได้ฟังจริง");
  assert.equal(d.metrics(state.sessions).pending, 0);
  assert.equal(d.metrics(state.sessions).reviewed, 0);
});
console.log(`${checks} meaningful workflow checks passed`);
