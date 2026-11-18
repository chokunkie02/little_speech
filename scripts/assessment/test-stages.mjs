// Stage-by-stage test of the central assessment, through the REAL POST /api/assessment/evaluate.
//
// Only two things are faked: @supabase/supabase-js (in-memory, scripts/assessment/fakes/supabase.mjs)
// and the network call to OpenAI (globalThis.fetch). Auth, child access, policy lookup, school
// criteria, audio checks, scoring and the per-stage decision all run the production code.
//
// Usage: npm run assessment:test-stages        (add --json for a machine-readable report)
// A report is also written to .learning-runtime/assessment-stages/report.json.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const OUT = ".learning-runtime/assessment-stages";
await mkdir(OUT, { recursive: true });
const fake = resolve("scripts/assessment/fakes/supabase.mjs");
await build({
  stdin: {
    contents: `
      export { POST } from "./src/app/api/assessment/evaluate/route.ts";
      export * as policy from "./src/lib/assessment/policy.ts";
      export * as openai from "./src/lib/assessment/openai.ts";
      export { getStages } from "./src/features/learning-studio/curriculum.ts";
      export { fakeState, resetFakeState } from ${JSON.stringify(fake)};`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: `${OUT}/bundle.js`,
  logLevel: "error",
  plugins: [
    {
      name: "fake-supabase",
      setup(b) {
        b.onResolve({ filter: /^@supabase\/supabase-js$/ }, () => ({ path: fake }));
      },
    },
  ],
});
const app = await import(`../../${OUT}/bundle.js`);
const { POST, policy, openai, getStages, fakeState, resetFakeState } = app;

// ── The design we test against (handoff §5/§8 and the migration seed), not read from the code ──
const DESIGN = {
  listen: { track: "speech", ai: false },
  imitate: { track: "speech", ai: true },
  syllables: { track: "speech", ai: true },
  words: { track: "speech", ai: true },
  sentences: { track: "speech", ai: true },
  transfer: { track: "speech", ai: false },
  understand: { track: "communication", ai: false },
  request: { track: "communication", ai: false },
  story: { track: "communication", ai: false },
  letter: { track: "phonics", ai: false },
  blend: { track: "phonics", ai: true },
  read: { track: "phonics", ai: true },
};
const TRACKS = ["speech", "phonics", "communication"];
const SOUNDS = ["ป", "ก", "ม"];
const LEVELS = ["starter", "explorer", "builder", "storyteller"];
const DEFAULTS = { passScore: 75, practiceScore: 55, minCompleteness: 70, minConfidence: 0.6 };

// ── Results ───────────────────────────────────────────────────────────────────
const checks = [];
const stageRows = new Map();
function record(name, run, stageId) {
  try {
    run();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, detail: error.message });
  }
  if (stageId) {
    const row = stageRows.get(stageId);
    row.total++;
    if (checks.at(-1).ok) row.passed++;
    else row.failures.push(name);
  }
}
async function recordAsync(name, run) {
  try {
    await run();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, detail: error.message });
  }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://fake-supabase.local";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service-role";
process.env.ASSESSMENT_SPEECH_PROVIDER = "openai";
process.env.ASSESSMENT_OPENAI_API_KEY = "sk-fixture-key-not-a-secret";
delete process.env.OPENAI_ASSESSMENT_TRANSCRIBE_MODEL;

const HOME_CHILD = randomUUID();
const SCHOOL_CHILD = randomUUID();
const ORG = randomUUID();
const PARENT = { id: randomUUID(), app_metadata: {} };
const STRANGER = { id: randomUUID(), app_metadata: {} };

function seed({ enabled = true, allowSchoolAi = false, schoolSettings } = {}) {
  const state = resetFakeState();
  state.rateLimit = false;
  state.users = { "parent-token": PARENT, "stranger-token": STRANGER };
  state.access = { [PARENT.id]: [HOME_CHILD, SCHOOL_CHILD] };
  state.tables.assessment_policy_state = [{ id: "global", published_id: "policy-1" }];
  state.tables.assessment_policy_versions = [
    {
      id: "policy-1",
      version: 7,
      published_at: new Date().toISOString(),
      config: { ...structuredClone(policy.DEFAULT_POLICY), enabled, allowSchoolAi },
    },
  ];
  state.tables.child_profiles = [
    { id: HOME_CHILD, organization_id: null },
    { id: SCHOOL_CHILD, organization_id: ORG },
  ];
  state.tables.school_assessment_versions = schoolSettings
    ? [{ id: "school-v1", organization_id: ORG, revision: 3, settings: schoolSettings, created_at: new Date().toISOString() }]
    : [];
  return state;
}

