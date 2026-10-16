# SkillForge launch plan (Stage 5)

Written 2026-10-16, on the `launch` branch. This is the working plan for taking SkillForge
live on Netlify. `docs/progress.md` stays the record of what happened; this file is the
plan and the click-by-click instructions for the parts only you can do.

**How to use it:** the items are in dependency order under "Order of work". Each item says
what I do and what you do. Tick the boxes as they land. Anything marked **you** needs you in
a dashboard, and I will stop and tell you before each one rather than working past it.

**No secret ever goes in the chat.** Where a secret has to move, the instruction below puts
it in the dashboard or in a git-ignored file by your own hand. `.env.local` and any other
`*.local` file are never read, opened or scanned, including by scripts I write — scripts load
env vars through `process.loadEnvFile` and print only pass or fail, never a value.

---

## Decisions made

| Decision               | Choice                                                                           | Why / consequence                                                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host                   | Netlify, free plan                                                               | Credit cap applies — see item 3                                                                                                                                        |
| Public URL             | `https://skillforge-app.netlify.app` (fallback `skillforge-hq`)                  | No custom domain for launch. The site name is therefore the brand URL                                                                                                  |
| Supabase               | **New project for production**; current `obfxcakfqjqxrxjphidy` becomes dev + e2e | Production starts empty; seed and cleanup scripts cannot reach it                                                                                                      |
| Email                  | Dedicated Google account over SMTP                                               | No domain needed. Invites arrive from a `gmail.com` address — a known downgrade, accepted deliberately. Swapping to Resend later is five fields in one Supabase screen |
| Contact address        | The same dedicated Google account                                                | One address to create and monitor; it is both the SMTP sender and `CONTACT_EMAIL`                                                                                      |
| Analytics              | Cloudflare Web Analytics                                                         | Free, cookieless, no consent banner                                                                                                                                    |
| Free-tier pausing      | Scheduled keep-alive now; Pro later for the backups, not the pausing             | Free plan has **no automatic backups**, which matters more than pausing does                                                                                           |
| Strict CSP             | Next stage                                                                       | The inline theme script needs a hash or nonce and that script is what stops dark mode flashing                                                                         |
| "Resend invite" button | Post-launch                                                                      | Needs a new server function and e2e coverage; bundling a feature into a deployment change makes a failure harder to attribute                                          |
| Repo visibility        | Private through launch                                                           | See the post-launch list before making it public                                                                                                                       |

---

## Facts checked against the code and the providers (2026-10-16)

Recorded so none of this has to be re-derived later.

| Claim                                                             | Finding                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Are server functions really unprotected?                          | Yes. `createStartHandler` applies its default CSRF middleware **only when there is no `startInstance`**. `src/start.ts` exports one, so the default is skipped. The dev warning is accurate                                                                                                                |
| Is `createCsrfMiddleware` available?                              | Yes, from `@tanstack/react-start`. It is a **request** middleware, so it belongs in `requestMiddleware`, not `functionMiddleware`                                                                                                                                                                          |
| Would `defaultPreset: "cloudflare-module"` block a Netlify build? | No. Nitro's auto-detected provider beats `defaultPreset`. Set `NITRO_PRESET` explicitly anyway, so it is not magic                                                                                                                                                                                         |
| Nitro's netlify preset output                                     | Server to `.netlify/functions-internal/`, static to `dist/`. So `publish = "dist"`, and `.netlify/` must be added to `.gitignore`                                                                                                                                                                          |
| Netlify free plan                                                 | **300 credits/month, hard cap, no top-up. When exhausted every site you own is paused and serves "Site not available."** Production deploy 15 credits (≈20 deploys/month), bandwidth 20 credits/GB, web requests 2 credits per 10,000, function compute 10 credits per GB-hour                             |
| Supabase free plan                                                | 2 active projects per org, 500 MB database, 50,000 MAU, 5 GB egress, **no automatic backups**. Paused after 7 days of low database activity; restorable from Studio within 90 days. Pro is $25/month and never pauses                                                                                      |
| Resend free tier                                                  | 3,000/month, 100/day, 3 domains, 30-day logs — but `onboarding@resend.dev` returns 403 for any recipient except your own account address, so a verified domain is mandatory                                                                                                                                |
| Gmail SMTP                                                        | ~500 recipients/day, 100 recipients per message. App password required (less-secure-app passwords were removed 1 May 2025). `From` must be the account address, or a verified "Send mail as" alias                                                                                                         |
| Cloudflare Web Analytics                                          | Free, works on a non-Cloudflare site via a JS beacon with no DNS change, sets no cookies and no localStorage. Ad blockers can block the beacon, so counts under-report                                                                                                                                     |
| GitHub Actions cron                                               | Scheduled workflows are silently disabled in **public** repos after 60 days with no repository activity. Private repos are not affected, but consume Actions minutes                                                                                                                                       |
| Can two Supabase projects be migrated without a committed diff?   | Yes. `supabase db push --db-url …` exists in CLI 2.119, so `supabase/config.toml` never has to be flipped                                                                                                                                                                                                  |
| What is actually costing the home page                            | The shared entry chunk is **539 KB raw / 153 KiB gzip and contains all of supabase-js** — GoTrueClient, realtime, phoenix. No module in the root graph imports it; the bundler hoisted it there because several code-split routes share it. That is the 343 KiB Lighthouse reports unused on the home page |

