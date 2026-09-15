import { createFileRoute, Link } from "@tanstack/react-router";
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
  course_id: string;
};

type Profile = { id: string; name: string; team_id: string | null; role: string };

function AdminDashboard() {
  const { checking } = useRequireRole("admin");
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

  if (checking) return null;

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading…</div>
        ) : showOnboarding ? (
          <OnboardingView />
        ) : (
          <>
            <h1 className="mb-6 font-serif text-3xl font-semibold text-foreground">Dashboard</h1>

            <div className="mb-2 grid gap-4 sm:grid-cols-3">
              <StatCard label="Overall completion" value={`${stats.completionPct}%`} />
              <StatCard label="Active courses" value={stats.activeCourses} />
              <StatCard label="Overdue assignments" value={stats.overdue} />
            </div>
            <p className="text-sm text-muted-foreground">
              Click a stat or visit{" "}
              <Link to="/admin/assignments" className="font-medium text-primary hover:underline">
                Assignments
              </Link>{" "}
              to see the full assignment detail.
            </p>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function OnboardingView() {
  const cardBorder = "#8A8578";

  return (
    <div className="py-10">
      <div className="mb-10 text-center">
        <h1
          className="mb-3 font-serif text-4xl font-semibold"
          style={{ color: "#1B2430" }}
        >
          Welcome to SkillForge
        </h1>
        <p className="text-base" style={{ color: "#8A8578" }}>
          Let's get your team learning. Here's how to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <OnboardingCard
          title="Create your first course"
          description="Build a course with content and a short quiz to start training your team."
          to="/admin/courses"
          buttonText="Create course"
          borderColor={cardBorder}
        />
        <OnboardingCard
          title="Add employees"
          description="Invite your team members so they can see and complete assignments."
          to="/admin/employees"
          buttonText="Add employees"
          borderColor={cardBorder}
        />
        <OnboardingCard
          title="Create a team"
          description="Organize employees into teams for easier course assignments."
          to="/admin/employees"
          buttonText="Create team"
          borderColor={cardBorder}
        />
      </div>
    </div>
  );
}

function OnboardingCard({
  title,
  description,
  to,
  buttonText,
  borderColor,
}: {
  title: string;
  description: string;
  to: string;
  buttonText: string;
  borderColor: string;
}) {
  return (
    <div
      className="flex flex-col rounded-md bg-background p-6"
      style={{ border: `1px solid ${borderColor}` }}
    >
      <h2
        className="mb-2 font-serif text-xl font-semibold"
        style={{ color: "#1B2430" }}
      >
        {title}
      </h2>
      <p className="mb-6 flex-1 text-sm" style={{ color: "#8A8578" }}>
        {description}
      </p>
      <Link
        to={to}
        className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {buttonText}
      </Link>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Link
      to="/admin/assignments"
      className="block rounded-md border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/50"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-4xl font-semibold text-foreground tracking-tight">
        {value}
      </p>
    </Link>
  );
}
