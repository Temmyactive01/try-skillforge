import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole } from "@/lib/use-require-role";
import { EmployeeShell } from "@/components/EmployeeShell";
import { bestScore, passedAt } from "@/lib/scores";
import { dueLabel, finishedDueLabel, formatDate, type Due } from "@/lib/dates";
import { splitTraining, type TrainingStatus } from "@/lib/training";
import { Button } from "@/components/ui/button";
import { Tag, type TagTone } from "@/components/ui/tag";
import { TemperProgress } from "@/components/ui/temper-progress";

export const Route = createFileRoute("/employee/home")({
  head: () => ({ meta: [{ title: "My training — SkillForge" }] }),
  component: EmployeeHome,
});

type Course = { id: string; title: string; category: string | null };

type Row = {
  id: string;
  due_date: string | null;
  status: TrainingStatus;
  course: Course | null;
  score: number | null;
  /** When they first passed, for finished training. Null if nothing passed. */
  completed_at: string | null;
};

/** The shape the select below really returns. */
type Attempt = { score: number; passed: boolean; completed_at: string };
type Fetched = Omit<Row, "score" | "completed_at"> & { quiz_results: Attempt[] | null };

const STATUS: Record<TrainingStatus, { label: string; tone: TagTone }> = {
  not_started: { label: "Not started", tone: "quiet" },
  in_progress: { label: "In progress", tone: "bronze" },
  complete: { label: "Complete", tone: "blue" },
  cancelled: { label: "Cancelled", tone: "quiet" },
};

/** What this training is waiting for the employee to do. */
function actionLabel(status: TrainingStatus) {
  if (status === "complete") return "Review";
  return status === "in_progress" ? "Continue" : "Start";
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
          "id, due_date, status, course:courses(id, title, category), quiz_results(score, passed, completed_at)",
        )
        .eq("user_id", userData.user.id);
      /*
       * The generated types describe an embedded row as possibly an array,
       * because they can't tell a one-to-one join from a one-to-many. This
       * select is on the foreign key, so it is one course per assignment.
       */
      const fetched = (data ?? []) as unknown as Fetched[];
      setRows(
        fetched.map((a) => ({
          id: a.id,
          due_date: a.due_date,
          status: a.status,
          course: a.course,
          // Practice retakes after passing don't lower the score shown.
          score: bestScore(a.quiz_results),
          completed_at: passedAt(a.quiz_results),
        })),
      );
    })();
  }, [checking]);

  if (checking) return null;

  const { todo, done } = splitTraining(rows ?? []);
  const total = todo.length + done.length;
  const pct = total === 0 ? 0 : Math.round((done.length / total) * 100);

  return (
    <EmployeeShell name={name}>
      <h1 className="text-heading-1 font-expanded text-ink">My training</h1>

      {rows === null ? (
        <p className="mt-8 text-small text-ink-muted">Loading…</p>
      ) : total === 0 ? (
        <div className="mt-8 rounded-md border border-steel bg-surface px-4 py-12 text-center">
          <p className="text-body text-ink">No training assigned yet.</p>
          <p className="mt-1 text-small text-ink-muted">Your admin will assign courses here.</p>
        </div>
      ) : (
        <>
          <section className="mt-8 rounded-md border border-steel bg-surface p-4 md:p-6">
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <h2 className="text-heading-3 text-ink">Your progress</h2>
              <p className="text-small text-ink-muted">
                {done.length} of {total} complete
              </p>
            </div>
            {/* DESIGN.md names this use of TemperProgress. Not animated on load. */}
            <TemperProgress value={pct} label="Training complete" />
          </section>

          {todo.length > 0 && (
            <TrainingGroup
              heading="To do"
              items={todo}
              // DESIGN.md: one primary button per screen. The most urgent thing
              // outstanding is the one that earns it, which is also what makes
              // "what to do next" visible without a badge saying so.
              primaryId={todo[0].id}
            />
          )}

          {done.length > 0 && <TrainingGroup heading="Completed" items={done} />}
        </>
      )}
    </EmployeeShell>
  );
}

function TrainingGroup({
  heading,
  items,
  primaryId,
}: {
  heading: string;
  items: Row[];
  primaryId?: string;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-heading-2 text-ink">{heading}</h2>
      <ul
        aria-label={heading}
        className="divide-y divide-steel rounded-md border border-steel bg-surface"
      >
        {items.map((item) => (
          <TrainingItem key={item.id} item={item} primary={item.id === primaryId} />
        ))}
      </ul>
    </section>
  );
}

function TrainingItem({ item, primary }: { item: Row; primary: boolean }) {
  const title = item.course?.title ?? "Untitled course";
  const status = STATUS[item.status];
  const complete = item.status === "complete";
  // Nothing finished is overdue, however long ago it was due.
  const due = complete ? finishedDueLabel(item.due_date) : dueLabel(item.due_date);

  /*
   * Once something is finished, when it was finished is the useful fact and
   * when it was due is history. Older data can be complete with no passing
   * attempt behind it, which the app itself can't produce, so the due date
   * stays as the fallback rather than leaving a gap.
   */
  const finishedOn = complete && item.completed_at ? formatDate(item.completed_at) : null;

  return (
    <li className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-6 md:p-6">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="text-heading-3 text-ink">{title}</h3>
          <Tag tone={status.tone}>{status.label}</Tag>
        </div>

        <p className="text-small text-ink-muted">
          {item.course?.category ? `${item.course.category} · ` : ""}
          {finishedOn ? <span>Completed {finishedOn}</span> : <DueDate due={due} />}
        </p>

        {item.score !== null && (
          <div className="flex items-center gap-2">
            {/*
             * Named on the page, not only to a screen reader: an In progress
             * item showing 50% could otherwise read as being halfway through
             * the course rather than as the best a quiz attempt has scored.
             */}
            <span className="shrink-0 text-small text-ink-muted">Best score</span>
            <TemperProgress
              value={item.score}
              label={`Best score for ${title}`}
              className="max-w-40"
            />
          </div>
        )}
      </div>

      <Button asChild variant={primary ? "default" : "outline"} className="self-start md:self-auto">
        {/*
         * The action is the only link in the item. Making the whole row a link
         * as well would give a screen reader two routes to the same place and
         * a keyboard user an extra stop on the way past.
         */}
        <Link
          to="/employee/course/$assignmentId"
          params={{ assignmentId: item.id }}
          aria-label={`${actionLabel(item.status)} ${title}`}
        >
          {actionLabel(item.status)}
        </Link>
      </Button>
    </li>
  );
}

/** DESIGN.md: "Overdue is oxide, always with words", never colour on its own. */
function DueDate({ due }: { due: Due }) {
  if (due.tone === "overdue") return <span className="font-medium text-oxide">{due.label}</span>;
  if (due.tone === "soon") {
    return (
      <Tag tone="straw" className="align-middle">
        {due.label}
      </Tag>
    );
  }
  return <span>{due.label}</span>;
}
