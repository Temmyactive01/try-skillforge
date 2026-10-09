// Manual tests 1–4 as one story: company signup → team + invite → accept invite →
// course with quiz → assign → employee fails, retakes and passes → admin sees Complete.
import { test, type BrowserContext, type Page } from "@playwright/test";
import {
  DEFAULT_QUESTIONS,
  PASSWORD,
  expect,
  open,
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
  await admin.getByRole("button", { name: "Add team" }).click();
  await admin.locator("#team-name").fill(teamName);
  await admin.getByRole("dialog").getByRole("button", { name: "Add team" }).click();
  await expect(admin.getByText(`Added the team ${teamName}.`)).toBeVisible();
  await expect(
    admin.getByRole("list", { name: "Teams" }).getByRole("listitem").filter({ hasText: teamName }),
  ).toBeVisible();

  await admin.getByRole("button", { name: "Invite employee" }).click();
  await admin.locator("#invite-name").fill(employeeName);
  await admin.locator("#invite-email").fill(employeeEmail);
  await admin.locator("#invite-team").selectOption({ label: teamName });
  await admin.getByRole("button", { name: "Send invite" }).click();
  await expect(admin.getByText(`Invite sent to ${employeeEmail}.`)).toBeVisible();

  const row = admin.getByRole("row").filter({ hasText: employeeEmail });
  await expect(row).toContainText(teamName);
  await expect(row).toContainText("Invited");
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
  await admin.getByRole("button", { name: "Create course" }).click();
  await admin.locator("#course-title").fill(courseTitle);
  await admin.locator("#course-description").fill("A short course made by the journey test.");
  await admin.locator("#course-content").fill("Read this, then take the quiz.");
  await admin.locator("#course-category").fill("Testing");

  for (let qi = 0; qi < DEFAULT_QUESTIONS.length; qi++) {
    if (qi > 0) await admin.getByRole("button", { name: "Add question" }).first().click();
    const q = DEFAULT_QUESTIONS[qi];
    const label = `Question ${qi + 1}`;
    await admin.getByRole("textbox", { name: label, exact: true }).fill(q.text);
    for (let oi = 0; oi < q.options.length; oi++) {
      await admin
        .getByRole("textbox", { name: `${label}, option ${oi + 1}`, exact: true })
        .fill(q.options[oi]);
    }
    await admin
      .getByRole("radio", {
        name: `${label}, option ${q.options.indexOf(q.correct) + 1} is the correct answer`,
      })
      .click();
  }
  await admin.getByRole("button", { name: "Save course" }).click();
  await expect(admin.getByText(`Created ${courseTitle}.`)).toBeVisible();

  const courseRow = admin.getByRole("row").filter({ hasText: courseTitle });
  await expect(courseRow).toBeVisible();
  await courseRow.getByRole("button", { name: "Assign", exact: true }).click();
  await expect(admin.getByRole("heading", { name: "Assign course" })).toBeVisible();
  await admin.locator("label").filter({ hasText: employeeEmail }).getByRole("checkbox").click();
  const due = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  await admin.locator("#assign-due").fill(due);
  await admin.getByRole("button", { name: "Assign course" }).click();
  await expect(admin.getByText(`Assigned ${courseTitle} to 1 person.`)).toBeVisible();
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

test("a practice retake after passing keeps the course Complete and the best score", async () => {
  await employee.getByRole("link").filter({ hasText: courseTitle }).click();
  await employee.getByRole("button", { name: "Take Quiz" }).click();

  // A worse attempt (every answer wrong) is only practice.
  await answerQuiz(employee, (q) => q.options.find((o) => o !== q.correct)!);
  await expect(employee.getByRole("heading", { name: "Quiz Not Passed" })).toBeVisible();
  await expect(
    employee.getByText(/You already passed, so the course stays complete\./),
  ).toBeVisible();

  await open(employee, "/employee/home");
  await expect(employee.getByRole("link").filter({ hasText: courseTitle })).toContainText(
    /Completed\s*·\s*100%/,
  );
});

test("the admin sees the assignment as Complete with the best score", async () => {
  await open(admin, "/admin/assignments");
  await expect(assignmentRow(admin)).toContainText("Complete");
  // Attempts were 0%, 100% and 0%: the best one is shown, not the latest.
  await expect(assignmentRow(admin).getByRole("cell").nth(3)).toHaveText("100%");
  await open(admin, "/admin/dashboard");
  await expect(admin.getByRole("link").filter({ hasText: "Overall completion" })).toContainText(
    "100%",
  );
});