---

## Order of work

- [x] 1. CSRF middleware and its `verify:security` check (item 2) — the one hard blocker.
     Done in `b248cdc`. `verify:security` is now 59 checks, up from 55
- [x] 1b. Netlify adapter settled and `netlify.toml` written (item 3). The nitro `netlify`
      preset wins; 26 spike checks pass against the built bundle
- [ ] 2. Deploy preview against the **dev** Supabase project (item 3) — **you** create the
     Netlify site
- [ ] 3. Production Supabase project (item 1) — **you** create it, I migrate with your approval, **you** configure Auth (item 4)
- [ ] 4. Email (item 5) — **you**
- [ ] 5. Keep-alive (item 6), analytics (item 7) — **you** for the Cloudflare token
- [ ] 6. `SITE_URL`, contact address, robots, sitemap, security headers (items 8 and the extras)
- [ ] 7. Performance, measured (item 9)
- [ ] 8. First production deploy, then the smoke test (item 12), then delete the smoke company
- [ ] 9. Lovable redirect (item 11) — **you**
- [ ] 10. Update `docs/progress.md`, `CLAUDE.md`, the README environment table; tick "Before launch"; final commit. Nothing is pushed or merged without your word

**Never touched without asking:** any migration, any Supabase setting, `main`, the design
tokens, `DESIGN.md`.

---

## Item 1 — Production and development data separation

A new Supabase project becomes production; the current one becomes dev and test.

New project as production, rather than the reverse, for three reasons:

1. The destructive scripts read `.env.local`. `cleanupE2EData()` **deletes** companies and
   users; `npm run seed` creates the Northwind demo; `npm run screenshots` seeds and deletes
   its own data. If `.env.local` ever pointed at production they would run against real
   customers. With a new project, production credentials never sit in a local env file at
   all, apart from one deliberate migration command.
2. The current project's Redirect URLs include `localhost:8080/**` and `localhost:8090/**`.
   Those belong to a dev project, not to the auth project of a live product.
3. Production then starts genuinely empty, which also settles item 10.

**I do**

- `npm run db:push:prod` — requires `PROD_DATABASE_URL` from `.env.production.local` (already
  git-ignored by the `*.local` rule) and runs `supabase db push --db-url …`, supporting
  `--dry-run`. Plain `npx supabase db push` keeps pointing at dev.
- A **production guard** in `scripts/lib.mjs`, used by `seed.mjs`, `verify-security.mjs` and
  `e2e/helpers.ts`: if `SUPABASE_PROJECT_ID` matches `PRODUCTION_PROJECT_ID` (a new
  non-secret line in the committed `.env`), refuse to run and say why.
- README environment table gains a dev/prod column; `CLAUDE.md` documents the split.

**You do**

1. supabase.com/dashboard → **New project** → same organisation → name `skillforge-production`
   → **Generate a password** → **save it in your password manager, you cannot see it again**
   → region nearest your users → **Create new project**. Wait for provisioning.
2. **Project Settings → API Keys**: copy the **Project URL**, the **project ref** (the
   subdomain) and the **publishable key**. These three are public — paste them in the chat.
3. **Project Settings → API Keys → Secret keys** → reveal the `service_role` / secret key.
   **Do not paste it in the chat.** It goes into Netlify in item 3.
