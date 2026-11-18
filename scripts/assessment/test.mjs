import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";

await mkdir(".learning-runtime/assessment-tests", { recursive: true });
await build({
  entryPoints: [
    "src/lib/assessment/policy.ts",
    "src/lib/assessment/wav.ts",
    "src/lib/assessment/azure.ts",
    "src/lib/assessment/openai.ts",
    "src/lib/assessment/provider.ts",
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
const openai = await import(
  "../../.learning-runtime/assessment-tests/lib/assessment/openai.js"
);
const provider = await import(
  "../../.learning-runtime/assessment-tests/lib/assessment/provider.js"
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
await check(
  "The central frame: old policies get the default frame, central values must sit inside it, adult-only stages stay locked",
  () => {
    const old = structuredClone(policy.DEFAULT_POLICY);
    delete old.allowSchoolAi;
    for (const rule of old.rules) delete rule.school;
    assert.equal(policy.policySchema.safeParse(old).success, true);
    const words = old.rules.find((rule) => rule.stageId === "words");
    assert.deepEqual(policy.frameOf(words).passScore, [60, 90]);
    assert.equal(policy.frameOf(words).mode, "choice");
    assert.equal(policy.frameOf(old.rules.find((rule) => rule.stageId === "listen")).mode, "locked");
    const outside = structuredClone(policy.DEFAULT_POLICY);
    outside.rules.find((rule) => rule.stageId === "words").school.passScore = [80, 90];
    assert.equal(policy.policySchema.safeParse(outside).success, false);
    const unlocked = structuredClone(policy.DEFAULT_POLICY);
    unlocked.rules.find((rule) => rule.stageId === "listen").school.mode = "choice";
    assert.equal(policy.policySchema.safeParse(unlocked).success, false);
  },
);
await check(
  "School settings are rejected outside the frame, on locked stages, with inverted scores, or with AI the platform has not allowed",
  () => {
    const central = structuredClone(policy.DEFAULT_POLICY);
    const valid = { aiEnabled: false, reviewers: "teacher", overrides: [{ stageId: "words", mode: "adult", passScore: 85 }] };
    assert.deepEqual(policy.validateSchoolSettings(valid, central), []);
    const high = { ...valid, overrides: [{ stageId: "words", passScore: 95 }] };
    assert.equal(policy.validateSchoolSettings(high, central).length, 1);
    const locked = { ...valid, overrides: [{ stageId: "listen", mode: "azure" }] };
    assert.equal(policy.validateSchoolSettings(locked, central).length, 1);
    const inverted = { ...valid, overrides: [{ stageId: "words", passScore: 60, practiceScore: 70 }] };
    assert.equal(policy.validateSchoolSettings(inverted, central).length, 1);
    const ai = { ...valid, aiEnabled: true };
    assert.equal(policy.validateSchoolSettings(ai, central).length, 1);
    central.enabled = true;
    central.allowSchoolAi = true;
    assert.deepEqual(policy.validateSchoolSettings(ai, central), []);
  },
);
await check(
  "A child is judged by central rules, or by school rules clamped into the frame; school AI needs platform, permission and school",
  () => {
    const central = structuredClone(policy.DEFAULT_POLICY);
    central.enabled = true;
    const family = policy.effectivePolicy(central);
    assert.equal(family.config, central);
    const noSettings = policy.effectivePolicy(central, null);
    assert.equal(noSettings.config.enabled, false);
    const school = { aiEnabled: true, reviewers: "teacher", overrides: [{ stageId: "words", mode: "adult", passScore: 85 }] };
    assert.equal(policy.effectivePolicy(central, school).config.enabled, false);
    central.allowSchoolAi = true;
    const applied = policy.effectivePolicy(central, school);
    assert.equal(applied.config.enabled, true);
    const words = applied.config.rules.find((rule) => rule.stageId === "words");
    assert.equal(words.mode, "adult");
    assert.equal(words.passScore, 85);
    assert.equal(applied.config.rules.find((rule) => rule.stageId === "syllables").passScore, 75);
    assert.deepEqual(applied.clampedStages, []);
    // The platform narrows the frame after the school saved: the school value is pulled to the edge.
    const narrowed = structuredClone(central);
    const frame = narrowed.rules.find((rule) => rule.stageId === "words").school;
    frame.passScore = [60, 80];
    frame.mode = "locked";
    const clamped = policy.effectivePolicy(narrowed, school);
    const clampedWords = clamped.config.rules.find((rule) => rule.stageId === "words");
    assert.equal(clampedWords.passScore, 80);
    assert.equal(clampedWords.mode, "azure");
    assert.deepEqual(clamped.clampedStages, ["words"]);
  },
);

// ── OpenAI speech provider ───────────────────────────────────────────────────
async function withEnv(values, run) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}
const OPENAI_ENV = {
  ASSESSMENT_SPEECH_PROVIDER: undefined,
  ASSESSMENT_OPENAI_API_KEY: "sk-fixture-key-not-a-secret",
  // A developer's system-wide key for other tools must never be used by the assessment.
  OPENAI_API_KEY: "sk-or-v1-fixture-openrouter-key",
  OPENAI_ASSESSMENT_TRANSCRIBE_MODEL: undefined,
};

await check(
  "Transcript scoring compares Thai text in code: spacing and punctuation ignored, a wrong consonant or extra words lower the score",
  () => {
    assert.deepEqual(openai.scoreTranscript("ปูอยู่ในกล่อง", "ปู อยู่ ใน กล่อง."), {
      score: 100,
      accuracy: 100,
      completeness: 100,
    });
    const swapped = openai.scoreTranscript("ปู", "บู");
    assert.equal(swapped.accuracy, 50);
    assert.equal(policy.judgeSpeech({ ...swapped, confidence: 0.9 }, rule, 0.6).outcome, "retry");
    const repeated = openai.scoreTranscript("ปู", "ปู ปู");
    assert.equal(repeated.completeness, 100);
    assert.ok(repeated.accuracy < rule.passScore, "saying extra words is not a pass");
    const partial = openai.scoreTranscript("ไก่กำลังกินข้าว", "ไก่กิน");
    assert.ok(partial.completeness < rule.minCompleteness);
    assert.deepEqual(openai.scoreTranscript("ปู", "  ...  "), { score: 0, accuracy: 0, completeness: 0 });
  },
);

await check(
  "Confidence comes from transcription logprobs; missing probabilities mean 0, which goes to adult review",
  () => {
    const heard = openai.parseOpenAITranscription({
      text: " ปู ",
      logprobs: [{ token: "ป", logprob: -0.1 }, { token: "ู", logprob: -0.3 }],
    });
    assert.equal(heard.transcript, "ปู");
    assert.equal(heard.confidence, Math.round(Math.exp(-0.2) * 1000) / 1000);
    const whisper = openai.parseOpenAITranscription({ text: "ปู", segments: [{ avg_logprob: -0.05 }] });
    assert.ok(whisper.confidence > 0.9);
    const blind = openai.parseOpenAITranscription({ text: "ปู" });
    assert.equal(blind.confidence, 0);
    assert.equal(
      policy.judgeSpeech({ score: 100, accuracy: 100, completeness: 100, confidence: blind.confidence }, rule, 0.6).outcome,
      "needs_review",
    );
    assert.equal(openai.parseOpenAITranscription({ error: "nope" }), null);
  },
);

await check(
  "OpenAI request sends Thai WAV with logprobs and never the target text; rejections never yield a score",
  () =>
    withEnv(OPENAI_ENV, async () => {
      let sent;
      globalThis.fetch = async (url, options) => {
        sent = { url, options };
        return Response.json({ text: "ปู", logprobs: [{ token: "ปู", logprob: -0.05 }] });
      };
      const scores = await openai.assessWithOpenAI(wav(5000), "ปู");
      assert.equal(sent.url, "https://api.openai.com/v1/audio/transcriptions");
      assert.equal(sent.options.headers.Authorization, "Bearer sk-fixture-key-not-a-secret");
      const form = sent.options.body;
      assert.equal(form.get("model"), "gpt-4o-transcribe");
      assert.equal(form.get("language"), "th");
      assert.equal(form.get("response_format"), "json");
      assert.deepEqual(form.getAll("include[]"), ["logprobs"]);
      assert.equal(form.get("prompt"), null, "the target must not be suggested to the model");
      for (const [, value] of form.entries())
        if (typeof value === "string") assert.ok(!value.includes("ปู"));
      assert.equal(form.get("file").type, "audio/wav");
      assert.equal(scores.score, 100);
      assert.equal(scores.transcript, "ปู");
      assert.ok(scores.confidence > 0.9);

      globalThis.fetch = async () => Response.json({ text: "" });
      assert.equal(await openai.assessWithOpenAI(wav(5000), "ปู"), null);
      for (const [status, reason] of [[401, "provider_auth_failed"], [403, "provider_auth_failed"], [429, "provider_rate_limited"], [500, "provider_failed"]]) {
        globalThis.fetch = async () => new Response("{}", { status });
        await assert.rejects(() => openai.assessWithOpenAI(wav(5000), "ปู"), new RegExp(reason));
      }
    }),
);

await check(
  "Provider switch defaults to OpenAI, uses only its own key variable, rejects OpenRouter keys, and still routes to Azure on request",
  () =>
    withEnv({ ...OPENAI_ENV, ASSESSMENT_OPENAI_API_KEY: undefined, AZURE_SPEECH_KEY: undefined, AZURE_SPEECH_REGION: undefined }, async () => {
      assert.deepEqual(provider.speechProvider(), {
        id: "openai",
        label: "OpenAI",
        ready: false,
        detail: "gpt-4o-transcribe",
      }, "a system-wide OPENAI_API_KEY is ignored");
      await assert.rejects(() => provider.assessSpeech(wav(5000), "ปู"), /provider_not_configured/);
      process.env.ASSESSMENT_OPENAI_API_KEY = "sk-or-v1-fixture-openrouter-key";
      assert.equal(provider.speechProvider().ready, false, "OpenRouter keys do not work at api.openai.com");
      process.env.ASSESSMENT_OPENAI_API_KEY = "sk-has space";
      assert.equal(provider.speechProvider().ready, false);
      process.env.ASSESSMENT_OPENAI_API_KEY = "sk-fixture-key-not-a-secret";
      assert.equal(provider.speechProvider().ready, true);
      assert.ok(!JSON.stringify(provider.speechProvider()).includes("fixture-key"));
      process.env.OPENAI_ASSESSMENT_TRANSCRIBE_MODEL = "whisper-1";
      let body;
      globalThis.fetch = async (_url, options) => {
        body = options.body;
        return Response.json({ text: "ปู", segments: [{ avg_logprob: -0.1 }] });
      };
      const result = await provider.assessSpeech(wav(5000), "ปู");
      assert.equal(result.source, "openai");
      assert.equal(body.get("response_format"), "verbose_json");
      assert.equal(body.get("include[]"), null);
      process.env.ASSESSMENT_SPEECH_PROVIDER = "azure";
      assert.equal(provider.speechProvider().id, "azure");
      assert.equal(provider.speechProvider().ready, false);
      await assert.rejects(() => provider.assessSpeech(wav(5000), "ปู"), /provider_not_configured/);
      assert.ok(policy.isAiSource("openai") && policy.isAiSource("azure") && !policy.isAiSource("rules"));
    }),
);

console.log(
  `${checks} central assessment checks passed. Azure and OpenAI responses are test fixtures, not live service results.`,
);
