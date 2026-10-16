import { Link, createFileRoute } from "@tanstack/react-router";

import { PublicPage, section } from "@/components/public/PublicPage";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () =>
    pageHead({
      title: "About — SkillForge",
      description:
        "SkillForge is designed and built by Temitope Ilesanmi-Ojo, a product designer moving into product management. It is in active development.",
      path: "/about",
    }),
  component: AboutPage,
});

/*
 * What this page used to say, and no longer does: that "we" started SkillForge
 * after watching companies buy software nobody used, and that there are teams
 * already using it. One person built it, and there is no public user base to
 * point at. DESIGN.md's honesty rule applies to the marketing site as much as
 * to the product, so the invented story and the invented traction are gone
 * rather than reworded.
 */
const BELIEFS = [
  {
    title: "Assigning should take a minute",
    body: "Pick the people, pick the date, send it. If setting up a piece of training is an afternoon's work, it will not happen often enough to matter.",
  },
  {
    title: "Progress should be visible before the deadline",
    body: "A completion report that arrives after the date has passed tells you what you failed to do. The point of the table is that you can still act on it.",
  },
  {
    title: "Completing training should mean something",
    body: "A tick box records that somebody clicked. A quiz that only the server can mark records that they knew the material on the day.",
  },
];

/** Opens in a new tab, so a reader does not lose the page they were on. */
const external = "rounded-sm font-medium text-temper-blue hover:underline";

function AboutPage() {
  return (
    <PublicPage>
      <section className={`${section} py-12 lg:py-16`}>
        <h1 className="max-w-[18ch] text-heading-1 font-expanded text-ink">About SkillForge</h1>

        <p className="mt-6 max-w-[64ch] text-body text-ink">
          SkillForge is designed and built by Temitope Ilesanmi-Ojo, a product designer moving into
          product management.
        </p>

        <p className="mt-4 max-w-[64ch] text-body text-ink-muted">
          SkillForge is in active development.
        </p>

        <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          <a
            href="https://ilesanmi-ojo-temitope-portfolio.netlify.app"
            target="_blank"
            rel="noopener"
            className={external}
          >
            Portfolio
          </a>
          <a
            href="https://www.linkedin.com/in/temitope-ilesanmi-ojo/"
            target="_blank"
            rel="noopener"
            className={external}
          >
            LinkedIn
          </a>
        </p>
      </section>

      <section className={`${section} py-12 lg:py-16`}>
        <div className="max-w-[64rem] border-t border-steel pt-8">
          <h2 className="max-w-[24ch] text-heading-2 text-ink">Why it exists</h2>
          <p className="mt-4 max-w-[68ch] text-body text-ink-muted">
            Assigning training is the easy half. Finding out who actually did it is where it comes
            apart, and it usually ends in a spreadsheet, a chase, and a number nobody trusts.
          </p>
          <p className="mt-4 max-w-[68ch] text-body text-ink-muted">
            SkillForge is the smallest thing that answers that question properly: give the work a
            deadline, make a quiz the proof it was done, and put the answer on one page that is
            true the moment you look at it.
          </p>
        </div>
      </section>

      <section className={`${section} py-12 lg:py-16`}>
        <div className="max-w-[64rem] border-t border-steel pt-8">
          <h2 className="text-heading-2 text-ink">What it is built around</h2>
          <ul className="mt-8">
            {BELIEFS.map((belief) => (
              <li
                key={belief.title}
                className="grid gap-x-6 gap-y-1 border-b border-steel py-5 sm:grid-cols-[22rem_1fr]"
              >
                <h3 className="text-heading-3 text-ink">{belief.title}</h3>
                <p className="max-w-[62ch] text-body text-ink-muted">{belief.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${section} py-12 lg:py-16`}>
        <div className="max-w-[64rem] border-t border-steel pt-8">
          <h2 className="max-w-[24ch] text-heading-2 text-ink">Have a look at it</h2>
          <p className="mt-4 max-w-[60ch] text-body text-ink-muted">
            The tour is five screens from the product itself. If it suits how your company works,
            the next step is an account.
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
