# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SkillForge is a multi-tenant B2B learning & development app: a company admin creates courses (text / video link / PDF link + multiple-choice quiz), invites employees, groups them into teams, and assigns courses with due dates; employees view content, take the quiz (pass mark 70%), and see their progress. Each company's data must stay fully isolated from every other company's.

This GitHub repo is the only home for SkillForge. Keep `main` working and don't rewrite pushed history. `AGENTS.md` only points other coding agents here, so keep guidance in this file.

`DESIGN.md` is the new official design system for an upcoming redesign. It has **not** been applied yet; the current UI still uses the older tokens described under Stack. Don't restyle pages to `DESIGN.md` unless asked.

## Commands

```sh
npm ci             # npm only; package-lock.json is the lockfile
npm run dev        # vite dev server
npm run build      # production build (nitro, Cloudflare target)
npm run lint       # eslint
npm run format     # prettier --write
npx tsc --noEmit   # type-check (no script for it)
```

There is no test suite.

## Stack

- **TanStack Start** (React 19, SSR) with file-based routing via TanStack Router, built with Vite 8. `vite.config.ts` is a plain Vite config: Tailwind, TanStack Start (server entry `src/server.ts`; import protection fails the build if client code imports `**/server/**` or `server-only`), nitro for builds (defaults to Cloudflare Workers; output in `.output/`), and React. Dev server runs on port 8080.
- **Tailwind CSS v4**; design tokens live in `src/styles.css` (navy ink `#1B2430`, off-white background, terracotta primary, green used only for success/"Complete", Fraunces serif headings + Inter body). shadcn/ui components exist in `src/components/ui/` but the app pages currently don't use them — pages are hand-written Tailwind.
- **Supabase** (Lovable Cloud) for Postgres, Auth, and Row-Level Security. Project id is in `supabase/config.toml`; URL and publishable key come from `.env` (`VITE_SUPABASE_*` for the browser, `SUPABASE_*` for the server). The service-role key (`SUPABASE_SERVICE_ROLE_KEY`) is only present in the hosted server environment.

## Routing

Routes are files in `src/routes/` (see `src/routes/README.md` for conventions: `admin.courses.tsx` → `/admin/courses`, `$param` for dynamic segments). `src/routeTree.gen.ts` is generated — never edit it. `__root.tsx` is the only layout and must keep `<Outlet />`.

- Public marketing: `/`, `/about`, `/features`, `/pricing`, `/security`, `/privacy`, `/terms` (static, share `Footer`).
- Auth: `/login` (email+password, forgot-password, role-based redirect, safe `?next=`), `/signup` (creates a new company + its admin), `/accept-invite` (invited employee sets password).
- Admin (wrapped in `AdminShell`): `/admin/dashboard`, `/admin/courses`, `/admin/assignments`, `/admin/employees`.
- Employee (wrapped in `EmployeeShell`): `/employee/home`, `/employee/course/$assignmentId`.
- Machine endpoints: `/mcp`, `/.well-known/oauth-protected-resource`, `/oauth/consent` (see MCP below).

Page guarding is client-side via `useRequireRole("admin" | "employee")` in `src/lib/use-require-role.ts`, which redirects to `/login` or to the other role's home. This is UX only — **the real security boundary is RLS in the database**.

## How data access works (the important part)

There are three ways code talks to Supabase; pick the right one:

1. **Browser client** — `supabase` from `@/integrations/supabase/client`. Pages query tables directly (in `useEffect` + `useState`; React Query is provisioned in the root but not used for data). Every query runs as the signed-in user, so RLS automatically scopes results to their company — pages generally don't filter by `company_id` themselves, but inserts must set `company_id` (looked up from the user's profile).
2. **Server functions with the user's identity** — `createServerFn(...).middleware([requireSupabaseAuth])` in `src/lib/*.functions.ts`. `attachSupabaseAuth` (registered globally in `src/start.ts`) adds the browser's bearer token to every server-function call; `requireSupabaseAuth` validates it and puts an RLS-scoped `context.supabase` and `context.userId` on the context.
3. **Service-role admin client** — `supabaseAdmin` from `@/integrations/supabase/client.server`, which bypasses RLS. Only use inside server-function handlers, and load it with a dynamic `await import(...)` there: `*.functions.ts` and route files are also bundled for the client, so a top-level import would leak it.

