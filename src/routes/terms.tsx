import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ContactParagraph } from "@/components/public/ContactParagraph";
import { PublicPage, section } from "@/components/public/PublicPage";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () =>
    pageHead({
      title: "Terms of service — SkillForge",
      description:
        "The terms covering use of SkillForge: accounts, acceptable use, data ownership and termination. A draft, to be reviewed with legal counsel before launch.",
      path: "/terms",
    }),
  component: TermsPage,
});

/*
 * Restyled onto the design tokens in phase 4; the wording is unchanged apart
 * from British spelling and the contact line, which no longer prints an
 * address that was never real. See CONTACT_EMAIL in src/lib/seo.ts.
 */
function TermsPage() {
  return (
    <PublicPage>
      <section className={`${section} py-12 lg:py-16`}>
        <div className="max-w-[48rem]">
          <h1 className="text-heading-1 font-expanded text-ink">Terms of service</h1>
          <p className="mt-2 text-small text-ink-muted">Last updated: 9 September 2026</p>
          <p className="mt-6 rounded-md border border-steel bg-surface px-4 py-3 text-small text-ink-muted">
            These terms are a draft. They will be reviewed and finalised with legal counsel before
            launch.
          </p>

          <div className="mt-10">
            <Section title="Acceptance of terms">
              <p>
                By accessing or using SkillForge, you agree to be bound by these terms of service
                and all applicable laws and regulations. If you do not agree to these terms, you
                may not use the service.
              </p>
            </Section>

            <Section title="Description of service">
              <p>
                SkillForge is a learning and development platform that allows companies to create
                courses, assign training to employees or teams, administer quizzes, and track
                completion and progress. We may update or modify features over time.
              </p>
            </Section>

            <Section title="Account registration and company data">
              <p>
                To use SkillForge, you must register an account associated with a company. You are
                responsible for maintaining the confidentiality of your account credentials and for
                all activity that occurs under your account. You represent that you have the
                authority to bind your company to these terms.
              </p>
            </Section>

            <Section title="Acceptable use">
              <p>
                You agree not to misuse the service, including but not limited to: attempting to
                access data you are not authorised to view, interfering with other users or
                accounts, uploading harmful or illegal content, or using SkillForge for any
                unlawful purpose. We reserve the right to suspend or terminate accounts that
                violate this policy.
              </p>
            </Section>

            <Section title="Subscription and payment">
              <p>
                SkillForge may offer paid subscription plans in future. There is no billing in the
                service today, and nothing on it is charged for. If pricing is introduced, the
                terms, billing cycles and payment arrangements will be shown before any purchase,
                and this section will be finalised before any paid plan goes live.
              </p>
            </Section>

            <Section title="Data ownership">
              <p>
                You retain ownership of the content you upload to SkillForge. You grant us a
                limited licence to host, display, and process that content solely for the purpose
                of providing the service. We will not use your company content for any other
                purpose without your consent.
              </p>
            </Section>

            <Section title="Termination">
              <p>
                You may stop using SkillForge at any time. We may suspend or terminate your access
                if you violate these terms or if required by law. Upon termination, your right to
                use the service ceases immediately, and we may delete your data in accordance with
                our data retention practices.
              </p>
            </Section>

            <Section title="Limitation of liability">
              <p>
                To the maximum extent permitted by law, SkillForge and its affiliates will not be
                liable for any indirect, incidental, special, consequential, or punitive damages
                arising out of or related to your use of the service.
              </p>
            </Section>

            <Section title="Changes to these terms">
              <p>
                We may update these terms of service from time to time. We will notify you of
                material changes by email or through the service. Continued use of SkillForge after
                changes become effective constitutes acceptance of the updated terms.
              </p>
            </Section>

            <Section title="Contact us">
              <ContactParagraph
                lead="If you have any questions about these terms of service"
                subject="Terms of service"
              />
            </Section>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-steel py-8 first:border-t-0 first:pt-0">
      <h2 className="text-heading-2 text-ink">{title}</h2>
      {/* DESIGN.md: keep lines under 75 characters. */}
      <div className="mt-3 max-w-[70ch] space-y-4 text-body text-ink-muted">{children}</div>
    </section>
  );
}
