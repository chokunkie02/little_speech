import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";

await mkdir(".learning-runtime/assessment-tests", { recursive: true });
await build({
  entryPoints: [
    "src/lib/assessment/policy.ts",
    "src/lib/assessment/wav.ts",
    "src/lib/assessment/azure.ts",
    "src/features/learning-studio/domain.ts",
    "src/features/learning-studio/curriculum.ts",
  ],
  bundle: true,
  platform: "node",
  format: "esm",
  outdir: ".learning-runtime/assessment-tests",
  outbase: "src",
});
const policy = await import(
  "../../.learning-runtime/assessment-tests/lib/assessment/policy.js"
);
const { inspectWav } = await import(
  "../../.learning-runtime/assessment-tests/lib/assessment/wav.js"
);
const azure = await import(
  "../../.learning-runtime/assessment-tests/lib/assessment/azure.js"
);
const domain = await import(
  "../../.learning-runtime/assessment-tests/features/learning-studio/domain.js"
);
const { getStages } = await import(
  "../../.learning-runtime/assessment-tests/features/learning-studio/curriculum.js"
);
let checks = 0;
async function check(name, run) {
  await run();
  checks++;
  console.log("PASS " + name);
}
const rule = policy.DEFAULT_POLICY.rules.find(
  (rule) => rule.stageId === "words",
);
const scores = { score: 80, accuracy: 80, completeness: 90, confidence: 0.8 };