4. **Project Settings → Database → Connection string → Session pooler** → copy it and replace
   `[YOUR-PASSWORD]` with the database password from step 1. Create a new file
   `.env.production.local` in the project root containing:

   ```
   PROD_DATABASE_URL=
   PROD_SUPABASE_SERVICE_ROLE_KEY=
   ```

   Fill both in yourself. The file is git-ignored and I never open it.

5. Tell me the ref and URL. I run `npm run db:push:prod -- --dry-run`, show you the 15
   migrations it would apply, and wait for your approval before applying them.
6. I then generate `types.ts` fresh and diff it against the committed file to prove the
   schema is identical. No migration is needed for this launch — the schema does not change.

---

## Item 2 — CSRF protection for server functions

The hard blocker. Server functions are same-origin RPC endpoints and nothing currently stops
a cross-site request reaching one — which matters most for `createEmployee` and `submitQuiz`,
both of which write with the service role.

**I do**

- Add `createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" })` to
  `requestMiddleware` in `src/start.ts`, after `errorMiddleware` so errors still get the
  branded page. Not `disableCsrfMiddlewareWarning`.
- Extend `npm run verify:security` with a CSRF section taking an optional base URL (default
  `http://localhost:8080`, the same shape as `test:mcp`), proving two things against a real
  running app:
  - POST to a server function with `Origin: https://evil.example` → **403**;
  - the same POST with the app's own Origin and no auth token → **not 403** (it fails on
    authentication instead), which shows the middleware discriminates on origin and nothing
    else.
  - If no app is reachable it skips with a loud message rather than passing silently.
  - Read-only by construction: the positive case uses an auth-required function with no
    token, so nothing is ever written. Safe to run against the live site.
- Run the full e2e suite afterwards. All 135 tests call server functions from a browser, so
  that is the real proof.

**Risk being watched:** when `Sec-Fetch-Site` is absent the middleware compares the `Origin`
header with `new URL(request.url).origin`. Behind Netlify's proxy that could resolve to an
internal host and refuse everything. Browsers do send `Sec-Fetch-Site`, so it should never
fire — confirmed on a deploy preview before production. If it misbehaves, the fix is the
middleware's explicit `origin` matcher.

**Measured, not assumed.** Four probes against a running dev server, before and after:

| Request to a server function                          | Before      | After                          |
| ----------------------------------------------------- | ----------- | ------------------------------ |
| `Origin: https://evil.example`                        | 200, routed | **403**                        |
| `Sec-Fetch-Site: cross-site` with a matching `Origin` | 200, routed | **403**                        |
| Own `Origin`                                          | 200, routed | routed (403 would be the bug)  |
| Page request from a foreign `Origin`                  | 200         | **200** — navigation untouched |

The third row is why `Sec-Fetch-Site` is checked explicitly: it is the header a browser
actually sends, and the only path that never consults `request.url`. So it is also the path
that still holds if Netlify's proxy rewrites the URL.

**You do:** nothing.

---

## Item 3 — Switching the build from Cloudflare to Netlify

**Adapter.** Two routes exist and the official docs disagree:

- `@netlify/vite-plugin-tanstack-start` is what TanStack's hosting guide and Netlify's
  framework guide both recommend (`publish = "dist/client"`, local emulation via
  `netlify dev`). It replaces nitro.
- Nitro's `netlify` preset is already installed, is auto-detected, keeps `src/server.ts` and
  the import-protection wiring untouched, and changes one config line.

**Settled: the nitro `netlify` preset.** It was spiked first, being the lower-risk option,
and it passed everything — so the Netlify Vite plugin was never spiked. That is a departure
from the plan as written ("spike both") and it is deliberate: there is nothing to compare,
because the option that changes least already works. If the deploy preview turns up something
the local spike could not see, the plugin is still there to fall back on.

What the spike proved, by importing the built handler and driving it with real `Request`
objects — the preset's handler takes a standard web `Request`, so the whole app can be
exercised with no Netlify CLI and no deploy (26 checks, all passing):

- all eight public pages server-render;
- `/login`, `/signup`, `/forgot-password`, `/accept-invite`, `/oauth/consent`;
- all four admin pages and both employee pages;
- the 404 page;
- `/.well-known/oauth-protected-resource` naming the right resource and the Supabase issuer;
- `POST /mcp` → 401 with the discovery header, and 403 from a foreign Origin;
- CSRF: 403 on a foreign Origin, 403 on `Sec-Fetch-Site: cross-site`, through on its own;
- the h3-500 normaliser from `src/server.ts` present in the bundle.

