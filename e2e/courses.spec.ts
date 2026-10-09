// The admin Courses screen: creating and editing a course with its quiz,
// deleting one through the "⋯" menu and its confirmation, the rules that stop
// an assigned course being deleted, the empty state, and the card layout a
// phone gets instead of the table.
import { test, type Page } from "@playwright/test";
import {
  adminClient,
  assign,
  createCompany,
  createCourse,
  createUser,
  expect,
  open,
  signInUI,
} from "./helpers";

const STAMP = Date.now();
const DELETABLE = `Deletable course ${STAMP}`;
const ASSIGNED = `Busy course ${STAMP}`;
const COMPLETED = `Finished course ${STAMP}`;
const CANCELLED_ONLY = `Cancelled only course ${STAMP}`;
const ONCE_PASSED = `Once passed course ${STAMP}`;
const EDITABLE = `Editable course ${STAMP}`;

let adminEmail: string;
let companyId: string;
/** A second company whose admin sees no courses at all, for the empty state. */
let emptyAdminEmail: string;

test.beforeAll(async () => {
  const company = await createCompany("Courses");
  adminEmail = company.admin.email;
  companyId = company.id;

  const employee = await createUser(company.id, "Ada Mensah");
  await createCourse(company.id, DELETABLE);
  await createCourse(company.id, EDITABLE);
  // Assigned and under way, but nobody has passed it.
  const assigned = await createCourse(company.id, ASSIGNED);
  await assign(assigned, employee.id, { dueInDays: 7 });

  // Assigned and passed, for the editor's "completed training stays complete".
  const completed = await createCourse(company.id, COMPLETED);
  await assign(completed, employee.id, { status: "complete", dueInDays: 7 });

  // Cancelled, and nobody ever passed: nothing would be lost by deleting it.
  const cancelledOnly = await createCourse(company.id, CANCELLED_ONLY);
  await assign(cancelledOnly, employee.id, { status: "cancelled", dueInDays: 3 });

  // Cancelled too, but somebody passed it first. That record has to survive.
  const oncePassed = await createCourse(company.id, ONCE_PASSED);
  const oncePassedId = await assign(oncePassed, employee.id, { status: "cancelled" });
  const { error: resultError } = await adminClient()
    .from("quiz_results")
    .insert({ assignment_id: oncePassedId, score: 100, passed: true });
  if (resultError) throw new Error(`record a pass: ${resultError.message}`);

  const empty = await createCompany("Courses empty");
  emptyAdminEmail = empty.admin.email;
});

const rowFor = (page: Page, title: string) => page.getByRole("row").filter({ hasText: title });

const cards = (page: Page) => page.getByRole("list", { name: "Courses" }).getByRole("listitem");

async function openMenu(page: Page, title: string, item: string) {
  await rowFor(page, title)
    .getByRole("button", { name: `More actions for ${title}` })
    .click();
  await page.getByRole("menuitem", { name: item }).click();
}

/** The questions stored for a course, read with the service role. */
async function storedQuestions(title: string) {
  const admin = adminClient();
  const { data: course } = await admin
    .from("courses")
    .select("id")
    .eq("company_id", companyId)
    .eq("title", title)
    .maybeSingle();
  if (!course) return null;
  const { data } = await admin
    .from("quiz_questions")
    .select("question_text, options, correct_answer")
    .eq("course_id", course.id)
    .order("created_at", { ascending: true });
  return data ?? [];
}

test("creating a course saves its details and its quiz", async ({ page }) => {
  const title = `Fire safety ${STAMP}`;
  await signInUI(page, adminEmail);
  await open(page, "/admin/courses");

  await page.getByRole("button", { name: "Create course" }).click();
  await expect(page.getByRole("heading", { name: "Create course" })).toBeVisible();

  // The pass mark is stated, and it comes from the grader's own constant.
  await expect(page.getByText("Employees pass at 70%.").first()).toBeVisible();

  await page.locator("#course-title").fill(title);
  await page.locator("#course-category").fill("Safety");
  await page.locator("#course-content").fill("Read this, then take the quiz.");

  await page
    .getByRole("textbox", { name: "Question 1", exact: true })
    .fill("Where is the fire exit?");
  await page
    .getByRole("textbox", { name: "Question 1, option 1", exact: true })
    .fill("Through the kitchen");
  await page
    .getByRole("textbox", { name: "Question 1, option 2", exact: true })
    .fill("Past the lifts");
  await page.getByRole("radio", { name: "Question 1, option 2 is the correct answer" }).click();

  await page.getByRole("button", { name: "Save course" }).click();

  await expect(page.getByRole("heading", { name: "Courses" })).toBeVisible();
  await expect(page.getByText(`Created ${title}.`)).toBeVisible();

  const row = rowFor(page, title);
  await expect(row).toContainText("Safety");
  await expect(row).toContainText("Not assigned yet");

  await expect.poll(async () => (await storedQuestions(title))?.length).toBe(1);
  const [question] = (await storedQuestions(title))!;
  expect(question.question_text).toBe("Where is the fire exit?");
  expect(question.correct_answer).toBe("Past the lifts");
  // Only the options that were filled in are stored.
  expect(question.options).toEqual(["Through the kitchen", "Past the lifts"]);
});

