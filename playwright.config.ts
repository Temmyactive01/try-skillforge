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
   * 15s was tuned while open() waited for networkidle before handing the page
   * back. That wait is gone — it was a guess at hydration, which the page now
   * signals properly — but the time it absorbed hasn't disappeared: a page
   * that fetches its rows in an effect still fetches them, and that wait now
   * falls inside the assertion that is looking for a row. So the assertion
   * budget takes on what the pre-wait used to cover. It costs a passing run
   * nothing; only a genuinely failing assertion waits the extra five seconds.
   */
  expect: { timeout: 20_000 },
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