One apparent failure turned out not to be one: `/oauth/consent` answered 307, which is
TanStack normalising the search params for a route with `validateSearch`. With an
`authorization_id` it is 200.

**What the spike cannot prove, and the preview must:** everything that depends on what
Netlify sets as `request.url` behind its proxy. Both the CSRF fallback path and the MCP
origin check derive an origin from it. Browsers send `Sec-Fetch-Site`, so CSRF should never
reach that fallback — but the MCP metadata has no equivalent shortcut, so it is the one to
check first on the preview.

**I do**

- `netlify.toml`: build `npm run build`, publish `dist`, `NITRO_PRESET = "netlify"`,
  `NODE_VERSION = "24"` (matching the Node the build and suite are verified on locally — if
  Netlify rejects 24, fall back to 22 and re-verify).
- `vite.config.ts`: `defaultPreset` flips from `cloudflare-module` to `netlify`, so a plain
  local `npm run build` produces exactly what production runs. The Cloudflare path stays
  working via `NITRO_PRESET=cloudflare-module npm run build`, and is verified as still
  building — it is the escape hatch if the credit cap bites.
- `.gitignore`: add `.netlify/`.
- Verify on a **deploy preview**, not production: all eight public pages, `/tour`, the 404,
  `/login`, `/signup`, `/forgot-password`, `/accept-invite`, the four admin pages, both
  employee pages, `/oauth/consent`; the five server functions (`signupCompanyAdmin`,
  `createEmployee`, `listPendingEmployeeIds`, `getCourseForEdit`, `submitQuiz`); `POST /mcp`
  with a bearer token plus the 401 and 403 cases; `/.well-known/oauth-protected-resource`;
  the favicons and `og.png`; and a deliberate SSR error still rendering the branded page.
- Two checks that are easy to miss: that `/mcp` and the metadata endpoint report the **public
  https origin** (both derive it from `new URL(request.url).origin`), and that
  `E2E_SKIP_INVITE_EMAIL` is absent in production so the no-email path cannot be reached.

**You do**

1. app.netlify.com → **Add new project → Import an existing project → GitHub** → authorise
   → pick `Temmyactive01/try-skillforge` → **branch `launch`** for the preview (we move it to
   `main` at launch) → leave the build settings as `netlify.toml` supplies them → **Deploy**.
2. **Site configuration → General → Site details → Change site name** → `skillforge-app`
   (fallback `skillforge-hq`). This is the brand URL, so get it right before anything
   references it.
3. **Site configuration → Environment variables → Add a variable**, once for each of:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`,
   `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID`,
   `SUPABASE_SERVICE_ROLE_KEY`.
   - For each, choose **"Different value for each deploy context"**. **Production** gets the
     new production project's values; **Deploy previews** and **Branch deploys** get the
     current dev project's. A preview can then never write to real data.
   - `SUPABASE_SERVICE_ROLE_KEY` only: tick **"Contains secret values"** so it is hidden from
     logs, and scope it to **Functions** (runtime) — it is read through `process.env` at
     request time.
   - The three `VITE_*` values are inlined at **build** time, so they must be scoped to
     **Builds**. **Never name a secret `VITE_*`:** `vite.config.ts` inlines every `VITE_*`
     variable into the client bundle.
4. **Site configuration → Build & deploy → Continuous deployment → Build hooks / Branch
   deploys:** consider turning off automatic deploys on every push while we work, because of
   the credit cap below.

**The credit cap, in plain terms.** Netlify's free plan is **300 credits a month, a hard cap
with no top-up, and when they run out every site on the account is paused and serves "Site
not available."** A production deploy is 15 credits, so roughly **20 deploys a month**.
Bandwidth is 20 credits/GB (≈15 GB if you never deployed). Traffic itself is cheap. So
**deploys are what will eat the budget** — batch commits into few deploys. Personal is
$9/month for 1,000 credits. Worth remembering: the build currently targets Cloudflare
Workers, which has no equivalent cliff, so if the cap bites, moving is a one-line preset
change — which is why the Cloudflare path is kept working.

---

## Item 4 — Supabase Auth settings for the live URL

All of this is in the **new production** project. The dev project changes nothing.

**You do**

1. **Authentication → URL Configuration**
   - **Site URL:** `https://skillforge-app.netlify.app`
   - **Redirect URLs → Add URL:** `https://skillforge-app.netlify.app/**` — and nothing else.
     No localhost. No preview wildcard: previews use the dev project, so they do not need an
     entry here.
