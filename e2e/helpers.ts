// Shared helpers for the end-to-end tests. Everything a test creates uses an
// @e2e.example.com email or an "E2E Test " company name, and cleanup only ever
// deletes rows matching those, so demo data and real companies are never touched.
import { createClient } from "@supabase/supabase-js";
import { expect, type Locator, type Page } from "@playwright/test";
import type { Database } from "../src/integrations/supabase/types";

export const E2E_DOMAIN = "e2e.example.com";
export const E2E_COMPANY_PREFIX = "E2E Test ";
export const PASSWORD = "E2e-Test-Pass-2026!";

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service-role client: bypasses RLS. Used only to set up and clean up test data. */
export function adminClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    noSession,
  );
}

/** Publishable-key client: exactly what a browser gets. */
export function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    noSession,
  );
}

/** A browser-level client signed in as the given user. */
export async function signedInClient(email: string, password = PASSWORD) {
  const client = publicClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return client;
}

let counter = 0;
function uniqueId() {
  counter += 1;
  return `${Date.now().toString(36)}${counter}${Math.random().toString(36).slice(2, 6)}`;
}
export const testEmail = (label: string) => `${label}-${uniqueId()}@${E2E_DOMAIN}`;
export const testCompanyName = (label: string) => `${E2E_COMPANY_PREFIX}${uniqueId()} ${label}`;

function must<T>(
  result: { data: T; error: { message: string } | null },
  what: string,
): NonNullable<T> {
  if (result.error || result.data == null) {
    throw new Error(`${what}: ${result.error?.message ?? "no data returned"}`);
  }
  return result.data;
}

/** For writes that return no rows: only the error matters. */
function ok(result: { error: { message: string } | null }, what: string) {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
}

/** Company plus admin, created the same way as signupCompanyAdmin. */
export async function createCompany(label: string) {
  const admin = adminClient();
  const name = testCompanyName(label);
  const company = must(
    await admin.from("companies").insert({ name }).select("id").single(),
    "create company",
  );
  const adminUser = await createUser(company.id, `${label} Admin`, "admin");
  return { id: company.id, name, admin: adminUser };
}

/** A confirmed user with a password and a profile in the given company. */
export async function createUser(
  companyId: string,
  name: string,
  role: "admin" | "employee" = "employee",
  teamId: string | null = null,
) {
  const admin = adminClient();
  const email = testEmail(role);
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !created.user) throw new Error(`create user ${email}: ${error?.message}`);
  ok(
    await admin.from("profiles").insert({
      id: created.user.id,
      company_id: companyId,
      name,
      email,
      role,
      team_id: teamId,
    }),
    `create profile ${email}`,
  );
  return { id: created.user.id, email, name };
}

export type Question = { text: string; options: string[]; correct: string };

export const DEFAULT_QUESTIONS: Question[] = [
  {
    text: "What colour is the sky on a clear day?",
    options: ["Green", "Blue", "Red", "Black"],
    correct: "Blue",
  },
  {
    text: "How many days are in a week?",
    options: ["Five", "Six", "Seven", "Eight"],
    correct: "Seven",
  },
  {
    text: "Which of these is a fruit?",
    options: ["Carrot", "Potato", "Onion", "Apple"],
    correct: "Apple",
  },
];

export async function createCourse(
  companyId: string,
  title: string,
  questions = DEFAULT_QUESTIONS,
) {
  const admin = adminClient();
  const course = must(
    await admin
      .from("courses")
      .insert({
        company_id: companyId,
        title,
        description: "Created by the end-to-end tests.",
        content_type: "text",
        content_url: "Read this, then take the quiz.",
        category: "Testing",
      })
      .select("id")
      .single(),
    "create course",
  );
  ok(
    await admin.from("quiz_questions").insert(
      questions.map((q) => ({
        course_id: course.id,
        question_text: q.text,
        options: q.options,
        correct_answer: q.correct,
      })),
    ),
    "create questions",
  );
  return course.id;
}

export type AssignmentStatus = "not_started" | "in_progress" | "complete" | "cancelled";

/** A date `days` from now as YYYY-MM-DD. Negative is in the past, so overdue. */
export const dayFromNow = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

