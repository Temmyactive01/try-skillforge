// Captures the design screenshots. Not part of `npm run test:e2e`.
//   npm run screenshots:before          → docs/screenshots/before (pre-phase-1 design, light only)
//   npm run screenshots                 → docs/screenshots/phase-1 (light and dark)
//   npm run screenshots:before-phase-2  → docs/screenshots/before-phase-2 (Courses and Employees as they were)
import { test } from "@playwright/test";
import path from "node:path";
import type { Browser, Page } from "@playwright/test";
import { open, signInUI } from "./helpers";
import { createScreenshotData } from "./screenshot-data";

type Theme = "light" | "dark";
/** Which screens a project captures. Each project lists only the ones it needs. */
type Screen = "dashboard" | "assignments" | "courses" | "employees" | "shell" | "getting-started";
type Meta = { dir: string; themes: Theme[]; screens: Screen[] };

const VIEWPORTS = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "mobile", width: 375, height: 812 },
];

test("capture the admin screens", async ({ browser, baseURL }, info) => {
  test.setTimeout(20 * 60 * 1000);
  const { dir, themes, screens } = info.project.metadata as Meta;
  const wanted = new Set(screens);
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

      // The company with real data: every screen except the getting-started state.
      await withPage(browser, theme, vp, async (page) => {
        await signInUI(page, data.admin.email);

        if (wanted.has("dashboard")) {
          await open(page, "/admin/dashboard");
          await page.getByRole("heading", { name: "Dashboard" }).waitFor();
          await shoot(page, `dashboard-${suffix}`);
        }

        if (wanted.has("assignments")) {
          await open(page, "/admin/assignments");
          await page.getByRole("heading", { name: "Assignments" }).waitFor();
          // Wait on the data itself: this is a table on a desktop and cards on a phone.
          // Both are in the DOM at every width, so wait for whichever one is on show.
          await page.getByText("Amara Nwosu").filter({ visible: true }).first().waitFor();
          await shoot(page, `assignments-${suffix}`);
        }

        if (wanted.has("courses")) {
          await open(page, "/admin/courses");
          await page.getByRole("heading", { name: "Courses" }).first().waitFor();
          await page
            .getByText("Data protection essentials")
            .filter({ visible: true })
            .first()
            .waitFor();
          await shoot(page, `courses-${suffix}`);
        }

        if (wanted.has("employees")) {
          await open(page, "/admin/employees");
          await page.getByRole("heading", { name: "Employees" }).first().waitFor();
          await page.getByText("Amara Nwosu").filter({ visible: true }).first().waitFor();
          await shoot(page, `employees-${suffix}`);
        }

        if (wanted.has("shell")) {
          // The shell's other states: collapsed rail on desktop, open drawer on mobile.
          // The rail carries the same label, so take the trigger in the header.
          await open(page, "/admin/assignments");
          await page.getByRole("heading", { name: "Assignments" }).waitFor();
          const trigger = page.locator("header").getByRole("button", { name: /toggle sidebar/i });
          await trigger.click();
          await page.waitForTimeout(500);
          await shoot(
            page,
            vp.label === "desktop"
              ? `admin-shell-collapsed-${suffix}`
              : `admin-shell-drawer-${suffix}`,
          );
        }
      });

      // The brand-new company: the getting-started state.
      if (wanted.has("getting-started")) {
        await withPage(browser, theme, vp, async (page) => {
          await signInUI(page, data.newAdmin.email);
          await open(page, "/admin/dashboard");
          await page.getByRole("heading", { name: "Welcome to SkillForge" }).waitFor();
          await shoot(page, `getting-started-${suffix}`);
        });
      }
    }
  }

  console.log(`\n${taken.length} screenshots in docs/screenshots/${dir}:`);
  for (const name of taken.sort()) console.log(`  ${name}`);
  console.log(`(from ${baseURL})`);
});
