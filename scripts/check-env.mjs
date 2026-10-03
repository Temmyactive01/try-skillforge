// Checks the Supabase settings in .env and .env.local without printing secrets.
// Usage: npm run check:env
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

// .env.local first: loadEnvFile never overrides a variable that is already set.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Missing file is reported through the missing variables below.
  }
}

let failed = false;
const ok = (msg) => console.log(`  ok    ${msg}`);
const bad = (msg) => {
  failed = true;
  console.log(`  FAIL  ${msg}`);
};

function jwtRole(token) {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).role;
  } catch {
    return undefined;
  }
}

const env = process.env;
const url = env.SUPABASE_URL;
const ref = env.SUPABASE_PROJECT_ID;
const publishable = env.SUPABASE_PUBLISHABLE_KEY;
const secret = env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = env.DATABASE_URL;

console.log("Public settings (.env)");
for (const name of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PROJECT_ID"]) {
  if (!env[name]) bad(`${name} is empty`);
  else if (env[name] !== env[`VITE_${name}`]) bad(`VITE_${name} must equal ${name}`);
  else ok(`${name} and VITE_${name} set and identical`);
}
if (url && !/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url)) {
  bad(`SUPABASE_URL should look like https://<project-id>.supabase.co (no trailing slash)`);
} else if (url && ref && !url.startsWith(`https://${ref}.`)) {
  bad("SUPABASE_PROJECT_ID does not match the project in SUPABASE_URL");
} else if (url) {
  ok(`project ${ref} at ${url}`);
}
if (publishable) {
  const kind = publishable.startsWith("sb_publishable_")
    ? "publishable key"
    : jwtRole(publishable) === "anon"
      ? "legacy anon key"
      : null;
  if (kind) ok(`publishable key looks like a ${kind}`);
  else bad("SUPABASE_PUBLISHABLE_KEY is not a publishable (sb_publishable_...) or anon key");
}

console.log("Secrets (.env.local), values never shown");
const committedEnv = readFileSync(".env", "utf8");
if (!secret) bad("SUPABASE_SERVICE_ROLE_KEY is empty");
else {
  const kind = secret.startsWith("sb_secret_")
    ? "secret key"
    : jwtRole(secret) === "service_role"
      ? "legacy service_role key"
      : null;
  if (kind) ok(`SUPABASE_SERVICE_ROLE_KEY is set and looks like a ${kind}`);
  else bad("SUPABASE_SERVICE_ROLE_KEY is not a secret (sb_secret_...) or service_role key");
  if (committedEnv.includes(secret))
    bad("the secret key is also in .env, which is committed. Remove it from .env");
}
if (!dbUrl) bad("DATABASE_URL is empty");
else if (dbUrl.includes("[YOUR-PASSWORD]")) bad("DATABASE_URL still contains [YOUR-PASSWORD]");
else if (committedEnv.includes(dbUrl))
  bad("DATABASE_URL is also in .env, which is committed. Remove it from .env");
else ok("DATABASE_URL is set");

console.log("Live checks");
if (url && publishable) {
  const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: publishable } }).catch(
    (e) => ({ status: e.message }),
  );
  if (res.status === 200) ok("publishable key accepted by Supabase Auth");
  else bad(`publishable key rejected (status ${res.status})`);
}
if (url && secret) {
  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (!error) ok("secret key accepted (admin API works)");
  else bad(`secret key rejected: ${error.message}`);
}
if (dbUrl && !dbUrl.includes("[YOUR-PASSWORD]")) {
  const sql = postgres(dbUrl, { ssl: "require", max: 1, connect_timeout: 15, onnotice: () => {} });
  try {
    await sql`select 1`;
    ok("database connection works");
  } catch (e) {
    // Error messages from the driver never include the password.
    bad(`database connection failed: ${e.message}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

console.log(failed ? "\nSome checks failed." : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
