# SkillForge progress log

What has been done, why, what broke and what's next. Newest session first. Update this file at the end of every working session.

## Where things stand (2026-10-05, end of session 3)

- The app runs locally against your own Supabase project (`obfxcakfqjqxrxjphidy`). Nothing depends on Lovable any more.
- The GitHub repo is the only home for the code. Everything is pushed to `main`.
- The database has all 14 migrations applied. Every table is protected by Row-Level Security, and `npm run verify:security` proves it.
- **Only passing the quiz completes a course.** Employees can start a course, but only the server-side grader can mark it Complete or record a score.
- **Once passed, a course stays Complete.** Employees can retake the quiz for practice, and admins see each assignment's best score on the Assignments page.
- **21 automated browser tests** (`npm run test:e2e`) cover:
  - signup, invites, courses and quizzes;
  - password reset;
  - company isolation and role rules;
  - who can complete a course;
  - practice retakes after passing.

  They pass, send no email and clean up after themselves.
- Demo data (Northwind Logistics) is loaded with `npm run seed`. Your own test company from manual testing is also in the database.
- Not deployed yet. Netlify is the planned host.
- The new design system (`DESIGN.md`) is written but not applied. The tests are there to catch anything the redesign breaks.

## Session 3: 2026-10-05 (only the quiz completes a course; retakes)

### What we did

1. **Closed the "employees can complete their own course" gap.**
   - A new migration means a signed-in employee can only move their own assignment from Not started to In progress. Setting Complete, Cancelled or back to Not started is refused.
   - Employees can no longer insert quiz results at all.
   - The quiz grader (`submitQuiz`) records the result and sets Complete or In progress itself, using the service role, after checking:
     - the assignment is the employee's;
     - it isn't cancelled;
     - its course belongs to their company.
2. **Added proof.**
   - A new test, "only passing the quiz can complete a course", has an employee:
     - start a course (allowed);
     - try to set Complete, Cancelled and Not started (all refused);
     - try to record a 100% result (refused).
   - `npm run verify:security` gained the same two checks.
   - The test was run **before** the fix and failed, which showed the gap was real. It passes after.
3. Re-ran everything: 20/20 browser tests, `verify:security`, `test:mcp`, the type-check and the build all pass. Northwind and your test company are unchanged.
4. Pushed sessions 2 and 3 to GitHub.
5. **Retakes (your decision): once passed, an assignment stays Complete** (`e92b5ab`).
   - Later attempts are practice. They're still recorded, but they never move the course back to In progress.
   - The admin's Assignments page has a new **Best score** column.
   - The employee's My Learning page also shows the best score; before, it showed the latest.
   - A failed practice attempt now says "You already passed, so the course stays complete." It no longer asks for a retake.
   - The journey test now does a 0% practice retake after passing, and checks that the course stays Complete, My Learning still shows 100% and the admin sees Best score 100%.
   - All 21 tests, `verify:security`, `test:mcp`, the type-check and the build pass. Pushed.

### Key decisions and why

| Decision | Why |
|---|---|
| **Enforced in the database, not just the app** | The browser can talk to the database directly, so a rule only in the page could be bypassed. The database now refuses the change whoever sends it. |
| **The grader writes with the service role** | Once employees can't set Complete, the grader can't do it "as the employee" either. It checks ownership first, then writes with the trusted key. |
| **Employees may only go Not started → In progress** | That's the one change the app makes for them ("I've reviewed the content"). Every other status change belongs to the grader or an admin. |
| **Cancelled assignments can't be graded** | Otherwise taking the quiz from an old link would revive a cancelled assignment as Complete. |
| **A pass sticks; retakes are practice** (your decision, replacing the old behaviour where a failed retake set In progress) | Completion records that the employee has shown they know the material. Practising afterwards shouldn't undo that. |
| **Show the best score, not the latest** | It matches "a pass sticks". A lower practice score shouldn't make a completed course look worse to the admin or the employee. |

### Bugs found and fixed

| Bug | Cause | Fix |
|---|---|---|
| Employees could mark a course Complete (or record any score) without taking the quiz | The assignment trigger allowed any status change, and a rule let employees insert their own quiz results. | New migration, plus the grader writing with the service role (`f192771`). |

## Session 2: 2026-10-04 (automated tests)

### What we did

1. **Added Playwright end-to-end tests** (`e2e/`, run with `npm run test:e2e`): 19 tests in three files.
   - `journey.spec.ts` repeats manual tests 1–4:
     - company signup;
     - team and employee invite;
     - accepting the invite;
     - creating and assigning a course;
     - failing, retaking and passing the quiz;
     - the admin seeing Complete.
   - `password-reset.spec.ts` repeats test 5:
     - the Forgot password request;
     - a fresh link;
     - signing out in another tab;
     - an already-used link;
     - reloading the page.
   - `access.spec.ts` checks:
     - company isolation, in the pages and by direct database queries;
     - employees blocked from admin pages and admin-only changes;
     - quiz answers staying hidden.
2. **Found and fixed a security hole** with the new isolation test (see bugs).
3. **Replaced the deprecated `inputValidator()`** with `validator()` in all three server functions.
4. Documented the tests in the README ("Tests") and in `CLAUDE.md`.

### Key decisions and why

