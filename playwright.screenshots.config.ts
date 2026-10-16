// Config for the design screenshots only. `npm run test:e2e` uses playwright.config.ts
// and ignores the screenshots spec.
import { defineConfig } from "@playwright/test";

// Same order as scripts/lib.mjs: .env.local wins because loadEnvFile never overrides.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // A missing file shows up as a missing variable in setup.
  }
}

// A port of its own, so a screenshot run can't collide with a test run.
const PORT = 8091;
const baseURL = `http://localhost:${PORT}`;

/** Phase 3's screens: the employee's own pages, and every page you sign in through. */
const PHASE_3_SCREENS = [
  "training-list",
  "training-list-empty",
  "course-page",
  "quiz",
  "result-failed",
  "result-passed",
  "login",
  "signup",
  "forgot-password",
  "forgot-password-sent",
  "set-password-invite",
  "set-password-reset",
  "set-password-expired",
];

/** Phase 4's screens: every page a signed-out visitor can reach, and the 404. */
const PHASE_4_SCREENS = [
  "home",
  "about",
  "features",
  "tour",
  "pricing",
  "security",
  "privacy",
  "terms",
  "not-found",
];

export default defineConfig({
  testDir: "e2e",
  testMatch: /screenshots\.spec\.ts/,
  globalSetup: "./e2e/screenshots-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    channel: "msedge",
    headless: true,
  },
  projects: [
    // The design as it was before phase 1. Dark mode didn't exist yet, so light only.
    {
      name: "before",
      metadata: {
        dir: "before",
        themes: ["light"],
        screens: ["dashboard", "assignments", "getting-started"],
      },
    },
    {
      name: "phase-1",
      metadata: {
        dir: "phase-1",
        themes: ["light", "dark"],
        screens: ["dashboard", "assignments", "shell", "getting-started"],
      },
    },
    // The two screens phase 2 redesigns, as they were before it started.
    {
      name: "before-phase-2",
      metadata: { dir: "before-phase-2", themes: ["light"], screens: ["courses", "employees"] },
    },
    {
      name: "phase-2",
      metadata: {
        dir: "phase-2",
        themes: ["light", "dark"],
        screens: [
          "courses",
          "employees",
          "course-editor",
          "invite-dialog",
          "courses-empty",
          "employees-empty",
        ],
      },
    },
    /*
     * The employee and auth pages as they were before phase 3. Light only: the
     * point is the layout that is being replaced, not the theme.
     */
    {
      name: "before-phase-3",
      metadata: { dir: "before-phase-3", themes: ["light"], screens: PHASE_3_SCREENS },
    },
    {
      name: "phase-3",
      metadata: { dir: "phase-3", themes: ["light", "dark"], screens: PHASE_3_SCREENS },
    },
    /*
     * The marketing pages as they were before phase 4. Light only: the point is
     * the layout being replaced, not the theme.
     */
    {
      name: "before-phase-4",
      metadata: { dir: "before-phase-4", themes: ["light"], screens: PHASE_4_SCREENS },
    },
    {
      name: "phase-4",
      metadata: { dir: "phase-4", themes: ["light", "dark"], screens: PHASE_4_SCREENS },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
