/*
 * Unit tests for the training ordering rule. Like e2e/dates.spec.ts these need
 * no browser: the rule is a pure function, and the cases that matter (equal
 * dates, nothing dated, nothing outstanding) are tedious to set up as real
 * assignments and trivial to state here. The e2e test proves the page uses it.
 */
import { test, expect } from "@playwright/test";
import { isOverdue, splitTraining, visibleToEmployee } from "../src/lib/training";
import type { TrainingStatus } from "../src/lib/training";

const NOW = new Date(2026, 9, 15, 12, 0); // 15 October 2026, local noon

/** A training item, named so a test can assert on the order by name. */
const item = (name: string, status: TrainingStatus, due_date: string | null = null) => ({
  name,
  status,
  due_date,
});

test("cancelled training never reaches the employee", () => {
  const items = [
    item("Fire safety", "not_started", "2026-10-20"),
    item("Forklift awareness", "cancelled", "2026-10-19"),
    item("Working at height", "complete", "2026-10-01"),
  ];
  expect(visibleToEmployee(items).map((i) => i.name)).toEqual(["Fire safety", "Working at height"]);

  const { todo, done } = splitTraining(items);
  expect([...todo, ...done].map((i) => i.name)).not.toContain("Forklift awareness");
});

test("overdue training comes first, most overdue at the top", () => {
  const { todo } = splitTraining([
    item("Due in five days", "not_started", "2026-10-20"),
    item("Overdue by two days", "not_started", "2026-10-13"),
    item("Overdue by ten days", "in_progress", "2026-10-05"),
    item("Due tomorrow", "not_started", "2026-10-16"),
  ]);
  expect(todo.map((i) => i.name)).toEqual([
    "Overdue by ten days",
    "Overdue by two days",
    "Due tomorrow",
    "Due in five days",
  ]);
});

test("training with no deadline sits below everything that has one", () => {
  const { todo } = splitTraining([
    item("No deadline", "not_started", null),
    item("Due in a year", "not_started", "2027-10-15"),
    item("Overdue", "not_started", "2026-01-01"),
  ]);
  expect(todo.map((i) => i.name)).toEqual(["Overdue", "Due in a year", "No deadline"]);
});

test("with no deadline either way, what you have started comes first", () => {
  const { todo } = splitTraining([
    item("Not opened", "not_started", null),
    item("Half done", "in_progress", null),
  ]);
  expect(todo.map((i) => i.name)).toEqual(["Half done", "Not opened"]);
});

test("status does not outrank a deadline", () => {
  // Something not yet started but due tomorrow beats something in progress but
  // due next month: the deadline is the thing that can be missed.
  const { todo } = splitTraining([
    item("In progress, due next month", "in_progress", "2026-11-20"),
    item("Not started, due tomorrow", "not_started", "2026-10-16"),
  ]);
  expect(todo.map((i) => i.name)).toEqual([
    "Not started, due tomorrow",
    "In progress, due next month",
  ]);
});

test("finished training is kept apart, most recently due first", () => {
  const { todo, done } = splitTraining([
    item("Finished last year", "complete", "2025-10-01"),
    item("Still to do", "not_started", "2026-10-20"),
    item("Finished last month", "complete", "2026-09-10"),
    item("Finished, never dated", "complete", null),
  ]);
  expect(todo.map((i) => i.name)).toEqual(["Still to do"]);
  expect(done.map((i) => i.name)).toEqual([
    "Finished last month",
    "Finished last year",
    "Finished, never dated",
  ]);
});

test("nothing outstanding leaves an empty to-do group, not a mixed list", () => {
  const { todo, done } = splitTraining([
    item("One", "complete", "2026-10-01"),
    item("Two", "complete", "2026-10-02"),
  ]);
  expect(todo).toEqual([]);
  expect(done).toHaveLength(2);
});

test("finished training is never overdue, however long ago it was due", () => {
  expect(isOverdue(item("x", "complete", "2020-01-01"), NOW)).toBe(false);
  expect(isOverdue(item("x", "cancelled", "2020-01-01"), NOW)).toBe(false);
  expect(isOverdue(item("x", "not_started", null), NOW)).toBe(false);
  expect(isOverdue(item("x", "not_started", "2026-10-14"), NOW)).toBe(true);
  // Due today is not overdue until the day is out.
  expect(isOverdue(item("x", "not_started", "2026-10-15"), NOW)).toBe(false);
});
