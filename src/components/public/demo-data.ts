/*
 * The example data behind every product view on the public site.
 *
 * Three rules it has to keep:
 *
 *  1. **It is example data and says so.** Every frame that shows it carries
 *     the words. Nothing here is a customer, a number anyone has measured, or
 *     a claim about use.
 *  2. **It never goes stale.** Deadlines are written as the words the app
 *     would print ("Due in 3 days"), not as dates computed from `new Date()`.
 *     A computed date would read differently on the server and in the
 *     reader's own timezone, which is a hydration mismatch, and a hardcoded
 *     one would be in the past by next year.
 *  3. **It agrees with itself.** The tour shows the same demo company from
 *     four angles, so the dashboard figures and the per-course completion are
 *     *derived* from the assignment list below rather than typed out beside
 *     it. Editing one row keeps the whole tour consistent.
 *
 * The scores cover all four temper stages — straw, bronze, violet, blue —
 * because showing the whole scale at a glance is what the hero is for.
 */

import type { TagTone } from "@/components/ui/tag";

/** How a deadline is written, and which of DESIGN.md's treatments it gets. */
export type DemoDue = { label: string; tone: "overdue" | "soon" | "plain" | "none" };

export type DemoStatus = "not_started" | "in_progress" | "complete";

export const STATUS_LABEL: Record<DemoStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
};

/** The same tones the real assignments table uses. Cancelled cannot occur here. */
export const STATUS_TONE: Record<DemoStatus, TagTone> = {
  not_started: "quiet",
  in_progress: "bronze",
  complete: "blue",
};

export type DemoAssignment = {
  employee: string;
  course: string;
  status: DemoStatus;
  /** Best quiz score, or null where nobody has attempted it yet. */
  score: number | null;
  due: DemoDue;
};

/** Ordered by employee name, the way the table opens. */
export const DEMO_ASSIGNMENTS: DemoAssignment[] = [
  {
    employee: "Amara Nwosu",
    course: "Fire safety at work",
    status: "complete",
    score: 92,
    due: { label: "Finished last month", tone: "plain" },
  },
  {
    employee: "Daniel Okafor",
    course: "Data protection essentials",
    status: "in_progress",
    score: 58,
    due: { label: "Due in 3 days", tone: "soon" },
  },
  {
    employee: "Daniel Okafor",
    course: "Fire safety at work",
    status: "complete",
    score: 100,
    due: { label: "Finished last week", tone: "plain" },
  },
  {
    employee: "Daniel Okafor",
    course: "Manual handling",
    status: "not_started",
    score: null,
    due: { label: "Due in 2 weeks", tone: "plain" },
  },
  {
    employee: "Lena Brandt",
    course: "Data protection essentials",
    status: "in_progress",
    score: 22,
    due: { label: "Overdue by 2 days", tone: "overdue" },
  },
  {
    employee: "Priya Shah",
    course: "Manual handling",
    status: "complete",
    score: 100,
    due: { label: "Finished yesterday", tone: "plain" },
  },
  {
    employee: "Ruth Mensah",
    course: "Data protection essentials",
    status: "complete",
    score: 74,
    due: { label: "Finished 3 days ago", tone: "plain" },
  },
  {
    employee: "Tomas Kovac",
    course: "Fire safety at work",
    status: "complete",
    score: 86,
    due: { label: "Finished 3 days ago", tone: "plain" },
  },
];

export type DemoCourse = {
  title: string;
  category: string;
  questions: number;
  /** Filled in from the assignment list, not typed out. */
  assigned: number;
  completion: number;
};

const COURSE_SHAPE = [
  { title: "Fire safety at work", category: "Health and safety", questions: 6 },
  { title: "Data protection essentials", category: "Compliance", questions: 8 },
  { title: "Manual handling", category: "Health and safety", questions: 4 },
];

const pct = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

export const DEMO_COURSES: DemoCourse[] = COURSE_SHAPE.map((course) => {
  const rows = DEMO_ASSIGNMENTS.filter((row) => row.course === course.title);
  const done = rows.filter((row) => row.status === "complete").length;
  return { ...course, assigned: rows.length, completion: pct(done, rows.length) };
});

/** The three dashboard panels, counted from the same rows the table shows. */
export const DEMO_DASHBOARD = {
  completion: pct(
    DEMO_ASSIGNMENTS.filter((row) => row.status === "complete").length,
    DEMO_ASSIGNMENTS.length,
  ),
  complete: DEMO_ASSIGNMENTS.filter((row) => row.status === "complete").length,
  total: DEMO_ASSIGNMENTS.length,
  activeCourses: DEMO_COURSES.filter((course) => course.assigned > 0).length,
  courses: DEMO_COURSES.length,
  overdue: DEMO_ASSIGNMENTS.filter((row) => row.due.tone === "overdue").length,
  /** Matches the one overdue row's wording above. */
  oldestOverdueDays: 2,
};

export type DemoTraining = {
  course: string;
  category: string;
  status: DemoStatus;
  score: number | null;
  due: DemoDue;
  /** The button's words, which the real page takes from the status. */
  action: string;
};

/**
 * The same company from the other side: Daniel Okafor's own list, ordered by
 * deadline with the outstanding work first, exactly as the real page orders it.
 */
export const DEMO_TRAINING: DemoTraining[] = [
  {
    course: "Data protection essentials",
    category: "Compliance",
    status: "in_progress",
    score: 58,
    due: { label: "Due in 3 days", tone: "soon" },
    action: "Continue",
  },
  {
    course: "Manual handling",
    category: "Health and safety",
    status: "not_started",
    score: null,
    due: { label: "Due in 2 weeks", tone: "plain" },
    action: "Start",
  },
  {
    course: "Fire safety at work",
    category: "Health and safety",
    status: "complete",
    score: 100,
    due: { label: "Completed last week", tone: "plain" },
    action: "Review",
  },
];

/** One question from the course Daniel is part way through. */
export const DEMO_QUIZ = {
  course: "Data protection essentials",
  position: "Question 3 of 8",
  question: "A colleague emails asking for a customer list for a supplier. What do you do first?",
  options: [
    "Send it, because the request came from inside the company",
    "Check whether the supplier is covered by a data-sharing agreement",
    "Forward the request to the customer",
    "Send it with the names removed",
  ],
  /** Index of the option shown as chosen. Nothing here is gradeable. */
  chosen: 1,
};
