// Manual tests 1–4 as one story: company signup → team + invite → accept invite →
// course with quiz → assign → employee fails, retakes and passes → admin sees Complete.
import { test, type BrowserContext, type Page } from "@playwright/test";
import {
  DEFAULT_QUESTIONS,
  PASSWORD,
  expect,
  open,
  field,
  fillSetPasswordForm,
  inviteLink,
  testCompanyName,
  testEmail,
} from "./helpers";

test.describe.configure({ mode: "serial" });

const companyName = testCompanyName("Journey");
const adminEmail = testEmail("admin");
const employeeEmail = testEmail("employee");
const employeeName = "Journey Employee";
const teamName = "Warehouse";
const courseTitle = `Journey Course ${Date.now()}`;

let adminCtx: BrowserContext;
let employeeCtx: BrowserContext;
let admin: Page;
let employee: Page;

test.beforeAll(async ({ browser }) => {
  adminCtx = await browser.newContext();
  employeeCtx = await browser.newContext();
  admin = await adminCtx.newPage();
  employee = await employeeCtx.newPage();
});

test.afterAll(async () => {
  await adminCtx.close();
  await employeeCtx.close();
});

const assignmentRow = (page: Page) =>
  page.getByRole("row").filter({ hasText: employeeName }).filter({ hasText: courseTitle });

async function answerQuiz(page: Page, pick: (q: (typeof DEFAULT_QUESTIONS)[number]) => string) {
  for (const q of DEFAULT_QUESTIONS) {
    await page.getByLabel(pick(q), { exact: true }).check();
  }
  await page.getByRole("button", { name: "Submit Quiz" }).click();
}

test("a new company signs up and lands on the admin dashboard", async () => {
  await open(admin, "/signup");
  await admin.locator("#name").fill("Journey Admin");
  await admin.locator("#company").fill(companyName);
  await admin.locator("#email").fill(adminEmail);
  await admin.locator("#password").fill(PASSWORD);
  await admin.locator("#confirm").fill(PASSWORD);
  await admin.getByRole("button", { name: "Create account" }).click();
  await admin.waitForURL("**/admin/dashboard");
  await expect(admin.getByRole("heading", { name: "Welcome to SkillForge" })).toBeVisible();
});

test("the admin creates a team and invites an employee (no email sent)", async () => {
  await open(admin, "/admin/employees");
  await admin.getByRole("button", { name: "+ Add Team" }).click();
  await field(admin, "Team name").fill(teamName);
  await admin.getByRole("button", { name: "Save team" }).click();
  await expect(admin.getByRole("cell", { name: teamName, exact: true })).toBeVisible();

  await admin.getByRole("button", { name: "+ Add Employee" }).click();
  await field(admin, "Name").fill(employeeName);
  await field(admin, "Email").fill(employeeEmail);
  await field(admin, "Team (optional)").selectOption({ label: teamName });
  await admin.getByRole("button", { name: "Save employee" }).click();
  const row = admin.getByRole("row").filter({ hasText: employeeEmail });
  await expect(row).toContainText(teamName);
  await expect(row).toContainText("Pending");
});

test("the employee accepts the invite and sets a password", async ({ baseURL }) => {
  await open(employee, await inviteLink(employeeEmail, baseURL!));
  await expect(employee.getByText("Choose a password for your SkillForge account.")).toBeVisible();
  await fillSetPasswordForm(employee, PASSWORD);
  await employee.waitForURL("**/employee/home");
  await expect(employee.getByRole("heading", { name: "My Learning" })).toBeVisible();
  await expect(employee.getByText("No courses assigned yet.")).toBeVisible();

  await admin.reload({ waitUntil: "networkidle" });
  await expect(admin.getByRole("row").filter({ hasText: employeeEmail })).toContainText("Active");
});

test("the admin creates a course with a quiz and assigns it", async () => {
  await open(admin, "/admin/courses");
  await admin.getByRole("button", { name: "+ Create Course" }).click();
  await field(admin, "Title").fill(courseTitle);
  await field(admin, "Description").fill("A short course made by the journey test.");
  await field(admin, "Content").fill("Read this, then take the quiz.");
  await field(admin, "Category").fill("Testing");

  for (let qi = 0; qi < DEFAULT_QUESTIONS.length; qi++) {
    if (qi > 0) await admin.getByRole("button", { name: "+ Add question" }).click();
    const q = DEFAULT_QUESTIONS[qi];
    const block = admin.locator(`div:has(> div > span:text-is("Question ${qi + 1}"))`);
    await block.getByPlaceholder("Question text").fill(q.text);
    for (let oi = 0; oi < q.options.length; oi++) {
      await block.getByPlaceholder(`Option ${oi + 1}`, { exact: true }).fill(q.options[oi]);
    }
    await block.locator('input[type="radio"]').nth(q.options.indexOf(q.correct)).check();
  }
  await admin.getByRole("button", { name: "Save course" }).click();

  const courseRow = admin.getByRole("row").filter({ hasText: courseTitle });
  await expect(courseRow).toBeVisible();
  await courseRow.getByRole("button", { name: "Assign" }).click();
  await expect(admin.getByRole("heading", { name: "Assign Course" })).toBeVisible();
  await admin
    .locator("label")
    .filter({ hasText: employeeEmail })
    .locator('input[type="checkbox"]')
    .check();
  const due = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  await field(admin, "Due date").fill(due);
  await admin.locator("form").getByRole("button", { name: "Assign", exact: true }).click();
  await expect(admin.getByText(`Assigned "${courseTitle}" to 1 employee(s).`)).toBeVisible();
});

test("the employee fails the quiz, then retakes it and passes", async () => {
  await open(employee, "/employee/home");
  await employee.getByRole("link").filter({ hasText: courseTitle }).click();
  await employee.getByRole("button", { name: "I've reviewed the content" }).click();
  await employee.getByRole("button", { name: "Take Quiz" }).click();

  // Every answer wrong.
  await answerQuiz(employee, (q) => q.options.find((o) => o !== q.correct)!);
  await expect(employee.getByRole("heading", { name: "Quiz Not Passed" })).toBeVisible();
  await expect(employee.getByText(/You scored 0%/)).toBeVisible();

  await open(admin, "/admin/assignments");
  await expect(assignmentRow(admin)).toContainText("In progress");

  await employee.getByRole("button", { name: "Retake Quiz" }).click();
  await answerQuiz(employee, (q) => q.correct);
  await expect(employee.getByRole("heading", { name: "Quiz Passed" })).toBeVisible();
  await expect(employee.getByText(/You scored 100%/)).toBeVisible();

  await employee
    .getByRole("button", { name: "Back to my learning" })
    .or(employee.getByRole("link", { name: "Back to my learning" }))
    .click();
  await employee.waitForURL("**/employee/home");
  await expect(employee.getByRole("link").filter({ hasText: courseTitle })).toContainText(
    /Completed\s*·\s*100%/,
  );
});

test("the admin sees the assignment as Complete", async () => {
  await open(admin, "/admin/assignments");
  await expect(assignmentRow(admin)).toContainText("Complete");
  await open(admin, "/admin/dashboard");
  await expect(admin.getByRole("link").filter({ hasText: "Overall completion" })).toContainText(
    "100%",
  );
});
