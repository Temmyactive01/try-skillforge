// Password reset, including manual test 5's failure (Sign out in another tab) and dead links.
// Reset links come from the admin API; the one browser request that would email is intercepted.
import { test } from "@playwright/test";
import {
  PASSWORD,
  alertText,
  createCompany,
  createUser,
  expect,
  open,
  fillSetPasswordForm,
  publicClient,
  recoveryLink,
  signInUI,
} from "./helpers";

const NEW_PASSWORD = "Reset-Test-2026!";
let companyId: string;

test.beforeAll(async () => {
  companyId = (await createCompany("Reset")).id;
});

// A fresh employee per test, so each starts with the known password.
async function newEmployee() {
  return createUser(companyId, "Reset Employee");
}

async function canSignIn(email: string, password: string) {
  const { error } = await publicClient().auth.signInWithPassword({ email, password });
  return !error;
}

test("Forgot password asks for a link to the set-password page (no email sent)", async ({
  page,
}) => {
  const user = await newEmployee();
  let redirectTo: string | null = null;
  let requestedEmail: string | undefined;
  await page.route(`${process.env.SUPABASE_URL}/auth/v1/recover**`, async (route) => {
    redirectTo = new URL(route.request().url()).searchParams.get("redirect_to");
    requestedEmail = route.request().postDataJSON()?.email;
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await open(page, "/login");
  await page.locator("#email").fill(user.email);
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "If an account exists for this email, a password reset link has been sent.",
  );
  expect(requestedEmail).toBe(user.email);
  expect(redirectTo).toMatch(/\/accept-invite\?type=recovery$/);
});

test("a fresh reset link sets a new password", async ({ page, baseURL }) => {
  const user = await newEmployee();
  await open(page, await recoveryLink(user.email, baseURL!));
  await expect(page.getByText("Choose a new password for your SkillForge account.")).toBeVisible();
  expect(page.url()).not.toContain("access_token");

  await expect(page.locator("#password")).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show new password" }).click();
  await expect(page.locator("#password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Show confirm password" }).click();
  await expect(page.locator("#confirm")).toHaveAttribute("type", "text");

  await fillSetPasswordForm(page, NEW_PASSWORD, "Something-Else-2026!");
  await expect(page.getByRole("alert")).toHaveText("Passwords do not match.");

  await fillSetPasswordForm(page, NEW_PASSWORD);
  await page.waitForURL("**/employee/home");
  expect(await canSignIn(user.email, NEW_PASSWORD)).toBe(true);
  expect(await canSignIn(user.email, PASSWORD)).toBe(false);
});

test("signing out in another tab doesn't break an open reset form", async ({
  context,
  baseURL,
}) => {
  const user = await newEmployee();
  const tabA = await context.newPage();
  await signInUI(tabA, user.email);

  const tabB = await context.newPage();
  await open(tabB, await recoveryLink(user.email, baseURL!));
  await expect(tabB.getByText("Choose a new password")).toBeVisible();

  await tabA.bringToFront();
  await tabA.getByRole("button", { name: "Sign out" }).click();
  await tabA.waitForURL("**/login");

  await tabB.bringToFront();
  await fillSetPasswordForm(tabB, NEW_PASSWORD);
  await tabB.waitForURL("**/employee/home");
  expect(await canSignIn(user.email, NEW_PASSWORD)).toBe(true);
});

test("an already-used reset link shows a plain message and no form", async ({
  page,
  browser,
  baseURL,
}) => {
  const user = await newEmployee();
  const link = await recoveryLink(user.email, baseURL!);
  await open(page, link);
  await expect(page.getByText("Choose a new password")).toBeVisible();

  const otherContext = await browser.newContext();
  try {
    const second = await otherContext.newPage();
    await open(second, link);
    await expect(second.getByRole("alert")).toHaveText(
      "This reset link has expired or was already used. Request a new one from the login page.",
    );
    await expect(second.locator("#password")).toHaveCount(0);
    await expect(second.getByRole("link", { name: "Go to sign in" })).toBeVisible();
  } finally {
    await otherContext.close();
  }
});

test("reloading the reset page keeps the form working", async ({ page, baseURL }) => {
  const user = await newEmployee();
  await open(page, await recoveryLink(user.email, baseURL!));
  await expect(page.getByText("Choose a new password")).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("#password")).toBeVisible();
  await fillSetPasswordForm(page, NEW_PASSWORD);
  await page.waitForURL("**/employee/home");
  expect(await canSignIn(user.email, NEW_PASSWORD), `alert: ${await alertText(page)}`).toBe(true);
});
