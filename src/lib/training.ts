/*
 * How an employee's training is ordered.
 *
 * DESIGN.md: "Admins scan, employees focus." An admin gets a sortable table and
 * decides what to look at; an employee gets one question — what should I do
 * next? — so the page answers it rather than offering to sort.
 *
 * The rule lives here, away from the page, because it is the part worth testing
 * on its own: it has more cases than it looks like, and none of them need a
 * browser to check.
 */
import { daysUntil } from "@/lib/dates";

export type TrainingStatus = "not_started" | "in_progress" | "complete" | "cancelled";

/** The least an item needs for the rules below to apply to it. */
export type Orderable = {
  status: TrainingStatus;
  due_date: string | null;
};

/**
 * Cancelled training never reaches the employee.
 *
 * Cancelling is the admin saying "you no longer need to do this". Showing it
 * would put a row on the page that the employee cannot act on and cannot get
 * rid of, and the only thing they could do about it is ask someone. The admin
 * keeps the record either way: the row is still there, still restorable, and
 * still counted out of the dashboard figures.
 */
export function visibleToEmployee<T extends Orderable>(items: T[]): T[] {
  return items.filter((item) => item.status !== "cancelled");
}

/** Past its due date and not finished. The admin's Assignments page counts it the same way. */
export function isOverdue(item: Orderable, now: Date = new Date()) {
  return (
    item.status !== "complete" &&
    item.status !== "cancelled" &&
    item.due_date !== null &&
    daysUntil(item.due_date, now) < 0
  );
}

/**
 * Outstanding training, most urgent first.
 *
 * Anything with a deadline comes before anything without one, soonest first —
 * which puts overdue work at the very top for free, since a date in the past
 * sorts before every date in the future. Among items with no deadline at all,
 * something already started comes before something not yet touched: finishing
 * what you are in the middle of beats opening something new.
 */
function compareTodo(a: Orderable, b: Orderable) {
  if (a.due_date && b.due_date) {
    if (a.due_date !== b.due_date) return a.due_date < b.due_date ? -1 : 1;
  } else if (a.due_date !== b.due_date) {
    return a.due_date ? -1 : 1;
  }
  const started = (item: Orderable) => (item.status === "in_progress" ? 0 : 1);
  return started(a) - started(b);
}

/** Finished training, most recently due first. Undated sits at the end. */
function compareDone(a: Orderable, b: Orderable) {
  if (a.due_date && b.due_date) {
    if (a.due_date !== b.due_date) return a.due_date < b.due_date ? 1 : -1;
    return 0;
  }
  if (a.due_date !== b.due_date) return a.due_date ? -1 : 1;
  return 0;
}

/**
 * Splits training into what is left to do and what is finished.
 *
 * Two groups rather than one long sort, because a heading says "you have
 * nothing outstanding" far more plainly than a completed item simply happening
 * to be at the bottom of a list.
 */
export function splitTraining<T extends Orderable>(items: T[]) {
  const visible = visibleToEmployee(items);
  return {
    todo: visible.filter((item) => item.status !== "complete").sort(compareTodo),
    done: visible.filter((item) => item.status === "complete").sort(compareDone),
  };
}
