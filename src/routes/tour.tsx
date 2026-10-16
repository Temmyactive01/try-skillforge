import { Link, createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { PublicPage, section } from "@/components/public/PublicPage";
import {
  AssignmentsView,
  CoursesView,
  DashboardView,
  QuizView,
  TrainingView,
} from "@/components/public/ProductView";
import { Button } from "@/components/ui/button";
import { PASS_MARK } from "@/lib/scores";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/tour")({
  head: () =>
    pageHead({
      title: "Take the tour — SkillForge",
      description:
        "A walk through SkillForge: the admin dashboard, courses, the assignments table, what an employee sees, and the quiz. Built from the real screens with example data.",
      path: "/tour",
    }),
  component: TourPage,
});

/*
 * The tour a visitor gets instead of a public demo login.
 *
 * It is built from the same components the app is built from, with example
 * data, so there is no second account to sign in to, no shared password, no
 * company whose data has to be kept away from real ones, and nothing to reset
 * overnight. The cost is that it cannot be clicked through; the benefit is
 * that it adds no attack surface at all, and that it cannot fall out of date
 * the way a folder of screenshots does.
 */
function TourPage() {
  return (
    <PublicPage>
      <section className={`${section} py-12 lg:py-16`}>
        <h1 className="max-w-[20ch] text-heading-1 font-expanded text-ink">A tour of SkillForge</h1>
        <p className="mt-6 max-w-[64ch] text-body text-ink-muted">
          Five screens, in the order you would meet them. Each one is built from the same
          components as the screen it shows, with example data for a company that does not exist —
          so what you are looking at is the real thing with invented names in it, not a mock-up.
        </p>
        <p className="mt-4 max-w-[64ch] text-body text-ink-muted">
          Nothing on this page is clickable. There is no demo account to sign in to, by design:{" "}
          <Link to="/security" className="rounded-sm font-medium text-temper-blue hover:underline">
            a shared login is a surface we would rather not have
          </Link>
          .
        </p>
      </section>

      <Stop
        heading="1. The dashboard"
        body="Where an admin lands. Overall completion is the one place the whole company's progress is a single number, and it sits on the temper scale like every other completion figure. Overdue says how late the oldest thing is, in words."
      >
        <DashboardView />
      </Stop>

      <Stop
        heading="2. Courses"
        body="What has been built, and how far each course has got. A course holds its content — text you write, or a link to a video or a PDF — and the multiple-choice questions that go with it."
      >
        <CoursesView />
      </Stop>

      <Stop
        heading="3. Assignments"
        body="Every assignment in the company: who it is for, which course, where it has got to, the best quiz score so far, and when it is due. Sortable by any of those. Anything late is called out in words as well as colour."
      >
        <AssignmentsView />
      </Stop>

      <Stop
        heading="4. What the employee sees"
        body="One list, ordered by deadline, with a button on the single thing to do next. No dashboard, no navigation to learn. Finished work moves to the bottom and keeps its score."
      >
        <TrainingView />
      </Stop>

      <Stop
        heading="5. The quiz"
        body={`One question at a time, with a step to check the answers before handing them in. The server marks it: the correct answers are not in the page while the quiz is open. ${PASS_MARK}% passes, and a pass sticks — later attempts are practice.`}
      >
        <QuizView />
      </Stop>

      <section className={`${section} py-12 lg:py-16`}>
        <div className="max-w-[64rem] border-t border-steel pt-8">
          <h2 className="max-w-[24ch] text-heading-2 text-ink">That is the whole product</h2>
          <p className="mt-4 max-w-[60ch] text-body text-ink-muted">
            There is no sixth screen holding the interesting part back. If it looks like it would
            do the job, the next step is a company account of your own.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/signup">Create a company account</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/features">See the full feature list</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}

/** One stop on the tour: words on the left, the screen underneath them. */
function Stop({
  heading,
  body,
  children,
}: {
  heading: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className={`${section} border-t border-steel py-12 lg:py-16`}>
      <div className="max-w-[80rem]">
        <h2 className="max-w-[24ch] text-heading-2 text-ink">{heading}</h2>
        <p className="mt-4 max-w-[68ch] text-body text-ink-muted">{body}</p>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
