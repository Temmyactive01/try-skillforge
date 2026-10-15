import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

/*
 * DESIGN.md: "Admins scan, employees focus." Where the admin gets a sidebar and
 * a 12-column grid, the employee gets a single centred column with a top bar
 * and nothing else to decide between. There is no navigation to speak of —
 * there are only two employee screens, and one is reached from the other.
 */
export function EmployeeShell({ children, name }: { children: ReactNode; name?: string }) {
  const navigate = useNavigate();

  async function signOut() {
    // Local scope only: ending every session would kill a password reset open
    // in another tab. See the session-1 notes in docs/progress.md.
    await supabase.auth.signOut({ scope: "local" });
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-ground">
      {/*
       * Not sticky, unlike the admin's. The course page is a document to read,
       * and nothing in this bar is something you reach for while reading — so
       * on a phone a pinned bar would spend 64px of a short screen on two
       * controls you want twice a session.
       */}
      <header className="border-b border-steel bg-ground">
        <div className="mx-auto flex h-16 max-w-[45rem] items-center gap-3 px-4 md:px-0">
          <Link
            to="/employee/home"
            className="flex items-center gap-2 rounded-md text-heading-3 font-semibold text-ink"
          >
            {/* The same mark as the admin shell: a billet of steel, tempered blue. */}
            <span aria-hidden className="inline-block size-5 shrink-0 rounded-sm bg-temper-blue" />
            SkillForge
          </Link>

          <div className="ml-auto flex min-w-0 items-center gap-1">
            {name && (
              <p className="hidden min-w-0 truncate px-2 text-small text-ink-muted sm:block">
                {name}
              </p>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut aria-hidden />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* DESIGN.md: a single centred column, max 720px. */}
      <main className="mx-auto max-w-[45rem] px-4 py-8 md:px-0 md:py-12">{children}</main>

      {/* One toaster per shell: see DESIGN.md → "Toast". */}
      <Toaster />
    </div>
  );
}
