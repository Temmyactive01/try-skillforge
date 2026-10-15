/*
 * Unit tests for the date helpers. No browser, no database, no dev server —
 * they run in the same Playwright runner as everything else purely because it
 * is already here and already reads TypeScript, so this costs no new tooling
 * and no new config. The whole file runs in milliseconds.
 *
 * The thing worth testing is the day boundary. A due date is a calendar day,
 * but `new Date("2026-10-15")` is midnight UTC, so the naive reading is a day
 * early for anyone west of Greenwich and an hour from being wrong for everyone
 * else. `now` is injectable, so each case pins the exact local instant it means.
 */
import { test, expect } from "@playwright/test";
import {
  daysUntil,
  dueLabel,
  finishedDueLabel,
  formatDate,
  overdueLabel,
  parseLocalDate,
} from "../src/lib/dates";

/** A local instant, built from local parts so it means the same in any timezone. */
const at = (
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
): Date => new Date(year, month - 1, day, hour, minute);

test("a date-only value is midnight on that local calendar day", () => {
  const parsed = parseLocalDate("2026-10-15");
  expect(parsed.getFullYear()).toBe(2026);
  expect(parsed.getMonth()).toBe(9); // October
  expect(parsed.getDate()).toBe(15);
  expect(parsed.getHours()).toBe(0);
});

test("a date reads the same however far west or east the reader is", () => {
  // The bug this guards: new Date("2026-10-15") is 00:00 UTC, which is the 14th
  // in New York. Whatever this machine's offset, the 15th must stay the 15th.
  expect(formatDate("2026-10-15")).toBe("15 Oct 2026");
  expect(formatDate("2026-01-01")).toBe("1 Jan 2026");
});

test("days are counted between local midnights, not in 24-hour blocks", () => {
  // One minute before midnight, tomorrow is still one day away — not zero.
  expect(daysUntil("2026-10-16", at(2026, 10, 15, 23, 59))).toBe(1);
  // One minute after midnight, it is today.
  expect(daysUntil("2026-10-16", at(2026, 10, 16, 0, 1))).toBe(0);
  expect(daysUntil("2026-10-15", at(2026, 10, 15, 0, 0))).toBe(0);
  expect(daysUntil("2026-10-15", at(2026, 10, 15, 23, 59))).toBe(0);
});

test("the count survives a daylight-saving change", () => {
  // The UK clocks go back on 25 October 2026, making that day 25 hours long.
  // Counted in 24-hour blocks the answer would be 1.04 days, not 1.
  expect(daysUntil("2026-10-26", at(2026, 10, 25, 12, 0))).toBe(1);
  expect(daysUntil("2026-10-25", at(2026, 10, 24, 12, 0))).toBe(1);
  // And forward again in March.
  expect(daysUntil("2026-03-30", at(2026, 3, 29, 12, 0))).toBe(1);
});

test("a due date is said the way a person would say it", () => {
  const now = at(2026, 10, 15);
  expect(dueLabel("2026-10-15", now)).toEqual({ label: "Due today", tone: "soon" });
  expect(dueLabel("2026-10-16", now)).toEqual({ label: "Due tomorrow", tone: "soon" });
  expect(dueLabel("2026-10-17", now)).toEqual({ label: "Due in 2 days", tone: "soon" });
  expect(dueLabel("2026-10-18", now)).toEqual({ label: "Due in 3 days", tone: "soon" });
  // Past "due soon", still counted in days, but no longer urgent.
  expect(dueLabel("2026-10-19", now)).toEqual({ label: "Due in 4 days", tone: "plain" });
  expect(dueLabel("2026-10-29", now)).toEqual({ label: "Due in 14 days", tone: "plain" });
  // Far enough out that a count of days says less than the date does.
  expect(dueLabel("2026-10-30", now)).toEqual({ label: "Due 30 Oct 2026", tone: "plain" });
  expect(dueLabel(null, now)).toEqual({ label: "No due date", tone: "none" });
});

test("overdue is counted in days and always carries the words", () => {
  const now = at(2026, 10, 15);
  expect(dueLabel("2026-10-14", now)).toEqual({ label: "Overdue by 1 day", tone: "overdue" });
  expect(dueLabel("2026-10-13", now)).toEqual({ label: "Overdue by 2 days", tone: "overdue" });
  expect(dueLabel("2026-09-15", now)).toEqual({ label: "Overdue by 30 days", tone: "overdue" });
  expect(overdueLabel(1)).toBe("Overdue by 1 day");
  expect(overdueLabel(2)).toBe("Overdue by 2 days");
});

test("the day something becomes overdue is exact", () => {
  // Due on the 15th: urgent all day on the 15th, overdue the moment it is the 16th.
  expect(dueLabel("2026-10-15", at(2026, 10, 15, 23, 59)).tone).toBe("soon");
  expect(dueLabel("2026-10-15", at(2026, 10, 15, 23, 59)).label).toBe("Due today");
  expect(dueLabel("2026-10-15", at(2026, 10, 16, 0, 1)).tone).toBe("overdue");
  expect(dueLabel("2026-10-15", at(2026, 10, 16, 0, 1)).label).toBe("Overdue by 1 day");
});

test("finished training has a due date, not a deadline", () => {
  // Nothing finished is overdue, however long ago it was due.
  expect(finishedDueLabel("2026-01-01")).toEqual({ label: "Due 1 Jan 2026", tone: "plain" });
  expect(finishedDueLabel(null)).toEqual({ label: "No due date", tone: "none" });
});
