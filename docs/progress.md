# SkillForge progress log

What has been done, why, what broke and what's next. Newest session first. Update this file at the end of every working session.

## Where things stand (2026-10-09, end of session 5)

- **Phase 2 of the redesign is done.** Courses and Employees now follow `DESIGN.md` like the admin shell, Dashboard and Assignments before them: sortable tables on a desktop, cards on a phone, kit components throughout, and no hand-built markup.
- **Nothing in the admin uses a native browser dialog any more.** Confirmations are the kit's `AlertDialog`, messages are a toast. ESLint's `no-alert` now fails the build if one comes back.
- **Two security holes closed** (found while proving an unrelated policy was safe — see below). Any signed-in user could rewrite their own `profiles.email` and move themselves into any team, including another company's.
- Admins can now move an employee between teams, and manage teams properly (rename, delete).
- Phase 2 is **merged into `main` and pushed** (`adac2bc`, a merge commit). The `redesign-phase-2` branch is pushed too, so the history of the phase is still readable.
- **65 end-to-end tests pass** (26 before), and `verify:security` has grown from 40 checks to 55.

## Session 5: 2026-10-09 (redesign, phase 2)

### What we did

1. **Captured a "before" baseline** of Courses and Employees (`docs/screenshots/before-phase-2`).
2. **Redesigned the Courses page**: a sortable table (course and category, questions, assigned, completion on the temper scale, created) with cards below `md`, an empty state that says what to do next, Assign on the row, and Edit and Delete behind the "⋯" menu.
3. **Built a real course editor**: a full page rather than a dialog, because a course plus its quiz is far too tall for a phone-sized dialog. It asks before discarding unsaved work, warns when the course already has completions, and states the pass mark.
4. **Redesigned the Employees page**: Teams (with rename and delete) and People (name, email, team, invite status, completion) in two panels, cards on a phone, an invite dialog that confirms with the address it sent to.
5. **Finished the phase-1 leftovers**: "No due date" on assignment cards, a row-naming accessible label on every "⋯", the last `alert()` replaced by a toast, and a real hydration signal for the tests instead of a retry.
6. **Closed two profile security holes** and gave admins the narrowest possible power to change a colleague's team.
7. **Added 24 end-to-end tests** and brought the existing suite up to the redesigned screens.

### Key decisions and why

| Decision                                                    | Why                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The course editor is a page, not a dialog**               | A course with content and four questions is well over a phone screen tall. `DESIGN.md` reserves `radius-lg` for dialogs, which tells you what a dialog is for: something small enough to sit over the page.                                                                                       |
| **A course can only be deleted when nothing would be lost** | Assignments and quiz results cascade from the course. The first rule tried — block whenever any assignment exists — was a dead end, because nothing in the app can delete an assignment, only cancel one. The rule is now about consequences: every assignment cancelled, and nobody ever passed. |
| **Remove employee left out** (your call)                    | Deleting the account cascades to their assignments and results, which destroys completed training records. Waiting for a deactivate flag that keeps the history.                                                                                                                                  |
| **Resend invite left out** (your call)                      | Needs a server function that sends real email, which belongs with the SMTP setup.                                                                                                                                                                                                                 |
| **"Last updated" on Courses became "Created"** (your call)  | `courses` has only a `created_at` column. Showing a real date beats adding a column for a nicety.                                                                                                                                                                                                 |
| **Invited and Active get no temper colour**                 | The temper scale means progress and nothing else. Whether somebody has accepted an invite is not a stage of progress, so the word and the weight of the ink carry it.                                                                                                                             |
| **"Not assigned yet" instead of a 0% bar**                  | A full-width empty progress bar reads as failure. Nothing has been asked of that person yet.                                                                                                                                                                                                      |
| **One toast mechanism for the whole admin**                 | Confirmations ("Invite sent to ada@company.com.") and failures needed somewhere to go once the browser dialogs were gone. Failures stay until dismissed; a message that vanishes before it is read is worse than none. `DESIGN.md` gained a short Toast entry to say so.                          |
| **The pass mark comes from one constant** (your call)       | A hint reading "Employees pass at 70%" while the grader used something else would be worse than no hint. `PASS_MARK` lives in `scores.ts`; the grader, the employee's result message and the editor hint all read it.                                                                             |
| **Policy for "who", trigger for "which column"**            | A `FOR UPDATE` policy cannot compare the new row with the old one, so the policy alone would have let an admin rewrite a colleague's name or role. The same split already guards assignments.                                                                                                     |
| **Both restrictions are allow-lists** (your call)           | `to_jsonb(NEW) - 'team_id'` compared against the same of `OLD`, rather than a list of forbidden columns. A column added to `profiles` in future is protected the day it lands.                                                                                                                    |
| **The admin table markup moved into the kit**               | Phase 1 left `table`, `textarea`, `radio-group` and `label` on the shadcn aliases, which is why Assignments hand-built its table. All four now follow the tokens, and all three admin tables share one `SortableHeader` and one sorting rule.                                                     |

