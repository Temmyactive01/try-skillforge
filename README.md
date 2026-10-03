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
