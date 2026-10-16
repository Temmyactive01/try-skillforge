# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SkillForge is a multi-tenant B2B learning & development app: a company admin creates courses (text / video link / PDF link + multiple-choice quiz), invites employees, groups them into teams, and assigns courses with due dates; employees view content, take the quiz (pass mark 70%), and see their progress. Each company's data must stay fully isolated from every other company's.

This GitHub repo is the only home for SkillForge. Keep `main` working and don't rewrite pushed history. `AGENTS.md` only points other coding agents here, so keep guidance in this file.

`DESIGN.md` is the official design system and **is now the source of truth for every visual decision**. Its tokens are live in `src/styles.css`; the old cream/terracotta/Fraunces palette is gone. The redesign is finished: phase 1 covered the foundations, the admin shell, the admin dashboard and the Assignments table; phase 2 covered Courses and Employees; phase 3 covered the employee screens and every page you sign in through; phase 4 covered the public marketing pages and the 404. **Every screen now follows `DESIGN.md`.**

## Progress log

`docs/progress.md` records what has been done, key decisions and why, bugs fixed, known issues, the "Before launch" checklist and what's next. Read it at the start of a session. **At the end of every working session, update it before the final commit:** refresh "Where things stand", add a new dated session section at the top (newest first) with what was done, decisions, bugs and fixes (with commit hashes), tick or add "Before launch" items, and update "Known issues" and "What's next".

## Commands

```sh
npm ci             # npm only; package-lock.json is the lockfile
npm run dev        # vite dev server
npm run build      # production build (nitro, Cloudflare target)
npm run lint       # eslint
npm run format     # prettier --write
npx tsc --noEmit   # type-check (no script for it); e2e: npx tsc --noEmit -p e2e/tsconfig.json
npm run test:e2e   # Playwright end-to-end tests (add `-- e2e/<file>.spec.ts` for one file)
npm run check:contrast   # WCAG AA check on the design tokens, both themes
npm run screenshots      # design screenshots → docs/screenshots/phase-1
npm run screenshots:phase-2  # design screenshots → docs/screenshots/phase-2
npm run screenshots:phase-3  # design screenshots → docs/screenshots/phase-3
npm run screenshots:phase-4  # design screenshots → docs/screenshots/phase-4
npm run build:brand      # regenerate public/ favicons and the Open Graph image
```

**After any visual change**, run `npm run check:contrast` — it reads the tokens straight out of `styles.css` and fails if a pair drops below AA. Re-run `npm run screenshots` when a redesigned screen changes; it uses its own config and port (8091) and seeds its own data.

**End-to-end tests** (`e2e/`, `playwright.config.ts`) run in installed Edge against their own dev server on port 8090 (118 tests, 11-15 minutes depending on what else is running). That port must be in Supabase's Redirect URLs; `e2e/global-setup.ts` checks this. Run them after any change to a flow they cover, and keep them passing.

- **No email, ever.** The test server sets `E2E_SKIP_INVITE_EMAIL=1`, and `createEmployee` then uses `generateLink` instead of `inviteUserByEmail` (honoured only when `import.meta.env.DEV`). Tests get invite and reset links from `admin.generateLink` and intercept the browser's `/auth/v1/recover` call. Never call a path that emails.
- **Own data only.** Test users must use `@e2e.example.com` emails and test companies must be named `E2E Test …` (use the helpers in `e2e/helpers.ts`). `cleanupE2EData()` deletes only those, in global setup and teardown.
- **Navigate with `open(page, url)`.** It waits for `html[data-hydrated="true"]`, which `__root.tsx` sets in an effect once React has attached. Interacting before that makes forms submit natively, and the URL gains a `?`. Never paper over it with a retry or a timeout.
- **Sign in with `signIn(page, email)`**, which writes the session into `localStorage` before the first navigation. Use `signInUI` only where signing in is the thing under test — `journey`, `auth` and `password-reset` do.
- **`dates.spec.ts` and `training.spec.ts` are unit tests** on pure functions, run by the same Playwright runner because it is already here and already reads TypeScript. They need no browser and take a tenth of a second.
- **Dialogs must not fade their own opacity.** `DialogContent` and `AlertDialogContent` fade only their backdrop; animating the panel makes the page behind readable straight through the form while it opens. `e2e/dialogs.spec.ts` measures the rendered opacity and background alpha of every admin dialog, so re-adding `fade-in-0` fails the suite.
- **Courses and Employees keep a table and a card list in the DOM at once** and show whichever fits the width, so a name appears twice. Scope to `getByRole("row")` or the card list by its `aria-label`, or filter to the visible one.
- **The public pages' links name their destination _and_ describe it**, so the 404's way home has the accessible name "Home What SkillForge does", not "Home". Match the whole name rather than reaching for a regex.
- `npm run verify:security` and `npm run test:mcp` are separate script checks (see the README).

