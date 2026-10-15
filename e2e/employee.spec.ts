// The employee's own screens: the training list, the course page, the quiz and
// the result. The rules these protect are the ones the whole product rests on —
// only a passing quiz completes a course, a pass sticks, and a failed attempt
// does not hand back the answer sheet.
import { test, type Page } from "@playwright/test";
import {
  adminClient,
  DEFAULT_QUESTIONS,
  assign,
  assignmentStatus,
  createCompany,
  createCourse,
  createUser,
  expect,
  open,
  signIn,
  type Question,
} from "./helpers";
import { PASS_MARK } from "../src/lib/scores";

/*
 * Not serial: these share the data built in beforeAll but never each other's
 * state, and serial mode would let one failure skip every test after it —
 * which hides nine results to report one. The run is single-worker anyway.
 */

let company: Awaited<ReturnType<typeof createCompany>>;
let learner: Awaited<ReturnType<typeof createUser>>;
let newStarter: Awaited<ReturnType<typeof createUser>>;

/** The courses the ordering test reads, in the order the page should show them. */
const EXPECTED_ORDER = [
  "Overdue by three days",
  "Due in two days",
  "Due in nine days",
  "No deadline at all",
  "Finished last month",
];

test.beforeAll(async () => {
  company = await createCompany("Employee");
  learner = await createUser(company.id, "Ada Learner");
  newStarter = await createUser(company.id, "New Starter");

  // Created in a deliberately unhelpful order, so passing can't be an accident.
  const order: [string, number | null, "not_started" | "in_progress" | "complete"][] = [
    ["Finished last month", -30, "complete"],
    ["Due in nine days", 9, "not_started"],
    ["No deadline at all", null, "not_started"],
    ["Overdue by three days", -3, "not_started"],
    ["Due in two days", 2, "in_progress"],
  ];
  for (const [title, dueInDays, status] of order) {
    const courseId = await createCourse(company.id, title);
    await assign(courseId, learner.id, {
      status,
      ...(dueInDays === null ? {} : { dueInDays }),
    });
  }

  // Cancelled training is the admin's business and must not reach the employee.
  const cancelled = await createCourse(company.id, "Cancelled course");
  await assign(cancelled, learner.id, { status: "cancelled", dueInDays: 1 });
});

/** The visible training items, in the order the page lists them. */
async function itemTitles(page: Page) {
  return page.getByRole("listitem").locator("h3").allTextContents();
}

