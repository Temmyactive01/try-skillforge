// Shared helpers for the scripts in this folder. Secrets are read, never printed.
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

// .env.local first: loadEnvFile never overrides a variable that is already set.
export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      // A missing file shows up as a missing variable later.
    }
  }
}

export function requireEnv(...names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`Missing ${missing.join(", ")}. Run npm run check:env.`);
    process.exit(1);
  }
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service-role client: bypasses RLS. Scripts only, never the browser. */
export function adminClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, noSession);
}

/** Publishable-key client: exactly what a browser gets. */
export function publicClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, noSession);
}

export function db() {
  return postgres(process.env.DATABASE_URL, { ssl: "require", max: 1, onnotice: () => {} });
}

// Demo accounts created by scripts/seed.mjs. example.com is reserved, so no real inbox exists.
export const DEMO = {
  company: "Northwind Logistics",
  domain: "northwind.example.com",
  password: () => process.env.SEED_PASSWORD || "Northwind-Demo-2026!",
  admin: { name: "Grace Okafor", email: "admin@northwind.example.com" },
  teams: ["Operations", "Sales"],
  employees: [
    { name: "Amara Nwosu", email: "amara.nwosu@northwind.example.com", team: "Operations" },
    { name: "Daniel Mensah", email: "daniel.mensah@northwind.example.com", team: "Operations" },
    { name: "Priya Raman", email: "priya.raman@northwind.example.com", team: "Operations" },
    { name: "Lukas Weber", email: "lukas.weber@northwind.example.com", team: "Sales" },
    { name: "Sofia Alvarez", email: "sofia.alvarez@northwind.example.com", team: "Sales" },
    { name: "Tomás Silva", email: "tomas.silva@northwind.example.com", team: "Sales" },
  ],
};
