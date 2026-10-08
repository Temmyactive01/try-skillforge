import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole } from "@/lib/use-require-role";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { TemperProgress } from "@/components/ui/temper-progress";
import { daysLate } from "@/lib/dates";
import type { StatusFilter } from "@/routes/admin.assignments";

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
    const overdueRows = active.filter(
      (r) => r.status !== "complete" && r.due_date && new Date(r.due_date).getTime() < now,
    );
    // The worst case is what an admin needs to act on first.
    const oldestOverdueDays = overdueRows.length
      ? Math.max(...overdueRows.map((r) => daysLate(r.due_date!)))
      : 0;
    return {
      completionPct,
      complete,
      total,
      activeCourses,
      overdue: overdueRows.length,
      oldestOverdueDays,
    };
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
              {/* Each panel opens the Assignments list already filtered to what it counts. */}
              <StatPanel label="Overall completion" filter="complete" cta="See completed">
                <Figure value={`${stats.completionPct}%`} />
                {/* The one place the whole company's progress is a single number. */}
                <TemperProgress
                  value={stats.completionPct}
                  label="Overall completion"
                  showValue={false}
                  className="mt-3"
                />
                <p className="mt-3 text-small text-ink-muted">
                  {stats.complete} of {stats.total} assignments finished
                </p>
              </StatPanel>

              <StatPanel label="Active courses" cta="See all assignments">
                <Figure value={stats.activeCourses} />
                <p className="mt-3 text-small text-ink-muted">
                  {courses.length === 0
                    ? "No courses built yet"
                    : stats.activeCourses === courses.length
                      ? "Every course you have built is in use"
                      : `of ${courses.length} you have built`}
                </p>
              </StatPanel>

              <StatPanel label="Overdue assignments" filter="overdue" cta="See overdue">
                <Figure value={stats.overdue} tone={stats.overdue > 0 ? "oxide" : "ink"} />
                {/* Overdue is never colour alone: the words say it too. */}
                <p
                  className={`mt-3 text-small ${stats.overdue > 0 ? "text-oxide" : "text-ink-muted"}`}
                >
                  {stats.overdue === 0
                    ? "Nothing overdue"
                    : stats.oldestOverdueDays === 1
                      ? "The oldest is 1 day late"
                      : `The oldest is ${stats.oldestOverdueDays} days late`}
                </p>
              </StatPanel>
            </div>
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

function StatPanel({
  label,
  filter,
  cta,
  children,
}: {
  label: string;
  /** Opens Assignments with this filter already applied. */
  filter?: StatusFilter;
  cta: string;
  children: ReactNode;
}) {
  return (
    <Link
      to="/admin/assignments"
      search={filter ? { status: filter } : {}}
      className="group flex flex-col rounded-md border border-steel bg-surface p-6 transition-colors hover:border-temper-blue hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-temper-blue focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
    >
      <p className="text-small text-ink-muted">{label}</p>
      {children}
      {/* Says where the panel goes, so it doesn't read as a plain box of numbers.
          mt-auto keeps the three links on one line across panels of different heights. */}
      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-small font-medium text-temper-blue group-hover:underline">
        {cta}
        <ArrowRight aria-hidden className="size-4" />
      </span>
    </Link>
  );
}

function OnboardingView() {
  return (
    <div className="max-w-4xl">
      <h1 className="mb-3 text-heading-1 font-expanded text-ink">Welcome to SkillForge</h1>
      <p className="mb-8 text-body text-ink-muted">Three steps to get your team learning.</p>

      <ol className="grid gap-6 md:grid-cols-3">
        <OnboardingCard
          step={1}
          title="Create your first course"
          description="Build a course with content and a short quiz to start training your team."
          to="/admin/courses"
          action="Create course"
          primary
        />
        <OnboardingCard
          step={2}
          title="Add employees"
          description="Invite your team members so they can see and complete assignments."
          to="/admin/employees"
          action="Add employees"
        />
        <OnboardingCard
          step={3}
          title="Create a team"
          description="Organise employees into teams to assign courses to everyone at once."
          to="/admin/employees"
          action="Create team"
        />
      </ol>
    </div>
  );
}

function OnboardingCard({
  step,
  title,
  description,
  to,
  action,
  // DESIGN.md: one primary button per screen. The first step is the one to take.
  primary = false,
}: {
  step: number;
  title: string;
  description: string;
  to: string;
  action: string;
  primary?: boolean;
}) {
  return (
    <li className="flex flex-col rounded-md border border-steel bg-surface p-6">
      <span
        aria-hidden
        className="mb-3 inline-flex size-8 items-center justify-center rounded-sm bg-temper-blue text-small font-semibold text-on-temper-blue tabular-nums"
      >
        {step}
      </span>
      <h2 className="mb-2 text-heading-3 text-ink">
        <span className="sr-only">Step {step}: </span>
        {title}
      </h2>
      <p className="mb-6 flex-1 text-small text-ink-muted">{description}</p>
      <Button asChild variant={primary ? "default" : "outline"} className="w-full">
        <Link to={to}>{action}</Link>
      </Button>
    </li>
  );
}