2. **Authentication → Sign In / Providers → Email:** enabled. **Allow new users to sign up:
   OFF.** The app creates every account through its own server functions; this only blocks
   people creating empty accounts directly against Supabase.
3. **Authentication → Emails → SMTP Settings:** item 5.
4. **Authentication → OAuth Server:** enable it, authorization path `/oauth/consent`, allow
   dynamic client registration. Only needed for the Stage 4 MCP work, but free to do while
   you are in the screen.
5. On the **dev** project, leave Site URL at `http://localhost:8080` and keep `8080/**` and
   `8090/**` in Redirect URLs. If you want Netlify previews to be able to sign in, add
   `https://*--skillforge-app.netlify.app/**` **to the dev project only**.

I then verify from the live URL that a reset link lands on `/accept-invite` on the right
host — the same check `e2e/global-setup.ts` performs locally.

---

## Item 5 — Email for invites and password resets

Chosen: one dedicated Google account, used as both the SMTP sender and `CONTACT_EMAIL`.

The alternatives and why they lost are in the facts table above. The short version: Resend is
better but needs a domain; Brevo needs no domain but a `gmail.com` `From` through Brevo's IPs
fails DMARC alignment, which is worse than Gmail's own SMTP; Supabase's built-in sender only
reaches your own organisation members.

**You do**

1. accounts.google.com → create a new account, e.g. `skillforgeapp@gmail.com`. Google usually
   requires a phone number. Set the display name to **SkillForge**, because that name appears
   in the invite's From line.
2. myaccount.google.com (signed in as that account) → **Security → 2-Step Verification** →
   turn it on (an app password cannot be created without it).
3. Still in **Security**, search the page for **App passwords** → create one named
   `SkillForge SMTP` → copy the 16 characters. **Do not paste it in the chat.**
4. Supabase **production** project → **Authentication → Emails → SMTP Settings** → enable
   custom SMTP:
   - Host `smtp.gmail.com`
   - Port `465`
   - Username: the full Gmail address
   - Password: the 16-character app password
   - Sender email: **the same Gmail address** (Gmail rejects a different `From` unless it is a
     verified "Send mail as" alias)
   - Sender name: `SkillForge`
   - **Save**.
5. **Authentication → Emails → Templates** → open **Invite user** and **Reset password** →
   paste what they say into the chat and I will check them against the code (the links must
   land on `/accept-invite`).
6. Send yourself one real invite from the live admin UI before the smoke test in item 12.

Limits to keep in mind: ~500 recipients a day, 100 recipients per message. Far beyond launch
volume.

---

## Item 6 — Preventing Supabase free-tier pausing

A free project is paused after 7 days of low database activity, and a paused project takes
the whole app down — sign-in included — until someone restores it by hand. Restorable from
Studio within 90 days. Paid plans never pause.

Chosen: a scheduled keep-alive now. Move to Pro before the first paying customer, and do it
**for the backups** — the free plan has no automatic backups, and holding other companies'
training records without one is the real exposure. Pausing is merely embarrassing.

**I do**

- `.github/workflows/keep-alive.yml`: a cron every three days doing
  `GET {SUPABASE_URL}/rest/v1/companies?select=id&limit=1` with the **publishable** key.
  Under RLS an anonymous caller receives `[]`, so it leaks nothing, writes nothing, needs no
  secret, and still counts as database traffic. It pings **both** projects, since the dev
  project pausing would break the e2e suite.

**You do**

1. After it is merged: GitHub → repo → **Actions** tab → if prompted, **"I understand my
   workflows, go ahead and enable them"**.
2. Optional second, independent trigger (recommended, two minutes): cron-job.org → sign up →
   **Create cronjob** → the same URL, with the publishable key as an `apikey` header → every
   3 days → Save. The repo is private so the 60-day auto-disable rule does not apply yet —
   but see the post-launch list, because it starts applying the day the repo goes public.

---

## Item 7 — Analytics

Chosen: Cloudflare Web Analytics. Free, no cookies, no localStorage, no consent banner, one
beacon line, works on a Netlify-hosted site with no DNS change. Ad blockers can block the
beacon, so treat the counts as a floor rather than a measurement.

