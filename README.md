# SkillForge

SkillForge is a B2B learning and development app. Company admins create courses (text, video or PDF with a short quiz), invite employees, organise them into teams and assign courses with due dates. Employees work through their assigned courses and quizzes and track their progress. Each company's data is kept separate by Supabase row-level security.

Built with TanStack Start (React), Tailwind CSS and Supabase. See [CLAUDE.md](CLAUDE.md) for architecture and [DESIGN.md](DESIGN.md) for the design system.

## Development

You need [Node.js](https://nodejs.org/) 22 or newer, which includes npm. This project uses **npm** only; `package-lock.json` is the lockfile.

```sh
git clone <this-repository-url>
cd <repository-name>
npm ci        # install the exact versions in package-lock.json
npm run dev   # start the app at http://localhost:8080
```

Other scripts: `npm run build` (production build), `npm run lint`, `npx tsc --noEmit` (type-check).

To add or upgrade a package, use `npm install <package>` and commit the updated `package-lock.json`. `.npmrc` installs only from the public npm registry and, on npm 11 or newer, skips versions published less than a day ago.

## Environment variables

The app reads Supabase settings from `.env` (committed) and `.env.local` (git-ignored, overrides `.env`):

| Variable | Used by | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | Browser | Public values |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` | Server | Same values as the `VITE_` ones |
| `SUPABASE_SERVICE_ROLE_KEY` | Server (signup, invites, quiz grading) | **Secret.** Put it in `.env.local`, never in `.env` |
| `DATABASE_URL` | Scripts (`check:env`, security checks, seed) | Session pooler connection string with your database password. Keep it in `.env.local` |

In production, set the server variables as secrets in your hosting provider.

Run `npm run check:env` to test every value against Supabase. It never prints secret values.

## Supabase setup (dashboard settings)

These live in the Supabase dashboard, not in code. Set them once per project.

**Authentication → URL Configuration**

- **Site URL:** `http://localhost:8080` for local work; change it to the production URL when you deploy.
- **Redirect URLs:** `http://localhost:8080/**`, `http://localhost:8090/**` (the end-to-end test server, see [Tests](#tests)), plus `https://YOUR-SITE.netlify.app/**` once deployed. Invite and password-reset emails link to `/accept-invite`, which must be allowed here.

**Authentication → Sign In / Providers**

- **Email** provider: enabled. **Confirm email** can stay on; company signup and invites create users through the admin API.
- **Allow new users to sign up:** off. Accounts are only created by the app's server functions (company signup, employee invite), which still work with this off.

**Authentication → OAuth Server** (lets AI assistants sign in to the `/mcp` endpoint)

- Enable the OAuth server, set the authorization path to `/oauth/consent`, and allow dynamic client registration.

**Email delivery**

Supabase's built-in email service only delivers to members of your Supabase organisation and only a few emails per hour. Before inviting real employees, set up custom SMTP (for example Resend) under **Authentication → Emails → SMTP Settings**.

## Database changes

The database structure and Row-Level Security rules live in `supabase/migrations/` and are applied in filename (timestamp) order with the Supabase CLI, which is installed as a dev dependency:

```sh
npx supabase login                               # once per computer
npx supabase link --project-ref <project-id>     # once per clone; asks for the database password
npx supabase migration new <short_name>          # creates an empty, timestamped SQL file to fill in
npx supabase db push --dry-run                   # lists what would be applied
npx supabase db push                             # applies new migrations
npx supabase gen types typescript --project-id <project-id> > src/integrations/supabase/types.ts
```

Never edit a migration that has already been applied; add a new one instead.

## Tests

Automated browser tests (Playwright) check the main flows end to end, so a change that breaks them is caught before it ships:

- **Journey:** a company signs up, creates a team, invites an employee, and the employee accepts the invite. The admin creates and assigns a course. The employee fails the quiz, retakes it and passes, and the admin then sees the assignment as Complete.
- **Password reset:**
  - the Forgot password request;
  - a fresh reset link;
  - signing out in another tab while the reset form is open;
  - an already-used link;
  - reloading the reset page.
- **Access rules:** one company can't see or change another company's data, in the pages or by querying the database directly. An employee can't open admin pages or make admin-only changes.

### Before the first run

1. Install the dependencies with `npm ci`.
2. `.env.local` must hold the secret key (check with `npm run check:env`).
3. In Supabase, add `http://localhost:8090/**` to **Authentication → URL Configuration → Redirect URLs**. If it's missing, the tests stop straight away and tell you so.
4. The tests use Microsoft Edge, which comes with Windows. On another computer, run `npx playwright install chromium` and remove `channel: "msedge"` from `playwright.config.ts`.

### Running them

```sh
npm run test:e2e          # run every test (about 3–4 minutes)
npm run test:e2e:report   # open the detailed report of the last run in your browser
```

The tests start their own copy of the app on port 8090, so you can leave `npm run dev` running.

To run a single file, name it: `npm run test:e2e -- e2e/password-reset.spec.ts`. To watch the browser while it works, add `--headed`.

### Reading the results

- Each test prints one line: a ✓ when it passed, a ✘ when it failed.
- The last lines give the totals, for example `19 passed (3.2m)`, and confirm the clean-up (`Cleaned up test data: 4 companies, 12 users.`).
- When a test fails, it is listed with the step that went wrong (for example the button or text it couldn't find).
- `npm run test:e2e:report` shows each failure with:
  - a screenshot;
  - a "trace" you can step through action by action.

  The raw files are in `test-results/`. Both folders are git-ignored.
- Lines like `[WebServer] … TypeError: Failed to fetch` are harmless. They come from requests a page still had in flight when a test moved on.

### What the tests will never do

- **Send email.** Invite and reset links are made with Supabase's admin API, and the Forgot password request is answered by the test itself. The test server sets `E2E_SKIP_INVITE_EMAIL=1`, so **Add Employee** creates the invited user without emailing them. This switch only works in the dev server, never in a production build.
- **Touch real data.** Every test account uses an `@e2e.example.com` address and every test company is named `E2E Test …`. Clean-up deletes only those, before and after each run, even when tests fail.
