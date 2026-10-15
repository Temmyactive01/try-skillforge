// Captures the design screenshots. Not part of `npm run test:e2e`.
//   npm run screenshots:before          → docs/screenshots/before (pre-phase-1 design, light only)
//   npm run screenshots                 → docs/screenshots/phase-1 (light and dark)
//   npm run screenshots:before-phase-2  → docs/screenshots/before-phase-2 (Courses and Employees as they were)
//   npm run screenshots:phase-2         → docs/screenshots/phase-2 (light and dark)
//   npm run screenshots:before-phase-3  → docs/screenshots/before-phase-3 (employee and auth pages as they were)
//   npm run screenshots:phase-3         → docs/screenshots/phase-3 (light and dark)
//
// A "before" project is a record of one moment, not a thing to re-run: it walks
// the screens with the labels they had on the day, so once the redesign lands,
// this file describes the new design and the old shots stay as committed.
import { test } from "@playwright/test";
import path from "node:path";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { open, sessionTokens, signIn } from "./helpers";
import { createAdminScreenshotData, createEmployeeScreenshotData } from "./screenshot-data";

type Theme = "light" | "dark";
/** Which screens a project captures. Each project lists only the ones it needs. */
type Screen =
  // Admin (phases 1 and 2)
  | "dashboard"
  | "assignments"
  | "courses"
  | "employees"
  | "shell"
  | "course-editor"
  | "invite-dialog"
  | "getting-started"
  | "courses-empty"
  | "employees-empty"
  // Employee and auth (phase 3)
  | "training-list"
  | "training-list-empty"
  | "course-page"
  | "quiz"
  | "result-failed"
  | "result-passed"
  | "login"
  | "signup"
  | "forgot-password"
  | "forgot-password-sent"
  | "set-password-invite"
  | "set-password-reset"
  | "set-password-expired";
type Meta = { dir: string; themes: Theme[]; screens: Screen[] };

const VIEWPORTS = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "mobile", width: 375, height: 812 },
];

const ADMIN_SCREENS: Screen[] = [
  "dashboard",
  "assignments",
  "courses",
  "employees",
  "shell",
  "course-editor",
  "invite-dialog",
  "getting-started",
  "courses-empty",
  "employees-empty",
];

