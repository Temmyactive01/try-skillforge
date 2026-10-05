import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole } from "@/lib/use-require-role";
import { EmployeeShell } from "@/components/EmployeeShell";
import { bestScore } from "@/lib/scores";

export const Route = createFileRoute("/employee/home")({
  head: () => ({ meta: [{ title: "Home — SkillForge" }] }),
  component: EmployeeHome,
});

type Status = "not_started" | "in_progress" | "complete" | "cancelled";

type Row = {
  id: string;
  due_date: string | null;
  status: Status;
  course: { id: string; title: string; category: string | null } | null;
  score: number | null;
};

function daysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Parse date-only values as local midnight to avoid timezone shifts.
  const dueStr = /^\d{4}-\d{2}-\d{2}$/.test(dueDate)
    ? `${dueDate}T00:00:00`
    : dueDate;
  const due = new Date(dueStr);
  due.setHours(0, 0, 0, 0);
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function EmployeeHome() {
  const { checking, name } = useRequireRole("employee");
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (checking) return;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("assignments")
        .select(
          "id, due_date, status, course:courses(id, title, category), quiz_results(score)",
        )
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });
      const mapped: Row[] = (data ?? []).map((a: any) => {
        return {
          id: a.id,
          due_date: a.due_date,
          status: a.status,
          course: a.course,
          // Practice retakes after passing don't lower the score shown.
          score: bestScore(a.quiz_results),
        };
      });
      setRows(mapped.filter((r) => r.status !== "cancelled"));
    })();
  }, [checking]);

  if (checking) return null;

  const total = rows?.length ?? 0;
  const completed = rows?.filter((r) => r.status === "complete").length ?? 0;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <EmployeeShell name={name}>
      <h1 className="mb-6 font-serif text-2xl font-semibold text-foreground">My Learning</h1>

      <div className="mb-8 rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between text-sm text-foreground">
          <span>Overall progress</span>
          <span className="font-medium">
            {completed} / {total} completed ({pct}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {rows === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses assigned yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const daysLeft = daysUntilDue(r.due_date);
            const overdue =
              r.status !== "complete" && daysLeft != null && daysLeft < 0;
            const dueSoon =
              r.status !== "complete" &&
              daysLeft != null &&
              daysLeft >= 0 &&
              daysLeft <= 2;
            return (
              <li key={r.id}>
                <Link
                  to="/employee/course/$assignmentId"
                  params={{ assignmentId: r.id }}
                  className="block rounded-lg border border-border bg-card p-4 hover:border-primary hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-foreground">
                        {r.course?.title ?? "Untitled course"}
                      </div>
                      {r.course?.category && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {r.course.category}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-foreground/80">
                        {r.due_date ? (
                          <>Due {new Date(r.due_date).toLocaleDateString()}</>
                        ) : (
                          <>No due date</>
                        )}
                        {dueSoon && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
                            {daysLeft === 0
                              ? "Due today"
                              : `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
                          </span>
                        )}
                        {overdue && (
                          <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={r.status} score={r.score} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </EmployeeShell>
  );
}

function StatusBadge({ status, score }: { status: Status; score: number | null }) {
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
        Completed{score != null ? ` · ${score}%` : ""}
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex rounded-full bg-warning/20 px-2.5 py-1 text-xs font-medium text-foreground">
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      Not Started
    </span>
  );
}
