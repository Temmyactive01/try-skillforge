/*
 * Builds the brand assets in public/ — the favicons and the social share
 * image — and writes them next to the app rather than checking in a binary
 * nobody can regenerate.
 *
 *   npm run build:brand
 *
 * It renders real HTML in the installed Edge, through the Playwright that is
 * already a dev dependency for the tests, so the type is Archivo and the
 * colours are the design tokens rather than an approximation drawn by hand.
 *
 * The mark is the one the app already uses: a billet of steel, tempered blue.
 * It does not show the other three temper stages — those mean progress, and a
 * logo is not progress (DESIGN.md, "Principles").
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.join(process.cwd(), "public");

/* The light-theme tokens from src/styles.css. Kept in step by the contrast
 * check, which reads the same names out of that file. */
const T = {
  ground: "#f1f2f0",
  surface: "#ffffff",
  ink: "#1a1f24",
  inkMuted: "#59626b",
  steel: "#c4cacf",
  steelStrong: "#7a838a",
  blue: "#2c3f9e",
  violet: "#6b3f8e",
  bronze: "#94561f",
  straw: "#a67c1a",
  oxide: "#b0362b",
};

/*
 * The mark as a square SVG. `radius` is in the same units as the viewBox, so
 * the billet keeps DESIGN.md's radius-sm proportion at any size.
 */
const markSvg = (size = 32) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}" role="img" aria-label="SkillForge">
  <rect width="32" height="32" rx="6" fill="${T.ground}"/>
  <rect x="6" y="6" width="20" height="20" rx="3" fill="${T.blue}"/>
</svg>`;

const FONT_LINK = `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..700&display=swap">`;

/** One row of the assignments strip on the share image. */
function ogRow(name, course, status, score, fill) {
  const tag =
    status === "Complete"
      ? `background:${T.blue}1f;color:${T.blue}`
      : status === "In progress"
        ? `background:${T.bronze}26;color:${T.bronze}`
        : `background:${T.steel}66;color:${T.inkMuted}`;
  return `<tr>
    <td>${name}</td>
    <td class="muted">${course}</td>
    <td><span class="tag" style="${tag}">${status}</span></td>
    <td>
      <span class="track"><span class="fill" style="width:${score}%;background:${fill}"></span></span>
      <span class="pct">${score}%</span>
    </td>
  </tr>`;
}

const ogHtml = `<!doctype html>
<html><head><meta charset="utf-8">${FONT_LINK}
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: ${T.ground}; color: ${T.ink};
         font-family: Archivo, sans-serif; display: flex; flex-direction: column;
         justify-content: center; gap: 40px; padding: 64px; overflow: hidden; }
  .brand { display: flex; align-items: center; gap: 12px; font-size: 24px; font-weight: 600; }
  .billet { width: 24px; height: 24px; border-radius: 4px; background: ${T.blue}; }
  h1 { font-size: 54px; line-height: 58px; font-weight: 700; font-stretch: 125%;
       max-width: 14ch; letter-spacing: -0.01em; }
  p { font-size: 21px; line-height: 29px; color: ${T.inkMuted}; max-width: 40ch; }
  .frame { position: absolute; right: 48px; bottom: 64px; width: 468px;
           background: ${T.surface}; border: 1px solid ${T.steel}; border-radius: 14px;
           overflow: hidden; }
  .cap { display: flex; justify-content: space-between; padding: 11px 14px;
         border-bottom: 1px solid ${T.steel}; font-size: 13px; font-weight: 600; }
  .cap span:last-child { color: ${T.inkMuted}; font-weight: 400; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 10px 14px; border-bottom: 1px solid ${T.steel}; white-space: nowrap; }
  td:last-child { text-align: right; }
  tr:last-child td { border-bottom: 0; }
  .muted { color: ${T.inkMuted}; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
  .track { display: inline-block; width: 52px; height: 8px; border-radius: 4px;
           box-shadow: inset 0 0 0 1px ${T.steelStrong}; vertical-align: middle; overflow: hidden; }
  .fill { display: block; height: 100%; border-radius: 4px; }
  .pct { font-variant-numeric: tabular-nums; margin-left: 8px; }
</style></head>
<body>
  <div style="max-width:560px">
    <div class="brand"><span class="billet"></span>SkillForge</div>
    <h1 style="margin-top:28px">Assign training and see who has finished it.</h1>
    <p style="margin-top:20px">Build a course with a quiz, give it to a person or a team with a due date, and watch completion come in.</p>
  </div>
  <div class="frame">
    <div class="cap"><span>Assignments</span><span>Example data</span></div>
    <table>
      ${ogRow("Amara Nwosu", "Fire safety", "Complete", 92, T.violet)}
      ${ogRow("Daniel Okafor", "Data protection", "In progress", 58, T.bronze)}
      ${ogRow("Lena Brandt", "Data protection", "In progress", 22, T.straw)}
      ${ogRow("Priya Shah", "Manual handling", "Complete", 100, T.blue)}
    </table>
  </div>
</body></html>`;

/**
 * Wraps a PNG in an ICO container.
 *
 * The ICO format allows a PNG payload rather than a bitmap, which is what
 * every browser that still asks for /favicon.ico by name accepts, so this is
 * six bytes of header and sixteen of directory entry instead of a dependency.
 */
function pngToIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(1, 4); // one image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width, 0 means 256
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette size
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);

  return Buffer.concat([header, entry, png]);
}

async function shoot(browser, html, width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: "png" });
  await context.close();
  return png;
}

/** The mark alone, on its own ground square, at one size. */
const markPage = (size) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0} body{width:${size}px;height:${size}px;overflow:hidden}
    svg{display:block}
  </style></head><body>${markSvg(size)}</body></html>`;

async function main() {
  await mkdir(OUT, { recursive: true });

  // The SVG is the real favicon; the rasters are for what cannot read one.
  await writeFile(path.join(OUT, "favicon.svg"), `${markSvg()}\n`, "utf8");

  const browser = await chromium.launch({ channel: "msedge" });
  try {
    const ico32 = await shoot(browser, markPage(32), 32, 32);
    await writeFile(path.join(OUT, "favicon.ico"), pngToIco(ico32, 32));

    const apple = await shoot(browser, markPage(180), 180, 180);
    await writeFile(path.join(OUT, "apple-touch-icon.png"), apple);

    const og = await shoot(browser, ogHtml, 1200, 630);
    await writeFile(path.join(OUT, "og.png"), og);
  } finally {
    await browser.close();
  }

  console.log("Wrote public/favicon.svg, favicon.ico, apple-touch-icon.png and og.png");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