function wav({ amplitude = 6000, ms = 1000 } = {}) {
  const samples = Math.round(16 * ms);
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(16000, 24);
  bytes.writeUInt32LE(32000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) bytes.writeInt16LE(Math.round(amplitude * Math.sin(i / 3)), 44 + i * 2);
  return bytes;
}

// ── Fake OpenAI ───────────────────────────────────────────────────────────────
let openaiCalls = [];
let openaiReply = () => Response.json({ text: "", logprobs: [] });
globalThis.fetch = async (url, options) => {
  if (!String(url).startsWith("https://api.openai.com/")) throw new Error(`unexpected network call: ${url}`);
  const form = options.body;
  openaiCalls.push({
    url: String(url),
    auth: options.headers.Authorization,
    fields: Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string")),
    include: form.getAll("include[]"),
    fileType: form.get("file")?.type,
  });
  return openaiReply(form);
};
const hears = (text, logprob = -0.05) => () => Response.json({ text, logprobs: [...text].map((token) => ({ token, logprob })) });

// ── Calling the real route ────────────────────────────────────────────────────
async function evaluate({ token = "parent-token", childId = HOME_CHILD, item, stage, track, sound, level, selectedChoice, adultReview, adultOnly, audio, requestId = randomUUID() }) {
  const form = new FormData();
  form.append(
    "context",
    JSON.stringify({
      requestId,
      childId,
      sessionId: "stage-test",
      track,
      sound,
      level,
      stageId: stage.id,
      itemId: item.id,
      ...(selectedChoice ? { selectedChoice } : {}),
      ...(adultReview ? { adultReview } : {}),
      ...(adultOnly !== undefined ? { adultOnly } : {}),
    }),
  );
  if (audio) form.append("audio", new File([audio], "attempt.wav", { type: "audio/wav" }));
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await POST(new Request("http://localhost/api/assessment/evaluate", { method: "POST", headers, body: form }));
  return { status: response.status, body: await response.json(), requestId };
}

// ── 1. Central policy matches the design ─────────────────────────────────────
for (const [stageId, design] of Object.entries(DESIGN)) {
  const definition = policy.STAGE_DEFINITIONS.find((stage) => stage.id === stageId);
  stageRows.set(stageId, { stageId, label: definition?.label ?? "?", track: design.track, ai: design.ai, items: 0, methods: {}, total: 0, passed: 0, failures: [] });
  record(`[${stageId}] default rule matches the design`, () => {
    assert.ok(definition, "stage missing from STAGE_DEFINITIONS");
    assert.equal(definition.track, design.track);
    assert.equal(definition.automatic, design.ai);
    const rule = policy.DEFAULT_POLICY.rules.find((rule) => rule.stageId === stageId);
    assert.equal(rule.mode, design.ai ? "azure" : "adult", "rule.mode (\"azure\" = AI checks speech)");
    assert.equal(rule.passScore, DEFAULTS.passScore);
    assert.equal(rule.practiceScore, DEFAULTS.practiceScore);
    assert.equal(rule.minCompleteness, DEFAULTS.minCompleteness);
  }, stageId);
}
record("No stage exists in code that the design does not know about", () =>
  assert.deepEqual(policy.STAGE_DEFINITIONS.map((stage) => stage.id).sort(), Object.keys(DESIGN).sort()),
);
record("Default policy keeps AI off and uses the agreed POC thresholds", () => {
  assert.equal(policy.DEFAULT_POLICY.enabled, false);
  assert.equal(policy.DEFAULT_POLICY.minConfidence, DEFAULTS.minConfidence);
  assert.equal(policy.DEFAULT_POLICY.minDurationMs, 350);
  assert.equal(policy.DEFAULT_POLICY.maxDurationMs, 30000);
});