### Bugs and holes found, and what fixed them

| Found                                                                    | Cause                                                                                                                                              | Fix                                                                                                                                                                                       |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Any signed-in user could change their own `profiles.email`**           | The "update own profile" policy pins `role` and `company_id` and nothing else.                                                                     | The new trigger allows only `name` on the self path. Not an auth bypass — `auth.users.email` governs sign-in — but an employee could make their row show any address in the admin's list. |
| **Any signed-in user could move themselves into another company's team** | `profiles.team_id` has a foreign key to `teams`, which proves the team exists but not whose it is.                                                 | The trigger requires the team's `company_id` to match the employee's, on every path.                                                                                                      |
| **On a phone, the Employees table lost two columns entirely**            | The wrapper was `overflow-hidden` with no scroll container, so Team and Status were clipped off-screen — not scrollable, simply unreachable.       | The card layout.                                                                                                                                                                          |
| **`AssignCourseModal` was unreadable in dark mode**                      | It was still on hardcoded `slate`, `green` and `red` from before the redesign.                                                                     | Rebuilt on the kit and the tokens.                                                                                                                                                        |
| **The quiz editor's "correct answer" radio had no visible label**        | Its only label was a `title` tooltip, which most people never see.                                                                                 | A visible "Options — choose the correct answer" legend, and an accessible name per radio naming its question and option.                                                                  |
| **Dialogs were see-through while they opened**                           | `DialogContent` and `AlertDialogContent` animated their own opacity from 0, so the page behind showed through the form for 200ms.                  | The panel no longer fades — only the backdrop does. Guarded by `e2e/dialogs.spec.ts` at two widths in both themes.                                                                        |
| **The app ignored `prefers-reduced-motion`**                             | Nothing in `styles.css` responded to it, so a reader who had asked for less motion got all of it — as did every screenshot run, which asks for it. | A reduced-motion block that finishes every animation and transition at once.                                                                                                              |
| **`AlertDialogContent` was never moved onto the tokens**                 | It kept shadcn's `bg-background` and a colourless `border` while `DialogContent` was converted.                                                    | `bg-surface` and `border-steel`, like every other panel.                                                                                                                                  |
| **The screenshot seed showed "Invited" beside 50% complete**             | It signed in the first four employees by index; the fifth had a completed assignment. The Active/Invited rule itself was right.                    | Who gets signed in is derived from the assignment table.                                                                                                                                  |
| **A `verify:security` check failed against a rule that held**            | The check compared `after.email` with the stored value, but its `stored()` helper didn't select `email`, so it compared against `undefined`.       | Select every column the comparison uses. Confirmed separately with a throwaway probe that the database really does refuse the write.                                                      |

### Your phase-2 review, and what changed because of it

You found five things. Four were real; one was a seed-data mistake behind a correct rule.