## Stack

- **TanStack Start** (React 19, SSR) with file-based routing via TanStack Router, built with Vite 8. `vite.config.ts` is a plain Vite config: Tailwind, TanStack Start (server entry `src/server.ts`; import protection fails the build if client code imports `**/server/**` or `server-only`), nitro for builds (defaults to Cloudflare Workers; output in `.output/`), and React. Dev server runs on port 8080.
- **Tailwind CSS v4**; tokens live in `src/styles.css` and follow `DESIGN.md`. Read that file before any visual work. In short:
  - Colours are declared per theme under `:root` and `[data-theme="dark"]`, then exposed via `@theme inline`. Use the design names (`bg-surface`, `text-ink`, `text-ink-muted`, `border-steel`, `bg-temper-blue`, `text-oxide`) in new code. The shadcn names (`bg-primary`, `bg-card`, `text-muted-foreground`, …) are **aliases of the same tokens**, kept so unredesigned screens stay coherent — don't add new code that uses them.
  - The **temper scale** (straw → bronze → violet → blue) means progress and nothing else. Never use it decoratively. `temper-straw` is a fill, not a text colour, in the light theme.
  - Type: one family (Archivo). Use the named sizes `text-display`, `text-heading-1`, `text-figure`, `text-heading-2`, `text-heading-3`, `text-body`, `text-small` — line height and weight travel with the size. Add `font-expanded` to `display` and `heading-1` only. Never below 14px. Sentence case.
  - Spacing uses the 4px steps 1, 2, 3, 4, 6, 8, 12, 16. Radius: `sm` controls, `md` buttons and panels, `lg` dialogs only.
  - Separate panels with a `steel` hairline, not a shadow. One primary button per screen.
