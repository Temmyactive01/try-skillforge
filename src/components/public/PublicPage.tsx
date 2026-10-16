import type { ReactNode } from "react";

import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";

/*
 * The frame every public page sits in: a skip link, the header, one <main>,
 * the footer.
 *
 * The skip link is the first focusable thing in the document and is hidden
 * until it has focus — so a keyboard reader's first Tab offers a way past the
 * navigation, and nobody else ever sees it. It moves focus to <main>, which
 * carries tabIndex={-1} so it can receive focus without joining the tab order.
 */
export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <a
        href="#main"
        className="sr-only rounded-md bg-temper-blue px-4 py-2 text-small font-medium text-on-temper-blue focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>

      <PublicHeader />

      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>

      <PublicFooter />
    </div>
  );
}

/**
 * The page gutter, shared by every section so blocks line up down the page.
 * DESIGN.md's marketing rule is left-aligned and asymmetric, so this centres
 * the column and nothing inside it.
 */
export const section = "mx-auto w-full max-w-[72rem] px-4 sm:px-6";
