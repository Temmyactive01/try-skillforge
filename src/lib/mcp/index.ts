import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { unauthorized, verifyBearer } from "./auth";
import type { McpUser } from "./supabase-for-user";
import { registerGetMyProfile } from "./tools/get-my-profile";
import { registerListMyAssignments } from "./tools/list-my-assignments";
import { registerListCompanyCourses } from "./tools/list-company-courses";

function createMcpServer(user: McpUser) {
  const server = new McpServer(
    { name: "skillforge-mcp", title: "SkillForge", version: "0.1.0" },
    {
      instructions:
        "Tools for SkillForge — assigned training courses, quiz results, and company course catalog for the signed-in user.",
    },
  );
  registerGetMyProfile(server, user);
  registerListMyAssignments(server, user);
  registerListCompanyCourses(server, user);
  return server;
}

// Stateless Streamable HTTP: every request gets a fresh server bound to the
// verified caller, so no session state is shared between users.
export async function handleMcpRequest(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;

  // Spec requires Origin validation (DNS rebinding). Non-browser clients send
  // no Origin; browsers may only call from this app's own origin.
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== origin) {
    return new Response("Forbidden origin", { status: 403 });
  }

  const user = await verifyBearer(request);
  if (!user) {
    return unauthorized(origin, request.headers.has("authorization"));
  }

  const server = createMcpServer(user);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}
