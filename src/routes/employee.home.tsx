import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole } from "@/lib/use-require-role";

export const Route = createFileRoute("/employee/home")({
  head: () => ({ meta: [{ title: "Home — SkillForge" }] }),
  component: EmployeeHome,
});

function EmployeeHome() {
  const navigate = useNavigate();
  const { checking, name } = useRequireRole("employee");

  if (checking) return null;

  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">My Learning</h1>
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
        <p className="text-sm text-slate-600">Welcome, {name}.</p>
      </div>
    </main>
  );
}