// ── 2. Every curriculum item through the real route, AI on, home child ──────
seed({ enabled: true });
let itemCount = 0;
for (const track of TRACKS)
  for (const sound of SOUNDS)
    for (const level of LEVELS)
      for (const stage of getStages(track, sound, level)) {
        const row = stageRows.get(stage.id);
        for (const item of stage.items) {
          itemCount++;
          row.items++;
          const at = `${track}/${sound}/${level}/${stage.id}/${item.id}`;
          const base = { item, stage, track, sound, level };
          if (item.kind === "choice") {
            row.methods.rules = (row.methods.rules ?? 0) + 1;
            const right = await evaluate({ ...base, selectedChoice: item.answer });
            record(`${at} right choice → achieved by answer key`, () => {
              assert.equal(right.status, 200, JSON.stringify(right.body));
              assert.equal(right.body.source, "rules");
              assert.equal(right.body.outcome, "achieved");
            }, stage.id);
            const wrongChoice = item.choices.find((choice) => choice.id !== item.answer);
            if (wrongChoice) {
              const wrong = await evaluate({ ...base, selectedChoice: wrongChoice.id });
              record(`${at} wrong choice → practice`, () => {
                assert.equal(wrong.body.source, "rules");
                assert.equal(wrong.body.outcome, "practice");
              }, stage.id);
            }
            continue;
          }
          if (item.kind === "observation") {
            row.methods.adult = (row.methods.adult ?? 0) + 1;
            const pending = await evaluate(base);
            const reviewed = await evaluate({ ...base, adultReview: "achieved" });
            record(`${at} observation → adult review, adult result kept`, () => {
              assert.equal(pending.body.source, "adult");
              assert.equal(pending.body.outcome, "needs_review");
              assert.equal(reviewed.body.source, "adult");
              assert.equal(reviewed.body.outcome, "achieved");
            }, stage.id);
            continue;
          }
          const aiItem = DESIGN[stage.id].ai && !item.hidePrompt;
          if (aiItem) {
            row.methods.ai = (row.methods.ai ?? 0) + 1;
            openaiCalls = [];
            openaiReply = hears(item.sample);
            const result = await evaluate({ ...base, audio: wav() });
            record(`${at} speech "${item.sample}" said correctly → OpenAI, achieved`, () => {
              assert.equal(result.status, 200, JSON.stringify(result.body));
              assert.equal(result.body.source, "openai");
              assert.equal(result.body.outcome, "achieved");
              assert.equal(result.body.policyVersion, 7);
              assert.equal(openaiCalls.length, 1, "exactly one OpenAI call");
              for (const value of Object.values(openaiCalls[0].fields))
                assert.ok(!value.includes(item.sample), "target text must not be sent to OpenAI");
            }, stage.id);
          } else {
            row.methods.adult = (row.methods.adult ?? 0) + 1;
            openaiCalls = [];
            const result = await evaluate(base);
            record(`${at} speech ${item.hidePrompt ? "from a picture (hidePrompt)" : "in an adult-checked stage"} → adult review, no AI`, () => {
              assert.equal(result.body.source, "adult");
              assert.equal(result.body.outcome, "needs_review");
              assert.equal(openaiCalls.length, 0);
            }, stage.id);
          }
        }
      }
record("Curriculum still has 432 activities", () => assert.equal(itemCount, 432));
// Matches ANSWER_KEY_STAGES in src/components/assessment/AssessmentAdmin.tsx (the "ตรวจจากเฉลย" badge).
record("Stages labelled 'ตรวจจากเฉลย' in the admin page are exactly the choice-only stages", () =>
  assert.deepEqual(
    [...stageRows.values()].filter((row) => Object.keys(row.methods).join() === "rules").map((row) => row.stageId).sort(),
    ["letter", "listen", "understand"],
  ),
);

// ── 3. Speech scenarios on one AI item ───────────────────────────────────────
const pick = (stageId, test = () => true) => {
  for (const track of TRACKS)
    for (const level of LEVELS) {
      const stage = getStages(track, "ป", level).find((stage) => stage.id === stageId);
      const item = stage?.items.find((item) => item.kind === "speech" && !item.hidePrompt && test(item));
      if (item) return { item, stage, track, sound: "ป", level };
    }
  throw new Error(`no speech item in ${stageId}`);
};
const word = pick("words");
const long = pick("sentences", (item) => [...openai.normalizeThai(item.sample)].length >= 12);
const swapFirst = (text) => (text.startsWith("ป") ? "บ" + text.slice(1) : "บ" + text);

