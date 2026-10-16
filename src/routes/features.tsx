import { Link, createFileRoute } from "@tanstack/react-router";

import { PublicPage, container } from "@/components/public/PublicPage";
import { Button } from "@/components/ui/button";
import { PASS_MARK } from "@/lib/scores";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/features")({
  head: () =>
    pageHead({
      title: "Features — SkillForge",
      description:
        "What SkillForge does today: courses with multiple-choice quizzes, assignments to people or teams with due dates, a sortable assignments table, and a training record only the server can write.",
      path: "/features",
    }),
  component: FeaturesPage,
});

/*
 * Every line on this page describes something that exists in the code today.
 * The page it replaced listed four things that did not: reminder emails to
 * learners, single sign-on, priority support and custom integrations. The
 * honest replacement for them is the "Not in it yet" list at the bottom.
 */
type Entry = { term: string; detail: string };

const ADMIN: Entry[] = [
  {
    term: "Courses",
    detail:
      "Write the content in the editor, or point at a video or a PDF. Each course carries a category and a description.",
  },
  {
    term: "Quizzes",
    detail: `Multiple-choice questions with one correct option each. ${PASS_MARK}% passes. The questions belong to the course, so everyone sitting it gets the same test.`,
  },
  {
    term: "Assigning",
    detail:
      "To one person, to several, or to a whole team, with a due date or without one. A team assignment reaches everyone in that team at the moment you assign it.",
  },
  {
    term: "The assignments table",
    detail:
      "Who, which course, the status, the best quiz score and the due date. Sortable by any of those, filterable by status, and anything late says how late it is in words.",
  },
  {
    term: "Teams",
    detail: "Create, rename and delete teams, and move people between them.",
  },
  {
    term: "Employees",
    detail:
      "Invite by email, see who has accepted the invite and who has not, and see how far each person has got.",
  },
  {
    term: "Cancelling",
    detail:
      "An assignment that no longer applies is cancelled rather than deleted. It leaves the employee's list and the dashboard figures, the record stays, and it can be restored.",
  },
];

const EMPLOYEE: Entry[] = [
  {
    term: "One list",
    detail:
      "Ordered by deadline with the outstanding work first, and a button on the single next thing to do. Finished training moves to the bottom and keeps its score.",
  },
  {
    term: "The course page",
    detail:
      "Reads like a document: the content first, held to a comfortable line length, and the quiz underneath it.",
  },
  {
    term: "One question at a time",
    detail:
      "At every width, with a step to check the answers before handing them in, and a warning before leaving the page with answers unsubmitted.",
  },
  {
    term: "Your result",
    detail:
      "Your score, whether you passed, and which questions you got wrong. An attempt that failed is not shown the correct answers.",
  },
  {
    term: "Practice",
    detail:
      "A course that has been passed stays passed. Later attempts are recorded, but they cannot undo a completion.",
  },
];

const BUILD: Entry[] = [
  {
    term: "A training record that cannot be faked",
    detail:
      "Only the server's marking can complete a course or write a score. An employee may move their own assignment from Not started to In progress and nothing else; the database refuses the rest, whoever sends it and however they send it.",
  },
  {
    term: "One company's data stays its own",
    detail:
      "Row-level security scopes every table to the signed-in person's company, in the database rather than in the pages.",
  },
  {
    term: "Light and dark",
    detail:
      "Both themes, chosen from your system setting before the first paint, with a toggle in the app.",
  },
  {
    term: "Keyboard and screen reader",
    detail:
      "Visible focus on everything, status announced in words rather than shown in colour alone, and a skip link on every public page.",
  },
];

const NOT_YET = [
  "Reminder emails before a due date",
  "Archiving a course that is no longer taught",
  "Deactivating an employee while keeping their training record",
  "Exporting reports",
];

function FeaturesPage() {
  return (
    <PublicPage>
      <section className={`${container} py-12 lg:py-16`}>
        <h1 className="max-w-[18ch] text-heading-1 font-expanded text-ink">What SkillForge does</h1>
        <p className="mt-6 max-w-[64ch] text-body text-ink-muted">
          Everything on this page is in the product today. What is not in it is at the bottom, in a
          list of its own.
        </p>
      </section>

      <Group heading="For the admin" entries={ADMIN} />
      <Group heading="For the employee" entries={EMPLOYEE} />
      <Group heading="How it is built" entries={BUILD} />

      <section className={`${container} pt-10 lg:pt-14`}>
        <div className="border-t border-steel pt-8">
          <h2 className="text-heading-2 text-ink">Not in it yet</h2>
          <p className="mt-4 max-w-[64ch] text-body text-ink-muted">
            These are planned and not built. They are here so that nobody chooses SkillForge
            expecting one of them.
          </p>
          <ul className="mt-6">
            {NOT_YET.map((item) => (
              <li
                key={item}
                className="border-b border-steel py-3 text-body text-ink last:border-b-0"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${container} pt-10 lg:pt-14`}>
        <div className="border-t border-steel pt-8">
          <h2 className="max-w-[24ch] text-heading-2 text-ink">See it rather than read it</h2>
          <p className="mt-4 max-w-[60ch] text-body text-ink-muted">
            The tour walks through five screens, built from the same components as the product.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/tour">Take the tour</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/signup">Create a company account</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}

/*
 * A description list, not a grid of cards: the term and what it means are a
 * pair, and a pair is what a <dl> is for.
 */
function Group({ heading, entries }: { heading: string; entries: Entry[] }) {
  return (
    <section className={`${container} pt-10 lg:pt-14`}>
      <div className="border-t border-steel pt-8">
        <h2 className="text-heading-2 text-ink">{heading}</h2>
        <dl className="mt-8">
          {entries.map((entry) => (
            <div
              key={entry.term}
              className="grid gap-x-6 gap-y-1 border-b border-steel py-5 last:border-b-0 sm:grid-cols-[18rem_1fr]"
            >
              <dt className="text-heading-3 text-ink">{entry.term}</dt>
              <dd className="max-w-[62ch] text-body text-ink-muted">{entry.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
