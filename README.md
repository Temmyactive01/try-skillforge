# SkillForge Core

Build the foundation for a B2B Learning & Development web app called SkillForge.

Set up a database with these tables and relationships:

- companies (id, name)

- users (id, company_id, name, email, password, role: "admin" or "employee", team_id)

- teams (id, company_id, name)

- courses (id, company_id, title, description, content_type, content_url, category)

- quiz_questions (id, course_id, question_text, options as a list, correct_answer)

- assignments (id, course_id, user_id, due_date, status: "not_started"/"in_progress"/"complete")

- quiz_results (id, assignment_id, score, passed, completed_at)

Build a login page (email + password). On successful login, route admin-role users to "/admin/dashboard" and employee-role users to "/employee/home". Show a clear error message on failed login. Each company's data must stay completely separate from other companies' data.

Keep the visual design simple and clean: one primary color, white background, minimal styling. We'll add detailed UI in later steps — focus on this foundation working correctly first.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://try-skillforge.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/acbe6c6d-c3ce-4b37-bdca-d6e6b0f0db67).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

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