async function scenario(name, setup, expect) {
  await recordAsync(name, async () => {
    const env = { ...process.env };
    try {
      openaiCalls = [];
      const result = await setup();
      expect(result.body, result);
    } finally {
      for (const key of ["ASSESSMENT_OPENAI_API_KEY", "ASSESSMENT_SPEECH_PROVIDER"]) {
        if (env[key] === undefined) delete process.env[key];
        else process.env[key] = env[key];
      }
    }
  });
}

seed({ enabled: true });
await scenario(`Said the word right ("${word.item.sample}") → achieved`, () => {
  openaiReply = hears(word.item.sample);
  return evaluate({ ...word, audio: wav() });
}, (body) => {
  assert.equal(body.outcome, "achieved");
  assert.equal(body.score, 100);
  assert.equal(body.transcript, word.item.sample);
});
await scenario(`Wrong first consonant ("${swapFirst(word.item.sample)}") → not achieved`, () => {
  openaiReply = hears(swapFirst(word.item.sample));
  return evaluate({ ...word, audio: wav() });
}, (body) => {
  assert.equal(body.source, "openai");
  assert.notEqual(body.outcome, "achieved");
});
await scenario("Said the word twice → practice (extra words), not achieved", () => {
  openaiReply = hears(`${word.item.sample} ${word.item.sample}`);
  return evaluate({ ...word, audio: wav() });
}, (body) => assert.equal(body.outcome, "practice"));
await scenario("Unsure transcription (low confidence) → adult review even with a perfect match", () => {
  openaiReply = hears(word.item.sample, -2);
  return evaluate({ ...word, audio: wav() });
}, (body) => {
  assert.equal(body.source, "openai");
  assert.equal(body.outcome, "needs_review");
  assert.ok(body.confidence < DEFAULTS.minConfidence);
});
await scenario("Model returns no confidence at all → adult review", () => {
  openaiReply = () => Response.json({ text: word.item.sample });
  return evaluate({ ...word, audio: wav() });
}, (body) => assert.equal(body.outcome, "needs_review"));
await scenario("Nothing recognised → unavailable, no score invented", () => {
  openaiReply = () => Response.json({ text: "", logprobs: [] });
  return evaluate({ ...word, audio: wav() });
}, (body) => {
  assert.equal(body.reason, "no_recognition");
  assert.equal(body.score, undefined);
});
await scenario("Silent clip → rejected before calling OpenAI", () => evaluate({ ...word, audio: wav({ amplitude: 0 }) }), (body) => {
  assert.equal(body.reason, "audio_quality");
  assert.equal(openaiCalls.length, 0);
});
await scenario("Clip shorter than 0.35 s → rejected before calling OpenAI", () => evaluate({ ...word, audio: wav({ ms: 200 }) }), (body) => {
  assert.equal(body.reason, "audio_quality");
  assert.equal(openaiCalls.length, 0);
});
await scenario("AI item without a recording → asked to record first", () => evaluate(word), (body, result) => {
  assert.equal(result.status, 400);
  assert.match(body.error, /อัดเสียง/);
});
await scenario("Recorded attempt saved without an AI check (adultOnly) → waits for an adult, no audio, no AI call", () =>
  evaluate({ ...word, adultOnly: true }), (body, result) => {
  assert.equal(result.status, 200, JSON.stringify(body));
  assert.equal(body.source, "adult");
  assert.equal(body.outcome, "needs_review");
  assert.equal(body.reason, "not_sent_to_ai");
  assert.equal(openaiCalls.length, 0);
});
await scenario("adultOnly on an adult-checked speech item → still adult review", () => {
  let adultSpeech;
  for (const track of TRACKS)
    for (const level of LEVELS)
      for (const stage of getStages(track, "ป", level))
        for (const item of stage.items)
          if (!adultSpeech && item.kind === "speech" && (!DESIGN[stage.id].ai || item.hidePrompt))
            adultSpeech = { item, stage, track, sound: "ป", level };
  assert.ok(adultSpeech, "no adult-checked speech item in the curriculum");
  return evaluate({ ...adultSpeech, adultOnly: true });
}, (body) => {
  assert.equal(body.source, "adult");
  assert.equal(body.outcome, "needs_review");
});
await scenario("adultOnly must be exactly true (no other values accepted)", () =>
  evaluate({ ...word, adultOnly: "yes" }), (_body, result) => assert.equal(result.status, 400));
