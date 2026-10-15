import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

/*
 * Every page you sign in through: one centred card, one job, one primary
 * button. DESIGN.md's employee principle applies here more than anywhere —
 * nobody arrives at a sign-in page wanting to browse.
 *
 * The mark is the same tempered billet as both shells. The old pages used a
 * graduation cap that appeared nowhere else in the app.
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ground px-4 py-12">
      <div className="w-full max-w-100">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 rounded-md text-heading-3 font-semibold text-ink"
        >
          <span aria-hidden className="inline-block size-5 shrink-0 rounded-sm bg-temper-blue" />
          SkillForge
        </Link>

        <div className="rounded-md border border-steel bg-surface p-6">
          <h1 className="text-heading-2 text-ink">{title}</h1>
          <p className="mt-1 text-small text-ink-muted">{description}</p>
          <div className="mt-6">{children}</div>
        </div>

        {footer && <div className="mt-6 text-center text-small text-ink-muted">{footer}</div>}
      </div>
    </main>
  );
}

/**
 * The one link style these pages share, as a class rather than a component:
 * the router types `to` against the real route tree, and a component taking a
 * plain string would throw that away.
 */
export const authLink = "rounded-sm font-medium text-temper-blue hover:underline";
