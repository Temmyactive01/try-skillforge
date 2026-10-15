// Every Dialog and AlertDialog must sit on an opaque surface at
// every width and in both themes. A see-through dialog puts the page's text
// behind the form you are filling in, which is unreadable and looks broken.
//
// The check is on what the browser actually renders, not on the class list: a
// translucent token, an inherited opacity and an animation that never finishes
// all look identical on screen, and only one of them is visible in the markup.
import { test, type Locator, type Page } from "@playwright/test";
import {
  adminClient,
  assign,
  createCompany,
  createCourse,
  createUser,
  expect,
  open,
  signIn,
} from "./helpers";

const STAMP = Date.now();
const COURSE = `Dialog course ${STAMP}`;
const TEAM = `Dialog team ${STAMP}`;

let adminEmail: string;
let employeeEmail: string;
let quizAssignmentId: string;

test.beforeAll(async () => {
  const company = await createCompany("Dialogs");
  adminEmail = company.admin.email;

  const { data: team, error: teamError } = await adminClient()
    .from("teams")
    .insert({ company_id: company.id, name: TEAM })
    .select("id")
    .single();
  if (teamError) throw new Error(`create team: ${teamError.message}`);

  const ada = await createUser(company.id, "Ada Mensah", "employee", team.id);
  employeeEmail = ada.email;
  const course = await createCourse(company.id, COURSE);
  quizAssignmentId = await assign(course, ada.id, { dueInDays: 7 });
});

/** True only when nothing behind the panel can show through it. */
async function opacityOf(panel: Locator) {
  return panel.evaluate((el) => {
    const style = getComputedStyle(el);
    // Walk up: an opacity anywhere above makes the whole subtree translucent.
    let node: HTMLElement | null = el as HTMLElement;
    let inherited = 1;
    while (node) {
      inherited *= Number(getComputedStyle(node).opacity);
      node = node.parentElement;
    }
    const rgba = style.backgroundColor.match(/[\d.]+/g) ?? [];
    return {
      background: style.backgroundColor,
      backgroundAlpha: rgba.length === 4 ? Number(rgba[3]) : 1,
      effectiveOpacity: Number(inherited.toFixed(3)),
    };
  });
}

async function expectOpaque(panel: Locator, what: string) {
  await expect(panel).toBeVisible();
  const seen = await opacityOf(panel);
  expect(seen.backgroundAlpha, `${what}: background colour alpha`).toBe(1);
  expect(seen.effectiveOpacity, `${what}: rendered opacity`).toBe(1);
  expect(seen.background, `${what}: background colour`).not.toBe("rgba(0, 0, 0, 0)");
}

/** Opens each dialog in turn and hands the panel to the caller. */
const PANELS: { name: string; path: string; openIt: (page: Page) => Promise<Locator> }[] = [
  {
    name: "Invite employee",
    path: "/admin/employees",
    openIt: async (page) => {
      await page.getByRole("button", { name: "Invite employee" }).click();
      return page.getByRole("dialog");
    },
  },
  {
    name: "Add team",
    path: "/admin/employees",
    openIt: async (page) => {
      await page.getByRole("button", { name: "Add team" }).click();
      return page.getByRole("dialog");
    },
  },
  {
    name: "Change team",
    path: "/admin/employees",
    openIt: async (page) => {
      await page.getByRole("button", { name: "More actions for Ada Mensah" }).click();
      await page.getByRole("menuitem", { name: "Change team" }).click();
      return page.getByRole("dialog");
    },
  },
  {
    name: "Delete team confirmation",
    path: "/admin/employees",
    openIt: async (page) => {
      await page.getByRole("button", { name: `More actions for ${TEAM}` }).click();
      await page.getByRole("menuitem", { name: "Delete team" }).click();
      return page.getByRole("alertdialog");
    },
  },
  {
    name: "Assign course",
    path: "/admin/courses",
    openIt: async (page) => {
      await page.getByRole("button", { name: "Assign", exact: true }).first().click();
      return page.getByRole("dialog");
    },
  },
  {
    name: "Delete course confirmation",
    path: "/admin/courses",
    openIt: async (page) => {
      await page.getByRole("button", { name: `More actions for ${COURSE}` }).click();
      await page.getByRole("menuitem", { name: "Delete course" }).click();
      return page.getByRole("alertdialog");
    },
  },
  {
    name: "Edit assignment",
    path: "/admin/assignments",
    openIt: async (page) => {
      await page.getByRole("button", { name: "Edit", exact: true }).first().click();
      return page.getByRole("dialog");
    },
  },
  {
    name: "Cancel assignment confirmation",
    path: "/admin/assignments",
    openIt: async (page) => {
      await page
        .getByRole("button", { name: /^More actions for/ })
        .first()
        .click();
      await page.getByRole("menuitem", { name: "Cancel assignment" }).click();
      return page.getByRole("alertdialog");
    },
  },
  {
    name: "Discard changes confirmation",
    path: "/admin/courses",
    openIt: async (page) => {
      await page.getByRole("button", { name: "Create course" }).click();
      await page.locator("#course-title").fill("Something half-written");
      await page.getByRole("button", { name: "Cancel" }).first().click();
      return page.getByRole("alertdialog");
    },
  },
];

