import { Link, createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { Footer } from "@/components/Footer";
import { StampCheck } from "@/components/StampCheck";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — SkillForge" },
      { name: "description", content: "Simple, transparent pricing for SkillForge. Choose the plan that fits your team." },
      { property: "og:title", content: "Pricing — SkillForge" },
      { property: "og:description", content: "Simple, transparent pricing for SkillForge. Choose the plan that fits your team." },
    ],
  }),
  component: PricingPage,
});

const tiers = [
  {
    name: "Starter",
    description: "For small teams getting started",
    price: "$X/month",
    cta: "Get started free",
    ctaVariant: "primary" as const,
    features: [
      "Create unlimited text, video, and PDF courses",
      "Build multiple-choice quizzes for each course",
      "Assign courses to up to 10 employees",
      "Track completions and overdue assignments",
      "Email due-date reminders for learners",
    ],
  },
  {
    name: "Team",
    description: "For growing companies",
    price: "$X/month",
    popular: true,
    cta: "Get started free",
    ctaVariant: "primary" as const,
    features: [
      "Everything in Starter, plus:",
      "Unlimited employee accounts and assignments",
      "Team-based assignments and org-wide reporting",
      "Admin dashboard with progress and quiz scores",
      "Role-based access for admins and employees",
    ],
  },
  {
    name: "Enterprise",
    description: "For larger organizations",
    price: "Custom",
    cta: "Contact us",
    ctaVariant: "outline" as const,
    features: [
      "Everything in Team, plus:",
      "Custom onboarding and employee migration",
      "Advanced security review and audit support",
      "Priority support and dedicated success checks",
      "SSO and custom integration options available",
    ],
  },
];

function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-serif text-lg font-semibold text-foreground">SkillForge</span>
          </Link>
          <nav className="hidden items-center gap-6 sm:flex">
            <Link
              to="/features"
              className="text-sm font-medium text-foreground hover:text-muted-foreground"
            >
              Features
            </Link>
            <Link
              to="/pricing"
              className="text-sm font-medium text-foreground hover:text-muted-foreground"
            >
              Pricing
            </Link>
            <Link
              to="/about"
              className="text-sm font-medium text-foreground hover:text-muted-foreground"
            >
              About
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Choose the plan that fits your team
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm ${
                tier.popular ? "border-primary" : "border-border"
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  Most Popular
                </span>
              )}
              <div className="mb-6">
                <h2 className="font-serif text-2xl font-semibold text-foreground">
                  {tier.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
                <p className="mt-4 font-serif text-3xl font-semibold text-foreground">
                  {tier.price}
                </p>
              </div>

              <ul className="mb-8 flex flex-1 flex-col gap-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-foreground">
                    <StampCheck variant="primary" className="mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={tier.name === "Enterprise" ? "/about" : "/signup"}
                className={`inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                  tier.ctaVariant === "primary"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-input bg-background text-foreground hover:bg-accent"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
