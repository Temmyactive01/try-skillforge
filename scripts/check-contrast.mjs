// Checks the colour pairs the redesigned screens actually use, in both themes,
// against WCAG AA. Reads the token values straight out of src/styles.css, so it
// fails if someone changes a token to something unreadable.
//
// AA: 4.5:1 for normal text, 3:1 for large text (18.66px bold / 24px+) and for
// the edges of controls. See DESIGN.md → Colour.
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

/** The token block for one theme, as { token: "#rrggbb" }. */
function tokens(selector) {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`No ${selector} block in styles.css`);
  const block = css.slice(start, css.indexOf("}", start));
  const found = {};
  for (const [, name, value] of block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    found[name] = value;
  }
  return found;
}

const THEMES = {
  light: tokens(":root {"),
  dark: tokens('[data-theme="dark"] {'),
};

const srgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

function luminance(hex) {
  const [r, g, b] = srgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** Flatten a translucent fill (e.g. temper-bronze/10) over its background. */
function blend(hex, alpha, over) {
  const f = srgb(hex);
  const b = srgb(over);
  const mixed = f.map((c, i) => c * alpha + b[i] * (1 - alpha));
  return (
    "#" +
    mixed
      .map((c) =>
        Math.round(c * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

// [description, foreground token, background token, minimum, background alpha fill]
const CHECKS = [
  // Text on the two surfaces.
  ["body text on the page", "ink", "ground", 4.5],
  ["body text on a panel", "ink", "surface", 4.5],
  ["secondary text on the page", "ink-muted", "ground", 4.5],
  ["secondary text on a panel", "ink-muted", "surface", 4.5],
  ["links and headings in blue", "temper-blue", "surface", 4.5],
  ["overdue text", "oxide", "surface", 4.5],
  ["overdue text on the page", "oxide", "ground", 4.5],

  // Status tags: temper colour as text on a 10% tint of itself.
  ["'In progress' tag text", "temper-bronze", "surface", 4.5, ["temper-bronze", 0.1]],
  ["'Complete' tag text", "temper-blue", "surface", 4.5, ["temper-blue", 0.1]],
  ["'Not started' tag text", "ink-muted", "surface", 4.5],

  // Filled controls.
  ["text on a primary button", "on-temper-blue", "temper-blue", 4.5],
  ["text on a destructive fill", "on-oxide", "oxide", 4.5],

  // Non-text contrast: control edges and progress fills must be visible (3:1).
  ["input and control borders", "steel-strong", "surface", 3],
  ["control borders on the page", "steel-strong", "ground", 3],
  ["progress track edge", "steel-strong", "surface", 3],
  ["temper fill: straw", "temper-straw", "surface", 3],
  ["temper fill: bronze", "temper-bronze", "surface", 3],
  ["temper fill: violet", "temper-violet", "surface", 3],
  ["temper fill: blue", "temper-blue", "surface", 3],
  ["focus ring on the page", "temper-blue", "ground", 3],
];

// DESIGN.md: "temper-straw is a fill in the light theme, not a text colour."
const STRAW_IS_FILL_ONLY = "temper-straw";

let failures = 0;
for (const [theme, palette] of Object.entries(THEMES)) {
  console.log(`\n${theme} theme`);
  for (const [what, fg, bg, min, tint] of CHECKS) {
    const background = tint ? blend(palette[tint[0]], tint[1], palette[bg]) : palette[bg];
    const value = ratio(palette[fg], background);
    const pass = value >= min;
    if (!pass) failures++;
    console.log(`  ${pass ? "ok  " : "FAIL"}  ${what}: ${value.toFixed(2)}:1 (needs ${min}:1)`);
  }
  // Straw must never reach text contrast in light, or someone will be tempted to use it.
  const strawAsText = ratio(palette[STRAW_IS_FILL_ONLY], palette.surface);
  if (theme === "light" && strawAsText >= 4.5) {
    console.log(`  note  temper-straw now reads as text (${strawAsText.toFixed(2)}:1)`);
  }
}

console.log(failures ? `\n${failures} contrast check(s) failed.` : "\nAll contrast checks passed.");
process.exit(failures ? 1 : 0);
