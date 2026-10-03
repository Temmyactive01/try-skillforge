import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/courses", label: "Courses" },
  { to: "/admin/assignments", label: "Assignments" },
  { to: "/admin/employees", label: "Employees" },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-background font-sans">
      <aside className="flex w-56 flex-col bg-foreground p-4 text-background">
        <div className="mb-6 px-2 font-serif text-lg font-semibold text-background">
          SkillForge
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-background/75 hover:bg-background/10 hover:text-background"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={async () => {
            await supabase.auth.signOut({ scope: "local" });
            navigate({ to: "/login" });
          }}
          className="mt-4 rounded-md border border-background/25 px-3 py-1.5 text-sm text-background/85 hover:bg-background/10 hover:text-background"
        >
          Sign out
        </button>
      </aside>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
