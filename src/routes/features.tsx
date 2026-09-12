import { Link, createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { Footer } from "@/components/Footer";
import { StampCheck } from "@/components/StampCheck";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — SkillForge" },
      { name: "description", content: "Explore SkillForge features: course creation, quizzes, assignments, tracking, and secure team learning." },
      { property: "og:title", content: "Features — SkillForge" },
      { property: "og:description", content: "Explore SkillForge features: course creation, quizzes, assignments, tracking, and secure team learning." },
    ],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
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
            Everything your team needs to keep learning
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            SkillForge is a complete learning and development platform that helps you build courses, verify knowledge, and track progress — all in one place.
          </p>
        </div>
      </section>

      {/* Feature sections */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col gap-4 lg:gap-6">
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            <FeatureCard
              title="Course Creation"
              description="Build rich courses with text lessons, embedded video, and downloadable PDFs. Organize content into a clear flow so employees know exactly what to do next."
            />
            <FeatureCard
              title="Quiz & Grading"
              description="Add multiple-choice quizzes to any course and let SkillForge grade them automatically. Correct answers stay protected so employees can't game the system."
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
            <FeatureCard
              title="Assignment & Tracking"
              description="Assign training to individuals or whole teams, set due dates, and watch completion roll in. Employees get reminders before deadlines so nothing slips through."
            />
            <FeatureCard
              title="Admin Dashboard"
              description="Get real-time visibility into team progress, overdue assignments, and quiz scores — no spreadsheets, no manual follow-up, no guesswork."
            />
            <FeatureCard
              title="Security"
              description="Role-based access keeps admin tools separate from the employee experience. Quiz answers and sensitive data are locked down by default."
            />
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mt-auto bg-card px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Ready to upgrade your team's training?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Get started free and see how easy it is to build, assign, and track learning in one place.
          </p>
          <div className="mt-8">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get started free
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <StampCheck className="bg-primary text-primary-foreground" />
        <h3 className="font-serif text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