1. **The invite dialog was see-through on a phone.** Not a missing background — `bg-surface` was already on `DialogContent` and its alpha measured 1 at every width in both themes. The panel was animating **its own opacity** from 0 over 200ms, so for the length of that fade the page behind was legible straight through the form. The new test catches it at 0.708 on the first frame. The panel no longer fades; the backdrop still does and the panel still zooms, so the transition reads the same with no see-through frame. `AlertDialogContent` was also still on `bg-background` and a colourless border — the shadcn default rather than the tokens — and is now on `surface` and `steel` like the rest.
2. **"Invited" beside 50% complete** was the screenshot seed, not the logic. Invited means an account nobody has signed in to, and you cannot start a course — let alone pass its quiz — without signing in, so the rule is right. The seed signed in the first four employees _by index_, and the fifth had a completed assignment. It now derives who signs in from the assignment table itself, so editing one can't leave the other behind.
3. **The course editor's actions** are a sticky bar at the foot of the content column, inside it so it stops at the sidebar rather than spanning the window, with an opaque background so the form scrolls under it. A second "Add question" sits after the last question. Both Add buttons are secondary; there is still one primary button.
4. **Dialog titles and descriptions left-align at every width.** They were centred below `sm` and left-aligned above it, which gave one dialog two reading positions.
5. **Stacked dialog footers had no gap.** `sm:space-x-2` sets a horizontal margin, and only above `sm`, so on a phone Send invite and Cancel touched. Both footers now use `gap-2`, which works on either axis.

Also found on the way: **the app ignored `prefers-reduced-motion` entirely**. Playwright had been asking for reduced motion during every screenshot run and getting full animations. It now honours it.

`e2e/dialogs.spec.ts` guards all of this: nine dialogs at 375px and 1280px in both themes, asserting what the browser actually renders — background alpha, and the opacity inherited down the whole ancestor chain — because a translucent token, an inherited opacity and an unfinished animation look identical on screen and only one of them is visible in the markup.

### Commits

|           |                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------- |
| `cf8097f` | Captured the before-phase-2 screenshots; the screenshot run takes a list of screens per project |
| `877f807` | `PASS_MARK` moved into `scores.ts`, so nothing restates the number                              |
| `b468414` | `table`, `textarea`, `radio-group` and `label` brought onto the tokens                          |
| `1836a12` | Toast entry in `DESIGN.md`; Toaster restyled and mounted in `AdminShell`                        |
| `d8cf452` | Shared sorting, `SortableHeader` and `Tag`; the last `alert()` gone; "No due date" on cards     |
| `f093f34` | `data-hydrated` on `<html>`; the e2e sign-in retry deleted; ESLint `no-alert` on                |
| `825cfa2` | Courses page, course editor, `getCourseForEdit`, `AssignCourseModal` restyled                   |
| `465e99f` | Employees page                                                                                  |
| `44d47ea` | Contrast checks for the new tag and error pairs                                                 |
| `531aa1d` | Course deletion reworked around what would actually be lost                                     |
| `291533d` | Admin team-change policy and trigger; two profile holes closed                                  |
| `5dc3698` | Older tests brought up to the redesigned screens                                                |
| `c426453` | Progress log and CLAUDE.md                                                                      |
| `307bf90` | CSRF protection added to the launch checklist as a blocker                                      |
| `f8bfc7b` | Dialogs stop fading their own opacity; headers left-align; `prefers-reduced-motion` honoured    |
| `d3327e5` | Sticky Save/Cancel in the course editor, second "Add question"                                  |
| `3c8879f` | Screenshot seed no longer shows Invited beside a completion figure                              |
| `8f3824c` | Dialog checks walk the pages in order rather than reloading per dialog                          |

### Checks at the end of the session