| Decision | Why |
|---|---|
| **Playwright with the installed Edge** | Playwright is the standard tool for browser tests. Using the Edge that ships with Windows avoids a large browser download. |
| **Tests run their own app server on port 8090** | It can't accidentally reuse your normal 8080 server, which sends real invite emails, and you can keep `npm run dev` open while tests run. It needed one Supabase setting: `http://localhost:8090/**` in Redirect URLs. |
| **Test-only switch `E2E_SKIP_INVITE_EMAIL`** | "Add Employee" sends its email from the server, where a test can't intercept it. With the switch on, the app creates the same invited user via `generateLink` without emailing. It only works in the dev server, never in a production build. |
| **Links from the admin API; the Forgot password request answered by the test** | No real email and no use of Supabase's email limit. |
| **Strict test-data naming plus a guarded clean-up** | Test users are `…@e2e.example.com` and test companies are `E2E Test …`. Clean-up refuses to delete anything else, so Northwind and your company are safe. It also runs before each run, to clear leftovers from a crashed run. |
| **One test at a time** | Keeps well under Supabase's sign-in rate limits. A full run takes about 3–4 minutes. |
| **Security fix applied straight away** (your choice) | The hole broke company isolation, the app's core promise. |

### Bugs found and fixed

| Bug | Cause | Fix |
|---|---|---|
| **An admin could read another company's quiz answers** | The rule for creating assignments checked that the *employee* was in the admin's company, but not the *course*. An admin who knew another company's course ID could assign it to their own employee. Submitting that quiz then returned the other company's questions and correct answers. | A new migration requires the course to be in the admin's company too, and the quiz grader refuses courses the user can't see (`638d638`). No existing data was affected (0 such assignments). |
| Early test clicks did nothing | The tests clicked before React had finished loading the page (slow on a cold dev server), so forms submitted as plain HTML. | Tests open pages with `open()`, which waits until the page is idle. Test-only; no app change. |
| `inputValidator()` deprecation warning | TanStack Start renamed the method. | Switched to `validator()` (`77062fd`). The warning is gone, and all tests pass before and after. |

Commits: `638d638` (security fix), `ac29ac3` (tests), `77062fd` (validator), plus the docs commit that adds this section.

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

- ~~**Employees can mark their own course complete without the quiz.**~~ Fixed in session 3 (`f192771`).
- **Cancelled assignments aren't handled everywhere.** The MCP `list_my_assignments` status filter and the course page's `Assignment` type don't know about the `cancelled` status.
- **npm reports security advisories** in some dependencies. `npm audit fix` wasn't run, because it changes versions.
- **About 290 old lint problems** remain, mostly formatting in the Supabase helper files and the generated `types.ts`.
- **The full AI-assistant sign-in through the consent page** (manual test 6, with a real AI client) hasn't been tried. The signed-in `/mcp` call itself is tested.
- **The production build targets Cloudflare Workers** by default. This needs checking when setting up Netlify.
- **The old Lovable site** (try-skillforge.lovable.app) and its Supabase project still exist, frozen at the old version.
- **Harmless dev-log noise:**
  - a hydration warning caused by a page-ruler browser extension;
  - a 404 for the missing `favicon.ico`;
  - `TypeError: Failed to fetch` lines during test runs, from requests cut off when a test moves to the next page.

## Before launch

- [ ] **Set up an email service** (e.g. Resend) under Supabase → Authentication → Emails → SMTP Settings. The built-in sender only reaches your own address, a few times an hour, so real invites and resets won't arrive without it.
- [ ] **Update Supabase Site URL and Redirect URLs for Netlify** (Authentication → URL Configuration). Set Site URL to the Netlify address and add `https://YOUR-SITE.netlify.app/**` to Redirect URLs. Keep `http://localhost:8080/**` for local work.
- [ ] **Remove the Northwind demo data and your test company** from the production database. The demo accounts share a public password.
- [ ] **Add a favicon** (the browser-tab icon). Do it with the redesign so it matches `DESIGN.md`.
- [x] **Update the deprecated `inputValidator()` code** in the server functions (done in session 2, `77062fd`).
- [ ] **Run `npm run test:e2e` before every deploy.**

## What's next

1. Apply the design system in `DESIGN.md` (the redesign). Run `npm run test:e2e` after each page. If a test breaks only because a label or button text changed on purpose, update the test to match.
2. Deploy to Netlify and confirm the build works there, then work through "Before launch".
3. Fix the known issues above, starting with `cancelled` assignments.
4. Try connecting a real AI assistant through `/oauth/consent`.
5. Optionally, run the tests automatically on GitHub for every push (GitHub Actions). That needs the Supabase secret stored as a GitHub secret, and ideally a separate test Supabase project.

## Useful commands

```sh
npm run dev               # run the app at http://localhost:8080
npm run check:env         # check .env / .env.local against Supabase (never prints secrets)
npm run verify:security   # prove RLS and quiz-answer protection
npm run seed              # (re)load Northwind demo data
npm run test:mcp          # test the AI-assistant endpoint (needs npm run dev)
npm run test:e2e          # all browser tests (~3–4 min, no email, cleans up)
npm run test:e2e:report   # open the last test report
npx supabase db push      # apply new migrations (see README "Database changes")
```
