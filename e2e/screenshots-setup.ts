import { cleanupE2EData } from "./helpers";

// Lighter than the test suite's setup: screenshots never follow an emailed link,
// so there's no redirect-URL check to make.
export default async function globalSetup() {
  const missing = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"].filter(
    (n) => !process.env[n],
  );
  if (missing.length) {
    throw new Error(`Missing ${missing.join(", ")}. Run npm run check:env.`);
  }

  const swept = await cleanupE2EData();
  if (swept.companies || swept.users) {
    console.log(
      `Removed leftovers from an earlier run: ${swept.companies} companies, ${swept.users} users.`,
    );
  }
}
