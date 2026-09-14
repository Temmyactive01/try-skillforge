import { Link, createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — SkillForge" },
      { name: "description", content: "SkillForge's terms of service and acceptable use policy." },
      { property: "og:title", content: "Terms of Service — SkillForge" },
      { property: "og:description", content: "SkillForge's terms of service and acceptable use policy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
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

      {/* Content */}
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm font-normal text-muted-foreground">
            Last updated: September 9, 2026
          </p>

          <div className="mt-10 space-y-10">
            <TermsSection title="Acceptance of Terms">
              <p>
                By accessing or using SkillForge, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree to these terms, you may not use the service.
              </p>
            </TermsSection>

            <TermsSection title="Description of Service">
              <p>
                SkillForge is a learning and development platform that allows companies to create courses, assign training to employees or teams, administer quizzes, and track completion and progress. We may update or modify features over time.
              </p>
            </TermsSection>

            <TermsSection title="Account Registration & Company Data">
              <p>
                To use SkillForge, you must register an account associated with a company. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You represent that you have the authority to bind your company to these terms.
              </p>
            </TermsSection>

            <TermsSection title="Acceptable Use">
              <p>
                You agree not to misuse the service, including but not limited to: attempting to access data you are not authorized to view, interfering with other users or accounts, uploading harmful or illegal content, or using SkillForge for any unlawful purpose. We reserve the right to suspend or terminate accounts that violate this policy.
              </p>
            </TermsSection>

            <TermsSection title="Subscription & Payment">
              <p>
                SkillForge may offer paid subscription plans. Pricing, billing cycles, and payment terms will be displayed before purchase and are subject to change with notice. All fees are non-refundable unless otherwise stated. This section contains placeholder language and will be finalized before any paid plans go live.
              </p>
            </TermsSection>

            <TermsSection title="Data Ownership">
              <p>
                You retain ownership of the content you upload to SkillForge. You grant us a limited license to host, display, and process that content solely for the purpose of providing the service. We will not use your company content for any other purpose without your consent.
              </p>
            </TermsSection>

            <TermsSection title="Termination">
              <p>
                You may stop using SkillForge at any time. We may suspend or terminate your access if you violate these terms or if required by law. Upon termination, your right to use the service ceases immediately, and we may delete your data in accordance with our data retention practices.
              </p>
            </TermsSection>

            <TermsSection title="Limitation of Liability">
              <p>
                To the maximum extent permitted by law, SkillForge and its affiliates will not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the service.
              </p>
            </TermsSection>

            <TermsSection title="Changes to Terms">
              <p>
                We may update these Terms of Service from time to time. We will notify you of material changes by email or through the service. Continued use of SkillForge after changes become effective constitutes acceptance of the updated terms.
              </p>
            </TermsSection>

            <TermsSection title="Contact Us">
              <p>
                If you have any questions about these Terms of Service, please contact us at legal@skillforge.example. These terms are draft placeholders and will be reviewed and finalized with legal counsel.
              </p>
            </TermsSection>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function TermsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-3 text-base leading-relaxed text-foreground">
        {children}
      </div>
    </section>
  );
}
