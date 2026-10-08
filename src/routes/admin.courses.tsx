import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useRequireRole } from "@/lib/use-require-role";
import { formatDate } from "@/lib/dates";
import { sortRows, type Sort } from "@/lib/sorting";
import { AdminShell } from "@/components/AdminShell";
import { AssignCourseModal } from "@/components/AssignCourseModal";
import { CourseEditor } from "@/components/CourseEditor";
import { Button } from "@/components/ui/button";
import { TemperProgress } from "@/components/ui/temper-progress";
import { SortableHeader } from "@/components/ui/sortable-header";
import { toastDone, toastFailed } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/admin/courses")({
  head: () => ({ meta: [{ title: "Courses — SkillForge" }] }),
  component: AdminCoursesPage,
});

type CourseRow = {
  id: string;
  title: string;
  category: string | null;
  created_at: string;
  question_count: number;
  /** Every assignment row, cancelled ones included. */
  assignment_count: number;
  /** Assignments that still count towards completion. */
  active_count: number;
  completed_count: number;
  /** Has anyone ever passed this course? A pass is a record worth keeping. */
  ever_passed: boolean;
  /** Percentage complete, or null when the course has never been assigned. */
  completion: number | null;
};

type SortColumn = "title" | "question_count" | "active_count" | "completion" | "created_at";

/** Which screen the page is showing. The editor replaces the list rather than floating over it. */
type View = { kind: "list" } | { kind: "create" } | { kind: "edit"; course: CourseRow };

