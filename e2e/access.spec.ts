// Company isolation and role rules, checked in the browser and with the same
// access a browser has (publishable key + the user's own login).
import { test, type Page } from "@playwright/test";
import {
  adminClient,
  assign,
  createCompany,
  createCourse,
  createUser,
  expect,
  open,
  signIn,
  signedInClient,
} from "./helpers";

type Company = Awaited<ReturnType<typeof setUpCompany>>;

async function setUpCompany(label: string) {
  const company = await createCompany(label);
  const employee = await createUser(company.id, `${label} Employee ${Date.now()}`);
  const courseTitle = `${label} Course ${Date.now()}`;
  const courseId = await createCourse(company.id, courseTitle);
  const assignmentId = await assign(courseId, employee.id);
  return { ...company, employee, courseTitle, courseId, assignmentId };
}

let a: Company;
let b: Company;

test.beforeAll(async () => {
  a = await setUpCompany("Alpha");
  b = await setUpCompany("Bravo");
});

test.describe("one company can't see another company's data", () => {
  test("in the admin pages", async ({ page }) => {
    await signIn(page, b.admin.email);

    /*
     * Courses and Employees now render a table and a card list at once and
     * show whichever fits, so a name that appears in both needs the visible
     * one. A name that must NOT appear still has to be absent from both.
     */
    const onScreen = (text: string) => page.getByText(text).filter({ visible: true });

    await open(page, "/admin/courses");
    await expect(onScreen(b.courseTitle).first()).toBeVisible();
    await expect(page.getByText(a.courseTitle)).toHaveCount(0);

    await open(page, "/admin/employees");
    await expect(onScreen(b.employee.email).first()).toBeVisible();
    await expect(page.getByText(a.employee.email)).toHaveCount(0);
    await expect(page.getByText(a.admin.email)).toHaveCount(0);

    await open(page, "/admin/assignments");
    await expect(page.getByRole("row").filter({ hasText: b.courseTitle })).toBeVisible();
    await expect(page.getByText(a.courseTitle)).toHaveCount(0);
    await expect(page.getByText(a.employee.name)).toHaveCount(0);
  });

  test("when querying the database directly", async () => {
    const asB = await signedInClient(b.admin.email);

    const company = await asB.from("companies").select("id").eq("id", a.id);
    expect(company.data).toEqual([]);
    const course = await asB.from("courses").select("id").eq("id", a.courseId);
    expect(course.data).toEqual([]);
    const questions = await asB.from("quiz_questions").select("id").eq("course_id", a.courseId);
    expect(questions.data).toEqual([]);
    const profile = await asB.from("profiles").select("id").eq("id", a.employee.id);
    expect(profile.data).toEqual([]);
    const assignment = await asB.from("assignments").select("id").eq("id", a.assignmentId);
    expect(assignment.data).toEqual([]);

    const insertCourse = await asB
      .from("courses")
      .insert({ company_id: a.id, title: "Sneaky course", content_type: "text" });
    expect(insertCourse.error, "insert a course into another company").not.toBeNull();

    const assignTheirEmployee = await asB
      .from("assignments")
      .insert({ course_id: b.courseId, user_id: a.employee.id });
    expect(assignTheirEmployee.error, "assign another company's employee").not.toBeNull();

    const assignTheirCourse = await asB
      .from("assignments")
      .insert({ course_id: a.courseId, user_id: b.employee.id });
    expect(assignTheirCourse.error, "assign another company's course").not.toBeNull();

    const update = await asB
      .from("courses")
      .update({ title: "Renamed by another company" })
      .eq("id", a.courseId)
      .select("id");
    expect(update.data ?? [], "update another company's course").toEqual([]);
  });
});

