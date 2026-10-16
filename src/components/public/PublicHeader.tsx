import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useViewer } from "@/lib/use-viewer";
import { SkillForgeWordmark } from "./SkillForgeMark";

/*
 * One header for every public page. Until this phase the same forty lines of
 * markup were copied into five routes, and the nav was `hidden sm:flex` — so
 * on a phone Features, the tour and About could only be reached by typing the
 * address.
 *
 * DESIGN.md asks marketing for left-aligned and asymmetric, so the mark and
 * the nav sit together on the left and the actions go right. Below `sm` the
 * bar wraps into two rows rather than hiding anything, and it wraps with
 * `order` rather than a second copy of the links: one nav in the document
 * means one "Main navigation" for a screen reader and one target for a test.
 *
 * Pricing is deliberately not here. There are no prices yet, so the page lives
 * in the footer rather than inviting people to one that cannot answer them.
 */
const NAV = [
  { to: "/features", label: "Features" },
  { to: "/tour", label: "Take the tour" },
  { to: "/about", label: "About" },
] as const;

const navLink = "rounded-sm text-small font-medium text-ink-muted hover:text-ink hover:underline";

export function PublicHeader() {
  const viewer = useViewer();

  return (
    <header className="border-b border-steel bg-ground">
      <div className="mx-auto flex w-full max-w-[72rem] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:h-16 sm:flex-nowrap sm:px-6 sm:py-0">
        <SkillForgeWordmark className="order-1" />

        <nav
          aria-label="Main"
          className="order-3 flex w-full items-center gap-5 sm:order-2 sm:w-auto"
        >
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className={navLink}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="order-2 ml-auto flex items-center gap-2 sm:order-3">
          {viewer ? (
            /*
             * Somebody already signed in has no use for "Sign in", and less
             * for starting a second company. One link, to the half of the app
             * that is theirs.
             */
            <Button asChild size="sm">
              <Link to={viewer === "admin" ? "/admin/dashboard" : "/employee/home"}>
                {viewer === "admin" ? "Go to your dashboard" : "Go to your training"}
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
              {/*
               * One primary button per screen. On a phone the hero's is the one
               * that matters, so this one is desktop only.
               */}
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/signup">Create a company account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