export async function assign(
  courseId: string,
  userId: string,
  options: { status?: AssignmentStatus; dueInDays?: number } = {},
) {
  const admin = adminClient();
  const row = must(
    await admin
      .from("assignments")
      .insert({
        course_id: courseId,
        user_id: userId,
        status: options.status ?? "not_started",
        due_date: options.dueInDays === undefined ? null : dayFromNow(options.dueInDays),
      })
      .select("id")
      .single(),
    "create assignment",
  );
  return row.id;
}

/** The stored status, for checking that what the page shows matches the database. */
export async function assignmentStatus(id: string) {
  const { data, error } = await adminClient()
    .from("assignments")
    .select("status")
    .eq("id", id)
    .single();
  if (error) throw new Error(`read assignment ${id}: ${error.message}`);
  return data.status;
}

async function generateLink(type: "recovery" | "invite", email: string, baseURL: string) {
  const { data, error } = await adminClient().auth.admin.generateLink({
    type,
    email,
    options: { redirectTo: `${baseURL}/accept-invite?type=${type}` },
  });
  if (error) throw new Error(`generate ${type} link: ${error.message}`);
  return data.properties.action_link;
}

/** A password-reset link, made with the admin API so no email is sent. */
export const recoveryLink = (email: string, baseURL: string) =>
  generateLink("recovery", email, baseURL);

/** An invite link for an already-invited user, made with the admin API so no email is sent. */
export const inviteLink = (email: string, baseURL: string) =>
  generateLink("invite", email, baseURL);

/** Deletes every E2E company and user. Refuses to delete anything outside the E2E naming rules. */
export async function cleanupE2EData() {
  const admin = adminClient();
  const companies = must(
    await admin.from("companies").select("id, name").like("name", `${E2E_COMPANY_PREFIX}%`),
    "list E2E companies",
  );
  for (const c of companies) {
    if (!c.name.startsWith(E2E_COMPANY_PREFIX))
      throw new Error(`Refusing to delete company ${c.name}`);
  }
  if (companies.length) {
    ok(
      await admin
        .from("companies")
        .delete()
        .in(
          "id",
          companies.map((c) => c.id),
        ),
      "delete E2E companies",
    );
  }

  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`list users: ${error.message}`);
    users.push(...data.users.filter((u) => u.email?.endsWith(`@${E2E_DOMAIN}`)));
    if (data.users.length < 1000) break;
  }
  for (const u of users) {
    if (!u.email?.endsWith(`@${E2E_DOMAIN}`)) throw new Error(`Refusing to delete user ${u.email}`);
    ok(await admin.auth.admin.deleteUser(u.id), `delete ${u.email}`);
  }
  return { companies: companies.length, users: users.length };
}

// --- Browser helpers ---------------------------------------------------------

/**
 * Loads a page and waits until it is idle, so React has hydrated before the test clicks.
 * Clicking earlier submits forms the old-fashioned way (the URL gains a "?") and nothing happens.
 */
export async function open(page: Page, url: string) {
  await page.goto(url, { waitUntil: "networkidle" });
}

export async function signInUI(page: Page, email: string, password = PASSWORD) {
  await open(page, "/login");
  const submit = async () => {
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
  };

  await submit();
  try {
    await page.waitForURL(/\/(admin|employee)\//, { timeout: 20_000 });
  } catch {
    /*
     * A click that lands before React has attached submits the form the
     * old-fashioned way: the page reloads onto /login? with empty fields and
     * nothing happens. Waiting for networkidle usually prevents it, but on a
     * slow run it still slips through, so fill the form again and retry once.
     * A genuinely bad password still fails here, just a few seconds later.
     */
    if (!/\/(admin|employee)\//.test(page.url())) {
      await submit();
      await page.waitForURL(/\/(admin|employee)\//);
    }
  }
}

/** The input, textarea or select that follows a visible label (forms without htmlFor). */
export function field(scope: Page | Locator, label: string) {
  return scope
    .locator(`div:has(> label:text-is("${label}"))`)
    .locator(":scope > input, :scope > textarea, :scope > select");
}

export async function fillSetPasswordForm(page: Page, password: string, confirm = password) {
  await page.locator("#password").fill(password);
  await page.locator("#confirm").fill(confirm);
  await page.getByRole("button", { name: /set password/i }).click();
}

export const alertText = async (page: Page) =>
  (await page.getByRole("alert").allTextContents()).join(" | ");

export { expect };