| Check                                   | Result                                                                                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:e2e`                      | **65 passed** (26 before this session). 10 minutes on a quiet machine, 14 sharing it with the other checks. Re-run on `main` after the merge. |
| `npm run check:contrast`                | **all passed** — 56 checks across both themes                                                                                                 |
| `npx tsc --noEmit`                      | clean                                                                                                                                         |
| `npx tsc --noEmit -p e2e/tsconfig.json` | clean                                                                                                                                         |
| `npm run build`                         | succeeds (nitro, Cloudflare target)                                                                                                           |
| `npm run lint`                          | 399 problems, down from 412 on `main`; **no errors in any file this session touched**                                                         |
| `npm run verify:security`               | **all passed** — 55 checks (40 before). Re-run on `main` after the merge.                                                                     |
| secret scan                             | clean — no secret-shaped strings in any commit on the branch; `.env.local` has never been tracked                                             |
| `npm run test:mcp`                      | all passed                                                                                                                                    |

### Screenshots

`docs/screenshots/before-phase-2` (4, light only) and `docs/screenshots/phase-2` (28: Courses, Employees, the course editor, the invite dialog and both empty states, each at 1440x900 and 375x812, in both themes). The editor gets two shots per size: `course-editor-*` is the viewport, which is where the sticky action bar really sits, and `course-editor-full-*` is the whole form.

### What phase 2 did not cover

- The employee screens and the marketing pages still have their old layout.
- The marketing home page still has the centred hero and three feature cards that `DESIGN.md` says to avoid.
- Login and signup are untouched.

## Where things stood (2026-10-08, end of session 4)

- **The redesign has started.** `DESIGN.md` is now live: cool steel colours, Archivo, and the temper scale for progress. The cream/terracotta/Fraunces look is gone.
- Phase 1 covered the foundations and three screens: the admin shell, the admin dashboard and the Assignments table. Everything else inherits the new colours and typeface but keeps its old layout until its phase.
- Dark mode works, with a toggle in the admin top bar.
- Work is on the **`redesign` branch**, 7 commits, **not merged and not pushed** — ready for you to merge when you're happy.
- **26 tests pass**: the 21 from before, plus 5 new ones protecting the redesigned Assignments behaviour.

## Session 4: 2026-10-08 (redesign, phase 1)

### What we did

1. **Captured a "before" baseline** (`docs/screenshots/before`) so the redesign can be compared with what it replaced.
2. **Put the whole design system into the code:**
   - every `DESIGN.md` colour, in a light and a dark theme;
   - the Archivo typeface and the seven named text sizes;
   - the radius and spacing rules;
   - a visible keyboard focus ring everywhere, including screens not yet redesigned.
3. **Made dark mode real.** It never worked before: the styles existed but nothing ever switched them on.
4. **Restyled the component kit** and built **TemperProgress**, the progress bar that moves straw → bronze → violet → blue.
5. **Redesigned three screens:** the admin shell (collapsible sidebar, works on a phone), the dashboard (both states), and the Assignments table (sortable, with progress bars and plain-English overdue warnings).
6. **Added a contrast check** (`npm run check:contrast`) and captured 16 screenshots of the result.

### Key decisions and why

| Decision                                                  | Why                                                                                                                                                                                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The old style names became aliases of the new colours** | Roughly 870 uses of the old names are spread across 60+ files. Re-pointing them meant the whole app changed look at once, instead of three redesigned screens sitting next to twenty that still looked cream and terracotta. |
| **Built on the component kit that was already there**     | All 47 components existed but nothing used them — every screen was hand-built. `DESIGN.md` asks for the opposite, so the redesigned screens now use the kit.                                                                 |
| **The sidebar came free**                                 | The full collapsible sidebar (icon rail, phone drawer, keyboard shortcut) was already in the kit, unused. Restyling it beat hand-building one.                                                                               |
| **Theme set before the page paints**                      | A small script in the page head picks the theme from your saved choice, or your computer's setting. Without it, dark mode would flash white on every load.                                                                   |
| **Contrast is checked by a script, not by eye**           | It reads the real colour values and computes the real ratios, so a future colour change that hurts readability fails immediately. 40 checks, both themes.                                                                    |
| **The table scrolls sideways on a phone** (your choice)   | Keeps every column reachable. `DESIGN.md` reserves cards for the getting-started screen, so stacking rows into cards wasn't an option.                                                                                       |
| **The top bar doesn't repeat the page name**              | It showed "Assignments" directly above the heading "Assignments". The bar now carries only the controls.                                                                                                                     |
| **`font-serif` points at Archivo**                        | Thirteen screens still carry that class from the Fraunces era. Left alone they would have fallen back to Georgia — worse than before. The classes go as each screen is redesigned.                                           |

### Bugs found and fixed

| Bug                                                                 | Cause                                                                                                           | Fix                                                                                     |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Screenshots of the collapsed sidebar failed                         | Two controls share the label "Toggle sidebar": the one in the top bar and the thin strip at the sidebar's edge. | The screenshot run targets the one in the top bar.                                      |
| Mobile table columns were cramped and the pinned column had no edge | The table's minimum width was too narrow, and the frozen first column had no border.                            | Wider minimum, and a hairline on the pinned column so it reads as pinned when scrolled. |
| The last of the old terracotta                                      | Two hardcoded colours were still inline on the About page.                                                      | Replaced with tokens. No old palette values remain anywhere in `src/`.                  |

### Your review, and what changed because of it

You reviewed the screenshots and asked for six changes. All are in:

1. **Cancelling an assignment is no longer one click.** Edit stays on the row; cancelling moved into a "⋯" menu and asks for confirmation first. A cancelled row offers only **Restore** (renamed from Undo).
2. **Status tags** got a soft tint and lost their outline, so they can't be mistaken for buttons.
3. **Dates read "2 Oct 2026" everywhere**, fixed to British format rather than the reader's own, so a due date can't mean 10 February to one person and 2 October to another.
4. **On a phone, assignments are cards**, not a table scrolled sideways. The table returns on wider screens.
5. **Dashboard panels earn their space:** the subtext now adds something the number doesn't ("The oldest is 6 days late"), and each panel is a visible link that opens Assignments already filtered.
6. **The getting-started steps are numbered** 1, 2, 3.

Plus British spelling throughout.

### Then we protected it with tests

Five new tests in `e2e/assignments.spec.ts`, because all of that behaviour was new and nothing was guarding it:

- cancelling through the menu and the confirmation, then restoring, checked in the page **and** in the database;
- choosing "Keep assignment" changes nothing;
- the dashboard's overdue panel opens Assignments filtered to overdue, and the number of rows matches the number on the panel;
- at phone width the assignments are cards, with nothing scrolling sideways;
- on a wider screen the table comes back.

### Bugs the review and the tests found

| Bug                                                                 | Cause                                                                                                                                                                                                   | Fix                                                                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **The page became unreachable for screen readers after cancelling** | The "⋯" menu was being held open behind the confirmation dialog. While a menu is open it hides the rest of the page from assistive technology, so the table stayed hidden even after the dialog closed. | The menu now closes properly. Found only because the new test could not find the table rows afterwards.                  |
| React warned about a mismatch on every page load                    | The theme is chosen in the browser, so the server's HTML can't contain it.                                                                                                                              | The page now declares that difference as deliberate. The claim in the last session that there was no mismatch was wrong. |
| The screenshot run hung twice                                       | It waited for a table row, which no longer exists at phone width; then for a hidden one, because the cards come first in the page.                                                                      | It now waits for whichever layout is actually on show.                                                                   |

### What phase 1 did not cover

- The employee screens, the marketing pages, Courses and Employees. They use the new colours and typeface, but their layout is unchanged.
- The marketing home page still has the centred hero and three feature cards that `DESIGN.md` says to avoid.
- `AssignCourseModal` is still on a raw grey/green/red palette rather than the tokens.
- Row actions still report failures with a browser `alert()`. Everything else now uses the design system's dialogs.

## Where things stood (2026-10-05, end of session 3)

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

| Decision                                                                                                                   | Why                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Enforced in the database, not just the app**                                                                             | The browser can talk to the database directly, so a rule only in the page could be bypassed. The database now refuses the change whoever sends it. |
| **The grader writes with the service role**                                                                                | Once employees can't set Complete, the grader can't do it "as the employee" either. It checks ownership first, then writes with the trusted key.   |
| **Employees may only go Not started → In progress**                                                                        | That's the one change the app makes for them ("I've reviewed the content"). Every other status change belongs to the grader or an admin.           |
| **Cancelled assignments can't be graded**                                                                                  | Otherwise taking the quiz from an old link would revive a cancelled assignment as Complete.                                                        |
| **A pass sticks; retakes are practice** (your decision, replacing the old behaviour where a failed retake set In progress) | Completion records that the employee has shown they know the material. Practising afterwards shouldn't undo that.                                  |
| **Show the best score, not the latest**                                                                                    | It matches "a pass sticks". A lower practice score shouldn't make a completed course look worse to the admin or the employee.                      |

### Bugs found and fixed

| Bug                                                                                  | Cause                                                                                                     | Fix                                                                       |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
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

| Decision                                                                       | Why                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Playwright with the installed Edge**                                         | Playwright is the standard tool for browser tests. Using the Edge that ships with Windows avoids a large browser download.                                                                                                                    |
| **Tests run their own app server on port 8090**                                | It can't accidentally reuse your normal 8080 server, which sends real invite emails, and you can keep `npm run dev` open while tests run. It needed one Supabase setting: `http://localhost:8090/**` in Redirect URLs.                        |
| **Test-only switch `E2E_SKIP_INVITE_EMAIL`**                                   | "Add Employee" sends its email from the server, where a test can't intercept it. With the switch on, the app creates the same invited user via `generateLink` without emailing. It only works in the dev server, never in a production build. |
| **Links from the admin API; the Forgot password request answered by the test** | No real email and no use of Supabase's email limit.                                                                                                                                                                                           |
| **Strict test-data naming plus a guarded clean-up**                            | Test users are `…@e2e.example.com` and test companies are `E2E Test …`. Clean-up refuses to delete anything else, so Northwind and your company are safe. It also runs before each run, to clear leftovers from a crashed run.                |
| **One test at a time**                                                         | Keeps well under Supabase's sign-in rate limits. A full run takes about 3–4 minutes.                                                                                                                                                          |
| **Security fix applied straight away** (your choice)                           | The hole broke company isolation, the app's core promise.                                                                                                                                                                                     |

