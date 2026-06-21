import { createFileRoute } from "@tanstack/react-router";
import { useRequireRole } from "@/lib/use-require-role";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard — SkillForge" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { checking, name } = useRequireRole("admin");
  if (checking) return null;

  return (
    <AdminShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="text-sm text-slate-600">Welcome, {name}.</p>
      </div>
    </AdminShell>
  );
}
