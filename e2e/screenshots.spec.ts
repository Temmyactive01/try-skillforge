// Captures the design screenshots. Not part of `npm run test:e2e`.
//   npm run screenshots:before   → docs/screenshots/before (current design, light only)
//   npm run screenshots          → docs/screenshots/phase-1 (light and dark)
import { test } from "@playwright/test";
import path from "node:path";
import type { Browser, Page } from "@playwright/test";
import { open, signInUI } from "./helpers";
import { createScreenshotData } from "./screenshot-data";

type Theme = "light" | "dark";
type Meta = { dir: string; themes: Theme[]; shell: boolean };

const VIEWPORTS = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "mobile", width: 375, height: 812 },
];

test("capture the admin screens", async ({ browser, baseURL }, info) => {
  test.setTimeout(15 * 60 * 1000);
  const { dir, themes, shell } = info.project.metadata as Meta;
  const outDir = path.join(process.cwd(), "docs", "screenshots", dir);
  const data = await createScreenshotData();
  const taken: string[] = [];

  async function shoot(page: Page, name: string) {
    // Fonts must be in before the shot, or headings render in the fallback face.
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
    taken.push(`${name}.png`);
  }

  async function withPage(
    browserInstance: Browser,
    theme: Theme,
    viewport: { width: number; height: number },
    body: (page: Page) => Promise<void>,
  ) {
    const context = await browserInstance.newContext({
      viewport,
      colorScheme: theme, // the app's theme script follows the system setting by default
      reducedMotion: "reduce",
      deviceScaleFactor: 2,
    });
    try {
      await body(await context.newPage());
    } finally {
      await context.close();
    }
  }

  for (const theme of themes) {
    for (const vp of VIEWPORTS) {
      const suffix = `${vp.label}-${theme}`;

      // The company with real data: dashboard and the assignments table.
      await withPage(browser, theme, vp, async (page) => {
        await signInUI(page, data.admin.email);
        await open(page, "/admin/dashboard");
        await page.getByRole("heading", { name: "Dashboard" }).waitFor();
        await shoot(page, `dashboard-${suffix}`);

        await open(page, "/admin/assignments");
        await page.getByRole("heading", { name: "Assignments" }).waitFor();
        await page.getByRole("row").nth(1).waitFor();
        await shoot(page, `assignments-${suffix}`);

        if (!shell) return;
        // The shell's other states: collapsed rail on desktop, open drawer on mobile.
        if (vp.label === "desktop") {
          await page.getByRole("button", { name: "Toggle sidebar" }).click();
          await page.waitForTimeout(400);
          await shoot(page, `admin-shell-collapsed-${suffix}`);
        } else {
          await page.getByRole("button", { name: "Toggle sidebar" }).click();
          await page.getByRole("navigation").waitFor();
          await page.waitForTimeout(400);
          await shoot(page, `admin-shell-drawer-${suffix}`);
        }
      });

      // The brand-new company: the getting-started state.
      await withPage(browser, theme, vp, async (page) => {
        await signInUI(page, data.newAdmin.email);
        await open(page, "/admin/dashboard");
        await page.getByRole("heading", { name: "Welcome to SkillForge" }).waitFor();
        await shoot(page, `getting-started-${suffix}`);
      });
    }
  }

  console.log(`\n${taken.length} screenshots in docs/screenshots/${dir}:`);
  for (const name of taken.sort()) console.log(`  ${name}`);
  console.log(`(from ${baseURL})`);
});
