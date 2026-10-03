// Calls the running app's /mcp endpoint as a signed-in demo employee and checks
// each tool's answer against the database. Needs `npm run dev` and `npm run seed`.
// Usage: npm run test:mcp [-- http://localhost:8080]
import { DEMO, adminClient, loadEnv, publicClient, requireEnv } from "./lib.mjs";

loadEnv();
requireEnv("SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY");
const base = process.argv[2] ?? "http://localhost:8080";
let failures = 0;
const check = (pass, msg) => {
  if (!pass) failures++;
  console.log(`  ${pass ? "ok  " : "FAIL"}  ${msg}`);
};

let id = 0;
async function rpc(method, params, token) {
  const res = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-06-18",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
  });
  const body = res.headers.get("content-type")?.includes("application/json")
    ? await res.json()
    : null;
  return { status: res.status, body, wwwAuth: res.headers.get("www-authenticate") };
}
const initParams = {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "skillforge-smoke", version: "1" },
};
const toolJson = (r) => r.body?.result?.structuredContent;

console.log(`MCP endpoint ${base}/mcp`);
{
  const r = await rpc("initialize", initParams);
  check(
    r.status === 401 && r.wwwAuth?.includes("resource_metadata"),
    "no token: 401 with OAuth discovery header",
  );
}
{
  const r = await rpc("initialize", initParams, "not-a-real-token");
  check(r.status === 401 && r.wwwAuth?.includes("invalid_token"), "bad token: 401 invalid_token");
}

const employee = DEMO.employees[0];
const { data: session, error } = await publicClient().auth.signInWithPassword({
  email: employee.email,
  password: DEMO.password(),
});
if (error) {
  console.log(
    `  FAIL  could not sign in as ${employee.email}: ${error.message} (run npm run seed)`,
  );
  process.exit(1);
}
const token = session.session.access_token;
const userId = session.user.id;
console.log(`  (signed in as ${employee.email})`);

{
  const r = await rpc("initialize", initParams, token);
  check(
    r.status === 200 && r.body?.result?.serverInfo?.name === "skillforge-mcp",
    "initialize: server skillforge-mcp",
  );
}
{
  const r = await rpc("tools/list", {}, token);
  const names = (r.body?.result?.tools ?? []).map((t) => t.name).sort();
  check(
    JSON.stringify(names) ===
      JSON.stringify(["get_my_profile", "list_company_courses", "list_my_assignments"]),
    `tools/list: ${names.join(", ")}`,
  );
}

const admin = adminClient();
const { data: profile } = await admin
  .from("profiles")
  .select("company_id")
  .eq("id", userId)
  .single();
{
  const r = await rpc("tools/call", { name: "get_my_profile", arguments: {} }, token);
  const p = toolJson(r)?.profile;
  check(
    p?.email === employee.email && p?.role === "employee",
    `get_my_profile: ${p?.name} (${p?.role})`,
  );
}
{
  const { count } = await admin
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  const r = await rpc("tools/call", { name: "list_my_assignments", arguments: {} }, token);
  const list = toolJson(r)?.assignments ?? [];
  check(list.length === count, `list_my_assignments: ${list.length} (database has ${count})`);
  const r2 = await rpc(
    "tools/call",
    { name: "list_my_assignments", arguments: { status: "complete" } },
    token,
  );
  const done = toolJson(r2)?.assignments ?? [];
  check(
    done.length > 0 && done.every((a) => a.status === "complete"),
    `status filter: ${done.length} complete`,
  );
}
{
  const { count } = await admin
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("company_id", profile.company_id);
  const r = await rpc("tools/call", { name: "list_company_courses", arguments: {} }, token);
  const list = toolJson(r)?.courses ?? [];
  check(list.length === count, `list_company_courses: ${list.length} (database has ${count})`);
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll MCP checks passed.");
process.exit(failures ? 1 : 0);
