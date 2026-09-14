import { Link, createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — SkillForge" },
      { name: "description", content: "Learn why SkillForge was built and the team behind the modern learning and development platform." },
      { property: "og:title", content: "About — SkillForge" },
      { property: "og:description", content: "Learn why SkillForge was built and the team behind the modern learning and development platform." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
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
            About SkillForge
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            We're building the learning platform we wish existed — one that companies actually use and employees actually finish.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Our story
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            We started SkillForge after watching too many companies buy powerful L&D software that employees never used. The tools were clunky, progress tracking lived in scattered spreadsheets, and completion rates stayed stubbornly low. We set out to build something different: a platform that makes assigning, completing, and tracking training feel effortless for everyone involved.
          </p>
        </div>
      </section>

      {/* What We Believe */}
      <section className="bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            What we believe
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <PrincipleCard
              title="Simple to assign"
              description="Admins should be able to create a course, pick a team, and set a due date in minutes — not days."
            />
            <PrincipleCard
              title="Easy to track"
              description="Progress should be visible in real time, so managers can follow up before things slip."
            />
            <PrincipleCard
              title="Built to finish"
              description="Training only works if employees complete it. Every design choice pushes toward the finish line."
            />
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Meet the founder
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base text-muted-foreground">
          SkillForge is built by a solo founder focused on making workplace learning actually work.
        </p>
        <div className="mt-10 flex justify-center">
          <div className="max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-2xl font-semibold text-foreground">
              IT
            </div>
            <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">Ilesanmi-Ojo Temitope</h3>
            <p className="text-sm font-medium" style={{ color: "#E8634A" }}>Founder</p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "#8A8578" }}>Building SkillForge to make workplace training something teams actually finish.</p>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mt-auto bg-card px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Want to see what we're building?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Join the teams already using SkillForge to turn training from a chore into a competitive advantage.
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

function PrincipleCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <span className="font-serif text-xl font-semibold text-primary">
          {title.charAt(0)}
        </span>
      </div>
      <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function TeamMember({ name, role, bio }: { name: string; role: string; bio: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-2xl font-semibold text-foreground">
        {name.split(" ").map((n) => n[0]).join("")}
      </div>
      <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">{name}</h3>
      <p className="text-sm font-medium text-primary">{role}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{bio}</p>
    </div>
  );
}