for (const [status, reason] of [[401, "provider_auth_failed"], [429, "provider_rate_limited"], [500, "provider_failed"]])
  await scenario(`OpenAI answers ${status} → unavailable (${reason}), no score`, () => {
    openaiReply = () => new Response("{}", { status });
    return evaluate({ ...word, audio: wav() });
  }, (body) => {
    assert.equal(body.outcome, "unavailable");
    assert.equal(body.reason, reason);
    assert.equal(body.score, undefined);
  });
await scenario("Network failure / timeout → unavailable (provider_timeout)", () => {
  openaiReply = () => {
    throw new TypeError("fetch failed");
  };
  return evaluate({ ...word, audio: wav() });
}, (body) => assert.equal(body.reason, "provider_timeout"));
await scenario("No key on the server → unavailable (provider_not_configured), no call", () => {
  delete process.env.ASSESSMENT_OPENAI_API_KEY;
  return evaluate({ ...word, audio: wav() });
}, (body) => {
  assert.equal(body.reason, "provider_not_configured");
  assert.equal(openaiCalls.length, 0);
});
await scenario("OpenRouter key (sk-or-…) is treated as not configured", () => {
  process.env.ASSESSMENT_OPENAI_API_KEY = "sk-or-v1-fixture";
  return evaluate({ ...word, audio: wav() });
}, (body) => assert.equal(body.reason, "provider_not_configured"));
await scenario("OpenAI request: Thai, WAV, logprobs, own key variable, no prompt", () => {
  openaiReply = hears(word.item.sample);
  return evaluate({ ...word, audio: wav() });
}, () => {
  const call = openaiCalls[0];
  assert.equal(call.url, "https://api.openai.com/v1/audio/transcriptions");
  assert.equal(call.auth, "Bearer sk-fixture-key-not-a-secret");
  assert.equal(call.fields.language, "th");
  assert.equal(call.fields.model, "gpt-4o-transcribe");
  assert.deepEqual(call.include, ["logprobs"]);
  assert.equal(call.fields.prompt, undefined);
  assert.equal(call.fileType, "audio/wav");
});

// Idempotency, permissions and rate limit
await scenario("Same request sent twice → same result, OpenAI called once", async () => {
  openaiReply = hears(word.item.sample);
  const audio = wav();
  const first = await evaluate({ ...word, audio });
  const second = await evaluate({ ...word, audio, requestId: first.requestId });
  assert.deepEqual(second.body, first.body);
  return second;
}, () => assert.equal(openaiCalls.length, 1));
await scenario("Same request id with different audio → 409", async () => {
  openaiReply = hears(word.item.sample);
  const first = await evaluate({ ...word, audio: wav() });
  return evaluate({ ...word, audio: wav({ amplitude: 9000 }), requestId: first.requestId });
}, (_body, result) => assert.equal(result.status, 409));
await scenario("Adult without access to the child → 403", () => evaluate({ ...word, token: "stranger-token", audio: wav() }), (_body, result) =>
  assert.equal(result.status, 403),
);
await scenario("Not signed in → 401", () => evaluate({ ...word, token: null, audio: wav() }), (_body, result) => assert.equal(result.status, 401));
await scenario("13th new request in a minute → 429 (database rate limit)", async () => {
  fakeState().rateLimit = true;
  openaiReply = hears(word.item.sample);
  let last;
  for (let i = 0; i < 13; i++) last = await evaluate({ ...word, audio: wav() });
  fakeState().rateLimit = false;
  return last;
}, (_body, result) => assert.equal(result.status, 429));

// AI switched off
seed({ enabled: false });
await scenario("Admin has not enabled AI → adult review (ai_disabled), no call", () => evaluate({ ...word, audio: wav() }), (body) => {
  assert.equal(body.source, "adult");
  assert.equal(body.reason, "ai_disabled");
  assert.equal(openaiCalls.length, 0);
});

