// Renders the studio's own illustrations (src/features/learning-studio/Art.tsx) to static SVG files,
// so design mockups use the real พี่ปู and picture cards instead of placeholders.
//
//   node scripts/design/export-art.mjs
//
// Writes docs/design/wireframes/art/<kind>.svg
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const KINDS = ["crab", "mouth", "snake", "fish", "backpack", "banana", "crab-beach", "crab-box", "ball", "cup", "chicken", "cat", "shrimp", "clock"];
const OUT = "docs/design/wireframes/art";
const TMP = ".learning-runtime/export-art";
await mkdir(OUT, { recursive: true });
await mkdir(TMP, { recursive: true });

await build({
  stdin: {
    contents: `
      import { renderToStaticMarkup } from "react-dom/server";
      import { Art } from "./src/features/learning-studio/Art";
      export const render = (kind) => renderToStaticMarkup(<Art kind={kind} />);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  // React stays external: its CommonJS server build cannot be inlined into an ES module.
  external: ["react", "react-dom", "react/jsx-runtime", "react-dom/server"],
  outfile: `${TMP}/art.mjs`,
  logLevel: "error",
});
const { render } = await import(pathToFileURL(path.resolve(TMP, "art.mjs")).href);
for (const kind of KINDS) {
  let svg = render(kind);
  // Standalone files need the SVG namespace; drop the studio's CSS class hooks.
  if (!svg.includes("xmlns=")) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  svg = svg.replace(/ class="[^"]*"/, "");
  await writeFile(path.join(OUT, `${kind}.svg`), svg);
  console.log(`${kind}.svg ${svg.length} bytes`);
}
