/**
 * One date format across the app: "2 Oct 2026". Fixed to en-GB rather than the
 * reader's locale, so a due date never reads as 10/2 to one person and 2/10 to
 * another — ambiguous dates are the kind of thing people miss deadlines over.
 */
const formatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(value: string | Date) {
  return formatter.format(typeof value === "string" ? new Date(value) : value);
}

/** Whole days between midnight today and midnight on the given date. Positive = in the past. */
export function daysLate(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - due.getTime()) / 86_400_000);
}

/** How late something is, in words. Overdue is never signalled by colour alone. */
export function overdueLabel(days: number) {
  if (days === 0) return "Due today";
  return days === 1 ? "Overdue by 1 day" : `Overdue by ${days} days`;
}
