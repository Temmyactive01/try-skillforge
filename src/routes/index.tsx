import { Link, createFileRoute } from "@tanstack/react-router";

import { PublicPage, section } from "@/components/public/PublicPage";
import { AssignmentsView, TrainingView } from "@/components/public/ProductView";
import { Button } from "@/components/ui/button";
import { PASS_MARK } from "@/lib/scores";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      title: "SkillForge — assign training and see who has finished it",
      description:
        "SkillForge is training software for one company at a time: build a course with a quiz, assign it to a person or a team with a due date, and see who has finished.",
      path: "",
    }),
  component: HomePage,
});

/*
 * DESIGN.md's marketing rules: left-aligned and asymmetric, and the hero shows
 * a real admin table with temper progress bars rather than an illustration.
 * The frame is the one place on the site that uses radius-lg, which DESIGN.md
 * reserves for dialogs and the marketing hero.
 *
 * Nothing here claims a customer, a count or a rating. Where a section would
 * have needed social proof we do not have, there is no section.
 */
function HomePage() {
  return (
    <PublicPage>
      <Hero />
      <Steps />
      <EmployeeSide />
      <Isolation />
      <Closing />
    </PublicPage>
  );
}

function Hero() {
  return (
    <section className="overflow-hidden border-b border-steel py-12 lg:py-16">
      <div className="mx-auto w-full max-w-[80rem] px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h1 className="text-heading-1 font-expanded text-ink lg:text-display">
              Assign training and see who has finished it.
            </h1>

            <p className="mt-6 max-w-[46ch] text-body text-ink-muted">
              An admin writes a course, adds a multiple-choice quiz, and assigns it to one person or
              a whole team with a due date. Employees see what is outstanding, read it and take the
              quiz. The assignments table shows where everybody is.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link to="/signup">Create a company account</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/tour">Take the tour</Link>
              </Button>
            </div>

            <p className="mt-6 max-w-[52ch] text-small text-ink-muted">
              Employees do not sign up. Your admin invites them by email, and that invite is where
              they set their password. Already have an account?{" "}
              <Link to="/login" className="rounded-sm font-medium text-temper-blue hover:underline">
                Sign in
              </Link>
              .
            </p>
          </div>

          {/*
           * The frame runs wider than the text column and past the gutter the
           * rest of the page keeps to, which is where the asymmetry comes
           * from. The section clips it, so nothing scrolls sideways.
           */}
          <div className="lg:col-span-7 lg:-mr-10 xl:-mr-20">
            <AssignmentsView />
          </div>
        </div>
      </div>
    </section>
  );
}

/*
 * A real sequence, so it is numbered. The numbers are information here, not
 * decoration: they say these four things happen in this order.
 */
const STEPS = [
  {
    title: "Build the course",
    body: "Write the content in the editor, or point at a video or a PDF. Add multiple-choice questions and mark which option is the right one.",
  },
  {
    title: "Invite your people",
    body: "Employees never sign up themselves. You invite them by email from the Employees page, and that invite is where they set their password. Group them into teams if you want to assign by team later.",
  },
  {
    title: "Assign it",
    body: "Choose one person, several, or a whole team, and set a due date if there is one. A team assignment goes to everyone who is in that team when you assign it.",
  },
  {
    title: "See where everyone is",
    body: "Every assignment carries a status, the best quiz score and the due date. Anything late says how late it is in words, not in colour alone.",
  },
];

function Steps() {
  return (
    <section className={`${section} py-12 lg:py-16`}>
      <h2 className="max-w-[20ch] text-heading-2 text-ink">From a course to a completion</h2>

      <ol className="mt-8 max-w-[64rem] border-t border-steel">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="grid gap-x-6 gap-y-2 border-b border-steel py-6 sm:grid-cols-[3rem_14rem_1fr]"
          >
            <span aria-hidden className="text-heading-3 tabular-nums text-ink-muted">
              {index + 1}
            </span>
            <h3 className="text-heading-3 text-ink">{step.title}</h3>
            <p className="max-w-[62ch] text-body text-ink-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The mirror of the hero: product on the left this time, words on the right. */
function EmployeeSide() {
  return (
    <section className={`${section} py-12 lg:py-16`}>
      <div className="grid items-center gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <TrainingView />
        </div>

        <div className="lg:col-span-5">
          <h2 className="max-w-[22ch] text-heading-2 text-ink">
            Nothing for your team to learn first
          </h2>
          <p className="mt-4 max-w-[52ch] text-body text-ink-muted">
            There is no employee dashboard to get used to. One list, ordered by deadline, with a
            button on the single thing to do next. The course reads like a document, and the quiz
            asks one question at a time with a chance to check the answers before handing them in.
          </p>
          <p className="mt-4 max-w-[52ch] text-body text-ink-muted">
            Passing the quiz is the only thing that completes a course, so nobody ticks their own
            box. The pass mark is {PASS_MARK}%, and a course that has been passed stays passed —
            later attempts are practice and are recorded as such.
          </p>
        </div>
      </div>
    </section>
  );
}

function Isolation() {
  return (
    <section className={`${section} py-12 lg:py-16`}>
      <div className="max-w-[64rem] border-t border-steel pt-8">
        <h2 className="max-w-[24ch] text-heading-2 text-ink">
          One company&rsquo;s data cannot reach another&rsquo;s
        </h2>
        <p className="mt-4 max-w-[68ch] text-body text-ink-muted">
          Isolation is enforced in the database with row-level security, not in the pages. Every
          query a signed-in person makes is scoped to their own company before it returns anything,
          so a changed address or a hand-written request gets nothing extra.
        </p>
        <p className="mt-4 max-w-[68ch] text-body text-ink-muted">
          Correct quiz answers are not sent to the browser while a quiz is open. The server marks
          every attempt and sends back only what that attempt has earned.
        </p>
        <p className="mt-6">
          <Link
            to="/security"
            className="rounded-sm text-body font-medium text-temper-blue hover:underline"
          >
            How SkillForge is secured
          </Link>
        </p>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className={`${section} py-12 lg:py-16`}>
      <div className="max-w-[64rem] border-t border-steel pt-8">
        <h2 className="max-w-[20ch] text-heading-2 text-ink">Set your company up</h2>
        <p className="mt-4 max-w-[60ch] text-body text-ink-muted">
          You will name the company, create the admin account, and land on an empty dashboard with
          three things to do. Inviting people is the second of them.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link to="/signup">Create a company account</Link>
          </Button>
        </div>
        <p className="mt-4 max-w-[60ch] text-small text-ink-muted">
          This page is for the person setting SkillForge up. Everyone else joins from an invite.
        </p>
      </div>
    </section>
  );
}
