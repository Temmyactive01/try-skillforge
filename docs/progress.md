# SkillForge progress log

What has been done, why, what broke and what's next. Newest session first. Update this file at the end of every working session.

## Where things stand (2026-10-04)

- The app runs locally against your own Supabase project (`obfxcakfqjqxrxjphidy`). Nothing depends on Lovable any more.
- The GitHub repo is the only home for the code. `main` is pushed and up to date.
- The database has all 12 migrations applied. Every table is protected by Row-Level Security, and `npm run verify:security` proves it.
- Demo data (Northwind Logistics) is loaded with `npm run seed`. Your own test company from manual testing is also in the database.
- Signup, employee invites, course assignment, quizzes, password reset and the AI-assistant (`/mcp`) endpoint have all been tested and work.
- Not deployed yet. Netlify is the planned host.
- The new design system (`DESIGN.md`) is written but not applied.

## Session 1: 2026-10-03 to 2026-10-04

### What we did

1. **Understood the project** and wrote `CLAUDE.md`, the guide future coding sessions read first.
2. **Got it running on Windows.** A Lovable package crashed on Windows paths; we worked around it, then replaced the package (see bugs).
3. **Left Lovable completely**, in small tested steps:
   - npm instead of Bun, with a lockfile that downloads only from the public npm registry;
   - a plain Vite config instead of Lovable's wrapper;
   - removed Lovable's error reporting, preview login helper, project file and branding;
   - the AI-assistant login page moved from `/.lovable/oauth/consent` to `/oauth/consent`;
   - the AI-assistant endpoint rebuilt on the official MCP SDK.
4. **Moved to your own Supabase project:**
   - keys go in `.env` (public) and `.env.local` (secret), checked with `npm run check:env`;
   - the 12 database migrations are applied with the Supabase CLI;
   - security is verified with `npm run verify:security`;
   - demo data comes from `npm run seed`;
   - the AI endpoint is tested with `npm run test:mcp`;
   - Supabase Auth settings are configured and documented in the README.
5. **Tested the whole app by hand** (signup, invite, assign, quiz, password reset) and fixed what failed.
6. **Added `DESIGN.md`**, the design system for the upcoming redesign.

### Key decisions and why

| Decision | Why |
|---|---|
| **npm, not Bun** | npm comes with Node.js, while Bun needed extra setup on Windows. The old `bun.lock` downloaded packages from Lovable's private cache. |
| **Kept exact package versions when switching to npm** | A fresh install would have changed 234 packages at once (React, Supabase, Vite and more). Upgrades should happen on purpose, one at a time. |
| **One-day minimum age for new packages** (`.npmrc`) | Protects against freshly published malicious package versions. It replaces the same rule from Lovable's Bun config. |
| **Official MCP SDK instead of `@lovable.dev/mcp-js`** | The Lovable package still had the Windows bug in its latest version and sent usage data to Lovable by default. The official SDK does the same job with no Lovable ties. |
| **One migrations folder (`supabase/migrations`), drizzle removed** | Drizzle was Lovable's migration tool, and nothing in the app used it. One folder and one tool (the Supabase CLI) is simpler. The five drizzle migrations were moved as-is, renamed to keep their original order. |
| **Secrets only in `.env.local`** | `.env` is committed to GitHub and `.env.local` is git-ignored. A scan of all commits confirmed no secret was ever committed. |
| **New Supabase project started empty** | There was no data worth keeping. The demo data is recreated by a script instead. |
| **Public sign-ups turned off in Supabase** | The app creates every account itself (company signup and employee invites), so this only blocks people creating empty accounts directly through Supabase. |
| **Sign out ends only the current browser's session** | It used to end the user's sessions everywhere, which broke password resets open in other tabs (see bugs). This is also what most apps do. |
| **`AGENTS.md` kept, as a pointer to `CLAUDE.md`** | Other coding agents (such as Codex) read `AGENTS.md`. Pointing them at one guide stops two copies drifting apart. |

### Bugs found and fixed