test.describe("an employee can't use admin features", () => {
  for (const path of [
    "/admin/dashboard",
    "/admin/courses",
    "/admin/assignments",
    "/admin/employees",
  ]) {
    test(`opening ${path} sends them to My training`, async ({ page }) => {
      await signIn(page, a.employee.email);
      await open(page, path);
      await page.waitForURL("**/employee/home");
      await expect(page.getByRole("heading", { name: "My training" })).toBeVisible();
    });
  }

  test("admin-only database writes are refused", async () => {
    const asEmployee = await signedInClient(a.employee.email);

    const insertCourse = await asEmployee
      .from("courses")
      .insert({ company_id: a.id, title: "Employee course", content_type: "text" });
    expect(insertCourse.error, "employee creates a course").not.toBeNull();

    const changeDue = await asEmployee
      .from("assignments")
      .update({ due_date: "2099-01-01" })
      .eq("id", a.assignmentId)
      .select("id");
    expect(changeDue.error, "employee changes their own due date").not.toBeNull();

    await asEmployee.from("profiles").update({ role: "admin" }).eq("id", a.employee.id);
    const after = await adminClient()
      .from("profiles")
      .select("role")
      .eq("id", a.employee.id)
      .single();
    expect(after.data?.role, "employee promotes themselves to admin").toBe("employee");
  });

  test("only passing the quiz can complete a course", async () => {
    const courseId = await createCourse(a.id, `Completion Course ${Date.now()}`);
    const assignmentId = await assign(courseId, a.employee.id);
    const asEmployee = await signedInClient(a.employee.email);
    const statusNow = async () =>
      (await adminClient().from("assignments").select("status").eq("id", assignmentId).single())
        .data?.status;
    const setStatus = (status: "not_started" | "in_progress" | "complete" | "cancelled") =>
      asEmployee.from("assignments").update({ status }).eq("id", assignmentId);

    // Starting a course is allowed.
    expect((await setStatus("in_progress")).error).toBeNull();
    expect(await statusNow()).toBe("in_progress");

    // Completing it directly is not, and neither is any other status change.
    expect((await setStatus("complete")).error, "employee sets Complete").not.toBeNull();
    expect((await setStatus("cancelled")).error, "employee cancels").not.toBeNull();
    expect((await setStatus("not_started")).error, "employee resets").not.toBeNull();
    expect(await statusNow()).toBe("in_progress");

    // Nor can they record a passing result for themselves.
    const fake = await asEmployee
      .from("quiz_results")
      .insert({ assignment_id: assignmentId, score: 100, passed: true });
    expect(fake.error, "employee records their own quiz result").not.toBeNull();
    const results = await adminClient()
      .from("quiz_results")
      .select("id")
      .eq("assignment_id", assignmentId);
    expect(results.data).toEqual([]);
  });

  test("quiz answers can't be read", async () => {
    const asEmployee = await signedInClient(a.employee.email);
    const allowed = await asEmployee
      .from("quiz_questions")
      .select("id, question_text, options")
      .eq("course_id", a.courseId);
    expect(allowed.error).toBeNull();
    expect(allowed.data?.length).toBe(3);

    const answers = await asEmployee.from("quiz_questions").select("correct_answer");
    expect(answers.error?.message).toMatch(/permission denied/i);
  });
});

/*
 * getCourseForEdit is the only path that returns quiz_questions.correct_answer,
 * which is revoked from every signed-in user at the column level. It reads with
 * the service role, so its two guards — admin only, and the course must come
 * back from an RLS-scoped read as the caller — are the whole boundary.
 *
 * These call it the way the app does: from a signed-in page, so the real auth
 * middleware attaches the real token.
 */
async function callGetCourseForEdit(page: Page, courseId: string) {
  return page.evaluate(async (id) => {
    // A variable path keeps TypeScript from trying to resolve a browser URL.
    const modulePath = "/src/lib/courses.functions.ts";
    const mod = await import(/* @vite-ignore */ modulePath);
    try {
      const result = await mod.getCourseForEdit({ data: { course_id: id } });
      return { ok: true as const, answers: result.questions.map((q: never) => q) };
    } catch (error) {
      return { ok: false as const, message: String(error) };
    }
  }, courseId);
}

