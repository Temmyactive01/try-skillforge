import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole } from "@/lib/use-require-role";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard — SkillForge" }] }),
  component: AdminDashboard,
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

const STATUSES: Status[] = ["not_started", "in_progress", "complete"];

function statusLabel(s: Status) {
  return s === "not_started" ? "Not started" : s === "in_progress" ? "In progress" : "Complete";
}

function AdminDashboard() {
  const { checking } = useRequireRole("admin");
  const [rows, setRows] = useState<Row[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [teamFilter, setTeamFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (checking) return;
    (async () => {
      setLoading(true);
      const [{ data: a }, { data: t }, { data: c }] = await Promise.all([
        supabase
          .from("assignments")
          .select(
            "id, status, due_date, user_id, course_id, profiles!assignments_user_id_fkey(name, team_id), courses(title)",
          )
          .order("due_date", { ascending: true, nullsFirst: false }),
        supabase.from("teams").select("id, name").order("name"),
        supabase.from("courses").select("id, title").order("title"),
      ]);
      setTeams(t ?? []);
      setCourses(c ?? []);
      setRows(
        (a ?? []).map((r: any) => ({
          id: r.id,
          status: r.status,
          due_date: r.due_date,
          user_id: r.user_id,
          employee_name: r.profiles?.name ?? "—",
          team_id: r.profiles?.team_id ?? null,
          course_id: r.course_id,
          course_title: r.courses?.title ?? "—",
        })),
      );
      setLoading(false);
    })();
  }, [checking]);

  const stats = useMemo(() => {
    const total = rows.length;
    const complete = rows.filter((r) => r.status === "complete").length;
    const completionPct = total === 0 ? 0 : Math.round((complete / total) * 100);
    const activeCourses = new Set(rows.map((r) => r.course_id)).size;
    const now = Date.now();
    const overdue = rows.filter(
      (r) => r.status !== "complete" && r.due_date && new Date(r.due_date).getTime() < now,
    ).length;
    return { completionPct, activeCourses, overdue };
  }, [rows]);

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
    "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">Dashboard</h1>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Overall completion" value={`${stats.completionPct}%`} />
          <StatCard label="Active courses" value={stats.activeCourses} />
          <StatCard label="Overdue assignments" value={stats.overdue} />
        </div>

        <div className="rounded-md border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
            <span className="text-sm font-medium text-slate-700">Filters:</span>
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
                className="ml-auto text-sm text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Employee</th>
                <th className="px-4 py-2 font-medium">Course</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Due date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-slate-500">
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
                    <tr key={r.id} className="border-t border-slate-200">
                      <td className="px-4 py-2 text-slate-900">{r.employee_name}</td>
                      <td className="px-4 py-2 text-slate-700">{r.course_title}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td
                        className={`px-4 py-2 ${overdue ? "font-medium text-red-600" : "text-slate-700"}`}
                      >
                        {r.due_date ? new Date(r.due_date).toLocaleDateString() : "—"}
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const cls =
    status === "complete"
      ? "bg-green-100 text-green-700"
      : status === "in_progress"
        ? "bg-blue-100 text-blue-700"
        : "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {statusLabel(status)}
    </span>
  );
}
