// The pages you sign in through: validation that answers the person instead of
// a round trip, and links that have died saying so with a way forward.
import { test } from "@playwright/test";
import { PASSWORD, RESET_SENT, createCompany, createUser, expect, open } from "./helpers";

let company: Awaited<ReturnType<typeof createCompany>>;
let employee: Awaited<ReturnType<typeof createUser>>;

test.beforeAll(async () => {
  company = await createCompany("Auth");
  employee = await createUser(company.id, "Auth Employee");
});

test.describe("signing in", () => {
  test("an empty form is answered beside the fields, not after a round trip", async ({ page }) => {
    await open(page, "/login");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page.getByText("Enter the email address you were invited with.")).toBeVisible();
    await expect(page.getByText("Enter your password.")).toBeVisible();
    await expect(page.locator("#email")).toHaveAttribute("aria-invalid", "true");
    // The cursor lands where the first fix has to be typed.
    await expect(page.locator("#email")).toBeFocused();
    // Nothing was sent, so we are still here.
    await expect(page).toHaveURL(/\/login/);
  });

  test("a wrong password and an unknown address get the same answer", async ({ page }) => {
    /*
     * Saying which one was wrong would turn this form into a way to ask
     * whether an address has an account here.
     */
    const message = "That email and password don't match an account. Check both and try again.";

    await open(page, "/login");
    await page.locator("#email").fill(employee.email);
    await page.locator("#password").fill("Not-The-Right-Password-1!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText(message);

    await open(page, "/login");
    await page.locator("#email").fill("nobody-at-all@e2e.example.com");
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText(message);
  });

  test("the right password gets the employee to their training", async ({ page }) => {
    await open(page, "/login");
    await page.locator("#email").fill(employee.email);
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/employee/home");
    await expect(page.getByRole("heading", { name: "My training" })).toBeVisible();
  });

  test("the password can be shown and hidden", async ({ page }) => {
    await open(page, "/login");
    const field = page.locator("#password");
    await field.fill(PASSWORD);
    await expect(field).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Show password" }).click();
    await expect(field).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(field).toHaveAttribute("type", "password");
  });
});

test.describe("creating a company account", () => {
  test("every problem is reported at once, beside its own field", async ({ page }) => {
    await open(page, "/signup");
    await page.locator("#email").fill("not-an-email");
    await page.locator("#password").fill("short");
    await page.locator("#confirm").fill("different");
    await page.getByRole("button", { name: "Create account" }).click();

    // All five, not one at a time down a queue of submissions.
    await expect(page.getByText("Enter your name.")).toBeVisible();
    await expect(page.getByText("Enter your company's name.")).toBeVisible();
    await expect(
      page.getByText("That doesn't look like an email address. Check for a typo."),
    ).toBeVisible();
    await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
    await expect(page.getByText("Both passwords must match.")).toBeVisible();

    await expect(page.locator("#name")).toBeFocused();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("a password that is long enough but mistyped stops at the confirmation", async ({
    page,
  }) => {
    await open(page, "/signup");
    await page.locator("#name").fill("Ada Lovelace");
    await page.locator("#company").fill("E2E Test Never Created");
    await page.locator("#email").fill("ada@e2e.example.com");
    await page.locator("#password").fill(PASSWORD);
    await page.locator("#confirm").fill(`${PASSWORD}-not-quite`);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("Both passwords must match.")).toBeVisible();
    await expect(page.locator("#confirm")).toBeFocused();
    await expect(page).toHaveURL(/\/signup/);
  });
});

test.describe("forgetting a password", () => {
  test("the link on sign-in leads to a page of its own", async ({ page }) => {
    await open(page, "/login");
    await page.getByRole("link", { name: "Forgot your password?" }).click();
    await page.waitForURL("**/forgot-password");
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    // Its own page, so the way back is the ordinary one.
    await page.getByRole("link", { name: "Back to sign in" }).click();
    await page.waitForURL("**/login");
  });

  test("an empty address is answered before anything is sent", async ({ page }) => {
    let requested = false;
    await page.route(`${process.env.SUPABASE_URL}/auth/v1/recover**`, async (route) => {
      requested = true;
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await open(page, "/forgot-password");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("Enter your email address.")).toBeVisible();
    expect(requested, "a request was sent for an empty address").toBe(false);
  });

  test("an address with no account gets the very same confirmation", async ({ page }) => {
    /*
     * The two halves of the oracle: a real account and one that has never
     * existed must produce byte-identical text. Supabase answers the same
     * either way, but the page's own error handling could still give it
     * away -- its send rate limit, for one, can only be hit by an address it
     * really sends to.
     */
    await page.route(`${process.env.SUPABASE_URL}/auth/v1/recover**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );

    const seen: string[] = [];
    for (const address of [employee.email, "definitely-nobody@e2e.example.com"]) {
      await open(page, "/forgot-password");
      await page.locator("#email").fill(address);
      await page.getByRole("button", { name: "Send reset link" }).click();
      const status = page.getByRole("status").first();
      await expect(status).toContainText(RESET_SENT);
      seen.push((await status.innerText()).trim());
    }

    expect(seen[0], "a real account and an unknown one read the same").toBe(seen[1]);
    // And neither repeats the address back, which would differ on its own.
    expect(seen[0]).not.toContain(employee.email);
  });

  test("the confirmation says nothing about whether the account exists", async ({ page }) => {
    // Answered here so no email is ever sent; the suite never sends real email.
    await page.route(`${process.env.SUPABASE_URL}/auth/v1/recover**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );

    await open(page, "/forgot-password");
    await page.locator("#email").fill("nobody-at-all@e2e.example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(page.getByRole("status").first()).toContainText(RESET_SENT);
    await expect(page.getByText("The link works once and expires after an hour.")).toBeVisible();
  });
});

test.describe("a link that has died", () => {
  /** Exactly what Supabase puts in the fragment when a link is spent. */
  const dead =
    "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid";

  test("an expired invite says to ask the admin, because nothing else would work", async ({
    page,
  }) => {
    await open(page, `/accept-invite?type=invite${dead}`);
    await expect(page.getByRole("alert")).toContainText(
      "This invite link has expired or has already been used.",
    );
    await expect(page.getByRole("alert")).toContainText("Ask your admin to send you a new invite.");
    await expect(page.locator("#password")).toHaveCount(0);
    // An employee can't request their own invite, so there is no such button.
    await expect(page.getByRole("link", { name: "Request a new link" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Back to sign in" })).toBeVisible();
  });

  test("an expired reset link offers a new one", async ({ page }) => {
    await open(page, `/accept-invite?type=recovery${dead}`);
    await expect(page.getByRole("alert")).toContainText(
      "This reset link has expired or has already been used.",
    );
    await expect(page.locator("#password")).toHaveCount(0);

    await page.getByRole("link", { name: "Request a new link" }).click();
    await page.waitForURL("**/forgot-password");
  });

  test("the tokens never reach the address bar or the history", async ({ page }) => {
    // A reset link's session is in the fragment; leaving it there would put a
    // live session into browser history and into any shared screenshot.
    await open(page, `/accept-invite?type=recovery${dead}`);
    expect(page.url()).not.toContain("error_code");
    expect(page.url()).toContain("/accept-invite?type=recovery");
  });
});
