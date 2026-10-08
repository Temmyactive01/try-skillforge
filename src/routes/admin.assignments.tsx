import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole } from "@/lib/use-require-role";
import { AdminShell } from "@/components/AdminShell";
import { bestScore } from "@/lib/scores";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TemperProgress } from "@/components/ui/temper-progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/assignments")({
  head: () => ({ meta: [{ title: "Assignments — SkillForge" }] }),
  component: AdminAssignments,
});

type Status = "not_started" | "in_progress" | "complete" | "cancelled";

type Row = {
  id: string;
  status: Status;
  due_date: string | null;
  user_id: string;
  employee_name: string;
  team_id: string | null;
  course_id: string;
  course_title: string;
  best_score: number | null;
};

type Team = { id: string; name: string };
type Course = { id: string; title: string };
type Employee = { id: string; name: string; team_id: string | null };

type SortColumn = "employee_name" | "course_title" | "status" | "best_score" | "due_date";
type Sort = { column: SortColumn; direction: "asc" | "desc" };

const STATUSES: Status[] = ["not_started", "in_progress", "complete", "cancelled"];

// Status sorts by how far along the work is, not alphabetically.
const STATUS_ORDER: Record<Status, number> = {
  not_started: 0,
  in_progress: 1,
  complete: 2,
  cancelled: 3,
};

function statusLabel(s: Status) {
  return s === "not_started"
    ? "Not started"
    : s === "in_progress"
      ? "In progress"
      : s === "cancelled"
        ? "Cancelled"
        : "Complete";
}