test("a course cannot be saved without a title or a correct answer", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/courses");
  await page.getByRole("button", { name: "Create course" }).click();

  // No title: the form says so and stays put.
  await page.getByRole("button", { name: "Save course" }).click();
  await expect(page.getByText("Enter a course title.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create course" })).toBeVisible();

  // A written question with options but nothing marked correct.
  await page.locator("#course-title").fill(`Half-finished ${STAMP}`);
  await page.getByRole("textbox", { name: "Question 1", exact: true }).fill("Is this saved?");
  await page.getByRole("textbox", { name: "Question 1, option 1", exact: true }).fill("Yes");
  await page.getByRole("textbox", { name: "Question 1, option 2", exact: true }).fill("No");
  await page.getByRole("button", { name: "Save course" }).click();
  await expect(page.getByText("Select which option is correct.")).toBeVisible();

  // One option on its own isn't a question either.
  await page.getByRole("radio", { name: "Question 1, option 1 is the correct answer" }).click();
  await page.getByRole("textbox", { name: "Question 1, option 2", exact: true }).fill("");
  await page.getByRole("button", { name: "Save course" }).click();
  await expect(page.getByText("Give this question at least two options.")).toBeVisible();

  expect(await storedQuestions(`Half-finished ${STAMP}`)).toBeNull();
});

test("editing a course shows the stored correct answer and saves a change", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/courses");

  await openMenu(page, EDITABLE, "Edit course");
  await expect(page.getByRole("heading", { name: "Edit course" })).toBeVisible();

  /*
   * correct_answer is unreadable from the browser by design, so the editor
   * fetches it through getCourseForEdit. If that broke, this radio would be
   * unchecked and an admin would silently wipe the answer on every save.
   */
  await expect(
    page.getByRole("textbox", { name: "Question 1, option 2", exact: true }),
  ).toHaveValue("Blue");
  await expect(
    page.getByRole("radio", { name: "Question 1, option 2 is the correct answer" }),
  ).toBeChecked();

  await page.locator("#course-title").fill(`${EDITABLE} (revised)`);
  await page.getByRole("textbox", { name: "Question 1, option 1", exact: true }).fill("Emerald");
  await page.getByRole("button", { name: "Save course" }).click();

  await expect(page.getByText(`Saved ${EDITABLE} (revised).`)).toBeVisible();
  await expect(rowFor(page, `${EDITABLE} (revised)`)).toBeVisible();

  const stored = await storedQuestions(`${EDITABLE} (revised)`);
  expect(stored?.[0].options).toContain("Emerald");
  // The answer survived a save that never had to re-pick it.
  expect(stored?.[0].correct_answer).toBe("Blue");
});

test("leaving the editor with unsaved changes asks first", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/courses");

  // Nothing typed: Cancel just leaves.
  await page.getByRole("button", { name: "Create course" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Courses" })).toBeVisible();

  await page.getByRole("button", { name: "Create course" }).click();
  await page.locator("#course-title").fill("Something half-written");
  await page.getByRole("button", { name: "Cancel" }).click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Discard changes?");

  // Keep editing puts you back in the form with your work intact.
  await dialog.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.locator("#course-title")).toHaveValue("Something half-written");

  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Discard changes" }).click();
  await expect(page.getByRole("heading", { name: "Courses" })).toBeVisible();
});

test("editing an assigned course warns that finished training stays finished", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/courses");

  await openMenu(page, COMPLETED, "Edit course");
  await expect(
    page.getByText(/Changes apply to future attempts\. Completed training stays complete/),
  ).toBeVisible();
  // It counts the people who have actually passed.
  await expect(page.getByText(/1 person has already passed this course/)).toBeVisible();
});