### Bugs found and fixed

| Bug                                                    | Cause                                                                                                                                                                                                                                                                                      | Fix                                                                                                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **An admin could read another company's quiz answers** | The rule for creating assignments checked that the _employee_ was in the admin's company, but not the _course_. An admin who knew another company's course ID could assign it to their own employee. Submitting that quiz then returned the other company's questions and correct answers. | A new migration requires the course to be in the admin's company too, and the quiz grader refuses courses the user can't see (`638d638`). No existing data was affected (0 such assignments). |
| Early test clicks did nothing                          | The tests clicked before React had finished loading the page (slow on a cold dev server), so forms submitted as plain HTML.                                                                                                                                                                | Tests open pages with `open()`, which waits until the page is idle. Test-only; no app change.                                                                                                 |
| `inputValidator()` deprecation warning                 | TanStack Start renamed the method.                                                                                                                                                                                                                                                         | Switched to `validator()` (`77062fd`). The warning is gone, and all tests pass before and after.                                                                                              |

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

| Decision                                                           | Why                                                                                                                                                                                                              |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **npm, not Bun**                                                   | npm comes with Node.js, while Bun needed extra setup on Windows. The old `bun.lock` downloaded packages from Lovable's private cache.                                                                            |
| **Kept exact package versions when switching to npm**              | A fresh install would have changed 234 packages at once (React, Supabase, Vite and more). Upgrades should happen on purpose, one at a time.                                                                      |
| **One-day minimum age for new packages** (`.npmrc`)                | Protects against freshly published malicious package versions. It replaces the same rule from Lovable's Bun config.                                                                                              |
| **Official MCP SDK instead of `@lovable.dev/mcp-js`**              | The Lovable package still had the Windows bug in its latest version and sent usage data to Lovable by default. The official SDK does the same job with no Lovable ties.                                          |
| **One migrations folder (`supabase/migrations`), drizzle removed** | Drizzle was Lovable's migration tool, and nothing in the app used it. One folder and one tool (the Supabase CLI) is simpler. The five drizzle migrations were moved as-is, renamed to keep their original order. |
| **Secrets only in `.env.local`**                                   | `.env` is committed to GitHub and `.env.local` is git-ignored. A scan of all commits confirmed no secret was ever committed.                                                                                     |
| **New Supabase project started empty**                             | There was no data worth keeping. The demo data is recreated by a script instead.                                                                                                                                 |
| **Public sign-ups turned off in Supabase**                         | The app creates every account itself (company signup and employee invites), so this only blocks people creating empty accounts directly through Supabase.                                                        |
| **Sign out ends only the current browser's session**               | It used to end the user's sessions everywhere, which broke password resets open in other tabs (see bugs). This is also what most apps do.                                                                        |
| **`AGENTS.md` kept, as a pointer to `CLAUDE.md`**                  | Other coding agents (such as Codex) read `AGENTS.md`. Pointing them at one guide stops two copies drifting apart.                                                                                                |

