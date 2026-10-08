import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole } from "@/lib/use-require-role";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { TemperProgress } from "@/components/ui/temper-progress";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard — SkillForge" }] }),
  component: AdminDashboard,
});

type Status = "not_started" | "in_progress" | "complete" | "cancelled";

type Row = {
  id: string;
  status: Status;
  due_date: string | null;
  user_id: string;
  course_id: string;
};

type Profile = { id: string; name: string; team_id: string | null; role: string };

function AdminDashboard() {
  const { checking, name } = useRequireRole("admin");
  const [rows, setRows] = useState<Row[]>([]);
  const [courses, setCourses] = useState<{ id: string }[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (checking) return;
    (async () => {
      setLoading(true);
      const [{ data: a }, { data: c }, { data: p }] = await Promise.all([
        supabase
          .from("assignments")
          .select("id, status, due_date, user_id, course_id")
          .order("due_date", { ascending: true, nullsFirst: false }),
        supabase.from("courses").select("id"),
        supabase.from("profiles").select("id, name, team_id, role"),
      ]);
      setCourses(c ?? []);
      setProfiles((p ?? []).map((row: any) => ({ ...row, role: row.role ?? "" })));
      setRows(
        (a ?? []).map((r: any) => ({
          id: r.id,
          status: r.status,
          due_date: r.due_date,
          user_id: r.user_id,
          course_id: r.course_id,
        })),
      );
      setLoading(false);
    })();
  }, [checking]);

  const employeeCount = useMemo(
    () => profiles.filter((p) => p.role === "employee").length,
    [profiles],
  );
  const showOnboarding = !loading && courses.length === 0 && employeeCount === 0;

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status !== "cancelled");
    const total = active.length;
    const complete = active.filter((r) => r.status === "complete").length;
    const completionPct = total === 0 ? 0 : Math.round((complete / total) * 100);
    const activeCourses = new Set(active.map((r) => r.course_id)).size;
    const now = Date.now();
    const overdue = active.filter(
      (r) => r.status !== "complete" && r.due_date && new Date(r.due_date).getTime() < now,
    ).length;
    return { completionPct, activeCourses, overdue };
  }, [rows]);

  if (checking) return null;

  return (
    <AdminShell name={name}>
      <div className="mx-auto max-w-6xl">
        {loading ? (
          <p className="py-12 text-ink-muted">Loading…</p>
        ) : showOnboarding ? (
          <OnboardingView />
        ) : (
          <>
            <h1 className="mb-8 text-heading-1 font-expanded text-ink">Dashboard</h1>

            <div className="mb-6 grid gap-6 sm:grid-cols-3">
              <StatPanel label="Overall completion">
                <Figure value={`${stats.completionPct}%`} />
                {/* The one place the whole company's progress is a single number. */}
                <TemperProgress
                  value={stats.completionPct}
                  label="Overall completion"
                  showValue={false}
                  className="mt-3"
                />
              </StatPanel>

              <StatPanel label="Active courses">
                <Figure value={stats.activeCourses} />
                <p className="mt-3 text-small text-ink-muted">
                  {stats.activeCourses === 1 ? "course assigned" : "courses assigned"}
                </p>
              </StatPanel>

              <StatPanel label="Overdue assignments">
                <Figure value={stats.overdue} tone={stats.overdue > 0 ? "oxide" : "ink"} />
                {/* Overdue is never colour alone: the words say it too. */}
                <p
                  className={`mt-3 text-small ${stats.overdue > 0 ? "text-oxide" : "text-ink-muted"}`}
                >
                  {stats.overdue === 0
                    ? "Nothing overdue"
                    : stats.overdue === 1
                      ? "1 assignment past its due date"
                      : `${stats.overdue} assignments past their due date`}
                </p>
              </StatPanel>
            </div>

            <p className="text-small text-ink-muted">
              Open{" "}
              <Link
                to="/admin/assignments"
                className="font-medium text-temper-blue hover:underline"
              >
                Assignments
              </Link>{" "}
              to see every row, or choose a panel above.
            </p>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function Figure({ value, tone = "ink" }: { value: string | number; tone?: "ink" | "oxide" }) {
  return (
    <p className={`text-figure tabular-nums ${tone === "oxide" ? "text-oxide" : "text-ink"}`}>
      {value}
    </p>
  );
}

function StatPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Link
      to="/admin/assignments"
      className="block rounded-md border border-steel bg-surface p-6 transition-colors hover:border-steel-strong"
    >
      <p className="text-small text-ink-muted">{label}</p>
      {children}
    </Link>
  );
}

function OnboardingView() {
  return (
    <div className="max-w-4xl">
      <h1 className="mb-3 text-heading-1 font-expanded text-ink">Welcome to SkillForge</h1>
      <p className="mb-8 text-body text-ink-muted">Three steps to get your team learning.</p>

      <div className="grid gap-6 md:grid-cols-3">
        <OnboardingCard
          title="Create your first course"
          description="Build a course with content and a short quiz to start training your team."
          to="/admin/courses"
          action="Create course"
          primary
        />
        <OnboardingCard
          title="Add employees"
          description="Invite your team members so they can see and complete assignments."
          to="/admin/employees"
          action="Add employees"
        />
        <OnboardingCard
          title="Create a team"
          description="Organise employees into teams to assign courses to everyone at once."
          to="/admin/employees"
          action="Create team"
        />
      </div>
    </div>
  );
}

function OnboardingCard({
  title,
  description,
  to,
  action,
  // DESIGN.md: one primary button per screen. The first step is the one to take.
  primary = false,
}: {
  title: string;
  description: string;
  to: string;
  action: string;
  primary?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-md border border-steel bg-surface p-6">
      <h2 className="mb-2 text-heading-3 text-ink">{title}</h2>
      <p className="mb-6 flex-1 text-small text-ink-muted">{description}</p>
      <Button asChild variant={primary ? "default" : "outline"} className="w-full">
        <Link to={to}>{action}</Link>
      </Button>
    </div>
  );
}