test.describe("the quiz answers a course editor needs", () => {
  test("an admin gets their own company's answers", async ({ page }) => {
    await signIn(page, a.admin.email);
    await open(page, "/admin/courses");

    const result = await callGetCourseForEdit(page, a.courseId);
    expect(result.ok, "admin reads their own course").toBe(true);
    // The positive control: without it the refusals below could pass vacuously.
    expect(result.ok && result.answers.length).toBe(3);
  });

  test("an admin is refused another company's answers", async ({ page }) => {
    await signIn(page, b.admin.email);
    await open(page, "/admin/courses");

    const result = await callGetCourseForEdit(page, a.courseId);
    expect(result.ok, "admin reads another company's course").toBe(false);
  });

  test("an employee is refused, even for their own course", async ({ page }) => {
    await signIn(page, a.employee.email);
    await open(page, "/employee/home");

    const result = await callGetCourseForEdit(page, a.courseId);
    expect(result.ok, "employee reads the answer sheet").toBe(false);
  });
});

/*
 * An admin may change one column on a colleague's profile: their team. The
 * policy says who, the restrict_admin_profile_update trigger says which column.
 */
test.describe("an admin may only change an employee's team", () => {
  test("the team moves, and nothing else does", async () => {
    const asAdmin = await signedInClient(a.admin.email);
    const { data: team } = await adminClient()
      .from("teams")
      .insert({ company_id: a.id, name: `Policy team ${Date.now()}` })
      .select("id")
      .single();

    const moved = await asAdmin
      .from("profiles")
      .update({ team_id: team!.id })
      .eq("id", a.employee.id);
    expect(moved.error, "admin moves their employee to a team").toBeNull();

    const stored = async () =>
      (
        await adminClient()
          .from("profiles")
          .select("team_id, name, role, company_id")
          .eq("id", a.employee.id)
          .single()
      ).data;
    expect((await stored())?.team_id).toBe(team!.id);

    for (const [what, patch] of [
      ["rename them", { name: "Renamed by an admin" }],
      ["promote them", { role: "admin" as const }],
      ["move them to another company", { company_id: b.id }],
    ] as const) {
      const attempt = await asAdmin.from("profiles").update(patch).eq("id", a.employee.id);
      expect(attempt.error, `admin tries to ${what}`).not.toBeNull();
    }

    const after = await stored();
    expect(after?.name).toBe(a.employee.name);
    expect(after?.role).toBe("employee");
    expect(after?.company_id).toBe(a.id);
  });

  test("another company's employee is out of reach", async () => {
    const asAdmin = await signedInClient(a.admin.email);
    const { data: team } = await adminClient()
      .from("teams")
      .insert({ company_id: a.id, name: `Reach team ${Date.now()}` })
      .select("id")
      .single();

    await asAdmin.from("profiles").update({ team_id: team!.id }).eq("id", b.employee.id);
    const stored = await adminClient()
      .from("profiles")
      .select("team_id")
      .eq("id", b.employee.id)
      .single();
    expect(stored.data?.team_id, "admin moves another company's employee").toBeNull();
  });

  test("an employee still can't move a colleague", async () => {
    const asEmployee = await signedInClient(a.employee.email);
    const { data: team } = await adminClient()
      .from("teams")
      .insert({ company_id: a.id, name: `Colleague team ${Date.now()}` })
      .select("id")
      .single();

    const other = await createUser(a.id, `Colleague ${Date.now()}`);
    await asEmployee.from("profiles").update({ team_id: team!.id }).eq("id", other.id);
    const stored = await adminClient()
      .from("profiles")
      .select("team_id")
      .eq("id", other.id)
      .single();
    expect(stored.data?.team_id, "employee moves a colleague").toBeNull();
  });
});
