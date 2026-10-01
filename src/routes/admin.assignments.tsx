import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole } from "@/lib/use-require-role";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/assignments")({
  head: () => ({ meta: [{ title: "Assignments — SkillForge" }] }),
  component: AdminAssignments,
});

type Status = "not_started" | "in_progress" | "complete";

type Row = {
  id: string;
  status: Status;
  due_date: string | null;
  user_id: string;
  employee_name: string;
  team_id: string | null;
  course_id: string;
  course_title: string;
};

type Team = { id: string; name: string };
type Course = { id: string; title: string };
type Employee = { id: string; name: string; team_id: string | null };

const STATUSES: Status[] = ["not_started", "in_progress", "complete"];

function statusLabel(s: Status) {
  return s === "not_started" ? "Not started" : s === "in_progress" ? "In progress" : "Complete";
}

function AdminAssignments() {
  const { checking } = useRequireRole("admin");
  const [rows, setRows] = useState<Row[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  const [teamFilter, setTeamFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (checking) return;
    (async () => {
      setLoading(true);
      const [{ data: a }, { data: t }, { data: c }, { data: p }] = await Promise.all([
        supabase
          .from("assignments")
          .select("id, status, due_date, user_id, course_id, courses(title)")
          .order("due_date", { ascending: true, nullsFirst: false }),
        supabase.from("teams").select("id, name").order("name"),
        supabase.from("courses").select("id, title").order("title"),
        supabase.from("profiles").select("id, name, team_id, role"),
      ]);
      const profMap = new Map<string, { name: string; team_id: string | null }>();
      (p ?? []).forEach((row: any) => profMap.set(row.id, { name: row.name, team_id: row.team_id }));
      setTeams(t ?? []);
      setCourses(c ?? []);
      setEmployees(
        (p ?? [])
          .filter((row: any) => row.role === "employee")
          .map((row: any) => ({ id: row.id, name: row.name, team_id: row.team_id })),
      );
      setRows(
        (a ?? []).map((r: any) => {
          const prof = profMap.get(r.user_id);
          return {
            id: r.id,
            status: r.status,
            due_date: r.due_date,
            user_id: r.user_id,
            employee_name: prof?.name ?? "—",
            team_id: prof?.team_id ?? null,
            course_id: r.course_id,
            course_title: r.courses?.title ?? "—",
          };
        }),
      );
      setLoading(false);
    })();
  }, [checking]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!teamFilter || r.team_id === teamFilter) &&
          (!courseFilter || r.course_id === courseFilter) &&
          (!statusFilter || r.status === statusFilter),
      ),
    [rows, teamFilter, courseFilter, statusFilter],
  );

  if (checking) return null;

  const selectCls =
    "rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-sans";

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 font-serif text-3xl font-semibold text-foreground">Assignments</h1>

        <div className="rounded-md border border-border bg-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <span className="text-sm font-medium text-foreground">Filters:</span>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className={selectCls}
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className={selectCls}
            >
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectCls}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
            {(teamFilter || courseFilter || statusFilter) && (
              <button
                onClick={() => {
                  setTeamFilter("");
                  setCourseFilter("");
                  setStatusFilter("");
                }}
                className="ml-auto text-sm text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          <table className="w-full font-sans text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Employee</th>
                <th className="px-4 py-2 font-medium">Course</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Due date</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-muted-foreground">
                    No assignments match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const overdue =
                    r.status !== "complete" &&
                    r.due_date &&
                    new Date(r.due_date).getTime() < Date.now();
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-2 text-foreground">{r.employee_name}</td>
                      <td className="px-4 py-2 text-foreground/80">{r.course_title}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td
                        className={`px-4 py-2 ${overdue ? "font-medium text-destructive" : "text-foreground/80"}`}
                      >
                        {r.due_date ? new Date(r.due_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => setEditing(r)}
                          className="mr-2 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm("Are you sure you want to remove this assignment?")) return;
                            const prev = rows;
                            setRows((curr) => curr.filter((x) => x.id !== r.id));
                            const { error } = await supabase
                              .from("assignments")
                              .delete()
                              .eq("id", r.id);
                            if (error) {
                              alert("Failed to remove assignment: " + error.message);
                              setRows(prev);
                            }
                          }}
                          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground/80 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "complete") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
        <span
          aria-hidden
          className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-success text-success-foreground shadow-sm"
          style={{ transform: "rotate(-8deg)" }}
        >
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 6.5l2.5 2.5 4.5-5" />
          </svg>
        </span>
        Complete
      </span>
    );
  }
  const cls =
    status === "in_progress"
      ? "bg-warning/20 text-foreground"
      : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {statusLabel(status)}
    </span>
  );
}