test("what is most urgent comes first, and finished training sits last", async ({ page }) => {
  await signIn(page, learner.email);
  await open(page, "/employee/home");
  await page.getByText("Overdue by three days").first().waitFor();

  expect(await itemTitles(page)).toEqual(EXPECTED_ORDER);

  // Overdue is said in words, never by colour on its own.
  const overdue = page.getByRole("listitem").filter({ hasText: "Overdue by three days" });
  await expect(overdue).toContainText("Overdue by 3 days");
  await expect(page.getByRole("listitem").filter({ hasText: "No deadline at all" })).toContainText(
    "No due date",
  );
  await expect(page.getByRole("listitem").filter({ hasText: "Due in two days" })).toContainText(
    "Due in 2 days",
  );

  // Two groups, and the finished one is the second.
  await expect(page.getByRole("list", { name: "To do" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Completed" })).toBeVisible();
});

test("a cancelled assignment never appears", async ({ page }) => {
  await signIn(page, learner.email);
  await open(page, "/employee/home");
  await page.getByText("Overdue by three days").first().waitFor();
  await expect(page.getByText("Cancelled course")).toHaveCount(0);
});

test("only the most urgent thing outstanding gets the primary button", async ({ page }) => {
  await signIn(page, learner.email);
  await open(page, "/employee/home");
  await page.getByText("Overdue by three days").first().waitFor();

  // DESIGN.md: one primary button per screen. Its fill is the brand colour.
  const primaries = page.locator("main a.bg-primary, main button.bg-primary");
  await expect(primaries).toHaveCount(1);
  await expect(primaries).toHaveAccessibleName("Start Overdue by three days");
});

test("a company with no training says so, and says who assigns it", async ({ page }) => {
  await signIn(page, newStarter.email);
  await open(page, "/employee/home");
  await expect(page.getByText("No training assigned yet.")).toBeVisible();
  await expect(page.getByText("Your admin will assign courses here.")).toBeVisible();
});

test("a finished course shows when it was finished, not when it was due", async ({ page }) => {
  const courseId = await createCourse(company.id, "Finished on a known day");
  const assignmentId = await assign(courseId, learner.id, {
    status: "complete",
    dueInDays: -40,
  });

  /*
   * Two passes, a week apart. Completion is the first one — practising
   * afterwards doesn't move the day they showed they knew the material.
   */
  const admin = adminClient();
  await admin.from("quiz_results").insert([
    {
      assignment_id: assignmentId,
      score: 100,
      passed: true,
      completed_at: "2026-03-02T09:30:00.000Z",
    },
    {
      assignment_id: assignmentId,
      score: 80,
      passed: true,
      completed_at: "2026-03-09T09:30:00.000Z",
    },
  ]);

  await signIn(page, learner.email);
  await open(page, "/employee/home");

  const item = page.getByRole("listitem").filter({ hasText: "Finished on a known day" });
  await expect(item).toContainText("Completed 2 Mar 2026");
  // The due date is history once something is done, so it is not also shown.
  await expect(item).not.toContainText("Due");
});

test("a score bar says what it is a score of", async ({ page }) => {
  // 50% on an In progress course could otherwise read as being halfway
  // through the course rather than as the best a quiz attempt has managed.
  const courseId = await createCourse(company.id, "Half marked");
  const assignmentId = await assign(courseId, learner.id, {
    status: "in_progress",
    dueInDays: 6,
  });
  await adminClient()
    .from("quiz_results")
    .insert({ assignment_id: assignmentId, score: 50, passed: false });

  await signIn(page, learner.email);
  await open(page, "/employee/home");

  const item = page.getByRole("listitem").filter({ hasText: "Half marked" });
  await expect(item).toContainText("Best score");
  await expect(item).toContainText("50%");
  // Named for a screen reader too, not only on the page.
  await expect(item.getByRole("progressbar", { name: "Best score for Half marked" })).toBeVisible();
});

test("starting the quiz moves the course to In progress, in the page and the database", async ({
  page,
}) => {
  const courseId = await createCourse(company.id, "Starting course");
  const assignmentId = await assign(courseId, learner.id, { dueInDays: 5 });
  expect(await assignmentStatus(assignmentId)).toBe("not_started");

  await signIn(page, learner.email);
  await open(page, `/employee/course/${assignmentId}`);
  await expect(page.getByText("Not started")).toBeVisible();

  await page.getByRole("button", { name: "Start the quiz" }).click();
  await page.getByText(DEFAULT_QUESTIONS[0].text).first().waitFor();

  await expect(page.getByText("In progress")).toBeVisible();
  await expect
    .poll(() => assignmentStatus(assignmentId), { message: "stored status" })
    .toBe("in_progress");
});

/** Walks the quiz one question at a time, then hands it in from the summary. */
async function takeQuiz(page: Page, pick: (q: Question, index: number) => string) {
  for (const [index, q] of DEFAULT_QUESTIONS.entries()) {
    await page.getByText(q.text).first().waitFor();
    await page.getByRole("radio", { name: pick(q, index), exact: true }).check();
    await page.getByRole("button", { name: "Next" }).click();
  }
  await page.getByRole("button", { name: "Submit quiz" }).click();
}

const wrongAnswer = (q: Question) => q.options.find((o) => o !== q.correct)!;

test("passing sets Complete, shows the result and moves focus to it", async ({ page }) => {
  const courseId = await createCourse(company.id, "Passing course");
  const assignmentId = await assign(courseId, learner.id, { dueInDays: 5 });

  await signIn(page, learner.email);
  await open(page, `/employee/course/${assignmentId}`);
  await page.getByRole("button", { name: "Start the quiz" }).click();
  await takeQuiz(page, (q) => q.correct);

  const heading = page.getByRole("heading", { name: "You passed" });
  await expect(heading).toBeVisible();
  // The result is the answer to what they just did, so the cursor goes to it.
  await expect(heading).toBeFocused();
  // And it is announced rather than silently replacing the quiz.
  await expect(page.getByRole("status").filter({ hasText: "You passed" })).toBeVisible();

  await expect(page.getByText("This course is now complete.")).toBeVisible();
  await expect.poll(() => assignmentStatus(assignmentId)).toBe("complete");
});

test("failing says the pass mark, and the pass mark is the one the grader uses", async ({
  page,
}) => {
  const courseId = await createCourse(company.id, "Failing course");
  const assignmentId = await assign(courseId, learner.id, { dueInDays: 5 });

  await signIn(page, learner.email);
  await open(page, `/employee/course/${assignmentId}`);
  await page.getByRole("button", { name: "Start the quiz" }).click();
  await takeQuiz(page, wrongAnswer);

  await expect(page.getByRole("heading", { name: "You didn't pass this time" })).toBeVisible();
  // Read from the same constant as the server-side grader, never restated.
  await expect(page.getByText(`You need ${PASS_MARK}% to pass.`)).toBeVisible();
  await expect(page.getByText("Review the course and try again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retake the quiz" })).toBeVisible();

  // A failed attempt never completes a course.
  await expect.poll(() => assignmentStatus(assignmentId)).toBe("in_progress");
});

test("a failed attempt is not given the correct answers", async ({ page }) => {
  const courseId = await createCourse(company.id, "Answer leak course");
  const assignmentId = await assign(courseId, learner.id, { dueInDays: 5 });

  await signIn(page, learner.email);

  // Everything the grader sends back, so hiding an answer in the UI can't pass
  // for keeping it: it would still have arrived in the browser.
  const bodies: string[] = [];
  page.on("response", async (response) => {
    if (!response.url().includes("submitQuiz") && !response.url().includes("_serverFn")) return;
    try {
      bodies.push(await response.text());
    } catch {
      // A response that can't be read can't be leaking anything either.
    }
  });

  await open(page, `/employee/course/${assignmentId}`);
  await page.getByRole("button", { name: "Start the quiz" }).click();
  await takeQuiz(page, wrongAnswer);
  await page.getByRole("heading", { name: "You didn't pass this time" }).waitFor();

  const onThePage = await page.locator("body").innerText();
  const overTheWire = bodies.join("\n");
  expect(bodies.length, "the grader's response was captured").toBeGreaterThan(0);

  for (const q of DEFAULT_QUESTIONS) {
    expect(onThePage, `"${q.correct}" on the page after failing`).not.toContain(q.correct);
    expect(overTheWire, `"${q.correct}" in the response after failing`).not.toContain(q.correct);
  }

  // It still says which ones were wrong — that is the useful half.
  await expect(page.getByText("Not correct").first()).toBeVisible();
  await expect(page.getByText("The correct answers aren't shown until you pass.")).toBeVisible();
});

test("a retake after passing is practice, and says so before and after", async ({ page }) => {
  const courseId = await createCourse(company.id, "Practice course");
  const assignmentId = await assign(courseId, learner.id, { status: "complete", dueInDays: 5 });

  await signIn(page, learner.email);
  await open(page, `/employee/course/${assignmentId}`);

  // Said before they start, not only after they finish.
  const practice = /Retaking it is for practice and won.t change your result\./;
  await expect(page.getByText(practice).first()).toBeVisible();

  await page.getByRole("button", { name: "Retake the quiz" }).click();
  await takeQuiz(page, wrongAnswer);

  await expect(page.getByRole("heading", { name: "You didn't pass this time" })).toBeVisible();
  await expect(page.getByText(practice).first()).toBeVisible();
  // The whole point: a bad practice run leaves the record alone.
  await expect.poll(() => assignmentStatus(assignmentId)).toBe("complete");
});

test("answers survive Back, Next and the summary", async ({ page }) => {
  const courseId = await createCourse(company.id, "Memory course");
  const assignmentId = await assign(courseId, learner.id, { dueInDays: 5 });

  await signIn(page, learner.email);
  await open(page, `/employee/course/${assignmentId}`);
  await page.getByRole("button", { name: "Start the quiz" }).click();

  const first = DEFAULT_QUESTIONS[0];
  await page.getByRole("radio", { name: first.correct, exact: true }).check();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByText(DEFAULT_QUESTIONS[1].text).first().waitFor();
  await page.getByRole("button", { name: "Back" }).click();

  await expect(page.getByRole("radio", { name: first.correct, exact: true })).toBeChecked();

  // All the way to the summary and back again through "Change".
  for (const q of DEFAULT_QUESTIONS) {
    await page.getByText(q.text).first().waitFor();
    await page.getByRole("radio", { name: q.correct, exact: true }).check();
    await page.getByRole("button", { name: "Next" }).click();
  }
  await expect(page.getByRole("heading", { name: "Check your answers" })).toBeVisible();
  await page.getByRole("button", { name: "Change your answer to question 1" }).click();
  await expect(page.getByRole("radio", { name: first.correct, exact: true })).toBeChecked();
});

test("pressing Enter in the quiz doesn't hand it in", async ({ page }) => {
  const courseId = await createCourse(company.id, "Enter key course");
  const assignmentId = await assign(courseId, learner.id, { dueInDays: 5 });

  await signIn(page, learner.email);
  await open(page, `/employee/course/${assignmentId}`);
  await page.getByRole("button", { name: "Start the quiz" }).click();

  const first = DEFAULT_QUESTIONS[0];
  const option = page.getByRole("radio", { name: first.correct, exact: true });
  await option.check();
  await option.press("Enter");

  // Still on question one, with nothing graded.
  await expect(page.getByText(first.text).first()).toBeVisible();
  await expect(page.getByText("Question 1 of 3")).toBeVisible();
  await expect(page.getByRole("heading", { name: /You (passed|didn't pass)/ })).toHaveCount(0);
  expect(await assignmentStatus(assignmentId)).toBe("in_progress");
});

test("leaving the quiz with unsubmitted answers asks first", async ({ page }) => {
  const courseId = await createCourse(company.id, "Leaving course");
  const assignmentId = await assign(courseId, learner.id, { dueInDays: 5 });

  await signIn(page, learner.email);
  await open(page, `/employee/course/${assignmentId}`);
  await page.getByRole("button", { name: "Start the quiz" }).click();
  await page.getByRole("radio", { name: DEFAULT_QUESTIONS[0].correct, exact: true }).check();

  await page.getByRole("link", { name: "Back to my training" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Leave the quiz?");

  // Staying keeps both the page and the answer.
  await page.getByRole("button", { name: "Stay on the quiz" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/employee/course/${assignmentId}$`));
  await expect(
    page.getByRole("radio", { name: DEFAULT_QUESTIONS[0].correct, exact: true }),
  ).toBeChecked();

  // Leaving really leaves.
  await page.getByRole("link", { name: "Back to my training" }).click();
  await page.getByRole("button", { name: "Leave the quiz" }).click();
  await page.waitForURL("**/employee/home");
});

test("no warning once the quiz has been handed in", async ({ page }) => {
  const courseId = await createCourse(company.id, "Submitted course");
  const assignmentId = await assign(courseId, learner.id, { dueInDays: 5 });

  await signIn(page, learner.email);
  await open(page, `/employee/course/${assignmentId}`);
  await page.getByRole("button", { name: "Start the quiz" }).click();
  await takeQuiz(page, (q) => q.correct);
  await page.getByRole("heading", { name: "You passed" }).waitFor();

  await page.getByRole("button", { name: "Back to my training" }).click();
  await page.waitForURL("**/employee/home");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});

test("on a phone the quiz shows one question at a time", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  const courseId = await createCourse(company.id, "Phone course");
  const assignmentId = await assign(courseId, learner.id, { dueInDays: 5 });

  await signIn(page, learner.email);
  await open(page, `/employee/course/${assignmentId}`);
  await page.getByRole("button", { name: "Start the quiz" }).click();

  await expect(page.getByText("Question 1 of 3")).toBeVisible();
  // Only this question's options are on the page at all.
  await expect(page.getByRole("radio")).toHaveCount(DEFAULT_QUESTIONS[0].options.length);
  await expect(page.getByText(DEFAULT_QUESTIONS[1].text)).toHaveCount(0);
  // Nowhere to go until this one is answered.
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();

  await page.getByRole("radio", { name: DEFAULT_QUESTIONS[0].correct, exact: true }).check();
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByText("Question 2 of 3")).toBeVisible();
  await expect(page.getByText(DEFAULT_QUESTIONS[1].text).first()).toBeVisible();
  await expect(page.getByText(DEFAULT_QUESTIONS[0].text)).toHaveCount(0);
});

/*
 * Course content is typed by a company admin and stored as-is, so to the
 * browser it is untrusted input. Text must never be rendered as HTML, and a
 * link must never be followed unless it is https — `javascript:` in an href
 * runs on click, and it would run for every employee in the company.
 */
test.describe("course content is treated as untrusted", () => {
  /** A course whose stored content is whatever this test wants to try. */
  async function courseWithContent(contentType: string, contentUrl: string) {
    const admin = adminClient();
    const course = await createCourse(company.id, `Content ${Date.now()}${contentType}`);
    await admin
      .from("courses")
      .update({ content_type: contentType, content_url: contentUrl })
      .eq("id", course);
    return assign(course, learner.id, { dueInDays: 5 });
  }

  test("markup in text content is shown, not run", async ({ page }) => {
    const assignmentId = await courseWithContent(
      "text",
      "Safety first.\n\n<img src=x onerror=\"document.title='pwned'\"><b>Not bold</b>",
    );
    await signIn(page, learner.email);
    await open(page, `/employee/course/${assignmentId}`);

    // The angle brackets are on the page as characters...
    await expect(page.getByText("<b>Not bold</b>")).toBeVisible();
    // ...and no element was ever created from them.
    await expect(page.locator("main img")).toHaveCount(0);
    await expect(page.locator("main b")).toHaveCount(0);
    expect(await page.title()).not.toBe("pwned");
  });

  test("a link that isn't https is shown rather than followed", async ({ page }) => {
    const assignmentId = await courseWithContent("video", "javascript:alert(1)");
    await signIn(page, learner.email);
    await open(page, `/employee/course/${assignmentId}`);

    await expect(page.getByText("This video can't be opened.")).toBeVisible();
    await expect(page.getByText(/doesn't start with https/)).toBeVisible();
    // Nothing clickable, and nothing framed.
    await expect(page.getByRole("link", { name: /Open the video/ })).toHaveCount(0);
    await expect(page.locator("main iframe")).toHaveCount(0);
  });

  test("a plain http PDF is refused the same way", async ({ page }) => {
    const assignmentId = await courseWithContent("pdf", "http://example.com/handbook.pdf");
    await signIn(page, learner.email);
    await open(page, `/employee/course/${assignmentId}`);

    await expect(page.getByText("This PDF can't be opened.")).toBeVisible();
    await expect(page.getByRole("link", { name: /Open the PDF/ })).toHaveCount(0);
    await expect(page.locator("main iframe")).toHaveCount(0);
  });

  test("an https PDF gets a link that opens in a new tab", async ({ page }) => {
    const assignmentId = await courseWithContent("pdf", "https://example.com/handbook.pdf");
    await signIn(page, learner.email);
    await open(page, `/employee/course/${assignmentId}`);

    const link = page.getByRole("link", { name: /Open the PDF/ });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("target", "_blank");
    // noopener, so the opened page can't reach back through window.opener.
    await expect(link).toHaveAttribute("rel", /noopener/);
  });
});
