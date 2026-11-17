import postcss from "postcss";
import selectorParser from "postcss-selector-parser";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const dir = "src/features/learning-studio";
const input = (
  await Promise.all(
    ["styles.css", "learning-v3.css"].map((n) =>
      readFile(`${dir}/${n}`, "utf8"),
    ),
  )
).join("\n");
const css = postcss.parse(input);
css.walkAtRules("import", (r) => r.remove());
css.walkAtRules("page", (r) => r.remove());
const animations = new Map();
css.walkAtRules(/keyframes$/, (r) => {
  const name = r.params.trim();
  animations.set(name, `studio-${name}`);
  r.params = `studio-${name}`;
});
css.walkDecls(/^(animation|animation-name)$/, (d) => {
  for (const [name, next] of animations)
    d.value = d.value.replace(new RegExp(`\\b${name}\\b`, "g"), next);
});
// Readable type floor: the studio was drawn with 8–11px labels, too small for parents on phones.
// Captions go to 12px and small body copy to 13px; everything 12px and up keeps its size.
css.walkDecls("font-size", (d) => {
  d.value = d.value.replace(/(\d+(?:\.\d+)?)px/g, (match, raw) => {
    const px = Number(raw);
    if (px >= 12) return match;
    return px >= 10 ? "13px" : "12px";
  });
});
// Text drawn in the brand colour needs its own ink: the button purple is too dark to read on a dark surface.
// host-theme.css maps --primary-ink to the host's --color-primary-text.
css.walkDecls("color", (d) => {
  d.value = d.value.replace(/var\(--primary\)/g, "var(--primary-ink, var(--primary))");
});

// Pale text colours (light greys, pastel purples, golds) were drawn for a white page and fall below
// WCAG AA (4.5:1). Mix each one with the theme's text colour just enough to pass on white: the hue stays,
// and because --text flips in dark mode the same mix also lifts contrast there.
// Decorative glyphs (stars, chapter watermarks, illustrations) keep their colour.
const DECORATIVE = /star|sparkle|chapter|art\b|-art|deco|hero-cloud|confetti|brand|\bsvg\b/;
const LIGHT_TEXT = "#1E293B";
const hexRgb = (hex) => {
  const h = hex.length === 4 ? [...hex.slice(1)].map((c) => c + c).join("") : hex.slice(1, 7);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrastOnWhite = (rgb) => 1.05 / (luminance(rgb) + 0.05);
const mixRgb = (a, b, p) => a.map((v, i) => Math.round(v * p + b[i] * (1 - p)));
css.walkDecls("color", (d) => {
  const selector = d.parent.selector ?? "";
  // Decorative glyphs keep their colour; the studio's own .dark rules were drawn for dark surfaces.
  if (DECORATIVE.test(selector) || /(^|[\s,])\.dark\b/.test(selector)) return;
  // A rule that paints its own fixed light background stays light in dark mode, so its text mixes
  // with the fixed dark ink instead of the theme's --text (which turns light in dark mode).
  let fixedLightFill = false;
  d.parent.walkDecls(/^background(-color)?$/, (bg) => {
    const digits = bg.value.match(/#([0-9a-fA-F]{3,8})\b/)?.[1];
    const hex = digits && "#" + (digits.length <= 4 ? digits.slice(0, 3) : digits.slice(0, 6));
    if (/\bwhite\b/.test(bg.value) || (hex && luminance(hexRgb(hex)) > 0.5)) fixedLightFill = true;
  });
  const ink = fixedLightFill ? LIGHT_TEXT : "var(--text)";
  d.value = d.value.replace(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b(?![0-9a-fA-F])/g, (hex) => {
    const rgb = hexRgb(hex);
    if (contrastOnWhite(rgb) >= 4.5 || luminance(rgb) > 0.6) return hex; // dark enough, or white text on a fill
    let keep = 100;
    while (keep > 0 && contrastOnWhite(mixRgb(rgb, hexRgb(LIGHT_TEXT), keep / 100)) < 4.6) keep -= 5;
    return `color-mix(in srgb, ${hex} ${keep}%, ${ink})`;
  });
});
css.walkRules((rule) => {
  let parent = rule.parent;
  while (parent) {
    if (parent.type === "atrule" && /keyframes$/.test(parent.name)) return;
    parent = parent.parent;
  }
  rule.selector = selectorParser((selectors) => {
    selectors.each((selector) => {
      let local = false;
      // Only top-level nodes: leave selectors inside :not(), :has(), etc. intact.
      for (const node of [...selector.nodes]) {
        const root =
          (node.type === "pseudo" && node.value === ":root") ||
          (node.type === "tag" && ["html", "body"].includes(node.value));
        const mode =
          node.type === "class" &&
          ["dark", "wireframe"].includes(node.value) &&
          selector.nodes[0] === node;
        if (root) {
          node.replaceWith(
            selectorParser.className({ value: "learning-studio-scope" }),
          );
          local = true;
        } else if (mode) {
          selector.prepend(
            selectorParser.className({ value: "learning-studio-scope" }),
          );
          local = true;
        }
      }
      if (!local) {
        selector.prepend(selectorParser.combinator({ value: " " }));
        selector.prepend(
          selectorParser.className({ value: "learning-studio-scope" }),
        );
      }
    });
  }).processSync(rule.selector);
});
await writeFile(
  `${dir}/studio.generated.css`,
  "/* Generated by npm run learning:prepare. Edit the source CSS files. */\n" +
    css.toString(),
);
await mkdir(".learning-runtime", { recursive: true });
await writeFile(".learning-runtime/package.json", '{"type":"module"}\n');
console.log("Prepared isolated learning styles and test runtime");
