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
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/employee/home" className="text-lg font-semibold text-slate-900">
            SkillForge
          </Link>
          <div className="flex items-center gap-3">
            {name && <span className="text-sm text-slate-600">{name}</span>}
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/login" });
              }}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
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
