import {
  readFile,
  readdir,
  stat,
  mkdir,
  copyFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
const args = process.argv.slice(2);
const fromIndex = args.indexOf("--from");
if (
  fromIndex < 0 ||
  !args[fromIndex + 1] ||
  args[fromIndex + 1].startsWith("--")
)
  throw new Error(
    'Usage: npm run learning:import-voices -- --from "D:\\voice-files" [--dry-run]',
  );
const source = path.resolve(args[fromIndex + 1]);
const dry = args.includes("--dry-run");
const root = path.resolve("public/learning-studio/audio/natural");
const catalog = JSON.parse(
  await readFile("public/learning-studio/audio/catalog.json", "utf8"),
);
const known = new Map(catalog.entries.map((c) => [`${c.id}.mp3`, c]));
const files = (await readdir(source)).filter((name) =>
  name.toLowerCase().endsWith(".mp3"),
);
if (!files.length) throw new Error("No .mp3 files found");
const clips = [];
for (const name of files) {
  if (!known.has(name))
    throw new Error(
      `Unknown clip: ${name}. Use filenames from learning:voice-pack.`,
    );
  const input = path.resolve(source, name),
    output = path.resolve(root, name);
  if (path.dirname(input) !== source || path.dirname(output) !== root)
    throw new Error("Invalid clip path");
  const info = await stat(input);
  const bytes = await readFile(input);
  const mp3 =
    bytes.subarray(0, 3).toString() === "ID3" ||
    (bytes[0] === 255 && (bytes[1] & 224) === 224);
  if (!info.isFile() || bytes.length < 1000 || !mp3)
    throw new Error(`Invalid/empty MP3: ${name}`);
  clips.push({ name, input, output, clip: known.get(name) });
}
if (!dry) {
  const filename = "src/features/learning-studio/audio-overrides.json";
  const overrides = JSON.parse(await readFile(filename, "utf8"));
  await mkdir(root, { recursive: true });
  for (const { name, input, output, clip } of clips) {
    await copyFile(input, output);
    overrides[clip.text] = `/learning-studio/audio/natural/${name}`;
  }
  await writeFile(filename, JSON.stringify(overrides, null, 2) + "\n");
}
console.log(
  `${dry ? "Validated" : "Imported"} ${clips.length} MP3 files; other clips keep bundled voices. ${dry ? "No changes written." : "Restart/rebuild the app to apply."}`,
);