Google Analytics 4 was the alternative and lost on the consent banner: cookies mean a banner
for UK and EU visitors plus privacy-policy work, on a site whose whole pitch is careful data
handling.

**I do**

- Add the beacon to the head in `src/routes/__root.tsx`, behind an env var so it is absent
  locally, in previews, in screenshot runs and in e2e runs.
- **Correct the privacy page.** Two things there need attention and both are truthfulness
  issues of the kind phase 4 was careful about: it says data collected includes "cookies",
  which the app does not use (session and theme live in `localStorage`), and it needs to name
  the analytics processor. It also still carries "This is a draft… finalised with legal
  counsel before launch" and a 9 September 2026 date. I will fix the cookies sentence and add
  an analytics paragraph. **Keeping the draft notice is your call** — my recommendation is to
  keep it, because it is true, rather than imply a review that has not happened.

**You do**

1. dash.cloudflare.com → sign up (free, no DNS change needed) → **Analytics & Logs → Web
   Analytics → Add a site** → hostname `skillforge-app.netlify.app` → it returns a snippet
   containing a **site token**.
2. Either paste the token in the chat (it is not a secret — it ships in the page) or set it
   yourself in Netlify as `VITE_CF_ANALYTICS_TOKEN`, **Production context only**.

---

## Item 8 — Base URL, robots, sitemap, canonical, Open Graph, contact address

**I do**

- Set `SITE_URL` in `src/lib/seo.ts` to `https://skillforge-app.netlify.app`. That one
  constant fixes the canonical links and the absolute `og.png` URL on all eight public pages
  at once — which is what currently stops LinkedIn rendering the share image.
- Set `CONTACT_EMAIL` to the dedicated Google account. Both legal pages read it and will stop
  printing `CONTACT_PENDING`.
- Add `robots.txt` and `sitemap.xml` as **server routes** (`src/routes/[robots.txt].ts`,
  `src/routes/[sitemap.xml].ts`, using the same bracket escaping as the existing
  `[.well-known]` folder), generated from `SITE_URL` and one route list rather than static
  files that can drift from it.
  - robots: allow the public pages; `Disallow: /admin/`, `/employee/`, `/mcp`, `/oauth/`,
    `/accept-invite`; point at the sitemap.
  - sitemap: the eight public pages only.
- Two e2e tests as the guard against regression: `/robots.txt` and `/sitemap.xml` return the
  real host and no `.example`, and no page's canonical contains `skillforge.example`.
- Re-run `npm run check:contrast`, and `npm run screenshots:phase-4` if anything visual moves
  (the contact lines on the legal pages will).

**You do:** nothing beyond having created the Google account in item 5.

---

## Item 9 — Mobile Lighthouse Performance, 69 → 80+

Measured, not guessed. The largest single item is concrete: **the 539 KB shared entry chunk
every page loads contains the whole of supabase-js** — GoTrueClient, realtime and phoenix —
even though no module in the root graph imports it. The bundler hoisted it into the shared
chunk because several code-split routes use it. On the home page that is ~343 KiB of
JavaScript nobody runs.

Worth recording why this is a surprise: phase 4 deliberately made `useViewer` import
supabase-js dynamically so a signed-out visitor downloads nothing. **The bundler undid that**,
and nobody looked at the chunk.

In order of expected return, measured one change at a time, three runs each, median — the
method session 7 used:

1. **Split supabase-js out of the entry chunk** via explicit chunking in `vite.config.ts`, so
   it loads on the routes that use it instead of on the marketing site. Largest win, no
   change to any screen.
2. **Take `QueryClientProvider` out of the root**, or scope it to the app routes. React Query
   is provisioned but not used for data, and it is a static root import, so `query-core` sits
   in the entry chunk for the marketing pages too.
3. **Re-measure the font on the real host.** Lighthouse did not flag it in session 7, but
   Google Fonts is two extra origins and a lab run flatters that. Self-host Archivo only if
   the real host says so.
4. **Leave the 37 KiB HTML alone.** The two-layout hero table and the kit's `Button` are both
   `DESIGN.md` instructions, and undoing them to buy points is the wrong trade.

**80 is not promised.** 1 and 2 are the real levers; before and after numbers for each will be
reported, and if they land short, what is left and what it would cost gets reported too
rather than reaching for 4.

---

## Item 10 — Demo and test data in production

Mostly settled by item 1: **production starts empty.** No Northwind, no old manual-test
company, no e2e leftovers, and no shared demo password anywhere near it.

