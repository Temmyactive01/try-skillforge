import { Link, createFileRoute } from "@tanstack/react-router";

import { PublicPage, section } from "@/components/public/PublicPage";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/pricing")({
  head: () =>
    pageHead({
      title: "Pricing — SkillForge",
      description:
        "SkillForge is not priced yet. It is in active development, and creating a company account today costs nothing. What that means, and what will change, in plain terms.",
      path: "/pricing",
    }),
  component: PricingPage,
});

/*
 * This page used to show three tiers at "$X/month", with features in them that
 * do not exist. A price nobody has decided is worse than no price, so the page
 * now says the true thing instead, and it is linked from the footer rather
 * than the header: there is no point inviting people to a page that cannot
 * answer the question they came with.
 */
const POINTS = [
  {
    term: "Today it costs nothing",
    detail:
      "Creating a company account, inviting your people, building courses and assigning them are all free, because there is no billing in SkillForge at all yet.",
  },
  {
    term: "There is no trial to run out",
    detail:
      "Nothing is time-limited and nothing stops working after a fortnight. There is no card to put in, so there is nothing to cancel.",
  },
  {
    term: "Nothing is held back",
    detail:
      "There is no paid tier with the useful half in it. What the feature list describes is what every account has.",
  },
  {
    term: "When there is a price, you will be told first",
    detail:
      "If SkillForge starts charging, anyone already using it will hear before it happens and will keep what they have put in either way. Your courses and your training records are your data.",
  },
];

function PricingPage() {
  return (
    <PublicPage>
      <section className={`${section} py-12 lg:py-16`}>
        <h1 className="max-w-[20ch] text-heading-1 font-expanded text-ink">
          SkillForge is not priced yet
        </h1>
        <p className="mt-6 max-w-[64ch] text-body text-ink-muted">
          It is in active development. Rather than invent three tiers and a number, here is exactly
          where that leaves anyone setting a company up today.
        </p>
      </section>

      <section className={`${section} py-12 lg:py-16`}>
        <div className="max-w-[64rem] border-t border-steel pt-8">
          <dl>
            {POINTS.map((point) => (
              <div
                key={point.term}
                className="grid gap-x-6 gap-y-1 border-b border-steel py-5 sm:grid-cols-[20rem_1fr]"
              >
                <dt className="text-heading-3 text-ink">{point.term}</dt>
                <dd className="max-w-[62ch] text-body text-ink-muted">{point.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className={`${section} py-12 lg:py-16`}>
        <div className="max-w-[64rem] border-t border-steel pt-8">
          <h2 className="max-w-[24ch] text-heading-2 text-ink">What to do with that</h2>
          <p className="mt-4 max-w-[62ch] text-body text-ink-muted">
            If you need a training tool with a contract and a support line behind it, SkillForge is
            not that today, and the feature list says plainly what is missing. If you want to put
            real training in front of a real team and see who finishes it, it will do that now.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/signup">Create a company account</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/features">See what is and is not in it</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