### Bugs found and fixed

| Bug                                                      | Cause                                                                                                                                                         | Fix                                                                                                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| App wouldn't start on Windows                            | Lovable's MCP plugin compared `C:/...` with `C:\...` as text, so its safety check always failed on Windows.                                                   | Replaced with the official MCP SDK (`273c780`).                                                                                                        |
| Route files always showed as "modified"                  | Windows checked files out with CRLF line endings, but the code generators write LF.                                                                           | `.gitattributes` makes every file LF (`ba32e74`).                                                                                                      |
| `/mcp` returned a 500 server error for a malformed token | Supabase's `getClaims` throws on malformed tokens instead of returning an error.                                                                              | Now caught and answered with "not authorised" (401) (`273c780`).                                                                                       |
| Type-check failed after removing drizzle                 | The `esbuild.keepNames` option (ignored by Vite 8 anyway) needed esbuild's types, which left with drizzle.                                                    | Switched to Rolldown's `output.keepNames` (`8228c6c`).                                                                                                 |
| Password reset never asked for a new password            | The reset email linked to `/login`, which just signed the user in.                                                                                            | The link now goes to the set-password page (`2c35302`).                                                                                                |
| Password reset failed with "Auth session missing!"       | All tabs share one login, and Sign out ended the user's sessions everywhere. Signing out in another tab killed the reset session, and the page didn't notice. | The page keeps its link's login in its own tab and checks it with Supabase. Sign out is now per-browser, and errors are in plain language (`0a33348`). |
| Wrong admin email in manual test 1                       | Not a code bug: signed up with the address meant for the employee.                                                                                            | The test company and account were deleted by exact ID; the demo data was untouched.                                                                    |