test("deleting a course goes through the menu and a confirmation", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/courses");

  const row = rowFor(page, DELETABLE);
  await expect(row).toBeVisible();
  // Deleting must not be a single stray click on the row.
  await expect(row.getByRole("button", { name: "Delete course" })).toHaveCount(0);

  // Choosing to keep it changes nothing.
  await openMenu(page, DELETABLE, "Delete course");
  let dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Delete this course?");
  await dialog.getByRole("button", { name: "Keep course" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(rowFor(page, DELETABLE)).toBeVisible();
  expect(await storedQuestions(DELETABLE)).not.toBeNull();

  await openMenu(page, DELETABLE, "Delete course");
  dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "Delete course" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await expect(page.getByText(`Deleted ${DELETABLE}.`)).toBeVisible();
  await expect(rowFor(page, DELETABLE)).toHaveCount(0);
  await expect.poll(() => storedQuestions(DELETABLE)).toBeNull();
});

test("a course someone has been assigned cannot be deleted", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/courses");

  await openMenu(page, ASSIGNED, "Delete course");
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Can't delete this course");
  await expect(dialog).toContainText(`${ASSIGNED} is assigned to 1 person`);
  // There is no way through: the only button closes it.
  await expect(dialog.getByRole("button", { name: "Delete course" })).toHaveCount(0);

  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(rowFor(page, ASSIGNED)).toBeVisible();
  expect(await storedQuestions(ASSIGNED)).not.toBeNull();
});

test("cancelling isn't enough if somebody passed the course", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/courses");

  // Every assignment is cancelled, so nothing is "assigned" any more — but a
  // completion was earned, and deleting the course would destroy the record.
  await openMenu(page, ONCE_PASSED, "Delete course");
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Can't delete this course");
  await expect(dialog).toContainText(
    `${ONCE_PASSED} has completed training records, so it can't be deleted. This keeps your training history intact.`,
  );
  await expect(dialog.getByRole("button", { name: "Delete course" })).toHaveCount(0);

  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  expect(await storedQuestions(ONCE_PASSED)).not.toBeNull();
});

test("a course whose assignments were all cancelled, and never passed, can go", async ({
  page,
}) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/courses");

  await openMenu(page, CANCELLED_ONLY, "Delete course");
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Delete this course?");
  // The dialog is honest about the cancelled row going with it.
  await expect(dialog).toContainText("1 cancelled assignment");
  await expect(dialog).toContainText("Nobody has passed it, so no training record is lost.");

  await dialog.getByRole("button", { name: "Delete course" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.getByText(`Deleted ${CANCELLED_ONLY}.`)).toBeVisible();
  await expect.poll(() => storedQuestions(CANCELLED_ONLY)).toBeNull();
});

test("every row's menu button names its course", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/courses");

  const menus = page.getByRole("button", { name: /^More actions for / });
  await expect(menus.first()).toBeVisible();
  for (const label of await menus.evaluateAll((els) =>
    els.map((el) => el.getAttribute("aria-label")),
  )) {
    // "More actions" alone tells a screen-reader user nothing about which row.
    expect(label).toMatch(/^More actions for .+/);
  }
  await expect(page.getByRole("button", { name: `More actions for ${ASSIGNED}` })).toBeVisible();
});

test("a company with no courses is told what to do next", async ({ page }) => {
  await signInUI(page, emptyAdminEmail);
  await open(page, "/admin/courses");

  await expect(page.getByText("No courses yet.")).toBeVisible();
  await expect(
    page.getByText("Create your first course to start assigning training."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Create course" })).toBeVisible();
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("courses are cards, not a table", async ({ page }) => {
    await signInUI(page, adminEmail);
    await open(page, "/admin/courses");

    await expect(page.locator("table")).toBeHidden();
    const card = cards(page).filter({ hasText: ASSIGNED });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Created");
    await expect(card.getByRole("button", { name: "Assign", exact: true })).toBeVisible();
    await expect(card.getByRole("button", { name: `More actions for ${ASSIGNED}` })).toBeVisible();

    // Nothing scrolls sideways: the page fits the screen.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test("the table comes back on a wider screen", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/courses");

  await expect(page.locator("table")).toBeVisible();
  await expect(cards(page).first()).toBeHidden();
});
