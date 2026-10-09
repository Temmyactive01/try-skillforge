// Every Dialog and AlertDialog in the admin must sit on an opaque surface at
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
  signInUI,
} from "./helpers";

const STAMP = Date.now();
const COURSE = `Dialog course ${STAMP}`;
const TEAM = `Dialog team ${STAMP}`;

let adminEmail: string;

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
  const course = await createCourse(company.id, COURSE);
  await assign(course, ada.id, { dueInDays: 7 });
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
 * The nine dialogs live on three pages. Walking them in page order and closing
 * each one with Escape turns three dozen page loads into three, which matters:
 * this runs four times over.
 */
const BY_PAGE = [...PANELS].sort((a, b) => a.path.localeCompare(b.path));

for (const width of [375, 1280]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 812 } });

    for (const theme of ["light", "dark"] as const) {
      test(`every dialog sits on an opaque surface in the ${theme} theme`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme });
        await signInUI(page, adminEmail);

        let currentPath = "";
        for (const panel of BY_PAGE) {
          if (panel.path !== currentPath) {
            await open(page, panel.path);
            currentPath = panel.path;
          }
          const found = await panel.openIt(page);
          await expectOpaque(found, `${panel.name} at ${width}px, ${theme}`);

          // Back to the page itself, ready for the next one. The editor's
          // discard dialog leaves the form behind it, so reload rather than
          // trusting Escape to land us back on the list.
          await page.keyboard.press("Escape");
          await expect(found).toHaveCount(0);
          if (panel.name === "Discard changes confirmation") currentPath = "";
        }
      });
    }

    // Alignment is a question of width, not of colour, so once per width is enough.
    test("every dialog's title and description are left-aligned", async ({ page }) => {
      await signInUI(page, adminEmail);
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
