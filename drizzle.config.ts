import { defineConfig } from "drizzle-kit";

// DATABASE_URL is a secret, so it lives in the git-ignored .env.local.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on the environment.
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
