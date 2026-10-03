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
- **Redirect URLs:** `http://localhost:8080/**`, plus `https://YOUR-SITE.netlify.app/**` once deployed. Invite and password-reset emails link to `/accept-invite`, which must be allowed here.

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
