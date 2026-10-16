import { defineConfig } from "@playwright/test";

// Same order as scripts/lib.mjs: .env.local wins because loadEnvFile never overrides.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // A missing file shows up as a missing variable in global setup.
  }
}

export const E2E_PORT = 8090;
const baseURL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: "e2e",
  // The screenshot spec has its own config (playwright.screenshots.config.ts).
  testIgnore: /screenshots\.spec\.ts/,
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  // One test at a time keeps us well under Supabase's auth rate limits.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  /*
   * Back to 15s. It was raised to 20 when `open()` stopped waiting for
   * networkidle: a page that fetches its rows in an effect still fetched them,
   * and that wait fell inside whichever assertion was looking for a row — so
   * the budget was covering a page load, which is not what an assertion budget
   * is for. Under a loaded machine it ran out anyway, twice.
   *
   * `open()` now waits for `data-loaded`, the attribute AdminShell sets once
   * the fetch has settled, so the wait is back where it belongs and the budget
   * only has to cover an assertion again.
   */
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    channel: "msedge",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    // Its own server, never your normal one on 8080: this one has invite emails switched off.
    command: `npm run dev -- --port ${E2E_PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { E2E_SKIP_INVITE_EMAIL: "1" },
  },
});