await check(
  "All 432 curriculum items resolve to a central rule without treating open answers as fixed text",
  () => {
    let count = 0;
    for (const track of ["speech", "communication", "phonics"]) {
      for (const sound of ["ป", "ก", "ม"]) {
        for (const level of ["starter", "explorer", "builder", "storyteller"]) {
          for (const stage of getStages(track, sound, level)) {
            assert.ok(
              policy.DEFAULT_POLICY.rules.some(
                (rule) => rule.stageId === stage.id,
              ),
            );
            for (const item of stage.items) {
              assert.equal(item.stageId, stage.id);
              count++;
            }
          }
        }
      }
    }
    assert.equal(count, 432);
  },
);
await check(
  "Draft validation rejects missing or duplicate stages and inverted thresholds",
  () => {
    assert.equal(
      policy.policySchema.safeParse(policy.DEFAULT_POLICY).success,
      true,
    );
    const missing = structuredClone(policy.DEFAULT_POLICY);
    missing.rules[0] = missing.rules[1];
    assert.equal(policy.policySchema.safeParse(missing).success, false);
    const inverted = structuredClone(policy.DEFAULT_POLICY);
    inverted.rules[3].practiceScore = 90;
    assert.equal(policy.policySchema.safeParse(inverted).success, false);
    const unsafe = structuredClone(policy.DEFAULT_POLICY);
    unsafe.rules.find((rule) => rule.stageId === "story").mode = "azure";
    assert.equal(policy.policySchema.safeParse(unsafe).success, false);
  },
);
await check(
  "Low confidence or incomplete speech cannot pass on a high overall score",
  () => {
    assert.equal(policy.judgeSpeech(scores, rule, 0.6).outcome, "achieved");
    assert.equal(
      policy.judgeSpeech({ ...scores, confidence: 0.2 }, rule, 0.6).outcome,
      "needs_review",
    );
    assert.notEqual(
      policy.judgeSpeech({ ...scores, completeness: 5 }, rule, 0.6).outcome,
      "achieved",
    );
    assert.notEqual(
      policy.judgeSpeech({ ...scores, accuracy: 20 }, rule, 0.6).outcome,
      "achieved",
    );
    assert.equal(
      policy.judgeSpeech({ ...scores, score: 40 }, rule, 0.6).outcome,
      "retry",
    );
  },
);
await check(
  "Azure REST scores match the documented flat NBest response and reject missing metrics",
  () => {
    const response = {
      RecognitionStatus: "Success",
      NBest: [
        {
          Confidence: 0.9,
          Display: "ปู",
          AccuracyScore: 85,
          CompletenessScore: 100,
          PronScore: 88,
          FluencyScore: 90,
        },
      ],
    };
    assert.equal(azure.parseAzureResponse(response).score, 88);
    assert.equal(
      azure.parseAzureResponse({ RecognitionStatus: "NoMatch" }),
      null,
    );
    delete response.NBest[0].PronScore;
    assert.equal(azure.parseAzureResponse(response), null);
  },
);
function wav(amplitude = 0) {
  const bytes = Buffer.alloc(44 + 32000);
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
  bytes.writeUInt32LE(32000, 40);
  for (let i = 44; i < bytes.length; i += 2)
    bytes.writeInt16LE(Math.round(amplitude * Math.sin(i)), i);
  return bytes;
}
await check(
  "Audio validation measures real samples and rejects a disguised or truncated WAV",
  () => {
    assert.equal(inspectWav(wav()).rms, 0);
    assert.equal(inspectWav(wav()).durationMs, 1000);
    assert.ok(inspectWav(wav(5000)).rms > 0.003);
    assert.throws(() => inspectWav(Buffer.from("not an audio file")));
    assert.throws(() => inspectWav(wav().subarray(0, 100)));
    const stereo = wav();
    stereo.writeUInt16LE(2, 22);
    assert.throws(() => inspectWav(stereo));
  },
);
await check(
  "Azure request uses Thai, server key and PCM; provider rejection never yields a score",
  async () => {
    const originalFetch = globalThis.fetch;
    const previous = Object.fromEntries(
      ["AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION", "AZURE_SPEECH_ENDPOINT"].map(
        (key) => [key, process.env[key]],
      ),
    );
    process.env.AZURE_SPEECH_KEY = "fixture-key-not-a-secret";
    process.env.AZURE_SPEECH_REGION = "southeastasia";
    delete process.env.AZURE_SPEECH_ENDPOINT;
    try {
      globalThis.fetch = async (url, options) => {
        assert.match(url, /language=th-TH/);
        assert.equal(
          options.headers["Ocp-Apim-Subscription-Key"],
          "fixture-key-not-a-secret",
        );
        const header = JSON.parse(
          Buffer.from(
            options.headers["Pronunciation-Assessment"],
            "base64",
          ).toString("utf8"),
        );
        assert.equal(header.ReferenceText, "กา");
        assert.equal(header.Granularity, "Word");
        return new Response("{}", { status: 401 });
      };
      await assert.rejects(
        () => azure.assessWithAzure(wav(5000), "กา"),
        /provider_auth_failed/,
      );
      process.env.AZURE_SPEECH_ENDPOINT =
        "https://fixture-resource.cognitiveservices.azure.com";
      assert.equal(
        azure.azureConnection().baseUrl,
        "https://fixture-resource.cognitiveservices.azure.com/stt",
      );
      process.env.AZURE_SPEECH_ENDPOINT = "http://untrusted.example";
      assert.equal(
        azure.azureConnection().baseUrl,
        "https://southeastasia.stt.speech.microsoft.com",
      );
    } finally {
      globalThis.fetch = originalFetch;
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  },
);
await check(
  "New result metadata and older local histories survive a reload",
  () => {
    const start = domain.startSession(
      domain.initialState(),
      getStages("speech", "ป")[0],
    );
    const attempt = {
      id: "test",
      itemId: start.session.itemIds[0],
      kind: "choice",
      mode: "choice",
      support: "independent",
      review: "achieved",
      retries: 0,
      createdAt: new Date().toISOString(),
      assessment: {
        id: "audit",
        source: "rules",
        outcome: "achieved",
        policyVersion: 2,
        feedback: "ตรงกับเฉลย",
        createdAt: new Date().toISOString(),
      },
    };
    const saved = domain.saveAttempt(start.state, start.session.id, attempt);
    assert.equal(
      domain.readState(JSON.stringify(saved)).sessions[0].attempts[0].assessment
        .policyVersion,
      2,
    );
    delete attempt.assessment;
    assert.equal(
      domain.readState(
        JSON.stringify(
          domain.saveAttempt(start.state, start.session.id, attempt),
        ),
      ).sessions.length,
      1,
    );
  },
);
console.log(
  `${checks} central assessment checks passed. Azure responses are test fixtures, not live service results.`,
);
