// Kid practice screens: on-device voice detection, item → game mapping, word splitting, CSS scope.
import { build } from "esbuild";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import postcss from "postcss";

await mkdir(".learning-runtime/tests", { recursive: true });
await build({
  entryPoints: [
    "src/features/learning-studio/kid/voice-activity.ts",
    "src/features/learning-studio/kid/games.ts",
    "src/features/learning-studio/kid/stickers.ts",
    "src/features/learning-studio/curriculum.ts",
  ],
  bundle: true,
  platform: "node",
  format: "esm",
  outdir: ".learning-runtime/tests/kid",
  logLevel: "error",
});
const voice = await import("../../.learning-runtime/tests/kid/kid/voice-activity.js");
const games = await import("../../.learning-runtime/tests/kid/kid/games.js");
const stickers = await import("../../.learning-runtime/tests/kid/kid/stickers.js");
const { getStages } = await import("../../.learning-runtime/tests/kid/curriculum.js");

let checks = 0;
function check(name, fn) {
  fn();
  checks++;
  console.log("PASS " + name);
}
/** Feeds `ms` of a steady RMS level in 20 ms steps, like animation frames. */
const feed = (tracker, level, ms) => {
  let state;
  for (let t = 0; t < ms; t += 20) state = tracker.push(level, 20);
  return state;
};