Existing server functions:
- `signupCompanyAdmin` (`signup.functions.ts`) — creates company → auth user → admin profile with the service role, rolling back on failure.
- `createEmployee` / `listPendingEmployeeIds` (`employees.functions.ts`) — admin-only: sends a Supabase invite email (redirect to `/accept-invite`) and inserts the employee profile; "pending" = auth user that has never signed in.
- `submitQuiz` (`quiz.functions.ts`) — grades on the server (reads `correct_answer` via service role), writes `quiz_results`, sets the assignment to `complete` (≥70%) or `in_progress`, and returns a per-question review.

Files under `src/integrations/supabase/` (clients, auth middleware, `types.ts`) are generated by Lovable — don't hand-edit them; `types.ts` reflects the DB schema.

## Database & security model

Tables (all `public`, RLS enabled): `companies`, `teams`, `profiles` (1:1 with `auth.users`; holds `company_id`, `team_id`, `role` = `admin|employee` — there is no separate `users` table and no password column), `courses`, `quiz_questions` (`options` is a JSONB array, `correct_answer` is the option text), `assignments` (`status` enum: `not_started | in_progress | complete | cancelled`), `quiz_results`.

Key invariants enforced in SQL — keep them when changing things:
- RLS policies scope every table to `private.get_user_company_id(auth.uid())`; admin writes also require `private.is_admin(auth.uid())`. These helpers live in the `private` schema (SECURITY DEFINER, not exposed via the API) to avoid RLS recursion.
- **Profiles are never created from client-supplied metadata.** The old `on_auth_user_created` trigger was removed; only server functions using the service role insert profiles. Users can update their own profile but cannot change `role` or `company_id`.
- `quiz_questions.correct_answer` is not selectable by `authenticated` (column-level grants), so clients must select explicit columns (`id, question_text, options`) — `select("*")` will fail. Grading must happen server-side.
- A trigger (`private.restrict_assignment_user_update`) lets non-admin employees change only `status` on their own assignments.
- Cancelling an assignment sets `status = 'cancelled'` (kept on record, admin can "Undo" back to `not_started`); cancelled rows are excluded from dashboard stats and the employee's list. Some older code (e.g. the MCP `list_my_assignments` status filter, the course page's `Assignment` type) doesn't know about `cancelled`.

Migrations live in **two** places, applied in order: `supabase/migrations/` (earlier, Lovable Cloud) and then `drizzle/migrations/` (newer, via `drizzle.config.ts` using `LOVABLE_DB_MIGRATION_URL`). New schema changes go in as new SQL migrations; `drizzle/schema.ts` is intentionally blank and auto-generated.

## MCP server

`src/lib/mcp/` is a read-only MCP server built on the official `@modelcontextprotocol/sdk`, exposing `get_my_profile`, `list_my_assignments`, `list_company_courses`. `/mcp` (`src/routes/mcp.ts`) is stateless Streamable HTTP: each request gets a fresh `McpServer` bound to the verified caller (`handleMcpRequest` in `src/lib/mcp/index.ts`).

Auth (`src/lib/mcp/auth.ts`): Supabase Auth is the OAuth authorization server and the app is only the protected resource. A request needs a signed-in user's Supabase access token as `Authorization: Bearer`; otherwise it gets a 401 whose `WWW-Authenticate` points to `/.well-known/oauth-protected-resource`, which names `${SUPABASE_URL}/auth/v1` as the issuer. Browser requests from a foreign `Origin` get 403. Tools query through `supabaseForUser` with the caller's token, so RLS still applies — never use `supabaseAdmin` in a tool. The Supabase OAuth consent screen is `/oauth/consent`; its URL must match the Supabase project's OAuth server settings.

To add a tool: create `src/lib/mcp/tools/<name>.ts` exporting a `register…(server, user)` function that calls `server.registerTool`, and call it from `createMcpServer` in `src/lib/mcp/index.ts`.

## Error handling plumbing

`src/server.ts` wraps the SSR entry to turn swallowed h3 500s into a branded error page; `src/start.ts` adds request-level error middleware; the root `ErrorComponent` logs to the console. Leave these in place. There is no external error reporting yet.
