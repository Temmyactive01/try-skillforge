// The admin Employees screen: inviting someone, moving them between teams,
// renaming and deleting a team, the Invited/Active tags, the empty states, and
// the card layout a phone gets instead of the table.
//
// No email is ever sent: the test server sets E2E_SKIP_INVITE_EMAIL, so
// createEmployee makes the same invited user with generateLink instead.
import { test, type Page } from "@playwright/test";
import {
  E2E_DOMAIN,
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
const OPERATIONS = `Operations ${STAMP}`;
const SALES = `Sales ${STAMP}`;
const SPARE = `Spare team ${STAMP}`;

let adminEmail: string;
let companyId: string;
let emptyAdminEmail: string;
let movable: { id: string; name: string };
let operationsId: string;
let salesId: string;

async function createTeam(name: string) {
  const { data, error } = await adminClient()
    .from("teams")
    .insert({ company_id: companyId, name })
    .select("id")
    .single();
  if (error || !data) throw new Error(`create team ${name}: ${error?.message}`);
  return data.id;
}

/** The team a profile is filed under, read with the service role. */
async function storedTeam(userId: string) {
  const { data } = await adminClient()
    .from("profiles")
    .select("team_id")
    .eq("id", userId)
    .maybeSingle();
  return data?.team_id ?? null;
}

test.beforeAll(async () => {
  const company = await createCompany("Employees");
  adminEmail = company.admin.email;
  companyId = company.id;

  operationsId = await createTeam(OPERATIONS);
  salesId = await createTeam(SALES);
  await createTeam(SPARE);

  const ada = await createUser(company.id, "Ada Mensah", "employee", operationsId);
  await createUser(company.id, "Ben Okafor", "employee", salesId);
  movable = { id: ada.id, name: ada.name };

  // Ada has two assignments, one finished, so her completion bar reads 50%.
  const course = await createCourse(company.id, `Induction ${STAMP}`);
  const second = await createCourse(company.id, `Data care ${STAMP}`);
  await assign(course, ada.id, { status: "complete", dueInDays: 5 });
  await assign(second, ada.id, { dueInDays: 12 });

  const empty = await createCompany("Employees empty");
  emptyAdminEmail = empty.admin.email;
});

const rowFor = (page: Page, name: string) => page.getByRole("row").filter({ hasText: name });

const teamItem = (page: Page, name: string) =>
  page.getByRole("list", { name: "Teams" }).getByRole("listitem").filter({ hasText: name });

const cards = (page: Page) => page.getByRole("list", { name: "Employees" }).getByRole("listitem");

test("inviting an employee confirms it and lists them as invited", async ({ page }) => {
  const email = `invited-${STAMP}@${E2E_DOMAIN}`;
  await signInUI(page, adminEmail);
  await open(page, "/admin/employees");

  await page.getByRole("button", { name: "Invite employee" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Invite employee");

  // The form refuses to send without the two things it needs.
  await dialog.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText("Enter their name.")).toBeVisible();
  await expect(page.getByText("Enter their work email address.")).toBeVisible();

  await page.locator("#invite-name").fill("Cleo Raman");
  await page.locator("#invite-email").fill(email);
  await page.locator("#invite-team").selectOption({ label: SALES });
  await dialog.getByRole("button", { name: "Send invite" }).click();

  // The confirmation repeats the verb and names the address.
  await expect(page.getByText(`Invite sent to ${email}.`)).toBeVisible();

  const row = rowFor(page, "Cleo Raman");
  await expect(row).toContainText(email);
  await expect(row).toContainText(SALES);
  // Invited, because they have never signed in.
  await expect(row).toContainText("Invited");
  await expect(row).toContainText("Not assigned yet");
});

test("someone who has signed in reads as active, with their progress", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/employees");

  const row = rowFor(page, "Ada Mensah");
  await expect(row).toContainText("Active");
  await expect(row).toContainText(OPERATIONS);
  // One of two assignments finished.
  await expect(row.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
});

test("changing an employee's team moves them, and the database agrees", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/employees");

  expect(await storedTeam(movable.id)).toBe(operationsId);

  await rowFor(page, movable.name)
    .getByRole("button", { name: `More actions for ${movable.name}` })
    .click();
  await page.getByRole("menuitem", { name: "Change team" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Change team");
  await page.locator("#change-team").selectOption({ label: SALES });
  await dialog.getByRole("button", { name: "Save team" }).click();

  await expect(page.getByText(`Moved ${movable.name} to ${SALES}.`)).toBeVisible();
  await expect(rowFor(page, movable.name)).toContainText(SALES);
  await expect.poll(() => storedTeam(movable.id)).toBe(salesId);

  // Put her back, so the other tests see the company they expect.
  await rowFor(page, movable.name)
    .getByRole("button", { name: `More actions for ${movable.name}` })
    .click();
  await page.getByRole("menuitem", { name: "Change team" }).click();
  await page.locator("#change-team").selectOption({ label: OPERATIONS });
  await page.getByRole("dialog").getByRole("button", { name: "Save team" }).click();
  await expect.poll(() => storedTeam(movable.id)).toBe(operationsId);
});

test("a team can be renamed and deleted, and deleting asks first", async ({ page }) => {
  const renamed = `${SPARE} renamed`;
  await signInUI(page, adminEmail);
  await open(page, "/admin/employees");

  await teamItem(page, SPARE)
    .getByRole("button", { name: `More actions for ${SPARE}` })
    .click();
  await page.getByRole("menuitem", { name: "Rename team" }).click();
  await page.locator("#team-name").fill(renamed);
  await page.getByRole("dialog").getByRole("button", { name: "Save team" }).click();
  await expect(page.getByText(`Renamed the team to ${renamed}.`)).toBeVisible();
  await expect(teamItem(page, renamed)).toBeVisible();

  // Keeping it changes nothing.
  await teamItem(page, renamed)
    .getByRole("button", { name: `More actions for ${renamed}` })
    .click();
  await page.getByRole("menuitem", { name: "Delete team" }).click();
  let dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Delete this team?");
  await dialog.getByRole("button", { name: "Keep team" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(teamItem(page, renamed)).toBeVisible();

  await teamItem(page, renamed)
    .getByRole("button", { name: `More actions for ${renamed}` })
    .click();
  await page.getByRole("menuitem", { name: "Delete team" }).click();
  dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "Delete team" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await expect(page.getByText(`Deleted ${renamed}.`)).toBeVisible();
  await expect(teamItem(page, renamed)).toHaveCount(0);
  // Nobody was in it, so nobody lost anything.
  await expect(rowFor(page, "Ada Mensah")).toContainText(OPERATIONS);
});

test("every row's menu button names its person or team", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/employees");

  const menus = page.getByRole("button", { name: /^More actions for / });
  await expect(menus.first()).toBeVisible();
  for (const label of await menus.evaluateAll((els) =>
    els.map((el) => el.getAttribute("aria-label")),
  )) {
    expect(label).toMatch(/^More actions for .+/);
  }
  await expect(page.getByRole("button", { name: "More actions for Ada Mensah" })).toBeVisible();
  await expect(page.getByRole("button", { name: `More actions for ${OPERATIONS}` })).toBeVisible();
});

test("a failed action is reported in a toast, not a browser dialog", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/employees");

  // A native dialog would stall the run; failing here proves one appeared.
  page.on("dialog", (d) => {
    throw new Error(`A native browser dialog appeared: ${d.message()}`);
  });

  // Make the write fail the way a dropped connection would.
  await page.route("**/rest/v1/profiles*", (route) =>
    route.request().method() === "PATCH" ? route.abort("failed") : route.continue(),
  );

  await rowFor(page, "Ben Okafor")
    .getByRole("button", { name: "More actions for Ben Okafor" })
    .click();
  await page.getByRole("menuitem", { name: "Change team" }).click();
  await page.locator("#change-team").selectOption({ label: OPERATIONS });
  await page.getByRole("dialog").getByRole("button", { name: "Save team" }).click();

  await expect(
    page.getByText("Couldn't move them. Check your connection and try again."),
  ).toBeVisible();
  // The dialog stays open with the work still in it, so nothing is lost.
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("a company with no people is told what to do next", async ({ page }) => {
  await signInUI(page, emptyAdminEmail);
  await open(page, "/admin/employees");

  await expect(page.getByText("No employees yet.")).toBeVisible();
  await expect(
    page.getByText("Invite your first employee to start assigning training."),
  ).toBeVisible();

  await expect(page.getByText("No teams yet.")).toBeVisible();
  await expect(
    page.getByText("Add a team to group employees and assign training to everyone at once."),
  ).toBeVisible();
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("employees are cards that keep the team and the status", async ({ page }) => {
    await signInUI(page, adminEmail);
    await open(page, "/admin/employees");

    await expect(page.locator("table")).toBeHidden();

    /*
     * The old table didn't scroll sideways — it was clipped, so Team and
     * Status were simply unreachable on a phone. The card must carry both.
     */
    const card = cards(page).filter({ hasText: "Ada Mensah" });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Active");
    await expect(card).toContainText(`Team: ${OPERATIONS}`);
    await expect(card.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    await expect(card.getByRole("button", { name: "More actions for Ada Mensah" })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test("the table comes back on a wider screen", async ({ page }) => {
  await signInUI(page, adminEmail);
  await open(page, "/admin/employees");

  await expect(page.locator("table")).toBeVisible();
  await expect(cards(page).first()).toBeHidden();
});