- **Theme:** `data-theme` on `<html>`, set by an inline script in `__root.tsx` before first paint (stored choice, else the system setting). `ThemeToggle` switches it. Don't move that script or add a theme provider — the current setup is what keeps dark mode from flashing.
- **Build screens from the kit in `src/components/ui/`** (restyled to the tokens), not hand-written markup — `DESIGN.md` asks for this, and the admin shell, dashboard and Assignments table now follow it. `TemperProgress` is the custom component for any completion figure. The admin shell is built on the kit's `sidebar.tsx` primitive.
- **Supabase** for Postgres, Auth, and Row-Level Security. Project id is in `supabase/config.toml`; URL and publishable key come from `.env` (`VITE_SUPABASE_*` for the browser, `SUPABASE_*` for the server). Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`) go in git-ignored `.env.local`, which overrides `.env`; `.env` is committed. See the README's environment table.

## Routing

Routes are files in `src/routes/` (see `src/routes/README.md` for conventions: `admin.courses.tsx` → `/admin/courses`, `$param` for dynamic segments). `src/routeTree.gen.ts` is generated — never edit it. `__root.tsx` is the only layout and must keep `<Outlet />`.

- **Public marketing:** `/`, `/tour`, `/features`, `/about`, `/pricing`, `/security`, `/privacy`, `/terms`. All of them, and the 404, are wrapped in `PublicPage` (`src/components/public/`), which supplies the skip link, `PublicHeader`, one `<main id="main">` and `PublicFooter`. Don't hand-build a header into a new public page — that is what left the old nav unreachable below 640px in five copies.
  - Head tags come from `pageHead()` in `src/lib/seo.ts`: title, description, canonical, Open Graph and Twitter in one call, so a page can't disagree with its own share card. Two constants there are waiting on launch decisions — `SITE_URL` (a `.example` placeholder until the deployed address is settled) and `CONTACT_EMAIL` (empty, so the legal pages say details are coming rather than print an address that bounces).
  - The hero and `/tour` are built from the **real** kit components (`Table`, `Tag`, `TemperProgress`) fed by `src/components/public/demo-data.ts`, so they cannot drift from the product the way a screenshot does. The dashboard figures and per-course completion in that file are _derived_ from the assignment list rather than typed beside it, so editing one row keeps the whole tour consistent.
  - **Nothing on the public site may claim a customer, a count, a rating or a feature that does not exist**, and every product view is labelled "Example data". `/features` carries a "Not in it yet" list for the same reason. This is a rule, not a tone.
  - `/tour` is the demo a visitor gets **instead of** a public login. Don't add a shared demo account without reading the security notes in the Stage 4 backlog first.
- Auth: `/login` (email+password, role-based redirect, safe `?next=`), `/forgot-password` (asks Supabase for a reset link, which lands on `/accept-invite`), `/signup` (creates a new company + its admin), `/accept-invite` (invited employee sets password; also where a reset link lands). All four are built on `AuthCard`.
- Admin (wrapped in `AdminShell`): `/admin/dashboard`, `/admin/courses`, `/admin/assignments`, `/admin/employees`.
- Employee (wrapped in `EmployeeShell`): `/employee/home`, `/employee/course/$assignmentId`.
- Machine endpoints: `/mcp`, `/.well-known/oauth-protected-resource`, `/oauth/consent` (see MCP below).
- The **404** is `notFoundComponent` in `__root.tsx`, on the same public shell. It sets its own `document.title` in an effect, because the root `head()` is static and a not-found render is not a route.
- `public/` holds the favicons and `og.png`. They are generated by `scripts/make-brand-assets.mjs` (`npm run build:brand`), which renders HTML in the installed Edge, rather than checked in by hand — re-run it if the mark or the tokens change.

Page guarding is client-side via `useRequireRole("admin" | "employee")` in `src/lib/use-require-role.ts`, which redirects to `/login` or to the other role's home. This is UX only — **the real security boundary is RLS in the database**.

## How data access works (the important part)

There are three ways code talks to Supabase; pick the right one:

1. **Browser client** — `supabase` from `@/integrations/supabase/client`. Pages query tables directly (in `useEffect` + `useState`; React Query is provisioned in the root but not used for data). Every query runs as the signed-in user, so RLS automatically scopes results to their company — pages generally don't filter by `company_id` themselves, but inserts must set `company_id` (looked up from the user's profile).
2. **Server functions with the user's identity** — `createServerFn(...).middleware([requireSupabaseAuth])` in `src/lib/*.functions.ts`. `attachSupabaseAuth` (registered globally in `src/start.ts`) adds the browser's bearer token to every server-function call; `requireSupabaseAuth` validates it and puts an RLS-scoped `context.supabase` and `context.userId` on the context.
3. **Service-role admin client** — `supabaseAdmin` from `@/integrations/supabase/client.server`, which bypasses RLS. Only use inside server-function handlers, and load it with a dynamic `await import(...)` there: `*.functions.ts` and route files are also bundled for the client, so a top-level import would leak it.

Existing server functions:

- `signupCompanyAdmin` (`signup.functions.ts`) — creates company → auth user → admin profile with the service role, rolling back on failure.
- `createEmployee` / `listPendingEmployeeIds` (`employees.functions.ts`) — admin-only: sends a Supabase invite email (redirect to `/accept-invite`) and inserts the employee profile; "pending" = auth user that has never signed in.
- `submitQuiz` (`quiz.functions.ts`) — checks the assignment is the caller's, is not cancelled, and uses a course they can see. It grades on the server (reads `correct_answer` via service role), writes `quiz_results` and sets the assignment to `complete` (≥70%) or `in_progress` with the service role, and returns a per-question review and the final status. **The review carries `correct_answer` only when the attempt passed, or the assignment was already complete** — a failed attempt learns which questions were wrong but not what the right answer was, so failing on purpose isn't a way to read the answer sheet. Decide that before building the review, not by stripping it afterwards. **Once complete, an assignment stays complete**: later attempts are practice and are still recorded. Pages show the **best** score (`bestScore` in `src/lib/scores.ts`), never the latest. The pass mark is `PASS_MARK` in `src/lib/scores.ts` — anything that mentions it reads it from there rather than restating the number.

Files under `src/integrations/supabase/` (clients, auth middleware/attacher) are ordinary project code. `types.ts` mirrors the DB schema; regenerate it with `npx supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts` after schema changes rather than editing it by hand.

## Database & security model

Tables (all `public`, RLS enabled): `companies`, `teams`, `profiles` (1:1 with `auth.users`; holds `company_id`, `team_id`, `role` = `admin|employee` — there is no separate `users` table and no password column), `courses`, `quiz_questions` (`options` is a JSONB array, `correct_answer` is the option text), `assignments` (`status` enum: `not_started | in_progress | complete | cancelled`), `quiz_results`.

Key invariants enforced in SQL — keep them when changing things:

- RLS policies scope every table to `private.get_user_company_id(auth.uid())`; admin writes also require `private.is_admin(auth.uid())`. Assignments link a user and a course, and admin writes require **both** to be in the admin's company. Any new cross-table reference needs the same both-sides check, and `submitQuiz` refuses courses the caller can't see. These helpers live in the `private` schema (SECURITY DEFINER, not exposed via the API) to avoid RLS recursion.
- `getCourseForEdit` (`courses.functions.ts`) — admin-only, read-only. The one path that returns `quiz_questions.correct_answer`, which no signed-in user can read (see the column grants below). It reads the course through the caller's own RLS first, so it can only ever answer for the caller's company, then reads the answers with the service role. The course editor needs it; nothing else should.

- **Profiles are never created from client-supplied metadata.** The old `on_auth_user_created` trigger was removed; only server functions using the service role insert profiles.
- **Who may change what on a profile** is split between a policy (who) and the `private.restrict_admin_profile_update` trigger (which column), because a `FOR UPDATE` policy can't compare the new row with the old one. A user may change **only their own `name`**; an admin may change **only `team_id`**, and only for a profile in their own company. Both halves of the trigger are allow-lists over `to_jsonb(NEW)` minus the permitted columns, so a new column on `profiles` is protected the day it lands — don't rewrite them as lists of forbidden columns. A team must also belong to the same company as the employee; the foreign key only proves the team exists.
- `quiz_questions.correct_answer` is not selectable by `authenticated` (column-level grants), so clients must select explicit columns (`id, question_text, options`) — `select("*")` will fail. Grading must happen server-side.
- A trigger (`private.restrict_assignment_user_update`) lets non-admin employees change only `status` on their own assignments, and only from `not_started` to `in_progress`. **Only `submitQuiz` may set `complete` or write `quiz_results`**: it writes them with the service role after checking ownership. Employees have no insert policy on `quiz_results`. The trigger restricts only `authenticated` callers, so the service role and direct database connections stay trusted.
- Cancelling an assignment sets `status = 'cancelled'` (kept on record, admin can "Undo" back to `not_started`); cancelled rows are excluded from dashboard stats and the employee's list. Some older code (e.g. the MCP `list_my_assignments` status filter, the course page's `Assignment` type) doesn't know about `cancelled`.

All migrations live in `supabase/migrations/` (timestamp-ordered) and are applied with the Supabase CLI (`npx supabase db push`, see README "Database changes"). Add schema changes as new migrations via `npx supabase migration new`; never edit applied ones. After a schema change, regenerate `src/integrations/supabase/types.ts`.

## MCP server

`src/lib/mcp/` is a read-only MCP server built on the official `@modelcontextprotocol/sdk`, exposing `get_my_profile`, `list_my_assignments`, `list_company_courses`. `/mcp` (`src/routes/mcp.ts`) is stateless Streamable HTTP: each request gets a fresh `McpServer` bound to the verified caller (`handleMcpRequest` in `src/lib/mcp/index.ts`).

Auth (`src/lib/mcp/auth.ts`): Supabase Auth is the OAuth authorization server and the app is only the protected resource. A request needs a signed-in user's Supabase access token as `Authorization: Bearer`; otherwise it gets a 401 whose `WWW-Authenticate` points to `/.well-known/oauth-protected-resource`, which names `${SUPABASE_URL}/auth/v1` as the issuer. Browser requests from a foreign `Origin` get 403. Tools query through `supabaseForUser` with the caller's token, so RLS still applies — never use `supabaseAdmin` in a tool. The Supabase OAuth consent screen is `/oauth/consent`; its URL must match the Supabase project's OAuth server settings.

To add a tool: create `src/lib/mcp/tools/<name>.ts` exporting a `register…(server, user)` function that calls `server.registerTool`, and call it from `createMcpServer` in `src/lib/mcp/index.ts`.

## Error handling plumbing

`src/server.ts` wraps the SSR entry to turn swallowed h3 500s into a branded error page; `src/start.ts` adds request-level error middleware; the root `ErrorComponent` logs to the console. Leave these in place. There is no external error reporting yet.