**The Northwind seed stays, as a dev tool.** `verify:security`'s third section signs in as a
demo employee to prove the isolation and escalation rules; `npm run screenshots` needs data;
`test:mcp` needs a signed-in user. Deleting it would cost real coverage. What changes is that
the production guard makes `npm run seed` refuse to run against the production ref.

`verify:security` against production skips that third section on its own — the script already
prints `skip  could not sign in as admin@northwind.example.com` rather than failing. Sections
1 and 2 (RLS, policies, column grants, triggers, and what the publishable key alone can read)
do run, and those are the ones that matter for a fresh database.

**You do**

- Nothing for production. On the **dev** project, optionally delete your old manual-test
  company — say so and it is done by exact ID, the way session 1 did, never by a name match.
- After the smoke test, the smoke-test company is deleted from production by exact ID. Note
  before that runs: deleting an auth user cascades to `assignments` and `quiz_results`.

---

## Item 11 — Redirecting the old `try-skillforge.lovable.app` link

Lovable's documentation says there is **no way to remove a `*.lovable.app` project URL**, and
its primary-domain redirect needs a paid plan and a custom domain. So a true 301 is not
available for free.

Chosen: **edit the old Lovable project into a one-page "SkillForge has moved" notice** with a
prominent link and a meta refresh. The old URL keeps working and anyone holding it arrives in
the right place. Deleting the project instead leaves a dead link, which is worse for anything
already shared.

**You do** (the Lovable connector is not authorised in this session, so this is yours end to
end):

1. lovable.dev → open the `try-skillforge` project → in the chat, paste:

   > Replace the entire app with a single static page: heading "SkillForge has moved", one
   > sentence saying the live app is now at https://skillforge-app.netlify.app, a prominent
   > link to it, and a meta refresh redirecting there after 3 seconds. Remove all other
   > routes, all Supabase calls and all authentication.

2. Check the preview, then **Publish**.
3. **Then delete or pause the old Lovable Supabase project.** It still holds old user data and
   its own service-role key, and it is the one piece of this that is pure liability. Supabase
   dashboard → that project → **Settings → General → Pause project** or **Delete project**.
   Do this **after** step 2, so you do not break the page you just published while it still
   talks to that database.

If Lovable's agent fights you, ask and the exact HTML will be written for you to paste.

---

## Item 12 — Post-launch smoke test on the live URL

By hand, on production, in this order, because each step feeds the next. **Real email now
works, so use two addresses you control** — the dedicated Google account and a `+employee`
alias of it. Gmail delivers `name+employee@gmail.com` to the same inbox, and Supabase treats
it as a separate account.

| #   | Flow                                                                                      | Watch for                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/signup` — create company "Smoke Test Ltd"                                               | Lands on the admin dashboard; getting-started steps show                                                                                                         |
| 2   | Employees → create team "Smoke" → invite the `+employee` alias                            | Toast names the address; row shows **Invited**; **the email actually arrives** — this is the proof for item 5                                                    |
| 3   | Open the invite link in a private window → set a password                                 | Lands on `/accept-invite`, not `/login`; employee home loads                                                                                                     |
| 4   | As admin: create a course with three questions, assign it to the employee with a due date | Row on Assignments, status Not started                                                                                                                           |
| 5   | As the employee: open the course, **fail** the quiz                                       | Score shown, status In progress, and the review says which questions were wrong **and does not reveal the correct answers** — session 6's fix, on the live build |
| 6   | Retake and pass                                                                           | Status Complete; best score shown                                                                                                                                |
| 7   | As admin: Assignments and Dashboard                                                       | Complete, correct best score, completion figure moved                                                                                                            |
| 8   | Sign out → `/forgot-password` with the account address                                    | Confirmation wording is generic; **the reset email arrives**; the link lands on `/accept-invite`; the new password works                                         |
| 9   | `/tour`, all eight public pages, a deliberate 404                                         | Header nav reachable at phone width; the 404 has its own title                                                                                                   |
| 10  | Paste the home URL into a LinkedIn or Slack message box                                   | **`og.png` renders** — the proof for item 8                                                                                                                      |

Then from my side, against the live URL: `npm run verify:security` (sections 1 and 2), the new
CSRF check, `npm run test:mcp` against `https://skillforge-app.netlify.app/mcp`, and a mobile
Lighthouse run for the item 9 number. Then "Smoke Test Ltd" is deleted by exact ID.

