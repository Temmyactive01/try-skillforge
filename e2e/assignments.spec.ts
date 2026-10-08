// The admin Assignments screen: cancelling behind a confirmation, restoring,
// the dashboard's overdue panel, and the card layout a phone gets instead of
// the table.
import { test, type Page } from "@playwright/test";
import {
  assign,
  assignmentStatus,
  createCompany,
  createCourse,
  createUser,
  expect,
  open,
  signInUI,
} from "./helpers";

const COURSE_A = `Fire safety ${Date.now()}`;
const COURSE_B = `Data protection ${Date.now()}`;

// Set up once: these tests read the same company, and only the two rows below
// are ever changed — by the test that owns each one.
let adminEmail: string;
let cancelRow: { id: string; employee: string; course: string };
let keepRow: { id: string; employee: string; course: string };
/** Exactly two assignments are past their due date and unfinished. */
const EXPECTED_OVERDUE = 2;

test.beforeAll(async () => {
  const company = await createCompany("Assignments");
  adminEmail = company.admin.email;

  const [ada, ben, cleo] = await Promise.all([
    createUser(company.id, "Ada Mensah"),
    createUser(company.id, "Ben Okafor"),
    createUser(company.id, "Cleo Raman"),
  ]);
  const courseA = await createCourse(company.id, COURSE_A);
  const courseB = await createCourse(company.id, COURSE_B);

  const cancelId = await assign(courseA, ada.id, { dueInDays: 14 });
  const keepId = await assign(courseA, ben.id, { status: "in_progress", dueInDays: 21 });
  cancelRow = { id: cancelId, employee: ada.name, course: COURSE_A };
  keepRow = { id: keepId, employee: ben.name, course: COURSE_A };

  // Two overdue, plus two past-dated rows that must NOT count as overdue.
  await assign(courseB, cleo.id, { dueInDays: -6 });
  await assign(courseB, ada.id, { status: "in_progress", dueInDays: -2 });
  await assign(courseB, ben.id, { status: "complete", dueInDays: -3 });
  await assign(courseA, cleo.id, { status: "cancelled", dueInDays: -4 });
});

const rowFor = (page: Page, r: { employee: string; course: string }) =>
  page.getByRole("row").filter({ hasText: r.employee }).filter({ hasText: r.course });

/** Only the assignment cards: the sidebar is a list of items too. */
const cards = (page: Page) => page.getByRole("list", { name: "Assignments" }).getByRole("listitem");

const cardFor = (page: Page, r: { employee: string; course: string }) =>
  cards(page).filter({ hasText: r.employee }).filter({ hasText: r.course });

async function openCancelDialog(page: Page, r: { employee: string; course: string }) {
  await rowFor(page, r)
    .getByRole("button", { name: /^More actions for/ })
    .click();
  await page.getByRole("menuitem", { name: "Cancel assignment" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test("cancelling goes through the menu and a confirmation, and can be undone", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/assignments");

  const row = rowFor(page, cancelRow);
  await expect(row).toContainText("Not started");
  // Cancelling must not be a single stray click on the row.
  await expect(row.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(0);

  const dialog = await openCancelDialog(page, cancelRow);
  await expect(dialog).toContainText("Cancel this assignment?");
  await dialog.getByRole("button", { name: "Cancel assignment" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await expect(row).toContainText("Cancelled");
  await expect(row.getByRole("button", { name: "Restore" })).toBeVisible();
  // A cancelled row offers nothing else: no edit, no menu, nothing left to cancel.
  await expect(row.getByRole("button", { name: "Edit" })).toHaveCount(0);
  await expect(row.getByRole("button", { name: /^More actions for/ })).toHaveCount(0);
  // The row updates optimistically, so wait for the database to agree.
  await expect.poll(() => assignmentStatus(cancelRow.id)).toBe("cancelled");

  await row.getByRole("button", { name: "Restore" }).click();
  await expect(row).toContainText("Not started");
  await expect(row.getByRole("button", { name: "Edit" })).toBeVisible();
  await expect.poll(() => assignmentStatus(cancelRow.id)).toBe("not_started");
});

test("choosing to keep the assignment changes nothing", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/assignments");

  const row = rowFor(page, keepRow);
  await expect(row).toContainText("In progress");

  const dialog = await openCancelDialog(page, keepRow);
  await dialog.getByRole("button", { name: "Keep assignment" }).click();

  // Wait for it to unmount, not just hide: while it is open the dialog takes the
  // rest of the page out of the accessibility tree, so rows aren't findable.
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(row).toContainText("In progress");
  await expect(row.getByRole("button", { name: "Restore" })).toHaveCount(0);
  expect(await assignmentStatus(keepRow.id)).toBe("in_progress");
  await expect(row.getByRole("button", { name: "Edit" })).toBeVisible();
});

test("the dashboard's overdue panel opens the matching rows", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/dashboard");

  const panel = page.getByRole("link").filter({ hasText: "Overdue assignments" });
  const counted = Number((await panel.innerText()).match(/Overdue assignments\s*(\d+)/)?.[1]);
  expect(counted).toBe(EXPECTED_OVERDUE);

  await panel.click();
  await page.waitForURL(/\/admin\/assignments\?.*status=overdue/);
  await expect(page.locator("#filter-status")).toHaveValue("overdue");

  // The list must agree with the number that sent you here.
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(counted);
  // And every row it shows really is late.
  for (const text of await rows.allInnerTexts()) {
    expect(text).toMatch(/Overdue by \d+ day/);
  }
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("assignments are cards, not a table", async ({ page }) => {
    await signInUI(page, adminEmail);
    await open(page, "/admin/assignments");

    await expect(page.locator("table")).toBeHidden();
    await expect(cards(page).first()).toBeVisible();

    // A card still carries everything the table columns would have shown.
    const card = cardFor(page, keepRow);
    await expect(card).toContainText(keepRow.course);
    await expect(card).toContainText("In progress");
    await expect(card.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(card.getByRole("button", { name: /^More actions for/ })).toBeVisible();

    // Nothing scrolls sideways: the page fits the screen.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test("the table comes back on a wider screen", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/assignments");

  await expect(page.locator("table")).toBeVisible();
  await expect(cards(page).first()).toBeHidden();
});
