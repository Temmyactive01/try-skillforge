import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { PublicPage, section } from "@/components/public/PublicPage";
import { ContactParagraph } from "@/components/public/ContactParagraph";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () =>
    pageHead({
      title: "Privacy policy — SkillForge",
      description:
        "What SkillForge collects, how it is used, and how each company's data is kept separate. A draft, to be reviewed with legal counsel before launch.",
      path: "/privacy",
    }),
  component: PrivacyPage,
});

/*
 * Restyled onto the design tokens in phase 4; the wording is unchanged apart
 * from British spelling and the contact line. The address that used to be here
 * (privacy@skillforge.example) was never real, so the page now says that
 * contact details are coming rather than printing one that bounces. See
 * CONTACT_EMAIL in src/lib/seo.ts.
 */
function PrivacyPage() {
  return (
    <PublicPage>
      <section className={`${section} py-12 lg:py-16`}>
        <div className="max-w-[48rem]">
          <h1 className="text-heading-1 font-expanded text-ink">Privacy policy</h1>
          <p className="mt-2 text-small text-ink-muted">Last updated: 9 September 2026</p>
          <p className="mt-6 rounded-md border border-steel bg-surface px-4 py-3 text-small text-ink-muted">
            This is a draft. It will be reviewed and finalised with legal counsel before launch.
          </p>

          <div className="mt-10">
            <Section title="Information we collect">
              <p>
                We collect information you provide directly to us, such as your name, email address,
                company name, and any content you upload while creating courses or managing your
                team. We also collect usage information about how you and your team interact with
                SkillForge, including log data, device information, and cookies.
              </p>
            </Section>

            <Section title="How we use your information">
              <p>
                We use the information we collect to provide, maintain, and improve SkillForge, to
                communicate with you, to authenticate users, to process assignments and quiz
                results, and to enforce our agreements. We do not sell personal information to third
                parties.
              </p>
            </Section>

            <Section title="Data storage and multi-tenancy">
              <p>
                SkillForge is built on a multi-tenant architecture. Each company&rsquo;s data is
                stored in a logically isolated environment and protected by row-level security
                policies, so your courses, employees, quiz answers, and progress data are never
                accessible to other companies on the platform. Our infrastructure providers maintain
                industry-standard physical and network security controls.
              </p>
            </Section>

            <Section title="Data sharing">
              <p>
                We share data only with service providers who help us operate SkillForge, such as
                hosting and authentication services. All providers are contractually bound to use
                your data only for the services they provide to us. We may also disclose information
                if required by law or to protect our rights.
              </p>
            </Section>

            <Section title="Data security">
              <p>
                We implement reasonable administrative, technical, and physical safeguards to
                protect your information. This includes encryption in transit, access controls,
                role-based permissions, and regular security reviews. No method of transmission over
                the internet is completely secure, and we cannot guarantee absolute security.
              </p>
            </Section>

            <Section title="Your rights">
              <p>
                Depending on your location, you may have the right to access, correct, delete, or
                export your personal information. You may also have the right to object to or
                restrict certain processing. To exercise these rights, contact us using the details
                below.
              </p>
            </Section>

            <Section title="Contact us">
              <ContactParagraph
                lead="If you have questions or concerns about this privacy policy or our data practices"
                subject="Privacy"
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
