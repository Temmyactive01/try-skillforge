// Demo data for the screenshot runs. The admin company's assignments cover every status,
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

export type AdminScreenshotData = Awaited<ReturnType<typeof createAdminScreenshotData>>;

export async function createAdminScreenshotData() {
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

/*
 * --- The employee experience -------------------------------------------------
 *
 * A company of its own, so the admin screenshots above keep the data they were
 * captured with. An employee never sees their company's name, so which company
 * the shots come from is invisible — but changing the admin seed to suit the
 * employee pages would quietly change every committed admin screenshot.
 *
 * One employee carries the whole mix a training list has to order: overdue, due
 * soon, due later, no due date, in progress and complete. A second has nothing
 * assigned, for the empty state. The quiz screens get a fresh employee per
 * capture pass, because taking a quiz changes the data it was taken from.
 */

/** Every question's correct answer is the second option, as in the admin seed. */
const CORRECT_INDEX = 1;

const QUIZ_COURSE = {
  title: "Lifting and carrying safely",
  category: "Safety",
  description: "How to pick up, carry and set down a load without hurting your back.",
  /*
   * Real paragraphs, not hard-wrapped lines: course content is stored as the
   * admin typed it and the page decides where the lines break, so pre-wrapping
   * it here would wrap twice on a phone and hide whether the page is holding
   * its lines under 70 characters.
   */
  content: [
    "Most lifting injuries at work happen during routine jobs, not unusual ones.",
    "Before you lift, look at the load and at the route you will take with it. Check the weight, look for a label, and clear anything you would otherwise have to step over. If a load is awkward rather than heavy, that still counts: a light box you cannot see past is more dangerous than a heavy one you can.",
    "When you lift, stand close to the load with your feet apart. Bend at the knees and hips rather than at your back, and keep the load close to your body at about waist height. Turn with your feet instead of twisting at the waist.",
    "If a load is too heavy or too awkward to manage alone, stop. Ask a colleague for help, or use a trolley. Nothing on site needs moving badly enough to be worth an injury.",
  ].join("\n\n"),
  questions: [
    {
      text: "Before lifting a load, what should you check first?",
      options: [
        "Whether anyone is watching",
        "The weight of the load and the route you will take",
        "How quickly you can carry it",
        "Whether the load is cold to the touch",
      ],
    },
    {
      text: "Where should a load be held while you carry it?",
      options: [
        "As far from your body as your arms allow",
        "Close to your body, at about waist height",
        "Above your head, resting on both hands",
        "Behind your back, with both arms hooked under it",
      ],
    },
    {
      text: "What should you do if a load is too heavy to lift alone?",
      options: [
        "Lift it quickly, to get it over with",
        "Ask a colleague for help, or use a trolley",
        "Drag it along the floor instead",
        "Lift it with your knees locked",
      ],
    },
    {
      text: "How should your back be positioned during a lift?",
      options: [
        "Bent forward from the waist",
        "Kept straight, bending at the knees and hips",
        "Twisted towards the load",
        "Arched backwards to balance the weight",
      ],
    },
  ],
};

/*
 * The learner's training, listed here in the order the rows happen to be
 * created rather than the order the page shows them: the point of the
 * screenshot is that the page does the ordering.
 */
const MY_TRAINING: {
  title: string;
  category: string;
  status: Status;
  due: number | null;
  score: number | null;
}[] = [
  { title: "Working at height", category: "Safety", status: "complete", due: -12, score: 100 },
  {
    title: "Spotting phishing emails",
    category: "Security",
    status: "not_started",
    due: 9,
    score: null,
  },
  { title: "Fire safety at work", category: "Safety", status: "not_started", due: -3, score: null },
  {
    title: "Manual handling for new starters",
    category: "Onboarding",
    status: "not_started",
    due: null,
    score: null,
  },
  {
    title: "Data protection essentials",
    category: "Compliance",
    status: "in_progress",
    due: 2,
    score: 50,
  },
  // Cancelled training is the admin's business, not the employee's: it must not appear.
  { title: "Forklift awareness", category: "Safety", status: "cancelled", due: 4, score: null },
  {
    title: "Keeping customer records tidy",
    category: "Compliance",
    status: "complete",
    due: -30,
    score: 75,
  },
];

export type EmployeeScreenshotData = Awaited<ReturnType<typeof createEmployeeScreenshotData>>;

export async function createEmployeeScreenshotData() {
  const admin = adminClient();

  const company = must(
    await admin
      .from("companies")
      .insert({ name: testCompanyName("Employee view") })
      .select("id")
      .single(),
    "create employee-view company",
  );

  // An admin exists only because a company without one is not a state the app can reach.
  await createUser(company.id, "Grace Okafor", "admin");

  const learner = await createUser(company.id, "Amara Nwosu", "employee");
  const newStarter = await createUser(company.id, "Ife Adeyemi", "employee");

  /** A course with a four-option quiz. */
  async function course(title: string, category: string, questionCount = 4) {
    const row = must(
      await admin
        .from("courses")
        .insert({
          company_id: company.id,
          title,
          description: "Short course used for the design screenshots.",
          content_type: "text",
          content_url: "Read this, then take the quiz.",
          category,
        })
        .select("id")
        .single(),
      `create course ${title}`,
    );
    ok(
      await admin.from("quiz_questions").insert(
        questions(questionCount).map((q) => ({
          course_id: row.id,
          question_text: q.text,
          options: q.options,
          correct_answer: q.correct,
        })),
      ),
      `create questions for ${title}`,
    );
    return row.id;
  }

  for (const item of MY_TRAINING) {
    const courseId = await course(item.title, item.category);
    const assignment = must(
      await admin
        .from("assignments")
        .insert({
          course_id: courseId,
          user_id: learner.id,
          status: item.status,
          due_date: item.due === null ? null : day(item.due),
        })
        .select("id")
        .single(),
      `assign ${item.title}`,
    );
    if (item.score === null) continue;
    ok(
      await admin.from("quiz_results").insert({
        assignment_id: assignment.id,
        score: item.score,
        passed: item.score >= 70,
        completed_at: new Date(Date.now() - 86_400_000).toISOString(),
      }),
      `record an attempt on ${item.title}`,
    );
  }

  // The course the quiz screens are captured from: real content, real questions.
  const quizCourse = must(
    await admin
      .from("courses")
      .insert({
        company_id: company.id,
        title: QUIZ_COURSE.title,
        description: QUIZ_COURSE.description,
        content_type: "text",
        content_url: QUIZ_COURSE.content,
        category: QUIZ_COURSE.category,
      })
      .select("id")
      .single(),
    "create the quiz course",
  );
  ok(
    await admin.from("quiz_questions").insert(
      QUIZ_COURSE.questions.map((q) => ({
        course_id: quizCourse.id,
        question_text: q.text,
        options: q.options,
        correct_answer: q.options[CORRECT_INDEX],
      })),
    ),
    "create the quiz course's questions",
  );

  /**
   * A fresh employee with the quiz course assigned. Taking a quiz changes the
   * assignment it was taken from, so every capture pass gets its own.
   */
  async function quizTaker() {
    const user = await createUser(company.id, "Daniel Mensah", "employee");
    ok(
      await admin.from("assignments").insert({
        course_id: quizCourse.id,
        user_id: user.id,
        status: "not_started",
        due_date: day(5),
      }),
      "assign the quiz course",
    );
    return user;
  }

  return {
    companyId: company.id,
    learner: { email: learner.email, name: learner.name },
    newStarter: { email: newStarter.email, name: newStarter.name },
    quizCourse: {
      title: QUIZ_COURSE.title,
      questions: QUIZ_COURSE.questions.map((q) => ({
        text: q.text,
        correct: q.options[CORRECT_INDEX],
        wrong: q.options[(CORRECT_INDEX + 1) % q.options.length],
      })),
    },
    quizTaker,
  };
}