check("Voice detector counts two spoken bursts and their length in a quiet room", () => {
  const t = voice.createVoiceTracker();
  feed(t, 0.004, 500);
  assert.equal(feed(t, 0.1, 300).speaking, true);
  feed(t, 0.004, 400);
  feed(t, 0.1, 300);
  const end = feed(t, 0.004, 400);
  assert.equal(end.segments, 2);
  assert.equal(end.speaking, false);
  assert(end.voicedMs >= 500 && end.voicedMs <= 900, `voicedMs ${end.voicedMs}`);
  assert.equal(end.noisy, false);
});
check("A tap or click on the mic is not voice; short pauses stay in one burst", () => {
  const t = voice.createVoiceTracker();
  feed(t, 0.004, 300);
  feed(t, 0.2, 40);
  assert.equal(feed(t, 0.004, 300).segments, 0);
  feed(t, 0.1, 200);
  feed(t, 0.004, 120);
  assert.equal(feed(t, 0.1, 200).segments, 1);
});
check("Stones and train: syllables said with short pauses are separate jumps", () => {
  // "ปา ปี ปู" with ~200 ms between syllables: one burst each at the games' shorter release.
  const t = voice.createVoiceTracker({ releaseMs: 170 });
  feed(t, 0.004, 300);
  for (let i = 0; i < 3; i++) {
    feed(t, 0.1, 260);
    feed(t, 0.004, 200);
  }
  assert.equal(feed(t, 0.004, 300).segments, 3);
});
check("A child who speaks the moment the mic opens is still heard", () => {
  const t = voice.createVoiceTracker();
  const end = feed(t, 0.1, 600);
  assert.equal(end.segments, 1);
  assert(end.voicedMs >= 300, `voicedMs ${end.voicedMs}`);
});
check("A loud room is flagged as noisy and its hum is not counted as speech", () => {
  const t = voice.createVoiceTracker();
  const end = feed(t, 0.06, 3000);
  assert.equal(end.noisy, true);
  assert.equal(end.segments, 0);
  assert.equal(voice.rms([0.5, -0.5, 0.5, -0.5]), 0.5);
});
check("Every activity in every goal, level and sound has a kid game", () => {
  const expected = { listen: "feed", imitate: "mirror", syllables: "stones", words: "card", sentences: "train", transfer: "together", understand: "feed", letter: "feed", blend: "stones" };
  let items = 0;
  for (const level of ["starter", "explorer", "builder", "storyteller"])
    for (const track of ["speech", "communication", "phonics"])
      for (const sound of ["ป", "ก", "ม"])
        for (const stage of getStages(track, sound, level))
          for (const item of stage.items) {
            const game = games.gameFor(item);
            assert(["feed", "mirror", "stones", "card", "train", "together"].includes(game));
            if (expected[stage.id]) assert.equal(game, expected[stage.id], `${level}/${track}/${sound}/${stage.id}/${item.id}`);
            items++;
          }
  assert.equal(items, 432);
  const [chain] = getStages("speech", "ป", "builder").find((s) => s.id === "syllables").items;
  assert.deepEqual(games.stonesFor(chain), ["ปา", "ปี", "ปู"]);
  const [blend] = getStages("phonics", "ป", "starter").find((s) => s.id === "blend").items;
  assert.deepEqual(games.stonesFor(blend), ["ป", "า", "ปา"]);
});
check("Thai phrases split into train cars; young levels play together, older alone", () => {
  assert.deepEqual(games.splitWords("ปูตัวเล็ก"), ["ปู", "ตัว", "เล็ก"]);
  assert.deepEqual(games.splitWords("ปู"), ["ปู"]);
  assert.deepEqual(games.splitWords("  "), []);
  assert.deepEqual(games.trainCars("ปูตัวเล็ก"), ["ปู", "ตัว", "เล็ก"]);
  const long = "ปูตัวเล็กกำลังเดินอยู่บนทรายริมทะเล";
  const cars = games.trainCars(long);
  assert.equal(cars.length, 4, cars.join(" · "));
  assert.equal(cars.join(""), long);
  assert(cars.every((c) => c.length >= 3), cars.join(" · "));
  assert.equal(games.defaultPlayMode("starter"), "together");
  assert.equal(games.defaultPlayMode(undefined), "together");
  assert.equal(games.defaultPlayMode("storyteller"), "alone");
});
check("Every picture in the curriculum is a sticker (letters, mouths and rhythm are not)", () => {
  const notPictures = new Set(["letter", "mouth", "sound-pattern", "mouth-word"]);
  const pages = new Set(stickers.STICKER_PAGES.map((p) => p.id));
  for (const s of Object.values(stickers.STICKERS)) assert(pages.has(s.page), s.name);
  let withSticker = 0;
  for (const level of ["starter", "explorer", "builder", "storyteller"])
    for (const track of ["speech", "communication", "phonics"])
      for (const sound of ["ป", "ก", "ม"])
        for (const stage of getStages(track, sound, level))
          for (const item of stage.items) {
            const art = item.kind === "choice" ? item.choices?.find((c) => c.id === item.answer)?.art : item.art;
            const kind = stickers.stickerFor(item);
            if (notPictures.has(art)) assert.equal(kind, null, `${item.id} ${art}`);
            else {
              assert.equal(kind, art, `${item.id}: picture "${art}" has no sticker`);
              withSticker++;
            }
          }
  assert(withSticker > 200, `only ${withSticker} activities give a sticker`);
});
check("Sticker book: earned once, in the round where it first appeared", () => {
  const stage = getStages("speech", "ป", "starter").find((s) => s.items.some((i) => stickers.stickerFor(i)));
  const item = stage.items.find((i) => stickers.stickerFor(i));
  const kind = stickers.stickerFor(item);
  const round = (id, at) => ({
    id, childId: "kid", planId: "p", track: "speech", sound: "ป", level: "starter", stageId: stage.id, stageLabel: stage.label,
    itemIds: [item.id], index: 0, status: "completed", startedAt: at, completedAt: at,
    attempts: [{ id: id + "a", itemId: item.id, createdAt: at, kind: item.kind, mode: "demo", support: "independent", review: "pending", retries: 0 }],
  });
  const later = round("r2", "2026-11-23T10:00:00Z");
  const first = round("r1", "2026-11-22T10:00:00Z");
  const other = { ...round("r3", "2026-11-21T10:00:00Z"), childId: "someone-else" };
  const book = stickers.stickerBook([later, first, other], "kid");
  assert.equal(book.owned.size, 1);
  assert.equal(book.owned.get(kind).sessionId, "r1");
  assert.deepEqual(book.newIn.get("r1"), [kind]);
  assert.equal(book.newIn.get("r2"), undefined);
  assert.deepEqual(stickers.stickersOfRound(later), [kind]);
  assert(stickers.stickerCatalog(getStages("speech", "ป", "starter")).includes(kind));
  assert.equal(stickers.stickerSource(getStages("speech", "ป", "starter"), kind).id, stage.id);
});
const css = postcss.parse(await readFile("src/features/learning-studio/kid/kid.css", "utf8"));
check("Kid screen styles stay inside .kid-world", () => {
  let rules = 0;
  css.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name)) return;
    for (const selector of rule.selectors) {
      assert(/^(\.dark )?\.kid-world\b/.test(selector.trim()), `unscoped selector: ${selector}`);
      rules++;
    }
  });
  css.walkAtRules(/keyframes$/, (r) => assert(r.params.startsWith("kw-"), `keyframes ${r.params} need the kw- prefix`));
  assert(rules > 50);
});
console.log(`${checks} kid checks passed`);
