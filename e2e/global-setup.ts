import type { FullConfig } from "@playwright/test";
import { adminClient, cleanupE2EData, createCompany, recoveryLink } from "./helpers";

export default async function globalSetup(config: FullConfig) {
  const missing = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"].filter(
    (n) => !process.env[n],
  );
  if (missing.length) {
    throw new Error(`Missing ${missing.join(", ")}. Run npm run check:env.`);
  }

  // Leftovers from a run that crashed before its teardown.
  const swept = await cleanupE2EData();
  if (swept.companies || swept.users) {
    console.log(
      `Removed leftovers from an earlier run: ${swept.companies} companies, ${swept.users} users.`,
    );
  }

  // Generated links only come back to the test server if Supabase allows its address.
  const baseURL = config.projects[0].use.baseURL!;
  const company = await createCompany("Preflight");
  try {
    const link = await recoveryLink(company.admin.email, baseURL);
    const res = await fetch(link, { redirect: "manual" });
    const location = res.headers.get("location") ?? "";
    if (!location.startsWith(`${baseURL}/accept-invite`)) {
      throw new Error(
        `Supabase sends test links to "${location.split("#")[0] || "(nowhere)"}" instead of ${baseURL}.\n` +
          `Fix: Supabase dashboard → Authentication → URL Configuration → Redirect URLs → Add URL → ${baseURL}/** → Save.`,
      );
    }
  } finally {
    await adminClient().from("companies").delete().eq("id", company.id);
    await adminClient().auth.admin.deleteUser(company.admin.id);
  }
}
