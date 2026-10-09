// Demo data for the screenshot run: one company whose assignments cover every status,
// every temper stage and the overdue case, plus an empty company for the
// getting-started state. Uses the same E2E naming and guarded cleanup as the tests,
// so demo data and real companies are never touched.
import { adminClient, createUser, signedInClient, testCompanyName, type Question } from "./helpers";

function must<T>(result: { data: T; error: { message: string } | null }, what: string) {
  if (result.error || result.data == null) {
    throw new Error(`${what}: ${result.error?.message ?? "no data returned"}`);
  }
  return result.data as NonNullable<T>;
}
function ok(result: { error: { message: string } | null }, what: string) {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
}

/** A date `days` from now as YYYY-MM-DD. Negative is in the past. */
const day = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

function questions(count: number): Question[] {
  // Scores are only believable if they're reachable: a 4-question quiz can score 25/50/75.
  return Array.from({ length: count }, (_, i) => ({
    text: `Question ${i + 1}`,
    options: ["First option", "Second option", "Third option", "Fourth option"],
    correct: "Second option",
  }));
}

const COURSES = [
  { title: "Data protection essentials", category: "Compliance", questionCount: 3 },
  { title: "Fire safety at work", category: "Safety", questionCount: 4 },
  { title: "Spotting phishing emails", category: "Security", questionCount: 3 },
  { title: "Manual handling for new starters", category: "Onboarding", questionCount: 3 },
];

const EMPLOYEES = [
  { name: "Amara Nwosu", team: "Operations" },
  { name: "Daniel Mensah", team: "Operations" },
  { name: "Priya Raman", team: "Operations" },
  { name: "Lukas Weber", team: "Sales" },
  { name: "Sofia Alvarez", team: "Sales" },
  { name: "Tomás Silva", team: "Sales" },
];

type Status = "not_started" | "in_progress" | "complete" | "cancelled";

// [employee, course, status, due in days (null = no date), best score (null = no attempt)]
// Chosen so the table shows: all four statuses; all four temper stages (33 straw,
// 50 bronze, 75 violet, 100 blue); two overdue rows; and a row with no due date.
// Complete rows always score 70+ and in-progress rows below 70, as the grader enforces.
const ASSIGNMENTS: [number, number, Status, number | null, number | null][] = [
  [0, 0, "complete", -5, 100],
  [1, 1, "complete", -4, 100],
  [4, 1, "complete", -1, 75],
  [2, 1, "in_progress", 2, 50],
  [3, 1, "in_progress", 9, 25],
  [0, 3, "in_progress", -2, 33],
  [1, 2, "not_started", -6, null],
  [4, 2, "not_started", 14, null],
  [5, 0, "not_started", null, null],
  [2, 0, "cancelled", 5, null],
];

/**
 * Has this employee done anything that requires having signed in? Any status
 * past "not started", or any recorded attempt. Derived from ASSIGNMENTS rather
 * than listed by hand, so editing that table can't leave the two out of step.
 */
function hasStartedSomething(employeeIndex: number) {
  return ASSIGNMENTS.some(
    ([emp, , status, , score]) =>
      emp === employeeIndex &&
      (status === "in_progress" || status === "complete" || score !== null),
  );
}

export type ScreenshotData = Awaited<ReturnType<typeof createScreenshotData>>;

export async function createScreenshotData() {
  const admin = adminClient();

  // --- The company with data -------------------------------------------------
  const company = must(
    await admin
      .from("companies")
      .insert({ name: testCompanyName("Screenshots") })
      .select("id")
      .single(),
    "create company",
  );
  const companyAdmin = await createUser(company.id, "Grace Okafor", "admin");

  const teams = must(
    await admin
      .from("teams")
      .insert([
        { company_id: company.id, name: "Operations" },
        { company_id: company.id, name: "Sales" },
      ])
      .select("id, name"),
    "create teams",
  );
  const teamId = (name: string) => teams.find((t) => t.name === name)?.id ?? null;

  const employeeIds: string[] = [];
  for (const [index, e] of EMPLOYEES.entries()) {
    const user = await createUser(company.id, e.name, "employee", teamId(e.team));
    employeeIds.push(user.id);
    /*
     * "Invited" means an account nobody has signed in to yet, which is what
     * createUser leaves behind. Anyone the table above gives progress to must
     * therefore be signed in once: you cannot start a course, let alone pass
     * its quiz, without signing in, so "Invited" beside a completion figure is
     * a state the real app can never produce.
     */
    if (hasStartedSomething(index)) await signedInClient(user.email);
  }

  const courseIds: string[] = [];
  for (const c of COURSES) {
    const course = must(
      await admin
        .from("courses")
        .insert({
          company_id: company.id,
          title: c.title,
          description: "Short course used for the design screenshots.",
          content_type: "text",
          content_url: "Read this, then take the quiz.",
          category: c.category,
        })
        .select("id")
        .single(),
      `create course ${c.title}`,
    );
    courseIds.push(course.id);
    ok(
      await admin.from("quiz_questions").insert(
        questions(c.questionCount).map((q) => ({
          course_id: course.id,
          question_text: q.text,
          options: q.options,
          correct_answer: q.correct,
        })),
      ),
      `create questions for ${c.title}`,
    );
  }

  for (const [emp, courseIdx, status, due, score] of ASSIGNMENTS) {
    const assignment = must(
      await admin
        .from("assignments")
        .insert({
          course_id: courseIds[courseIdx],
          user_id: employeeIds[emp],
          status,
          due_date: due === null ? null : day(due),
        })
        .select("id")
        .single(),
      "create assignment",
    );
    if (score === null) continue;
    // An earlier, weaker attempt on the first row proves the table shows the best score.
    const attempts = emp === 0 && courseIdx === 0 ? [67, score] : [score];
    ok(
      await admin.from("quiz_results").insert(
        attempts.map((s, i) => ({
          assignment_id: assignment.id,
          score: s,
          passed: s >= 70,
          completed_at: new Date(Date.now() - (attempts.length - i) * 86_400_000).toISOString(),
        })),
      ),
      "create quiz result",
    );
  }

  // --- A brand-new company, for the getting-started state --------------------
  const empty = must(
    await admin
      .from("companies")
      .insert({ name: testCompanyName("New company") })
      .select("id")
      .single(),
    "create empty company",
  );
  const emptyAdmin = await createUser(empty.id, "Jon Mensah", "admin");

  return {
    admin: { email: companyAdmin.email, name: companyAdmin.name },
    newAdmin: { email: emptyAdmin.email, name: emptyAdmin.name },
  };
}
