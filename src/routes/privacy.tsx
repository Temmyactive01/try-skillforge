import { Link, createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — SkillForge" },
      { name: "description", content: "SkillForge's privacy policy: how we collect, use, store, and protect your data." },
      { property: "og:title", content: "Privacy Policy — SkillForge" },
      { property: "og:description", content: "SkillForge's privacy policy: how we collect, use, store, and protect your data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
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

      {/* Content */}
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm font-normal text-muted-foreground">
            Last updated: September 9, 2026
          </p>

          <div className="mt-10 space-y-10">
            <PolicySection title="Information We Collect">
              <p>
                We collect information you provide directly to us, such as your name, email address, company name, and any content you upload while creating courses or managing your team. We also collect usage information about how you and your team interact with SkillForge, including log data, device information, and cookies.
              </p>
            </PolicySection>

            <PolicySection title="How We Use Your Information">
              <p>
                We use the information we collect to provide, maintain, and improve SkillForge, to communicate with you, to authenticate users, to process assignments and quiz results, and to enforce our agreements. We do not sell personal information to third parties.
              </p>
            </PolicySection>

            <PolicySection title="Data Storage & Multi-Tenancy">
              <p>
                SkillForge is built on a multi-tenant architecture. Each company's data is stored in a logically isolated environment and protected by row-level security policies, so your courses, employees, quiz answers, and progress data are never accessible to other companies on the platform. Our infrastructure providers maintain industry-standard physical and network security controls.
              </p>
            </PolicySection>

            <PolicySection title="Data Sharing">
              <p>
                We share data only with service providers who help us operate SkillForge, such as hosting and authentication services. All providers are contractually bound to use your data only for the services they provide to us. We may also disclose information if required by law or to protect our rights.
              </p>
            </PolicySection>

            <PolicySection title="Data Security">
              <p>
                We implement reasonable administrative, technical, and physical safeguards to protect your information. This includes encryption in transit, access controls, role-based permissions, and regular security reviews. No method of transmission over the internet is completely secure, and we cannot guarantee absolute security.
              </p>
            </PolicySection>

            <PolicySection title="Your Rights">
              <p>
                Depending on your location, you may have the right to access, correct, delete, or export your personal information. You may also have the right to object to or restrict certain processing. To exercise these rights, contact us using the information below.
              </p>
            </PolicySection>

            <PolicySection title="Contact Us">
              <p>
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us at privacy@skillforge.example. We will review and finalize this policy with legal counsel and update it as needed.
              </p>
            </PolicySection>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
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
