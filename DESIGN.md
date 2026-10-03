# SkillForge design system (DESIGN.md)

Training people actually finish. SkillForge helps HR and training managers assign courses, set due dates and see who has completed what, and helps employees get through their training without friction.

## The idea: tempered

A forge doesn't just heat metal. It tempers it, and steel shows its progress in colour: pale straw, then bronze, then violet, then blue. SkillForge uses that real sequence as its progress language. Every progress bar, status tag and completion figure moves through the same four temper colours, so an admin can read a whole team's state at a glance, and an employee can see their own training "heat up" toward done.

This is the one bold idea in the system. Everything around it stays quiet: cool steel neutrals, one typeface, plain language.

## Principles

1. **Progress is the hero.** The temper scale appears wherever completion is shown, and nowhere else. Never use temper colours for decoration, illustrations or section backgrounds.
2. **Admins scan, employees focus.** Admin screens are dense, table-first and aligned to a strict grid. Employee screens show one thing at a time: the next course, the next question.
3. **Deadlines are honest.** Overdue is `oxide`, always with words ("Overdue by 2 days"), never colour alone.
4. **Plain, calm, specific.** No hype in the product. The marketing site can be confident, but it describes what SkillForge does, not how it feels.

## The temper scale

| Stage | Token | Means |
| --- | --- | --- |
| Cold | `steel-strong` | Not started (empty track) |
| 1 | `temper-straw` | 1–33% complete, or due soon |
| 2 | `temper-bronze` | 34–66% complete, or in progress |
| 3 | `temper-violet` | 67–99% complete |
| Tempered | `temper-blue` | Complete |

The four stages get darker as they progress, so they stay distinguishable without relying on hue. Always pair a stage with a label or number.

## Colour

- `ground` is a cool steel-white. The old cream background and terracotta accent are retired.
- `surface` sits on `ground` for panels and tables. Separate them with a `steel` hairline, not a shadow.
- `temper-blue` is the only brand colour: primary buttons, links, focus rings. One primary button per screen.
- `oxide` means something is wrong or late. Nothing else uses red.
- Both light and dark themes meet 4.5:1 for text. `temper-straw` is a fill in the light theme, not a text colour.

## Typography

One family: **Archivo** (Google Fonts, variable width and weight). It has an industrial, engineered character that fits a forge without being themed.

- Headings (`display`, `heading-1`) use Archivo **expanded** (`font-stretch: 125%`). This wide, sturdy shape is the brand's voice in type.
- Everything else uses normal width.
- Numbers on dashboards use `figure` with tabular figures so columns of percentages line up.
- Sentence case everywhere. No all-caps labels, no letter-spaced eyebrows above headings.
- Keep text lines under 75 characters; course content under 70.

Load it with: `https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..700&display=swap`

## Layout

- **Admin:** a fixed left sidebar on `surface`, content on `ground`. Content is left-aligned on a 12-column grid with `space-6` gutters. Tables are the default way to show lists; cards are only for the getting-started screen.
- **Employee:** a single centred column, max 720px, with a top bar. The course page reads like a document: content first, quiz below, one question visible at a time on mobile.
- **Marketing:** left-aligned, asymmetric. The hero shows a real admin table with temper progress bars, not an abstract illustration.
- Spacing comes only from the `space-*` scale. Radius follows hierarchy: `radius-sm` for small controls, `radius-md` for buttons and panels, `radius-lg` for dialogs only.

## Iconography

Lucide line icons at 20px (16px in tables), 1.5px stroke, coloured `ink` or `ink-muted`. Icons support labels; they never replace them, except in the collapsed sidebar with tooltips.

## Writing

- Name things the way users say them: "Assign course", "Invite employee", "Due date".
- Buttons say what happens: "Send invite", not "Submit". The confirmation repeats the verb: "Invite sent to ada@company.com."
- Empty states tell people what to do next: "No courses yet. Create your first course to start assigning training."
- Errors say what went wrong and how to fix it, without apologising: "That email is already invited. Resend the invite from the Employees list."

## Avoid

- Cream backgrounds, terracotta accents, purple-to-blue gradients.
- Identical rounded cards with soft grey shadows for every block of content.
- Temper colours used as decoration.
- Centred hero with a gradient blob and three feature cards.

## Using it in the codebase

