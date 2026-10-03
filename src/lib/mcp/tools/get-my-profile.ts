import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { supabaseForUser, type McpUser } from "../supabase-for-user";

export function registerGetMyProfile(server: McpServer, user: McpUser) {
  server.registerTool(
    "get_my_profile",
    {
      title: "Get my profile",
      description:
        "Return the signed-in SkillForge user's profile (name, email, role, company, team).",
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      const sb = supabaseForUser(user);
      const { data, error } = await sb
        .from("profiles")
        .select("id, name, email, role, company_id, team_id, created_at")
        .eq("id", user.userId)
        .maybeSingle();
      if (error) {
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
      if (!data) {
        return { content: [{ type: "text", text: "Profile not found" }], isError: true };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: { profile: data },
      };
    },
  );
}