| Bug | Cause | Fix |
|---|---|---|
| App wouldn't start on Windows | Lovable's MCP plugin compared `C:/...` with `C:\...` as text, so its safety check always failed on Windows. | Replaced with the official MCP SDK (`273c780`). |
| Route files always showed as "modified" | Windows checked files out with CRLF line endings, but the code generators write LF. | `.gitattributes` makes every file LF (`ba32e74`). |
| `/mcp` returned a 500 server error for a malformed token | Supabase's `getClaims` throws on malformed tokens instead of returning an error. | Now caught and answered with "not authorised" (401) (`273c780`). |
| Type-check failed after removing drizzle | The `esbuild.keepNames` option (ignored by Vite 8 anyway) needed esbuild's types, which left with drizzle. | Switched to Rolldown's `output.keepNames` (`8228c6c`). |
| Password reset never asked for a new password | The reset email linked to `/login`, which just signed the user in. | The link now goes to the set-password page (`2c35302`). |
| Password reset failed with "Auth session missing!" | All tabs share one login, and Sign out ended the user's sessions everywhere. Signing out in another tab killed the reset session, and the page didn't notice. | The page keeps its link's login in its own tab and checks it with Supabase. Sign out is now per-browser, and errors are in plain language (`0a33348`). |
| Wrong admin email in manual test 1 | Not a code bug: signed up with the address meant for the employee. | The test company and account were deleted by exact ID; the demo data was untouched. |

Also added in that last fix: show/hide eye icons on the set-password page, sharing the signup page's existing `PasswordField`.

### Known issues (not fixed yet)

- **Cancelled assignments aren't handled everywhere.** The MCP `list_my_assignments` status filter and the course page's `Assignment` type don't know about the `cancelled` status.
- **npm reports security advisories** in some dependencies. `npm audit fix` wasn't run, because it changes versions.
- **About 290 old lint problems** remain, mostly formatting in the Supabase helper files and the generated `types.ts`.
- **The full AI-assistant sign-in through the consent page** (manual test 6, with a real AI client) hasn't been tried. The signed-in `/mcp` call itself is tested.
- **The production build targets Cloudflare Workers** by default. This needs checking when setting up Netlify.
- **The old Lovable site** (try-skillforge.lovable.app) and its Supabase project still exist, frozen at the old version.
- **Harmless dev-log noise:**
  - a hydration warning caused by a page-ruler browser extension;
  - a 404 for the missing `favicon.ico`.

## Before launch

- [ ] **Set up an email service** (e.g. Resend) under Supabase → Authentication → Emails → SMTP Settings. The built-in sender only reaches your own address, a few times an hour, so real invites and resets won't arrive without it.
- [ ] **Update Supabase Site URL and Redirect URLs for Netlify** (Authentication → URL Configuration). Set Site URL to the Netlify address and add `https://YOUR-SITE.netlify.app/**` to Redirect URLs. Keep `http://localhost:8080/**` for local work.
- [ ] **Remove the Northwind demo data and your test company** from the production database. The demo accounts share a public password.
- [ ] **Add a favicon** (the browser-tab icon). Do it with the redesign so it matches `DESIGN.md`.
- [ ] **Update the deprecated `inputValidator()` code** in the server functions (`src/lib/*.functions.ts`), as TanStack Start's warning suggests.

## What's next

1. Deploy to Netlify and confirm the build works there, then work through "Before launch".
2. Apply the design system in `DESIGN.md` (the redesign).
3. Fix the known issues above, starting with `cancelled` assignments.
4. Try connecting a real AI assistant through `/oauth/consent`.

## Useful commands

```sh
npm run dev               # run the app at http://localhost:8080
npm run check:env         # check .env / .env.local against Supabase (never prints secrets)
npm run verify:security   # prove RLS and quiz-answer protection
npm run seed              # (re)load Northwind demo data
npm run test:mcp          # test the AI-assistant endpoint (needs npm run dev)
npx supabase db push      # apply new migrations (see README "Database changes")
```
