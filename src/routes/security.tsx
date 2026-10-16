import { Link, createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { PublicPage, container } from "@/components/public/PublicPage";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/security")({
  head: () =>
    pageHead({
      title: "Security — SkillForge",
      description:
        "How SkillForge keeps one company's data away from another's: row-level security in the database, server-side quiz marking, and a training record the client cannot write.",
      path: "/security",
    }),
  component: SecurityPage,
});

/*
 * The claims here are deliberately narrow. The page this replaced said
 * SkillForge "undergoes regular automated security scanning and hardening",
 * which is the kind of sentence that sounds like a certification and is not
 * one. What is true is specific and checkable, so that is what it says.
 */
function SecurityPage() {
  return (
    <PublicPage>
      <section className={`${container} py-12 lg:py-16`}>
        <h1 className="max-w-[24ch] text-heading-1 font-expanded text-ink">
          How SkillForge is secured
        </h1>
        <p className="mt-6 max-w-[64ch] text-body text-ink-muted">
          SkillForge holds a company&rsquo;s training records and its quiz answers. Both of those
          are worth protecting from the company next door and from the employees sitting the
          quizzes. Here is how each is done, in enough detail to check.
        </p>
      </section>

      <Item heading="One company cannot read another">
        <p>
          Every table in the database has row-level security switched on, and every policy scopes
          the rows to the company of whoever is asking. That check is in the database, not in the
          pages: the browser talks to the database directly, so a rule that only lived in the app
          could be stepped around by writing the request by hand. Changing an address or an
          identifier in a request returns nothing extra, because those rows were never in scope.
        </p>
        <p>
          Where a record links two things — an assignment links a person to a course — the policy
          checks both ends belong to the same company. An admin cannot assign a course they cannot
          see, and the marking refuses one too.
        </p>
      </Item>

      <Item heading="Admins and employees are separated in the database">
        <p>
          An admin can build courses, manage teams, invite people and see the whole company&rsquo;s
          progress. An employee can see their own assignments, their own results and the courses
          they have been given. Those are different sets of policies, not different screens: an
          employee who reaches an admin address is not shown an admin page without data, they are
          refused the data wherever they ask from.
        </p>
        <p>
          What a person may change about themselves is narrower still. A user may edit only their
          own name; an admin may change only a colleague&rsquo;s team, and only inside their own
          company. Both rules are written as lists of what is allowed rather than what is forbidden,
          so a column added later is protected the day it arrives.
        </p>
      </Item>

      <Item heading="Quizzes are marked by the server">
        <p>
          The correct answers are not readable by a signed-in user at all: the column is not granted
          to them, so a page cannot fetch it even by asking for every column. A quiz in progress
          does not contain its own answer sheet.
        </p>
        <p>
          When an attempt is submitted, the server marks it and writes the result. An attempt that
          passed is shown the correct answers afterwards; an attempt that failed is told which
          questions were wrong but not what the right answer was, so failing on purpose is not a way
          to read the answers.
        </p>
      </Item>

      <Item heading="A completion can only be earned">
        <p>
          Employees cannot write their own quiz results, and cannot mark their own training
          complete. The one status change an employee may make is moving their own assignment from
          Not started to In progress. Everything else is refused by the database whoever sends it,
          so a completion on the record is one the marking produced.
        </p>
      </Item>

      <Item heading="The rules are re-proved, not assumed">
        <p>
          Two checks run against the real database rather than against a description of it. One
          walks the security rules directly — attempting the reads and writes that should fail, and
          failing the run if any of them succeed. The other drives the app in a browser through
          signing up, inviting, assigning, sitting a quiz and the company-isolation cases.
        </p>
        <p>
          Both have found real holes, which is the reason for mentioning them: an admin who could
          reach another company&rsquo;s quiz answers through an assignment, a user who could move
          themselves into another company&rsquo;s team, and a marker that handed the answer sheet to
          a failed attempt. Each was closed and then covered by a check that would catch it coming
          back.
        </p>
      </Item>

      <Item heading="What this is not">
        <p>
          SkillForge has not been through an external penetration test or a compliance audit, and it
          holds no certification. It is in active development and is written by one person. If your
          procurement needs any of those, it is not there yet — saying so is cheaper for both of us
          than finding out later.
        </p>
        <p>
          If you find something wrong, the{" "}
          <Link to="/about" className="rounded-sm font-medium text-temper-blue hover:underline">
            About page
          </Link>{" "}
          has the ways to get in touch.
        </p>
      </Item>
    </PublicPage>
  );
}

function Item({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className={`${container} pt-10 lg:pt-12`}>
      {/* Heading left, answer right. DESIGN.md: lines under 75 characters. */}
      <div className="grid gap-x-10 gap-y-4 border-t border-steel pt-8 lg:grid-cols-12">
        <h2 className="text-heading-2 text-ink lg:col-span-5">{heading}</h2>
        <div className="space-y-4 text-body text-ink-muted lg:col-span-7">{children}</div>
      </div>
    </section>
  );
}
