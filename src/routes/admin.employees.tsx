import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole } from "@/lib/use-require-role";
import { AdminShell } from "@/components/AdminShell";
import { createEmployee, listPendingEmployeeIds } from "@/lib/employees.functions";

export const Route = createFileRoute("/admin/employees")({
  head: () => ({ meta: [{ title: "Employees — SkillForge" }] }),
  component: AdminEmployeesPage,
});

type Team = { id: string; name: string };
type Employee = {
  id: string;
  name: string;
  email: string;
  team_id: string | null;
  team_name: string | null;
  pending: boolean;
};

const inputCls =
  "w-full rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelCls = "mb-1 block text-sm font-medium text-foreground/80";

function AdminEmployeesPage() {
  const { checking } = useRequireRole("admin");
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showEmpForm, setShowEmpForm] = useState(false);

  async function refresh() {
    setLoading(true);
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from("teams").select("id, name").order("name"),
      supabase
        .from("profiles")
        .select("id, name, email, team_id")
        .eq("role", "employee")
        .order("name"),
    ]);
    const teamList = t ?? [];
    const teamMap = new Map(teamList.map((x: Team) => [x.id, x.name]));
    setTeams(teamList);

    let pending = new Set<string>();
    try {
      const res = await listPendingEmployeeIds({ data: undefined });
      pending = new Set(res.pendingIds);
    } catch {
      // status unavailable — fall back to showing everyone as active
    }

    setEmployees(
      (p ?? []).map((e: any) => ({
        id: e.id,
        name: e.name,
        email: e.email,
        team_id: e.team_id,
        team_name: e.team_id ? (teamMap.get(e.team_id) ?? null) : null,
        pending: pending.has(e.id),
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    if (!checking) refresh();
  }, [checking]);

  if (checking) return null;

  return (
    <AdminShell>
      <div className="mx-auto max-w-4xl space-y-10">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">Teams</h1>
            {!showTeamForm && (
              <button
                onClick={() => setShowTeamForm(true)}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                + Add Team
              </button>
            )}
          </div>

          {showTeamForm && (
            <AddTeamForm
              onCancel={() => setShowTeamForm(false)}
              onCreated={() => {
                setShowTeamForm(false);
                refresh();
              }}
            />
          )}

          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-muted-foreground">Loading…</td>
                  </tr>
                ) : teams.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-muted-foreground">No teams yet.</td>
                  </tr>
                ) : (
                  teams.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-4 py-2 text-foreground">{t.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">Employees</h2>
            {!showEmpForm && (
              <button
                onClick={() => setShowEmpForm(true)}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                + Add Employee
              </button>
            )}
          </div>

          {showEmpForm && (
            <AddEmployeeForm
              teams={teams}
              onCancel={() => setShowEmpForm(false)}
              onCreated={() => {
                setShowEmpForm(false);
                refresh();
              }}
            />
          )}

          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Team</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-muted-foreground">
                      No employees yet.
                    </td>
                  </tr>
                ) : (
                  employees.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-4 py-2 text-foreground">{e.name}</td>
                      <td className="px-4 py-2 text-foreground/80">{e.email}</td>
                      <td className="px-4 py-2 text-foreground/80">{e.team_name ?? "—"}</td>
                      <td className="px-4 py-2">
                        {e.pending ? (
                          <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function AddTeamForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated.");
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (!profile) throw new Error("Profile not found.");
      const { error: iErr } = await supabase
        .from("teams")
        .insert({ name: name.trim(), company_id: profile.company_id });
      if (iErr) throw new Error(iErr.message);
      onCreated();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 space-y-4 rounded-md border border-border bg-card p-5"
    >
      <div>
        <label className={labelCls}>Team name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save team"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground/80 hover:bg-muted/40"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function AddEmployeeForm({
  teams,
  onCancel,
  onCreated,
}: {
  teams: Team[];
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [teamId, setTeamId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await createEmployee({
        data: {
          name: name.trim(),
          email: email.trim(),
          team_id: teamId || null,
          redirect_origin: window.location.origin,
        },
      });
      onCreated();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 space-y-4 rounded-md border border-border bg-card p-5"
    >
      <div>
        <label className={labelCls}>Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Team (optional)</label>
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className={inputCls}
        >
          <option value="">— None —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save employee"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground/80 hover:bg-muted/40"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