The app uses Tailwind. Map each token to a CSS variable in `src/styles.css` (for example `--temper-blue`) under `:root` for light and `[data-theme="dark"]` for dark, then reference the variables from the Tailwind theme so classes like `bg-surface` and `text-ink` work. Build pages from the existing UI kit in `src/components/ui/`, restyled with these tokens, rather than hand-built markup.

## Tokens

### Colour

| Token | Light | Dark | Use |
|---|---|---|---|
| `ground` | #f1f2f0 | #15181b | Page background. A cool steel-white, never warm cream. |
| `surface` | #ffffff | #1d2125 | Panels, tables, dialogs and form fields that sit on ground. |
| `ink` | #1a1f24 | #e8ebed | Primary text and icons on ground or surface (14.8:1 light, 14.9:1 dark). |
| `ink-muted` | #59626b | #9ba4ac | Secondary text: helper text, timestamps, table metadata (5.5:1 minimum). |
| `steel` | #c4cacf | #3a4148 | Hairlines and dividers only. Decorative, below 3:1, so never the only edge of a control. |
| `steel-strong` | #7a838a | #727b83 | Input and checkbox borders, the empty track of a progress bar (3.4:1 minimum). |
| `temper-blue` | #2c3f9e | #93a3f2 | The brand colour and the final temper stage: primary buttons, links, focus rings, and 'Complete'. |
| `on-temper-blue` | #ffffff | #10152e | Text and icons on temper-blue fills (9.1:1 light, 7.5:1 dark). |
| `temper-violet` | #6b3f8e | #c3a6e0 | Temper stage 3: progress from 67% up to complete. Also passed-quiz scores below 100%. |
| `temper-bronze` | #94561f | #dda56b | Temper stage 2: progress from 34% to 66%, and the 'In progress' status. |
| `temper-straw` | #a67c1a | #e3c36f | Temper stage 1: progress from 1% to 33%, and 'Due soon'. A fill, not a text colour in light theme (3.4:1). |
| `oxide` | #b0362b | #f2907f | Overdue assignments, failed quizzes and form errors only. Never decorative. |

### Type (Archivo)

| Style | Size / line | Weight | Use |
|---|---|---|---|
| `display` | 56px / 58px | 700 | Marketing hero only. Set Archivo at font-stretch 125% (expanded). |
| `heading-1` | 36px / 42px | 650 | Page titles. Expanded width (125%). |
| `figure` | 40px / 44px | 600 | Dashboard numbers. Tabular figures (font-variant-numeric: tabular-nums), normal width. |
| `heading-2` | 24px / 30px | 600 | Section headings inside a page. |
| `heading-3` | 18px / 24px | 600 | Course titles, panel titles, dialog titles. |
| `body` | 16px / 24px | 400 | Default text, course content, form labels. |
| `small` | 14px / 20px | 400 | Table cells, helper text, status tags. Never smaller than 14px. |

### Spacing

- `space-1`: 4px: Icon to label gap, tag padding.
- `space-2`: 8px: Tight stacks: label to field, tag gaps.
- `space-3`: 12px: Button vertical padding x2, table cell padding.
- `space-4`: 16px: Panel padding on mobile, gaps between form fields.
- `space-6`: 24px: Panel padding on desktop, gaps between panels.
- `space-8`: 32px: Space between page sections inside the app.
- `space-12`: 48px: Page top padding, gaps between marketing blocks.
- `space-16`: 64px: Marketing section spacing on desktop.

### Radius

- `radius-sm`: 4px: Inputs, checkboxes, status tags, progress bars.
- `radius-md`: 8px: Buttons and panels.
- `radius-lg`: 14px: Dialogs and the marketing hero frame only.

## TemperProgress component

A progress bar whose fill colour follows the temper scale, so completion reads at a glance across a whole table.

- Track: `surface` with a 1px `steel-strong` inner edge, 8px tall, `radius-sm`.
- Fill colour by value: 0% none, 1–33% `temper-straw`, 34–66% `temper-bronze`, 67–99% `temper-violet`, 100% `temper-blue`.
- Always show the number beside it in `small`, tabular figures. At 100% the number turns `temper-blue` and semibold.
- Use `role="progressbar"` with `aria-valuenow`, `aria-valuemin` and `aria-valuemax`.
- Use it in: the employee "My learning" bar, each row of the admin assignments table, the dashboard completion figure, and course cards on the employee home.
- Don't animate the fill on page load. Animate only when the value changes after an action, such as passing a quiz.