test("capture the design screenshots", async ({ browser, baseURL }, info) => {
  test.setTimeout(30 * 60 * 1000);
  const { dir, themes, screens } = info.project.metadata as Meta;
  const wanted = new Set(screens);
  const outDir = path.join(process.cwd(), "docs", "screenshots", dir);
  const taken: string[] = [];

  const needsAdmin = ADMIN_SCREENS.some((name) => wanted.has(name));
  const needsEmployee = screens.some((name) => !ADMIN_SCREENS.includes(name));
  const adminData = needsAdmin ? await createAdminScreenshotData() : null;
  const employeeData = needsEmployee ? await createEmployeeScreenshotData() : null;

  async function shoot(page: Page, name: string) {
    // Fonts must be in before the shot, or headings render in the fallback face.
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
    taken.push(`${name}.png`);
  }

  /** A dialog or a sticky bar is positioned against the viewport, so don't stitch. */
  async function shootViewport(page: Page, name: string) {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    taken.push(`${name}.png`);
  }

  function newContext(
    browserInstance: Browser,
    theme: Theme,
    viewport: { width: number; height: number },
  ): Promise<BrowserContext> {
    return browserInstance.newContext({
      viewport,
      colorScheme: theme, // the app's theme script follows the system setting by default
      reducedMotion: "reduce",
      deviceScaleFactor: 2,
    });
  }

  async function withPage(
    browserInstance: Browser,
    theme: Theme,
    viewport: { width: number; height: number },
    body: (page: Page) => Promise<void>,
  ) {
    const context = await newContext(browserInstance, theme, viewport);
    try {
      await body(await context.newPage());
    } finally {
      await context.close();
    }
  }

  for (const theme of themes) {
    for (const vp of VIEWPORTS) {
      const suffix = `${vp.label}-${theme}`;

      if (adminData) {
        // The company with real data: every screen except the getting-started state.
        await withPage(browser, theme, vp, async (page) => {
          await signIn(page, adminData.admin.email);

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

          if (wanted.has("course-editor")) {
            await open(page, "/admin/courses");
            await page.getByRole("heading", { name: "Courses" }).first().waitFor();
            // Edit a course that has been assigned, so the warning hint shows too.
            await page
              .getByRole("button", { name: "More actions for Fire safety at work" })
              .click();
            await page.getByRole("menuitem", { name: "Edit course" }).click();
            await page.getByRole("heading", { name: "Edit course" }).waitFor();
            await page
              .getByRole("textbox", { name: "Question 1, option 1", exact: true })
              .waitFor();

            /*
             * Two shots, because one can't show both things. A full-page capture
             * resolves the sticky action bar against the viewport, so in the
             * stitched image it lands a screen down and looks like it is
             * floating in the middle of the form. The viewport shot shows where
             * the bar really sits; the full one shows the whole form.
             */
            await page.evaluate(() => window.scrollTo(0, 0));
            await shootViewport(page, `course-editor-${suffix}`);
            await shoot(page, `course-editor-full-${suffix}`);
          }

          if (wanted.has("invite-dialog")) {
            await open(page, "/admin/employees");
            await page.getByRole("heading", { name: "Employees" }).first().waitFor();
            await page.getByRole("button", { name: "Invite employee" }).click();
            await page.getByRole("dialog").waitFor();
            await page.locator("#invite-name").fill("Ada Lovelace");
            await page.locator("#invite-email").fill("ada@northwind.example.com");
            await shootViewport(page, `invite-dialog-${suffix}`);
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

        // The brand-new company, for every "nothing here yet" state.
        const emptyScreens = (
          ["getting-started", "courses-empty", "employees-empty"] as const
        ).filter((name) => wanted.has(name));
        if (emptyScreens.length) {
          await withPage(browser, theme, vp, async (page) => {
            await signIn(page, adminData.newAdmin.email);

            if (wanted.has("getting-started")) {
              await open(page, "/admin/dashboard");
              await page.getByRole("heading", { name: "Welcome to SkillForge" }).waitFor();
              await shoot(page, `getting-started-${suffix}`);
            }

            if (wanted.has("courses-empty")) {
              await open(page, "/admin/courses");
              await page.getByText("No courses yet.").waitFor();
              await shoot(page, `courses-empty-${suffix}`);
            }

            if (wanted.has("employees-empty")) {
              await open(page, "/admin/employees");
              await page.getByText("No employees yet.").waitFor();
              await shoot(page, `employees-empty-${suffix}`);
            }
          });
        }
      }

      // --- Auth: nobody signed in ------------------------------------------
      if (
        ["login", "signup", "forgot-password", "forgot-password-sent"].some((s) =>
          wanted.has(s as Screen),
        )
      ) {
        await withPage(browser, theme, vp, async (page) => {
          if (wanted.has("login")) {
            await open(page, "/login");
            await page.locator("#password").waitFor();
            await shoot(page, `login-${suffix}`);
          }
          if (wanted.has("signup")) {
            await open(page, "/signup");
            await page.locator("#confirm").waitFor();
            await shoot(page, `signup-${suffix}`);
          }
          if (wanted.has("forgot-password")) {
            await open(page, "/forgot-password");
            await page.locator("#email").waitFor();
            await shoot(page, `forgot-password-${suffix}`);
          }
          if (wanted.has("forgot-password-sent")) {
            /*
             * The confirmation, without sending anything. Supabase's recover
             * call is answered here instead of reaching it — the suite never
             * sends real email, and a screenshot is no reason to start.
             */
            await page.route(`${process.env.SUPABASE_URL}/auth/v1/recover**`, (route) =>
              route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
            );
            await open(page, "/forgot-password");
            await page.locator("#email").fill("ada@northwind.example.com");
            await page.getByRole("button", { name: "Send reset link" }).click();
            await page.getByRole("status").first().waitFor();
            await shoot(page, `forgot-password-sent-${suffix}`);
          }
        });
      }

      /*
       * The set-password page takes its session from the URL fragment, which is
       * how an invite or reset email delivers one. Minting a live pair reaches
       * the real form without a generated link — and so without needing this
       * run's port in Supabase's Redirect URLs.
       */
      if (employeeData) {
        for (const [screen, kind] of [
          ["set-password-invite", "invite"],
          ["set-password-reset", "recovery"],
        ] as const) {
          if (!wanted.has(screen)) continue;
          const tokens = await sessionTokens(employeeData.newStarter.email);
          await withPage(browser, theme, vp, async (page) => {
            await open(
              page,
              `/accept-invite?type=${kind}#access_token=${tokens.access_token}` +
                `&refresh_token=${tokens.refresh_token}&type=${kind}`,
            );
            await page.locator("#confirm").waitFor();
            await shoot(page, `${screen}-${suffix}`);
          });
        }

        if (wanted.has("set-password-expired")) {
          await withPage(browser, theme, vp, async (page) => {
            // Exactly what Supabase puts in the fragment for a dead link.
            await open(
              page,
              "/accept-invite?type=recovery#error=access_denied&error_code=otp_expired" +
                "&error_description=Email+link+is+invalid+or+has+expired",
            );
            await page.getByRole("alert").waitFor();
            await shoot(page, `set-password-expired-${suffix}`);
          });
        }

        // --- The employee's own screens ------------------------------------
        if (wanted.has("training-list")) {
          await withPage(browser, theme, vp, async (page) => {
            await signIn(page, employeeData.learner.email);
            await open(page, "/employee/home");
            await page.getByText("Fire safety at work").first().waitFor();
            await shoot(page, `training-list-${suffix}`);
          });
        }

        if (wanted.has("training-list-empty")) {
          await withPage(browser, theme, vp, async (page) => {
            await signIn(page, employeeData.newStarter.email);
            await open(page, "/employee/home");
            await page.getByText(/No (courses|training)/i).waitFor();
            await shoot(page, `training-list-empty-${suffix}`);
          });
        }

        const quizScreens = (
          ["course-page", "quiz", "result-failed", "result-passed"] as const
        ).filter((name) => wanted.has(name));
        if (quizScreens.length) {
          // A fresh employee: taking the quiz changes the assignment it came from.
          const taker = await employeeData.quizTaker();
          const { questions, title } = employeeData.quizCourse;
          await withPage(browser, theme, vp, async (page) => {
            await signIn(page, taker.email);
            await open(page, "/employee/home");
            await page.getByRole("link", { name: `Start ${title}` }).click();
            await page.getByRole("heading", { name: title, level: 1 }).waitFor();

            if (wanted.has("course-page")) await shoot(page, `course-page-${suffix}`);

            await page.getByRole("button", { name: "Start the quiz" }).click();
            await page.getByText(questions[0].text).first().waitFor();

            // Mid-quiz, which on a phone is the whole point: one question at a time.
            if (wanted.has("quiz")) {
              await page.getByRole("radio", { name: questions[0].correct }).check();
              await page.getByRole("button", { name: "Next" }).click();
              await page.getByText(questions[1].text).first().waitFor();
              await shootViewport(page, `quiz-${suffix}`);
              // Back to the start, so the walk below begins where it expects to.
              await page.getByRole("button", { name: "Back" }).click();
              await page.getByText(questions[0].text).first().waitFor();
            }

            // Half right, so the failed result shows a real score rather than zero.
            await answer(page, questions, (q, i) => (i < 2 ? q.correct : q.wrong));
            if (wanted.has("result-failed")) {
              await page.getByText(/You scored/).waitFor();
              await shoot(page, `result-failed-${suffix}`);
            }

            if (wanted.has("result-passed")) {
              await page.getByRole("button", { name: "Retake the quiz" }).click();
              await answer(page, questions, (q) => q.correct);
              await page.getByText(/You scored/).waitFor();
              await shoot(page, `result-passed-${suffix}`);
            }
          });
        }
      }
    }
  }

  console.log(`\n${taken.length} screenshots in docs/screenshots/${dir}:`);
  for (const name of taken.sort()) console.log(`  ${name}`);
  console.log(`(from ${baseURL})`);
});

type QuizQuestion = { text: string; correct: string; wrong: string };

/** Walks the quiz one question at a time, answering with `pick`, then submits. */
async function answer(
  page: Page,
  questions: QuizQuestion[],
  pick: (q: QuizQuestion, index: number) => string,
) {
  for (const [index, q] of questions.entries()) {
    await page.getByText(q.text).first().waitFor();
    await page.getByRole("radio", { name: pick(q, index), exact: true }).check();
    await page.getByRole("button", { name: "Next" }).click();
  }
  await page.getByRole("button", { name: "Submit quiz" }).click();
}