**Never run `npm run test:e2e` against production.** It creates and deletes companies and
users. The production guard will refuse, but the rule stands on its own.

---

## Not on the original list, but a live deployment needs them

1. **Security headers.** Going live is the moment for `Strict-Transport-Security`,
   `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` / `frame-ancestors` and
   `Permissions-Policy` — cheap, testable, added to `netlify.toml` with an e2e test asserting
   them. A **strict CSP is deferred to the next stage** by agreement: the inline theme script
   in `__root.tsx` needs a hash or nonce (and that script is exactly what stops dark mode
   flashing, so it cannot simply move), plus allowances for Google Fonts, Supabase and the
   analytics beacon, and `style-src 'unsafe-inline'` is likely unavoidable with Tailwind.
2. **`/signup` is unauthenticated and creates an auth user with the service role.** Anyone can
   script unlimited company signups. CSRF does not help — a script can send whatever `Origin`
   it likes. Not being built in this stage, because it is a feature with design decisions in
   it. Launch knowing it, watch the `companies` table, decide properly. Flagged rather than
   discovered.
3. **No error reporting.** A 500 nobody sees on a live site is worse than a 500 in a dev
   console. Smallest honest option after launch: read the Netlify function logs. A real
   reporter is Stage 4.
4. **npm advisories are still open**, because `npm audit fix` changes versions. An accepted
   risk, not a solved problem.

---

## Post-launch list

- [ ] **Before making the repo public: full-history audit for secrets and personal data**
      (emails, names, anything in `docs/` or the screenshots), then switch to public for the
      portfolio. **GitHub disables scheduled workflows on public repos after 60 days without
      repository activity**, so check the keep-alive still runs after the switch.
- [ ] **"Resend invite"** on the Employees page — a server function plus e2e coverage, now
      that mail works.
- [ ] **Strict CSP**, with the inline theme script handled by hash or nonce.
- [ ] **Rate limiting or abuse control on `/signup`.**
- [ ] **Supabase Pro** before the first paying customer, for the automatic backups.
- [ ] **Error reporting.**
- [ ] **A custom domain**, which also upgrades email to Resend and improves the From line.
- [ ] **e2e in CI** (GitHub Actions) against the dev project — needs the Supabase secrets as
      repo secrets and a Chromium install, since the local suite pins installed Edge.
- [ ] **Stage 4 backlog** in `docs/progress.md` — the admin MCP tools first, since the whole
      "connect an AI assistant" story depends on them.

---

## Environment variable reference

| Variable                         | Where it lives                              | Dev value                                          | Production value                  |
| -------------------------------- | ------------------------------------------- | -------------------------------------------------- | --------------------------------- |
| `VITE_SUPABASE_URL`              | `.env` (committed), Netlify **Builds**      | dev project                                        | production project                |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | `.env`, Netlify **Builds**                  | dev                                                | production                        |
| `VITE_SUPABASE_PROJECT_ID`       | `.env`, Netlify **Builds**                  | dev                                                | production                        |
| `SUPABASE_URL`                   | `.env`, Netlify **Functions**               | dev                                                | production                        |
| `SUPABASE_PUBLISHABLE_KEY`       | `.env`, Netlify **Functions**               | dev                                                | production                        |
| `SUPABASE_PROJECT_ID`            | `.env`, Netlify **Functions**               | dev                                                | production                        |
| `PRODUCTION_PROJECT_ID`          | `.env` (committed, not secret)              | the production ref — the guard compares against it | same                              |
| `SUPABASE_SERVICE_ROLE_KEY`      | `.env.local`, Netlify **Functions**, secret | dev                                                | production                        |
| `DATABASE_URL`                   | `.env.local` only                           | dev                                                | never                             |
| `PROD_DATABASE_URL`              | `.env.production.local` only                | —                                                  | production, for migrations        |
| `PROD_SUPABASE_SERVICE_ROLE_KEY` | `.env.production.local` only                | —                                                  | production, for `verify:security` |
| `VITE_CF_ANALYTICS_TOKEN`        | Netlify **Builds**, Production context only | unset                                              | Cloudflare site token             |
| `E2E_SKIP_INVITE_EMAIL`          | the e2e test server only                    | `1`                                                | **must never be set**             |

**Never name a secret `VITE_*`.** `vite.config.ts` inlines every `VITE_*` variable into the
client bundle.
