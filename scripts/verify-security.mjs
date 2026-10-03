// Proves the database security rules are active. Usage: npm run verify:security
// 1. Database: RLS, policies, column grants, helper functions and triggers.
// 2. Logged-out browser: what the publishable key alone can read.
// 3. Signed-in demo employee (after npm run seed): quiz answers, isolation, escalation.
import { DEMO, adminClient, db, loadEnv, publicClient, requireEnv } from "./lib.mjs";

loadEnv();
requireEnv("SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL");

const TABLES = [
  "assignments",
  "companies",
  "courses",
  "profiles",
  "quiz_questions",
  "quiz_results",
  "teams",
];
let failures = 0;
const check = (pass, msg) => {
  if (!pass) failures++;
  console.log(`  ${pass ? "ok  " : "FAIL"}  ${msg}`);
};
const denied = (error) => error?.code === "42501";

// 1. Database ---------------------------------------------------------------
console.log("Database rules");
const sql = db();
try {
  const tables = await sql`
    select c.relname as name, c.relrowsecurity as rls,
           (select count(*)::int from pg_policy p where p.polrelid = c.oid) as policies
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
    order by 1`;
  check(
    JSON.stringify(tables.map((t) => t.name)) === JSON.stringify(TABLES),
    `public tables are exactly: ${TABLES.join(", ")}`,
  );
  for (const t of tables) {
    check(t.rls && t.policies > 0, `${t.name}: RLS on, ${t.policies} policies`);
  }

  const [{ views }] = await sql`
    select count(*)::int as views from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('v', 'm')`;
  check(views === 0, "no views in public (the old quiz_questions_public view is gone)");

  const [g] = await sql`select
    has_column_privilege('authenticated', 'public.quiz_questions', 'correct_answer', 'SELECT') as auth_answer,
    has_column_privilege('anon', 'public.quiz_questions', 'correct_answer', 'SELECT') as anon_answer,
    has_column_privilege('authenticated', 'public.quiz_questions', 'question_text', 'SELECT') as auth_text,
    has_table_privilege('authenticated', 'public.quiz_questions', 'SELECT') as auth_whole_table`;
  check(!g.auth_answer, "signed-in users cannot SELECT quiz_questions.correct_answer");
  check(!g.anon_answer, "logged-out visitors cannot SELECT quiz_questions.correct_answer");
  check(g.auth_text, "signed-in users can SELECT quiz_questions.question_text");
  check(!g.auth_whole_table, "no whole-table SELECT on quiz_questions (column grants only)");

  const [f] = await sql`select
    to_regprocedure('private.is_admin(uuid)') is not null as priv_admin,
    to_regprocedure('private.get_user_company_id(uuid)') is not null as priv_company,
    to_regprocedure('public.is_admin(uuid)') is null as no_public_admin,
    to_regprocedure('public.get_user_company_id(uuid)') is null as no_public_company`;
  check(f.priv_admin && f.priv_company, "RLS helpers exist in the private schema");
  check(
    f.no_public_admin && f.no_public_company,
    "RLS helpers are not in the API-exposed public schema",
  );

  const triggers = await sql`
    select tgname, c.relname, n.nspname from pg_trigger t
    join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal and tgname in ('restrict_assignment_user_update', 'on_auth_user_created')`;
  check(
    triggers.some(
      (t) => t.tgname === "restrict_assignment_user_update" && t.relname === "assignments",
    ),
    "trigger stops employees changing anything but status on their assignments",
  );
  check(
    !triggers.some((t) => t.tgname === "on_auth_user_created"),
    "no auth.users trigger creating profiles from client-supplied metadata",
  );
} finally {
  await sql.end({ timeout: 5 });
}

// 2. Logged-out browser ------------------------------------------------------
console.log("Logged-out visitor (publishable key only)");
const anon = publicClient();
for (const t of TABLES) {
  const { data, error } = await anon.from(t).select("id").limit(1);
  check(error || data.length === 0, `${t}: no rows readable`);
}
{
  const { error } = await anon.from("quiz_questions").select("correct_answer").limit(1);
  check(denied(error), "quiz answers: permission denied");
}
{
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/is_admin`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
      "Content-Profile": "private",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  check(res.status >= 400, `private schema not reachable through the API (HTTP ${res.status})`);
}

// 3. Signed-in demo employee -------------------------------------------------
console.log("Signed-in employee");
const admin = adminClient();
const employee = DEMO.employees[0];
const browser = publicClient();
const { data: signIn, error: signInError } = await browser.auth.signInWithPassword({
  email: employee.email,
  password: DEMO.password(),
});
if (signInError) {
  console.log(`  skip  could not sign in as ${employee.email} (run npm run seed first)`);
} else {
  const me = signIn.user.id;
  const { data: myProfile } = await admin
    .from("profiles")
    .select("company_id")
    .eq("id", me)
    .single();
  const myCompany = myProfile.company_id;
  console.log(`  (signed in as ${employee.email})`);

  {
    const { data, error } = await browser
      .from("quiz_questions")
      .select("id, question_text, options");
    check(
      !error && data.length > 0,
      `can read quiz questions without answers (${data?.length ?? 0})`,
    );
  }
  {
    const { error } = await browser.from("quiz_questions").select("correct_answer");
    check(denied(error), "quiz answers: permission denied");
  }
  {
    const { error } = await browser.from("quiz_questions").select("*");
    check(denied(error), 'select("*") on quiz_questions: permission denied');
  }
  {
    const { data } = await browser.from("courses").select("id, company_id");
    const { count } = await admin
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("company_id", myCompany);
    check(
      data.length === count && data.every((c) => c.company_id === myCompany),
      `sees exactly their company's ${count} courses`,
    );
  }
  {
    const { data } = await browser.from("assignments").select("user_id");
    check(
      data.length > 0 && data.every((a) => a.user_id === me),
      `sees only their own assignments (${data.length})`,
    );
  }
  {
    const { data } = await browser.from("profiles").select("company_id");
    check(
      data.every((p) => p.company_id === myCompany),
      `sees only colleagues' profiles (${data.length})`,
    );
  }
  {
    await browser.from("profiles").update({ role: "admin" }).eq("id", me);
    const { data } = await admin.from("profiles").select("role").eq("id", me).single();
    check(data.role === "employee", "cannot promote themselves to admin");
  }
  {
    const { data: mine } = await browser.from("assignments").select("id").limit(1).single();
    const { error } = await browser
      .from("assignments")
      .update({ due_date: "2099-01-01T00:00:00Z" })
      .eq("id", mine.id);
    check(Boolean(error), "cannot change their own due date");
  }

  // Another company's data must be invisible. Create one temporarily.
  const { data: other } = await admin
    .from("companies")
    .insert({ name: "Isolation check (temporary)" })
    .select("id")
    .single();
  try {
    const { data: course } = await admin
      .from("courses")
      .insert({ company_id: other.id, title: "Other company's course" })
      .select("id")
      .single();
    await admin.from("quiz_questions").insert({
      course_id: course.id,
      question_text: "Hidden?",
      options: ["yes", "no"],
      correct_answer: "yes",
    });
    const { data: c } = await browser.from("courses").select("id").eq("id", course.id);
    const { data: q } = await browser
      .from("quiz_questions")
      .select("id")
      .eq("course_id", course.id);
    const { data: co } = await browser.from("companies").select("id").eq("id", other.id);
    check(c.length === 0 && q.length === 0 && co.length === 0, "cannot see another company's data");
  } finally {
    await admin.from("companies").delete().eq("id", other.id);
  }
  await browser.auth.signOut();
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll security checks passed.");
process.exit(failures ? 1 : 0);
