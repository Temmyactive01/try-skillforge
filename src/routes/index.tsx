import { Link, createFileRoute } from "@tanstack/react-router";
import { BarChart3, BookOpen, CheckCircle2, ClipboardList, GraduationCap, ShieldCheck, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SkillForge — B2B Learning & Development Platform" },
      { name: "description", content: "Assign training, track completion, and see who's done what — all in one place." },
      { property: "og:title", content: "SkillForge — B2B Learning & Development Platform" },
      { property: "og:description", content: "Assign training, track completion, and see who's done what — all in one place." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">SkillForge</span>
          </div>
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
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Training your team can actually finish
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Assign courses, track completion, and see who’s done what — all in one place. No more scattered spreadsheets or chasing people down.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get started free
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold text-foreground">How it works</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          <StepCard
            icon={<ClipboardList className="h-8 w-8 text-primary" />}
            title="Assign courses"
            description="Admins create courses with content and quizzes, then assign them to individuals or entire teams with a due date."
          />
          <StepCard
            icon={<BookOpen className="h-8 w-8 text-primary" />}
            title="Employees complete training"
            description="Team members review course content, take built-in quizzes, and mark training as complete — all in one flow."
          />
          <StepCard
            icon={<BarChart3 className="h-8 w-8 text-primary" />}
            title="Track in real time"
            description="See completion rates, overdue assignments, and quiz scores on a live dashboard — no manual follow-up needed."
          />
        </div>
      </section>

      {/* Why SkillForge */}
      <section className="bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-semibold text-foreground">Why SkillForge?</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <BenefitCard
              icon={<Users className="h-7 w-7 text-primary" />}
              title="Centralized training"
              description="Everything lives in one platform. No more lost documents, broken video links, or separate tools."
            />
            <BenefitCard
              icon={<CheckCircle2 className="h-7 w-7 text-primary" />}
              title="Automatic progress tracking"
              description="Completion status updates the moment an employee finishes a course. Admins see it instantly."
            />
            <BenefitCard
              icon={<ShieldCheck className="h-7 w-7 text-primary" />}
              title="Quiz-based verification"
              description="Built-in multiple-choice quizzes ensure employees actually understood the material, not just clicked through."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-background px-4 py-6">
        <div className="mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} SkillForge. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