function AdminAssignments() {
  const { checking, name } = useRequireRole("admin");
  const [rows, setRows] = useState<Row[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  const [teamFilter, setTeamFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  // The soonest deadline first, matching the order the rows arrive in.
  const [sort, setSort] = useState<Sort>({ column: "due_date", direction: "asc" });

  useEffect(() => {
    if (checking) return;
    (async () => {
      setLoading(true);
      const [{ data: a }, { data: t }, { data: c }, { data: p }] = await Promise.all([
        supabase
          .from("assignments")
          .select("id, status, due_date, user_id, course_id, courses(title), quiz_results(score)")
          .order("due_date", { ascending: true, nullsFirst: false }),
        supabase.from("teams").select("id, name").order("name"),
        supabase.from("courses").select("id, title").order("title"),
        supabase.from("profiles").select("id, name, team_id, role"),
      ]);
      const profMap = new Map<string, { name: string; team_id: string | null }>();
      (p ?? []).forEach((row: any) =>
        profMap.set(row.id, { name: row.name, team_id: row.team_id }),
      );
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
            // Retakes are allowed after passing, so show the best attempt, not the latest.
            best_score: bestScore(r.quiz_results),
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

  const sorted = useMemo(() => {
    const by = (r: Row): string | number | null => {
      switch (sort.column) {
        case "employee_name":
          return r.employee_name.toLocaleLowerCase();
        case "course_title":
          return r.course_title.toLocaleLowerCase();
        case "status":
          return STATUS_ORDER[r.status];
        case "best_score":
          return r.best_score;
        case "due_date":
          return r.due_date ? new Date(r.due_date).getTime() : null;
      }
    };
    return [...filtered].sort((x, y) => {
      const a = by(x);
      const b = by(y);
      // Rows with nothing to compare — no score yet, no due date — always sit last.
      if (a === null) return b === null ? 0 : 1;
      if (b === null) return -1;
      const order = a < b ? -1 : a > b ? 1 : 0;
      return sort.direction === "asc" ? order : -order;
    });
  }, [filtered, sort]);

  /** Cancel and Undo both just move the status, optimistically. */
  async function patchStatus(id: string, status: Status) {
    const previous = rows;
    setRows((curr) => curr.map((x) => (x.id === id ? { ...x, status } : x)));
    const { error } = await supabase.from("assignments").update({ status }).eq("id", id);
    if (error) {
      alert(
        status === "cancelled"
          ? "Failed to cancel assignment: " + error.message
          : "Failed to restore assignment: " + error.message,
      );
      setRows(previous);
    }
  }

  if (checking) return null;

  const filtersApplied = Boolean(teamFilter || courseFilter || statusFilter);

  return (
    <AdminShell name={name}>
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-heading-1 font-expanded text-ink">Assignments</h1>

        <div className="rounded-md border border-steel bg-surface">
          <div className="flex flex-wrap items-end gap-4 border-b border-steel p-4">
            <Filter label="Team" value={teamFilter} onChange={setTeamFilter} allLabel="All teams">
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Filter>
            <Filter
              label="Course"
              value={courseFilter}
              onChange={setCourseFilter}
              allLabel="All courses"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Filter>
            <Filter
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              allLabel="All statuses"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </Filter>
            {filtersApplied && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => {
                  setTeamFilter("");
                  setCourseFilter("");
                  setStatusFilter("");
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {/*
           * On a phone the table scrolls sideways inside this panel, with the
           * employee column pinned so you always know whose row you are reading.
           */}
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-4xl text-small">
              <thead>
                <tr className="border-b border-steel">
                  <SortableHeader
                    column="employee_name"
                    sort={sort}
                    onSort={setSort}
                    className="sticky left-0 border-r border-steel bg-surface"
                  >
                    Employee
                  </SortableHeader>
                  <SortableHeader column="course_title" sort={sort} onSort={setSort}>
                    Course
                  </SortableHeader>
                  <SortableHeader column="status" sort={sort} onSort={setSort}>
                    Status
                  </SortableHeader>
                  <SortableHeader column="best_score" sort={sort} onSort={setSort}>
                    Best score
                  </SortableHeader>
                  <SortableHeader column="due_date" sort={sort} onSort={setSort}>
                    Due date
                  </SortableHeader>
                  <th scope="col" className="px-3 py-3 text-right font-medium text-ink-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-ink-muted">
                      Loading…
                    </td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-ink-muted">
                      No assignments match these filters.
                    </td>
                  </tr>
                ) : (
                  sorted.map((r) => (
                    <AssignmentRow
                      key={r.id}
                      row={r}
                      onEdit={() => setEditing(r)}
                      onStatusChange={(status) => patchStatus(r.id, status)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editing && (
        <EditAssignmentModal
          row={editing}
          teams={teams}
          employees={employees}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setRows((curr) =>
              curr.map((x) =>
                x.id === updated.id
                  ? {
                      ...x,
                      due_date: updated.due_date,
                      user_id: updated.user_id,
                      employee_name:
                        employees.find((e) => e.id === updated.user_id)?.name ?? x.employee_name,
                      team_id:
                        employees.find((e) => e.id === updated.user_id)?.team_id ?? x.team_id,
                    }
                  : x,
              ),
            );
            setEditing(null);
          }}
        />
      )}
    </AdminShell>
  );
}

/** One labelled filter. A native select stays reliable on a phone and with a keyboard. */
function Filter({
  label,
  value,
  onChange,
  allLabel,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  children: ReactNode;
}) {
  const id = `filter-${label.toLowerCase()}`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-small font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-sm border border-steel-strong bg-surface px-3 text-small text-ink"
      >
        <option value="">{allLabel}</option>
        {children}
      </select>
    </div>
  );
}

function SortableHeader({
  column,
  sort,
  onSort,
  className,
  children,
}: {
  column: SortColumn;
  sort: Sort;
  onSort: (sort: Sort) => void;
  className?: string;
  children: ReactNode;
}) {
  const active = sort.column === column;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-3 py-3 text-left font-medium text-ink-muted", className)}
    >
      <button
        type="button"
        onClick={() =>
          onSort({ column, direction: active && sort.direction === "asc" ? "desc" : "asc" })
        }
        className="inline-flex items-center gap-1 rounded-sm hover:text-ink"
      >
        {children}
        {!active ? (
          <ChevronsUpDown aria-hidden className="size-4 text-steel-strong" />
        ) : sort.direction === "asc" ? (
          <ChevronUp aria-hidden className="size-4" />
        ) : (
          <ChevronDown aria-hidden className="size-4" />
        )}
      </button>
    </th>
  );
}

/** How late something is, in whole days. Overdue is never colour alone. */
function overdueDays(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - due.getTime()) / 86_400_000);
}

function AssignmentRow({
  row,
  onEdit,
  onStatusChange,
}: {
  row: Row;
  onEdit: () => void;
  onStatusChange: (status: Status) => void;
}) {
  const late =
    row.status !== "complete" &&
    row.status !== "cancelled" &&
    row.due_date &&
    new Date(row.due_date).getTime() < Date.now()
      ? overdueDays(row.due_date)
      : null;

  return (
    <tr className="border-b border-steel last:border-b-0">
      <td className="sticky left-0 border-r border-steel bg-surface px-3 py-3 text-ink">
        {row.employee_name}
      </td>
      <td className="px-3 py-3 text-ink">{row.course_title}</td>
      <td className="px-3 py-3">
        <StatusTag status={row.status} />
      </td>
      <td className="px-3 py-3">
        {row.best_score != null ? (
          <TemperProgress
            value={row.best_score}
            label={`Best score, ${row.course_title}`}
            className="min-w-28"
          />
        ) : (
          <span className="text-ink-muted">—</span>
        )}
      </td>
      <td className="px-3 py-3">
        {row.due_date ? (
          <>
            <span className={late !== null ? "font-medium text-oxide" : "text-ink"}>
              {new Date(row.due_date).toLocaleDateString()}
            </span>
            {late !== null && (
              <span className="block text-small text-oxide">
                {late === 0
                  ? "Due today"
                  : late === 1
                    ? "Overdue by 1 day"
                    : `Overdue by ${late} days`}
              </span>
            )}
          </>
        ) : (
          <span className="text-ink-muted">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-right whitespace-nowrap">
        {row.status === "cancelled" && (
          <Button
            variant="outline"
            size="sm"
            className="mr-2"
            onClick={() => onStatusChange("not_started")}
          >
            Undo
          </Button>
        )}
        <Button variant="outline" size="sm" className="mr-2" onClick={onEdit}>
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="hover:border-oxide hover:text-oxide"
          onClick={() => {
            if (!confirm("Are you sure you want to cancel this assignment?")) return;
            onStatusChange("cancelled");
          }}
        >
          Cancel
        </Button>
      </td>
    </tr>
  );
}

/*
 * Status on the temper scale: cold steel before anything starts, bronze once the
 * work is under way, blue when it is done. Cancelled stays flat — it is not a
 * stage of progress, so it gets no temper colour.
 */
function StatusTag({ status }: { status: Status }) {
  const tone: Record<Status, string> = {
    not_started: "border-steel-strong text-ink-muted",
    in_progress: "border-temper-bronze bg-temper-bronze/10 text-temper-bronze",
    complete: "border-temper-blue bg-temper-blue/10 text-temper-blue",
    cancelled: "border-steel text-ink-muted line-through",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-small font-medium whitespace-nowrap",
        tone[status],
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

function EditAssignmentModal({
  row,
  teams,
  employees,
  onClose,
  onSaved,
}: {
  row: Row;
  teams: Team[];
  employees: Employee[];
  onClose: () => void;
  onSaved: (u: { id: string; due_date: string | null; user_id: string }) => void;
}) {
  const current = employees.find((e) => e.id === row.user_id);
  const [teamId, setTeamId] = useState<string>(current?.team_id ?? "");
  const [userId, setUserId] = useState<string>(row.user_id);
  const [dueDate, setDueDate] = useState<string>(
    row.due_date ? new Date(row.due_date).toISOString().slice(0, 10) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = teamId ? employees.filter((e) => e.team_id === teamId) : employees;

  const fieldCls =
    "h-9 w-full rounded-sm border border-steel-strong bg-surface px-3 text-small text-ink";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!userId) {
      setError("Select an employee.");
      return;
    }
    setSaving(true);
    const { error: upErr } = await supabase
      .from("assignments")
      .update({
        user_id: userId,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      })
      .eq("id", row.id);
    setSaving(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    onSaved({
      id: row.id,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      user_id: userId,
    });
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-heading-3">Edit assignment</DialogTitle>
          <DialogDescription>{row.course_title}</DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="edit-team" className="block text-small font-medium text-ink">
              Team
            </label>
            <select
              id="edit-team"
              value={teamId}
              onChange={(e) => {
                const t = e.target.value;
                setTeamId(t);
                const list = t ? employees.filter((emp) => emp.team_id === t) : employees;
                if (!list.some((emp) => emp.id === userId)) setUserId(list[0]?.id ?? "");
              }}
              className={fieldCls}
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-employee" className="block text-small font-medium text-ink">
              Employee
            </label>
            <select
              id="edit-employee"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className={fieldCls}
            >
              <option value="">Select an employee…</option>
              {visible.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-due" className="block text-small font-medium text-ink">
              Due date
            </label>
            <input
              id="edit-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={fieldCls}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-sm border border-oxide/40 bg-oxide/10 px-3 py-2 text-small text-oxide"
            >
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
