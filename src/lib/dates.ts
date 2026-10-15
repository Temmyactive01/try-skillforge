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

/**
 * A stored date as midnight in the reader's own timezone.
 *
 * `new Date("2026-10-15")` is midnight *UTC*, not midnight here. East of
 * Greenwich that still lands on the 15th, so it looks fine from here; west of
 * it the same value lands on the 14th and every due date in the app reads a
 * day early. A due date is a calendar day — the 15th is the 15th wherever you
 * are — so a date-only value is pinned to the local calendar instead.
 *
 * Values that carry a time (a timestamp from the database) are left alone:
 * those really are instants.
 */
export function parseLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!dateOnly) return new Date(value);
  const [, year, month, day] = dateOnly;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function formatDate(value: string | Date) {
  return formatter.format(parseLocalDate(value));
}

/** Midnight on the day the given instant falls on, in the reader's own timezone. */
function startOfLocalDay(at: Date) {
  return new Date(at.getFullYear(), at.getMonth(), at.getDate());
}

/**
 * Whole calendar days from today to the given date. Negative is in the past.
 *
 * Counted between local midnights, so it answers "how many sleeps", not "how
 * many 24-hour periods" — the two disagree across a daylight-saving change,
 * and it is the calendar one people mean. `now` is injectable so the day
 * boundary can be tested without waiting for midnight.
 */
export function daysUntil(dueDate: string | Date, now: Date = new Date()) {
  const from = startOfLocalDay(now).getTime();
  const to = startOfLocalDay(parseLocalDate(dueDate)).getTime();
  // Math.round absorbs the hour a daylight-saving change adds or removes.
  return Math.round((to - from) / 86_400_000);
}

/** Whole days between midnight today and midnight on the given date. Positive = in the past. */
export function daysLate(dueDate: string | Date, now: Date = new Date()) {
  return -daysUntil(dueDate, now);
}

/** How late something is, in words. Overdue is never signalled by colour alone. */
export function overdueLabel(days: number) {
  if (days === 0) return "Due today";
  return days === 1 ? "Overdue by 1 day" : `Overdue by ${days} days`;
}

/** Within this many days counts as due soon. */
export const DUE_SOON_DAYS = 3;

/**
 * How a due date is said and how it is coloured.
 *
 * `overdue` is oxide, `soon` is a straw tint, and both always carry the words —
 * DESIGN.md: "Overdue is oxide, always with words, never colour alone."
 */
export type DueTone = "overdue" | "soon" | "plain" | "none";
export type Due = { label: string; tone: DueTone };

/**
 * A due date the way a person would say it.
 *
 * Near dates get words, because "Due in 2 days" is something you can act on and
 * "Due 17 Oct 2026" is something you have to work out. Far ones get the date,
 * because "Due in 86 days" is not how anyone talks.
 */
export function dueLabel(dueDate: string | null, now: Date = new Date()): Due {
  if (!dueDate) return { label: "No due date", tone: "none" };

  const days = daysUntil(dueDate, now);
  if (days < 0) return { label: overdueLabel(-days), tone: "overdue" };
  if (days === 0) return { label: "Due today", tone: "soon" };
  if (days === 1) return { label: "Due tomorrow", tone: "soon" };
  if (days <= DUE_SOON_DAYS) return { label: `Due in ${days} days`, tone: "soon" };
  if (days <= 14) return { label: `Due in ${days} days`, tone: "plain" };
  return { label: `Due ${formatDate(dueDate)}`, tone: "plain" };
}

/**
 * The due date of training that is already finished: a fact, not a deadline.
 * Nothing finished can be overdue, and nothing finished is urgent.
 */
export function finishedDueLabel(dueDate: string | null): Due {
  if (!dueDate) return { label: "No due date", tone: "none" };
  return { label: `Due ${formatDate(dueDate)}`, tone: "plain" };
}