Also added in that last fix: show/hide eye icons on the set-password page, sharing the signup page's existing `PasswordField`.

### Known issues (not fixed yet)

- ~~**Employees can mark their own course complete without the quiz.**~~ Fixed in session 3 (`f192771`).
- ~~**Security fix: employees could set their own `team_id` (including another company's team) and `profiles.email`.**~~ Closed in Phase 2 migration (`291533d`).
- ~~**Row actions report failures with a browser `alert()`.**~~ Fixed in session 5: nothing in the admin uses a native dialog, and ESLint's `no-alert` keeps it that way.
- ~~**`AssignCourseModal` is on a raw grey/green/red palette.**~~ Rebuilt on the tokens in session 5.
- **A course that anyone has passed can never be deleted.** That is deliberate — it protects the training record — but there is also no way to archive or hide a course that is no longer taught. See the Stage 4 backlog.
- **Cancelled assignments aren't handled everywhere.** The MCP `list_my_assignments` status filter and the course page's `Assignment` type don't know about the `cancelled` status.
- **npm reports security advisories** in some dependencies. `npm audit fix` wasn't run, because it changes versions.
- **About 290 old lint problems** remain, mostly formatting in the Supabase helper files and the generated `types.ts`. Session 5 brought the count down from 412 to 399 and added none.
- **The full AI-assistant sign-in through the consent page** (manual test 6, with a real AI client) hasn't been tried. The signed-in `/mcp` call itself is tested.
- **The production build targets Cloudflare Workers** by default. This needs checking when setting up Netlify.
- **The old Lovable site** (try-skillforge.lovable.app) and its Supabase project still exist, frozen at the old version.
- **Harmless dev-log noise:**
  - a hydration warning caused by a page-ruler browser extension;
  - a 404 for the missing `favicon.ico`;
  - `TypeError: Failed to fetch` lines during test runs, from requests cut off when a test moves to the next page.

## Before launch

- [ ] **Required before deploying — enable TanStack Start's CSRF protection for server functions, and add a `verify:security` check for it.** The dev server prints a warning on every run: server functions are same-origin RPC endpoints and nothing currently stops a cross-site request reaching one. That matters most for `createEmployee` and `submitQuiz`, which write with the service role. The warning names the fix — a `createCsrfMiddleware` filtered to `ctx.handlerType === "serverFn"`, registered in `src/start.ts` alongside the existing `attachSupabaseAuth`. Don't silence it with `disableCsrfMiddlewareWarning` instead. Once it is on, `verify:security` should prove it: post to a server function with a foreign `Origin` and expect a refusal, the same shape as the MCP endpoint's existing 403-on-foreign-origin rule. Check the e2e suite still passes afterwards, since every test calls server functions from the browser.
- [ ] **Set up an email service** (e.g. Resend) under Supabase → Authentication → Emails → SMTP Settings. The built-in sender only reaches your own address, a few times an hour, so real invites and resets won't arrive without it.
- [ ] **Add "Resend invite"** to the Employees page, once that email service is in place. The list already shows who is still Invited; the action needs a server function that re-sends the invite, and there is no point shipping it before the mail actually arrives.
- [ ] **Update Supabase Site URL and Redirect URLs for Netlify** (Authentication → URL Configuration). Set Site URL to the Netlify address and add `https://YOUR-SITE.netlify.app/**` to Redirect URLs. Keep `http://localhost:8080/**` for local work.
- [ ] **Remove the Northwind demo data and your test company** from the production database. The demo accounts share a public password.
- [ ] **Add a favicon** (the browser-tab icon). Do it with the redesign so it matches `DESIGN.md`.
- [ ] **Prevent Supabase free-tier pausing: upgrade to Pro or add a scheduled keep-alive.** A free project is paused after a week with no activity, and a paused project takes the whole app down — sign-in included — until someone restores it by hand from the dashboard. Either pay for Pro, or schedule something that touches the database often enough to count as activity (a GitHub Action on a cron hitting a cheap endpoint is enough). Worth deciding before launch rather than discovering it from a user.
- [x] **Update the deprecated `inputValidator()` code** in the server functions (done in session 2, `77062fd`).
- [ ] **Run `npm run test:e2e` before every deploy.**

## Stage 4 backlog

Product decisions and features worth doing, none of them blocking a launch.

- [ ] **Deactivate employee (keeps training history).** Phase 2 deliberately shipped no "Remove employee": `assignments` and `quiz_results` cascade from `auth.users`, so deleting the account destroys completed training records. A deactivated employee should stop being able to sign in and drop out of assignment lists, while their history stays.
- [ ] **Archive course.** Same shape of problem from the other end: a course anyone has passed can't be deleted, so a course no longer taught has nowhere to go. Archiving would hide it from the Courses list and the Assign dialog without touching what people have already earned.
- [ ] **Decide whether admins should be able to cancel a Complete assignment** (it currently hides a completion record). Cancelling is reversible and the result rows survive, but a cancelled row drops out of the dashboard figures and the employee's list, so a completion can be made invisible without being deleted.
- [ ] **Handle `cancelled` everywhere.** The MCP `list_my_assignments` status filter and the course page's `Assignment` type still don't know the status exists.

## What's next

1. Review phase 2, then merge `redesign-phase-2` and push it.
2. Continue the redesign: the employee screens, then the marketing pages. Run `npm run test:e2e` and `npm run check:contrast` after each.
3. Deploy to Netlify and confirm the build works there, then work through "Before launch".
4. Work through the Stage 4 backlog above.
5. Try connecting a real AI assistant through `/oauth/consent`.
6. Optionally, run the tests automatically on GitHub for every push (GitHub Actions). That needs the Supabase secret stored as a GitHub secret, and ideally a separate test Supabase project.

## Useful commands

```sh
npm run dev               # run the app at http://localhost:8080
npm run check:env         # check .env / .env.local against Supabase (never prints secrets)
npm run verify:security   # prove RLS and quiz-answer protection
npm run seed              # (re)load Northwind demo data
npm run test:mcp          # test the AI-assistant endpoint (needs npm run dev)
npm run check:contrast    # check the design colours meet WCAG AA, both themes
npm run screenshots       # capture the phase-1 admin screens for review
npm run screenshots:phase-2  # capture the phase-2 screens (Courses, Employees)
npm run test:e2e          # all browser tests (~6 min, no email, cleans up)
npm run test:e2e:report   # open the last test report
npx supabase db push      # apply new migrations (see README "Database changes")
```
