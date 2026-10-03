// Loads realistic demo data: one company, an admin, 6 employees in 2 teams,
// 5 courses with quizzes and assignments in every status. Safe to re-run: it
// first removes the previous demo company and demo users (and nothing else).
// Usage: npm run seed
import { DEMO, adminClient, loadEnv, publicClient, requireEnv } from "./lib.mjs";

loadEnv();
requireEnv("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PUBLISHABLE_KEY");
const admin = adminClient();

function must({ data, error }, what) {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

/** Noon UTC, `days` from today (negative = past). */
function day(days) {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

// --- Courses ----------------------------------------------------------------
const COURSES = [
  {
    title: "Data Protection Essentials",
    category: "Compliance",
    content_type: "text",
    description: "How we collect, store and share customer and employee data under GDPR.",
    content:
      "Personal data is any information that identifies a person: a name, an email address, a delivery address or a customer number.\n\n" +
      "Only collect what you need for the job, keep it in approved systems (never personal email or USB sticks), and share it only with people who need it.\n\n" +
      "If personal data is lost, sent to the wrong person or accessed without permission, report it to the data protection team within 24 hours. We have 72 hours to tell the regulator.",
    questions: [
      [
        "Which of these is personal data?",
        [
          "A customer's delivery address",
          "A pallet's weight",
          "The depot's opening hours",
          "A truck's fuel type",
        ],
        0,
      ],
      [
        "Where should customer data be stored?",
        [
          "In approved company systems",
          "On a personal USB stick",
          "In your personal email",
          "On a printed list in your car",
        ],
        0,
      ],
      [
        "You emailed a customer list to the wrong person. What do you do?",
        [
          "Report it to the data protection team within 24 hours",
          "Ask them to delete it and say nothing",
          "Wait to see if anyone complains",
          "Send the list again to the right person",
        ],
        0,
      ],
      [
        "How long does the company have to tell the regulator about a serious breach?",
        ["72 hours", "24 hours", "7 days", "30 days"],
        0,
      ],
    ],
  },
  {
    title: "Fire Safety at Work",
    category: "Safety",
    content_type: "video",
    description: "Preventing fires, raising the alarm and evacuating safely.",
    content: "https://www.youtube.com/watch?v=Ytyg5Ep2R0M",
    questions: [
      [
        "What is the first thing to do when you discover a fire?",
        ["Raise the alarm", "Collect your belongings", "Finish your task", "Open the windows"],
        0,
      ],
      [
        "What does the PASS method for extinguishers stand for?",
        [
          "Pull, Aim, Squeeze, Sweep",
          "Push, Alert, Spray, Stop",
          "Pull, Alert, Stand, Spray",
          "Point, Aim, Shoot, Stop",
        ],
        0,
      ],
      [
        "When should you use a lift during a fire evacuation?",
        [
          "Never",
          "Only if it is close by",
          "Only if you are carrying equipment",
          "When the stairs are busy",
        ],
        0,
      ],
      [
        "Where do you go after evacuating?",
        [
          "The assembly point",
          "Your car",
          "The nearest café",
          "Back to your desk once it looks safe",
        ],
        0,
      ],
    ],
  },
  {
    title: "Spotting Phishing Emails",
    category: "Security",
    content_type: "text",
    description: "Recognise and report suspicious emails before they cause harm.",
    content:
      "Phishing emails pretend to come from someone you trust so that you click a link, open an attachment or share a password.\n\n" +
      "Warning signs: urgency ('your account will be closed today'), a sender address that doesn't match the company, unexpected attachments, and requests for passwords or payment details.\n\n" +
      "Never enter your password from a link in an email. Use the Report Phish button, then delete the message.",
    questions: [
      [
        "Which is a common sign of a phishing email?",
        [
          "Urgent pressure to act now",
          "Your manager's usual signature",
          "A meeting invite you expected",
          "A newsletter you subscribed to",
        ],
        0,
      ],
      [
        "An email asks you to confirm your password via a link. What do you do?",
        [
          "Report it and don't click the link",
          "Click it to check if it's real",
          "Reply asking if it's genuine",
          "Forward it to colleagues as a warning",
        ],
        0,
      ],
      [
        "The sender name says 'IT Support' but the address is it-support@freemail.com. This is…",
        ["Suspicious", "Normal for IT", "Safe if the logo looks right", "Only a problem on mobile"],
        0,
      ],
      [
        "What should you do with an unexpected invoice attachment from an unknown sender?",
        [
          "Report it without opening it",
          "Open it to see who it's from",
          "Print it for finance",
          "Save it to the shared drive",
        ],
        0,
      ],
    ],
  },
  {
    title: "Manual Handling for New Starters",
    category: "Onboarding",
    content_type: "pdf",
    description: "Lifting and moving loads safely in the warehouse (HSE guidance).",
    content: "https://www.hse.gov.uk/pubns/indg143.pdf",
    questions: [
      [
        "Before lifting a load you should first…",
        [
          "Plan the lift and check the route",
          "Lift it quickly to test the weight",
          "Ask a colleague to time you",
          "Bend at the waist",
        ],
        0,
      ],
      [
        "Where should you keep a load while carrying it?",
        ["Close to your waist", "At arm's length", "Above your shoulders", "On one hip only"],
        0,
      ],
      [
        "A load is too heavy to lift safely alone. What do you do?",
        [
          "Use equipment or get help",
          "Try anyway, carefully",
          "Drag it across the floor",
          "Leave it where it is without telling anyone",
        ],
        0,
      ],
    ],
  },
  {
    title: "Giving Useful Feedback",
    category: "Leadership",
    content_type: "text",
    description: "A simple structure for feedback that people can act on.",
    content:
      "Good feedback is specific, timely and about behaviour, not personality.\n\n" +
      "Use Situation, Behaviour, Impact: describe when and where it happened, what the person did, and the effect it had. Then agree a next step together.\n\n" +
      "Give praise in public and corrections in private, and do it soon after the event so the details are fresh.",
    questions: [
      [
        "What does SBI stand for?",
        [
          "Situation, Behaviour, Impact",
          "Summary, Background, Idea",
          "Strength, Barrier, Improvement",
          "Start, Build, Improve",
        ],
        0,
      ],
      [
        "Feedback works best when it is about…",
        [
          "Specific behaviour",
          "The person's personality",
          "What others think of them",
          "Their whole year",
        ],
        0,
      ],
      [
        "When should you usually give corrective feedback?",
        [
          "Privately, soon after the event",
          "In the next team meeting",
          "At the annual review",
          "By group email",
        ],
        0,
      ],
    ],
  },
];

// Assignment plan: [employee index, course index, status, due in days | null, quiz score | null].
// Scores must be reachable: 4 questions -> 0/25/50/75/100, 3 questions -> 0/33/67/100. Pass is 70+.
const ASSIGNMENTS = [
  [0, 0, "complete", -10, 100],
  [0, 1, "in_progress", 2, null], // due soon
  [0, 2, "not_started", -3, null], // overdue
  [0, 3, "complete", -20, 100],
  [1, 0, "in_progress", -2, 50], // overdue, failed quiz
  [1, 1, "complete", -5, 75],
  [1, 4, "not_started", null, null], // no due date
  [2, 2, "complete", -1, 100],
  [2, 0, "cancelled", 7, null],
  [2, 3, "not_started", 14, null],
  [3, 2, "in_progress", 1, 25], // due tomorrow, failed quiz
  [3, 4, "complete", -8, 100],
  [3, 0, "not_started", -7, null], // overdue
  [4, 2, "complete", -15, 75],
  [4, 1, "not_started", 0, null], // due today
  [4, 4, "cancelled", null, null],
  [5, 3, "not_started", 10, null],
  [5, 0, "not_started", 5, null],
];
const PENDING_EMPLOYEE = 5; // never signs in, so the Employees page shows "Pending"

// --- 1. Remove the previous demo data ----------------------------------------
console.log("Removing previous demo data…");
const oldUsers = [];
for (let page = 1; ; page++) {
  const { users } = must(await admin.auth.admin.listUsers({ page, perPage: 1000 }), "list users");
  oldUsers.push(...users.filter((u) => u.email?.endsWith(`@${DEMO.domain}`)));
  if (users.length < 1000) break;
}
if (oldUsers.length) {
  const profiles = must(
    await admin
      .from("profiles")
      .select("company_id")
      .in(
        "id",
        oldUsers.map((u) => u.id),
      ),
    "find demo company",
  );
  const companyIds = [...new Set(profiles.map((p) => p.company_id))];
  if (companyIds.length) {
    must(await admin.from("companies").delete().in("id", companyIds), "delete demo company");
  }
  for (const u of oldUsers) must(await admin.auth.admin.deleteUser(u.id), `delete ${u.email}`);
}
console.log(`  removed ${oldUsers.length} demo users`);

// --- 2. Company, teams, people -----------------------------------------------
console.log("Creating company, teams and people…");
const company = must(
  await admin.from("companies").insert({ name: DEMO.company }).select("id").single(),
  "create company",
);
const teams = must(
  await admin
    .from("teams")
    .insert(DEMO.teams.map((name) => ({ company_id: company.id, name })))
    .select("id, name"),
  "create teams",
);
const teamId = Object.fromEntries(teams.map((t) => [t.name, t.id]));

async function createPerson({ name, email, team }, role) {
  const { user } = must(
    await admin.auth.admin.createUser({
      email,
      password: DEMO.password(),
      email_confirm: true,
      user_metadata: { name },
    }),
    `create ${email}`,
  );
  // Same trusted path as the app: profiles are only ever written with the service role.
  must(
    await admin.from("profiles").insert({
      id: user.id,
      company_id: company.id,
      team_id: team ? teamId[team] : null,
      name,
      email,
      role,
    }),
    `profile for ${email}`,
  );
  return user.id;
}
await createPerson(DEMO.admin, "admin");
const employeeIds = [];
for (const e of DEMO.employees) employeeIds.push(await createPerson(e, "employee"));

// --- 3. Courses and quizzes --------------------------------------------------
console.log("Creating courses and quizzes…");
const courseIds = [];
for (const c of COURSES) {
  const course = must(
    await admin
      .from("courses")
      .insert({
        company_id: company.id,
        title: c.title,
        description: c.description,
        content_type: c.content_type,
        content_url: c.content, // the app stores text content here too
        category: c.category,
      })
      .select("id")
      .single(),
    `course ${c.title}`,
  );
  courseIds.push(course.id);
  must(
    await admin.from("quiz_questions").insert(
      c.questions.map(([question_text, options, correct], qi) => {
        // Rotate options so the right answer isn't always in the same position.
        const shift = (qi + courseIds.length) % options.length;
        return {
          course_id: course.id,
          question_text,
          options: [...options.slice(shift), ...options.slice(0, shift)],
          correct_answer: options[correct],
        };
      }),
    ),
    `questions for ${c.title}`,
  );
}

// --- 4. Assignments and quiz results ----------------------------------------
console.log("Creating assignments and quiz results…");
for (const [emp, courseIdx, status, due, score] of ASSIGNMENTS) {
  const n = COURSES[courseIdx].questions.length;
  if (
    score !== null &&
    ![...Array(n + 1).keys()].some((k) => Math.round((k / n) * 100) === score)
  ) {
    throw new Error(`Score ${score} is impossible for a ${n}-question quiz`);
  }
  const assignment = must(
    await admin
      .from("assignments")
      .insert({
        course_id: courseIds[courseIdx],
        user_id: employeeIds[emp],
        status,
        due_date: due === null ? null : day(due),
      })
      .select("id")
      .single(),
    "create assignment",
  );
  if (score !== null) {
    must(
      await admin.from("quiz_results").insert({
        assignment_id: assignment.id,
        score,
        passed: score >= 70,
        completed_at: day(due === null ? -1 : Math.min(due, 0) - 1),
      }),
      "create quiz result",
    );
  }
}

// --- 5. Sign everyone except one employee in once, so they show as Active ---
const browser = publicClient();
for (const [i, e] of DEMO.employees.entries()) {
  if (i === PENDING_EMPLOYEE) continue;
  must(
    await browser.auth.signInWithPassword({ email: e.email, password: DEMO.password() }),
    `sign in ${e.email}`,
  );
  await browser.auth.signOut();
}

// --- Summary ----------------------------------------------------------------
const byStatus = ASSIGNMENTS.reduce((acc, [, , s]) => ({ ...acc, [s]: (acc[s] ?? 0) + 1 }), {});
const overdue = ASSIGNMENTS.filter(
  ([, , s, due]) => s !== "complete" && s !== "cancelled" && due < 0 && due !== null,
).length;
console.log(`
Done: ${DEMO.company}
  people:      1 admin, ${DEMO.employees.length} employees in ${DEMO.teams.join(" and ")} (1 pending)
  courses:     ${COURSES.length}, ${COURSES.reduce((n, c) => n + c.questions.length, 0)} quiz questions
  assignments: ${ASSIGNMENTS.length} (${Object.entries(byStatus)
    .map(([s, n]) => `${n} ${s}`)
    .join(", ")}; ${overdue} overdue)

Demo logins (password: ${DEMO.password()})
  admin:    ${DEMO.admin.email}
  employee: ${DEMO.employees[0].email}`);