function AdminCoursesPage() {
  const { checking, name } = useRequireRole("admin");
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ kind: "list" });
  const [assigning, setAssigning] = useState<CourseRow | null>(null);
  const [sort, setSort] = useState<Sort<SortColumn>>({ column: "created_at", direction: "desc" });

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase
      .from("courses")
      // Only the question id: correct_answer isn't readable in the browser, by design.
      .select(
        "id, title, category, created_at, quiz_questions(id), assignments(status, quiz_results(passed))",
      )
      .order("created_at", { ascending: false });
    if (error) {
      toastFailed("Couldn't load your courses. Check your connection and refresh the page.");
      setLoading(false);
      return;
    }
    setCourses(
      (data ?? []).map((c) => {
        const assignments = c.assignments ?? [];
        const active = assignments.filter((a) => a.status !== "cancelled");
        const completed = active.filter((a) => a.status === "complete");
        return {
          id: c.id,
          title: c.title,
          category: c.category,
          created_at: c.created_at,
          question_count: (c.quiz_questions ?? []).length,
          assignment_count: assignments.length,
          active_count: active.length,
          completed_count: completed.length,
          completion: active.length ? Math.round((completed.length / active.length) * 100) : null,
          /*
           * A cancelled assignment can still hold a pass, so the status alone
           * isn't enough: look for a passing result anywhere on the course.
           */
          ever_passed: assignments.some(
            (a) => a.status === "complete" || (a.quiz_results ?? []).some((r) => r.passed),
          ),
        };
      }),
    );
    setLoading(false);
  }

  useEffect(() => {
    if (!checking) refresh();
  }, [checking]);

  const sorted = useMemo(
    () =>
      sortRows(courses, sort, (c, column) => {
        switch (column) {
          case "title":
            return c.title.toLocaleLowerCase();
          case "question_count":
            return c.question_count;
          case "active_count":
            return c.active_count;
          case "completion":
            return c.completion;
          case "created_at":
            return new Date(c.created_at).getTime();
        }
      }),
    [courses, sort],
  );

  async function deleteCourse(course: CourseRow) {
    const previous = courses;
    setCourses((curr) => curr.filter((c) => c.id !== course.id));
    const { error } = await supabase.from("courses").delete().eq("id", course.id);
    if (error) {
      setCourses(previous);
      toastFailed("Couldn't delete the course. Check your connection and try again.");
      return;
    }
    toastDone(`Deleted ${course.title}.`);
  }

  if (checking) return null;

  if (view.kind !== "list") {
    return (
      <AdminShell name={name}>
        <div className="mx-auto max-w-3xl">
          <CourseEditor
            courseId={view.kind === "edit" ? view.course.id : undefined}
            assignmentCount={view.kind === "edit" ? view.course.active_count : undefined}
            completedCount={view.kind === "edit" ? view.course.completed_count : undefined}
            onCancel={() => setView({ kind: "list" })}
            onSaved={(message) => {
              setView({ kind: "list" });
              toastDone(message);
              refresh();
            }}
          />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell name={name}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-heading-1 font-expanded text-ink">Courses</h1>
          <Button onClick={() => setView({ kind: "create" })}>
            <Plus aria-hidden />
            Create course
          </Button>
        </div>

        <div className="rounded-md border border-steel bg-surface">
          {loading ? (
            <p className="px-4 py-6 text-small text-ink-muted">Loading…</p>
          ) : sorted.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-body text-ink">No courses yet.</p>
              <p className="mt-1 text-small text-ink-muted">
                Create your first course to start assigning training.
              </p>
            </div>
          ) : (
            <>
              {/* Six columns can't be read on a phone, so each row becomes a card. */}
              <ul aria-label="Courses" className="divide-y divide-steel md:hidden">
                {sorted.map((c) => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    onAssign={() => setAssigning(c)}
                    onEdit={() => setView({ kind: "edit", course: c })}
                    onDelete={() => deleteCourse(c)}
                  />
                ))}
              </ul>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader column="title" sort={sort} onSort={setSort}>
                        Course
                      </SortableHeader>
                      <SortableHeader column="question_count" sort={sort} onSort={setSort}>
                        Questions
                      </SortableHeader>
                      <SortableHeader column="active_count" sort={sort} onSort={setSort}>
                        Assigned
                      </SortableHeader>
                      <SortableHeader column="completion" sort={sort} onSort={setSort}>
                        Completion
                      </SortableHeader>
                      <SortableHeader column="created_at" sort={sort} onSort={setSort}>
                        Created
                      </SortableHeader>
                      <TableHead scope="col" className="text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <span className="font-medium">{c.title}</span>
                          {c.category && (
                            <span className="block text-small text-ink-muted">{c.category}</span>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">{c.question_count}</TableCell>
                        <TableCell className="tabular-nums">{c.active_count}</TableCell>
                        <TableCell>
                          <Completion course={c} />
                        </TableCell>
                        <TableCell>{formatDate(c.created_at)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <CourseActions
                            course={c}
                            onAssign={() => setAssigning(c)}
                            onEdit={() => setView({ kind: "edit", course: c })}
                            onDelete={() => deleteCourse(c)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>

      {assigning && (
        <AssignCourseModal
          courseId={assigning.id}
          courseTitle={assigning.title}
          onClose={() => setAssigning(null)}
          onAssigned={(message) => {
            setAssigning(null);
            toastDone(message);
            refresh();
          }}
        />
      )}
    </AdminShell>
  );
}

/** How much of a course is finished. A course nobody has been given isn't 0% — it's unmeasured. */
function Completion({ course }: { course: CourseRow }) {
  if (course.completion === null) {
    return <span className="text-small text-ink-muted">Not assigned yet</span>;
  }
  return (
    <TemperProgress
      value={course.completion}
      label={`Completion, ${course.title}`}
      className="min-w-28"
    />
  );
}

/**
 * Assigning is what an admin comes here to do, so it stays on the row.
 * Editing and deleting sit behind the menu, and deleting asks first.
 */
function CourseActions({
  course,
  onAssign,
  onEdit,
  onDelete,
}: {
  course: CourseRow;
  onAssign: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  /*
   * Deleting a course takes its assignments and their quiz results with it, so
   * it is allowed only when there is nothing left to lose: every assignment
   * cancelled, and nobody ever passed. A completion is a record of what
   * somebody proved they knew; tidying up the catalogue is not a good enough
   * reason to destroy it.
   */
  const blockedBy = course.ever_passed
    ? "completions"
    : course.active_count > 0
      ? "assignments"
      : null;

  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={onAssign}>
        Assign
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`More actions for ${course.title}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>Edit course</DropdownMenuItem>
          {/*
           * The menu must be allowed to close: while it is open it takes the
           * rest of the page out of the accessibility tree, and holding it open
           * behind the dialog would leave the table unreachable afterwards.
           */}
          <DropdownMenuItem className="text-oxide" onSelect={() => setConfirming(true)}>
            Delete course
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          {blockedBy ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Can't delete this course</AlertDialogTitle>
                <AlertDialogDescription>
                  {blockedBy === "completions"
                    ? `${course.title} has completed training records, so it can't be deleted. This keeps your training history intact.`
                    : `${course.title} is assigned to ${course.active_count} ${course.active_count === 1 ? "person" : "people"}. Cancel those assignments before deleting it.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this course?</AlertDialogTitle>
                <AlertDialogDescription>
                  {course.title} and its {course.question_count}{" "}
                  {course.question_count === 1 ? "question" : "questions"} will be removed
                  {course.assignment_count > 0 &&
                    `, along with ${course.assignment_count} cancelled ${course.assignment_count === 1 ? "assignment" : "assignments"}`}
                  . Nobody has passed it, so no training record is lost. This can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep course</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete course</AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** The same course as a card, for widths where six columns don't fit. */
function CourseCard({
  course,
  onAssign,
  onEdit,
  onDelete,
}: {
  course: CourseRow;
  onAssign: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="space-y-3 p-4">
      <div className="min-w-0">
        <p className="text-body font-medium text-ink">{course.title}</p>
        <p className="text-small text-ink-muted">
          {[
            course.category,
            `${course.question_count} ${course.question_count === 1 ? "question" : "questions"}`,
            `${course.active_count} assigned`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <Completion course={course} />

      <div className="flex items-end justify-between gap-3">
        <p className="text-small text-ink-muted">Created {formatDate(course.created_at)}</p>
        <CourseActions course={course} onAssign={onAssign} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </li>
  );
}
