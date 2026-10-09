/**
 * Sorting shared by the admin tables (Assignments, Courses, Employees). They
 * all sort the same way, so the rule about empty values lives here once:
 *
 * a row with nothing to compare — no score yet, no due date, never assigned —
 * always sits last, whichever direction the column is sorted. Flipping the
 * direction should reorder the rows that have a value, not drag the blanks to
 * the top where they look like the most important ones.
 */

export type SortDirection = "asc" | "desc";
export type Sort<Column extends string> = { column: Column; direction: SortDirection };

/** Clicking a header sorts by it ascending, or flips it if it is already sorted. */
export function nextSort<Column extends string>(
  current: Sort<Column>,
  column: Column,
): Sort<Column> {
  const active = current.column === column;
  return { column, direction: active && current.direction === "asc" ? "desc" : "asc" };
}

/** What a row compares as for the sorted column. `null` means "nothing to compare". */
export type SortValue = string | number | null;

export function sortRows<Row, Column extends string>(
  rows: Row[],
  sort: Sort<Column>,
  valueOf: (row: Row, column: Column) => SortValue,
): Row[] {
  return [...rows].sort((x, y) => {
    const a = valueOf(x, sort.column);
    const b = valueOf(y, sort.column);
    if (a === null) return b === null ? 0 : 1;
    if (b === null) return -1;
    const order = a < b ? -1 : a > b ? 1 : 0;
    return sort.direction === "asc" ? order : -order;
  });
}
