import { Link } from "@tanstack/react-router";

import { ThemeToggle } from "@/components/ThemeToggle";
import { container } from "./PublicPage";
import { SkillForgeMark } from "./SkillForgeMark";

/*
 * Three short columns over a hairline, left-aligned like everything else on
 * the public site. Pricing lives here rather than in the header: there are no
 * prices yet, and the page says so.
 *
 * The theme toggle sits here and not in the header, for the reason phase 3
 * kept it off the sign-in pages: the header has one job, and the head script
 * has already honoured the reader's system setting before the first paint.
 */
const COLUMNS = [
  {
    heading: "Product",
    links: [
      { to: "/features", label: "Features" },
      { to: "/tour", label: "Take the tour" },
      { to: "/pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/security", label: "Security" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { to: "/privacy", label: "Privacy policy" },
      { to: "/terms", label: "Terms of service" },
    ],
  },
] as const;

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-steel bg-ground">
      <div className={`${container} py-12`}>
        <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:gap-16">
          <div>
            <p className="flex items-center gap-2 text-heading-3 font-semibold text-ink">
              <SkillForgeMark />
              SkillForge
            </p>
            <p className="mt-2 max-w-[38ch] text-small text-ink-muted">
              Assign training with a quiz, set a due date, and see who has finished it.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <div key={column.heading}>
                <h2 className="text-small font-semibold text-ink">{column.heading}</h2>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="rounded-sm text-small text-ink-muted hover:text-ink hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-steel pt-6">
          <p className="text-small text-ink-muted">&copy; {year} SkillForge</p>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
