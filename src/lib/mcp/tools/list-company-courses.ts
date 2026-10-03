import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabaseForUser, type McpUser } from "../supabase-for-user";

export function registerListCompanyCourses(server: McpServer, user: McpUser) {
  server.registerTool(
    "list_company_courses",
    {
      title: "List company courses",
      description:
        "List training courses available in the signed-in user's company. Optionally filter by category or a text search on the title.",
      inputSchema: {
        category: z.string().optional().describe("Exact category match."),
        search: z.string().optional().describe("Case-insensitive substring match on title."),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ category, search }) => {
      const sb = supabaseForUser(user);
      let query = sb
        .from("courses")
        .select("id, title, description, category, content_type, created_at")
        .order("created_at", { ascending: false });
      if (category) query = query.eq("category", category);
      if (search) query = query.ilike("title", `%${search}%`);

      const { data, error } = await query;
      if (error) {
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
        structuredContent: { courses: data ?? [] },
      };
    },
  );
}
