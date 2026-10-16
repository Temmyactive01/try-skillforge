/*
 * The public site: the pages a signed-out visitor can reach, plus the 404.
 *
 * None of these tests need data, so none of them create any. The two that
 * sign in borrow the company the suite's helpers build, because what they are
 * checking is that the marketing header notices somebody is already signed in.
 */
import { test } from "@playwright/test";
import { createCompany, createUser, expect, open, signIn, waitForHydration } from "./helpers";

/** Every public page, with the exact title it must carry and its one h1. */
const PAGES = [
  {
    path: "/",
    title: "SkillForge — assign training and see who has finished it",
    h1: "Assign training and see who has finished it.",
  },
  { path: "/features", title: "Features — SkillForge", h1: "What SkillForge does" },
  { path: "/tour", title: "Take the tour — SkillForge", h1: "A tour of SkillForge" },
  { path: "/pricing", title: "Pricing — SkillForge", h1: "SkillForge is not priced yet" },
  { path: "/about", title: "About — SkillForge", h1: "About SkillForge" },
  { path: "/security", title: "Security — SkillForge", h1: "How SkillForge is secured" },
  { path: "/privacy", title: "Privacy policy — SkillForge", h1: "Privacy policy" },
  { path: "/terms", title: "Terms of service — SkillForge", h1: "Terms of service" },
] as const;

test.describe("public pages", () => {
  for (const page_ of PAGES) {
    test(`${page_.path} has its own title, description and a single h1`, async ({ page }) => {
      await open(page, page_.path);

      await expect(page).toHaveTitle(page_.title);

      // Exactly one h1, and it is the page's own rather than the shell's.
      const headings = page.getByRole("heading", { level: 1 });
      await expect(headings).toHaveCount(1);
      await expect(headings).toHaveText(page_.h1);

      // A description worth having, not an empty tag that satisfies a checker.
      const description = await page
        .locator('head meta[name="description"]')
        .getAttribute("content");
      expect(description?.length ?? 0).toBeGreaterThan(50);

      // The share tags have to agree with the page, which is the whole reason
      // they are built by one helper rather than typed out per route.
      const ogTitle = await page.locator('head meta[property="og:title"]').getAttribute("content");
      expect(ogTitle).toBe(page_.title);
      const ogImage = await page.locator('head meta[property="og:image"]').getAttribute("content");
      expect(ogImage).toMatch(/^https?:\/\/.+\/og\.png$/);
    });
  }

  test("no page scrolls sideways at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    for (const { path } of PAGES) {
      await open(page, path);
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        overflow.scrollWidth,
        `${path} is ${overflow.scrollWidth - overflow.clientWidth}px wider than the viewport`,
      ).toBeLessThanOrEqual(overflow.clientWidth);
    }
  });

  test("the header reaches every page it names, and both calls to action", async ({ page }) => {
    await open(page, "/");

    const nav = page.getByRole("navigation", { name: "Main" });
    for (const [label, path] of [
      ["Features", "/features"],
      ["Take the tour", "/tour"],
      ["About", "/about"],
    ] as const) {
      await nav.getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(path);
      await waitForHydration(page);
    }

    // The mark goes home from wherever you are.
    await page.getByRole("link", { name: "SkillForge" }).first().click();
    await expect(page).toHaveURL("/");

    await page.getByRole("link", { name: "Create a company account" }).first().click();
    await expect(page).toHaveURL("/signup");

    await open(page, "/");
    await page.getByRole("link", { name: "Sign in", exact: true }).first().click();
    await expect(page).toHaveURL("/login");
  });

  test("the footer reaches pricing and the legal pages", async ({ page }) => {
    await open(page, "/");

    const footer = page.getByRole("navigation", { name: "Footer" });
    for (const [label, path] of [
      ["Pricing", "/pricing"],
      ["Privacy policy", "/privacy"],
      ["Terms of service", "/terms"],
      ["Security", "/security"],
    ] as const) {
      await open(page, "/");
      await footer.getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(path);
    }
  });

  test("an unknown address gets the 404 page, with a way back", async ({ page }) => {
    await open(page, "/this-page-does-not-exist");

    await expect(page).toHaveTitle("Page not found — SkillForge");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveCount(1);
    await expect(heading).toHaveText("That page isn’t here");

    // The header and footer are there too, so it is a page rather than a dead end.
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();

    // Each way back names where it goes and what is there, so the accessible
    // name is "Home What SkillForge does" rather than "Home".
    await page.getByRole("link", { name: "Home What SkillForge does" }).click();
    await expect(page).toHaveURL("/");
  });

  test("the skip link is the first stop and moves focus to the content", async ({ page }) => {
    await open(page, "/");

    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    // Hidden until it has focus, visible once it does.
    await expect(skip).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();
  });

  test("the favicon and the share image are actually served", async ({ page, baseURL }) => {
    for (const file of ["/favicon.svg", "/favicon.ico", "/apple-touch-icon.png", "/og.png"]) {
      const response = await page.request.get(`${baseURL}${file}`);
      expect(response.status(), `${file} should be served`).toBe(200);
    }
  });
});

test.describe("public pages for somebody already signed in", () => {
  test("an admin is offered their dashboard, not a second company", async ({ page }) => {
    const company = await createCompany("PublicAdmin");
    await signIn(page, company.admin.email);
    await open(page, "/");

    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Go to your dashboard" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Sign in", exact: true })).toHaveCount(0);
    await expect(header.getByRole("link", { name: "Create a company account" })).toHaveCount(0);

    await header.getByRole("link", { name: "Go to your dashboard" }).click();
    await expect(page).toHaveURL("/admin/dashboard");
  });

  test("an employee is offered their training", async ({ page }) => {
    const company = await createCompany("PublicEmployee");
    const employee = await createUser(company.id, "Dayo Learner", "employee");
    await signIn(page, employee.email);
    await open(page, "/");

    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Go to your training" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Sign in", exact: true })).toHaveCount(0);

    await header.getByRole("link", { name: "Go to your training" }).click();
    await expect(page).toHaveURL("/employee/home");
  });
});