// ── 4. School criteria ───────────────────────────────────────────────────────
// A transcript that scores between the central pass mark (75) and a school's stricter one (90).
let between;
for (let cut = 1; cut < 10 && !between; cut++) {
  const chars = [...long.item.sample];
  const heard = chars.slice(0, chars.length - cut).join("");
  const scores = openai.scoreTranscript(long.item.sample, heard);
  if (scores.score >= 76 && scores.score <= 89 && scores.accuracy >= 76 && scores.accuracy <= 89 && scores.completeness >= 70) between = heard;
}
const strict = { aiEnabled: true, reviewers: "teacher", overrides: [{ stageId: "sentences", passScore: 90 }] };
if (!between) record("School criteria fixture: found a transcript scoring 76–89", () => assert.fail(`no fitting cut of "${long.item.sample}"`));
else {
  seed({ enabled: true, allowSchoolAi: true, schoolSettings: strict });
  await scenario(`Family child, same answer ("${between}") → achieved under central pass 75`, () => {
    openaiReply = hears(between);
    return evaluate({ ...long, audio: wav() });
  }, (body) => {
    assert.equal(body.outcome, "achieved");
    assert.equal(body.rule.passScore, 75);
    assert.equal(body.schoolRevision, undefined);
  });
  await scenario("School child, same answer → practice under the school's pass 90", () => {
    openaiReply = hears(between);
    return evaluate({ ...long, childId: SCHOOL_CHILD, audio: wav() });
  }, (body) => {
    assert.equal(body.outcome, "practice");
    assert.equal(body.rule.passScore, 90);
    assert.equal(body.schoolRevision, 3);
  });
  seed({ enabled: true, allowSchoolAi: false, schoolSettings: strict });
  await scenario("School child when the platform does not allow school AI → adult review", () => evaluate({ ...long, childId: SCHOOL_CHILD, audio: wav() }), (body) => {
    assert.equal(body.reason, "ai_disabled");
    assert.equal(openaiCalls.length, 0);
  });
  seed({ enabled: true, allowSchoolAi: true, schoolSettings: { ...strict, aiEnabled: false } });
  await scenario("School that switched its own AI off → adult review", () => evaluate({ ...long, childId: SCHOOL_CHILD, audio: wav() }), (body) =>
    assert.equal(body.reason, "ai_disabled"),
  );
  seed({ enabled: true, allowSchoolAi: true, schoolSettings: { ...strict, overrides: [{ stageId: "sentences", passScore: 99 }] } });
  await scenario("School value above the frame (99) is clamped to the frame edge (90)", () => {
    openaiReply = hears(long.item.sample);
    return evaluate({ ...long, childId: SCHOOL_CHILD, audio: wav() });
  }, (body) => assert.equal(body.rule.passScore, 90));
}

// ── Report ────────────────────────────────────────────────────────────────────
const failed = checks.filter((check) => !check.ok);
const stages = [...stageRows.values()];
await writeFile(`${OUT}/report.json`, JSON.stringify({ date: new Date().toISOString(), items: itemCount, checks: checks.length, failed, stages }, null, 2));
if (process.argv.includes("--json")) console.log(JSON.stringify({ items: itemCount, checks: checks.length, failed, stages }, null, 2));
else {
  console.log("\nStage results (real /api/assessment/evaluate, fake database and fake OpenAI)\n");
  console.log("stage        track          method       items  checks");
  for (const row of stages) {
    const methods = Object.entries(row.methods).map(([key, value]) => `${key} ${value}`).join(", ") || "-";
    console.log(
      `${row.failures.length ? "FAIL" : "PASS"} ${row.stageId.padEnd(11)} ${row.track.padEnd(14)} ${(row.ai ? "AI+adult" : "adult/key").padEnd(12)} ${String(row.items).padStart(5)}  ${row.passed}/${row.total}  (${methods})`,
    );
  }
  const scenarios = checks.filter((check) => !check.name.startsWith("[") && !/^(speech|phonics|communication)\//.test(check.name));
  console.log("\nScenarios");
  for (const check of scenarios) console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}${check.ok ? "" : `\n     ${check.detail}`}`);
  for (const check of failed.filter((check) => !scenarios.includes(check))) console.log(`FAIL ${check.name}\n     ${check.detail}`);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed across ${itemCount} activities. Fake database and fake OpenAI: not live results.`);
}
process.exitCode = failed.length ? 1 : 0;
