import { Link, createFileRoute } from "@tanstack/react-router";
import { GraduationCap, ShieldCheck, Users, Lock, FileCheck } from "lucide-react";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — SkillForge" },
      {
        name: "description",
        content: "How SkillForge protects your company's data with multi-tenant isolation, role-based access control, and server-side quiz grading.",
      },
      { property: "og:title", content: "Security — SkillForge" },
      {
        property: "og:description",
        content: "How SkillForge protects your company's data with multi-tenant isolation, role-based access control, and server-side quiz grading.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-serif text-lg font-semibold text-foreground">
              SkillForge
            </span>
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

      {/* Content */}
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-16">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-10 w-10 text-primary" />
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Security
            </h1>
          </div>
          <p className="mt-2 text-sm font-normal text-muted-foreground">
            How SkillForge protects your company's data
          </p>

          <div className="mt-10 space-y-12">
            <SecuritySection
              icon={<Lock className="h-5 w-5" />}
              title="Multi-Tenant Data Isolation"
            >
              <p>
                SkillForge is built on a multi-tenant architecture where each company's data is fully isolated from every other company on the platform. Courses, employee records, quiz answers, progress data, and assignments are scoped to a single company identifier and protected by row-level security policies at the database level. No customer can query or access another company's information, period.
              </p>
            </SecuritySection>

            <SecuritySection
              icon={<Users className="h-5 w-5" />}
              title="Role-Based Access Control"
            >
              <p>
                Admin and Employee roles have strictly separated permissions. Admins can create courses, manage teams, invite employees, and review company-wide progress. Employees only see their own assigned courses, content, and quiz results. These boundaries are enforced at the route level and re-validated on every server request, so a user cannot reach admin functionality or view another employee's data by changing a URL.
              </p>
            </SecuritySection>

            <SecuritySection
              icon={<FileCheck className="h-5 w-5" />}
              title="Quiz Integrity"
            >
              <p>
                Correct quiz answers are never sent to the client. When an employee submits a quiz, answers are graded server-side by a privileged function that compares responses against the stored correct answers. This prevents answer keys from being inspected in browser developer tools or network traffic and ensures results cannot be manipulated by the client.
              </p>
            </SecuritySection>

            <SecuritySection
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Ongoing Security Review"
            >
              <p>
                SkillForge undergoes regular automated security scanning and hardening. We review access policies, dependency vulnerabilities, and authentication flows on an ongoing basis. Security fixes are shipped as part of our normal release process, and sensitive functionality is implemented through server-side handlers rather than client-side logic.
              </p>
            </SecuritySection>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SecuritySection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      <div className="mt-3 text-base leading-relaxed text-foreground">
        {children}
      </div>
    </section>
  );
}
