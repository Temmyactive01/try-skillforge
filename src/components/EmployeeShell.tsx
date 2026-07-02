import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export function EmployeeShell({
  children,
  name,
}: {
  children: ReactNode;
  name?: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/employee/home" className="font-display text-lg font-semibold text-foreground">
            SkillForge
          </Link>
          <div className="flex items-center gap-3">
            {name && <span className="text-sm text-muted-foreground">{name}</span>}
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/login" });
              }}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