/*
 * Both halves navigate afresh before each dialog. Closing one and opening the
 * next on the same page is quicker, but Radix locks the page with
 * pointer-events while a dialog is open and releases it on its own schedule,
 * so the next click can land on <html> instead of the button. A page load is
 * the one thing that resets all of it.
 */

/** A one-off override on a single dialog would only show up by checking them all. */
test("every dialog sits on an opaque surface", async ({ page }) => {
  await signIn(page, adminEmail);
  for (const panel of PANELS) {
    await open(page, panel.path);
    const found = await panel.openIt(page);
    await expectOpaque(found, panel.name);
  }
});

/*
 * The opacity came from two shared components, so a regression would hit every
 * dialog at once: one Dialog and one AlertDialog are enough to cover the rest
 * across the matrix, and checking all nine four times over just costs minutes.
 */
const REPRESENTATIVE = PANELS.filter(
  (panel) => panel.name === "Invite employee" || panel.name === "Delete team confirmation",
);

for (const width of [375, 1280]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 812 } });

    for (const theme of ["light", "dark"] as const) {
      test(`a dialog and a confirmation stay opaque in the ${theme} theme`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme });
        await signIn(page, adminEmail);

        for (const panel of REPRESENTATIVE) {
          await open(page, panel.path);
          const found = await panel.openIt(page);
          await expectOpaque(found, `${panel.name} at ${width}px, ${theme}`);
        }
      });
    }

    // Alignment is a question of width, not of colour, so once per width is enough.
    test("a dialog's footer buttons never touch", async ({ page }) => {
      await signIn(page, adminEmail);
      await open(page, "/admin/employees");
      await page.getByRole("button", { name: "Invite employee" }).click();

      const dialog = page.getByRole("dialog");
      const send = await dialog.getByRole("button", { name: "Send invite" }).boundingBox();
      const cancel = await dialog.getByRole("button", { name: "Cancel" }).boundingBox();
      expect(send, "Send invite is on screen").not.toBeNull();
      expect(cancel, "Cancel is on screen").not.toBeNull();

      /*
       * Stacked on a phone and side by side on a desktop, so measure whichever
       * axis they are separated on. The old sm:space-x-2 set a horizontal
       * margin above sm only, which left the stacked pair with nothing between
       * them; space-2 is 8px.
       */
      const stacked = send!.y !== cancel!.y;
      const gap = stacked
        ? Math.abs(send!.y - (cancel!.y + cancel!.height))
        : Math.abs(send!.x - (cancel!.x + cancel!.width));
      expect(gap, `gap between the footer buttons at ${width}px`).toBeGreaterThanOrEqual(8);
    });

    test("a dialog's title and description are left-aligned", async ({ page }) => {
      await signIn(page, adminEmail);
      await open(page, "/admin/employees");
      await page.getByRole("button", { name: "Invite employee" }).click();

      const dialog = page.getByRole("dialog");
      for (const role of ["heading", "paragraph"] as const) {
        const part = dialog.getByRole(role).first();
        await expect(part).toBeVisible();
        // Centred on a phone and left on a desktop is the shadcn default;
        // DESIGN.md wants one reading position at every width.
        expect(
          await part.evaluate((el) => getComputedStyle(el).textAlign),
          `${role} alignment at ${width}px`,
        ).not.toBe("center");
      }
    });
  });
}

/*
 * The employee has exactly one dialog — the warning before leaving a quiz with
 * unsubmitted answers — and it is held to the same rule as the admin's nine.
 * It is checked here rather than in employee.spec.ts so that a change to the
 * shared AlertDialog fails in the file that exists to catch exactly that.
 */
test.describe("the employee's one dialog", () => {
  for (const width of [375, 1280]) {
    for (const theme of ["light", "dark"] as const) {
      test(`leaving the quiz is opaque at ${width}px in the ${theme} theme`, async ({ page }) => {
        await page.setViewportSize({ width, height: 812 });
        await page.emulateMedia({ colorScheme: theme });
        await signIn(page, employeeEmail);

        await open(page, `/employee/course/${quizAssignmentId}`);
        await page.getByRole("button", { name: "Start the quiz" }).click();
        // A warning only appears once there is something to lose.
        await page.getByRole("radio").first().check();
        await page.getByRole("link", { name: "Back to my training" }).click();

        await expectOpaque(page.getByRole("alertdialog"), `Leave the quiz at ${width}px, ${theme}`);
      });
    }
  }
});
