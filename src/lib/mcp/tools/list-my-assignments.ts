import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabaseForUser, type McpUser } from "../supabase-for-user";

export function registerListMyAssignments(server: McpServer, user: McpUser) {
  server.registerTool(
    "list_my_assignments",
    {
      title: "List my assignments",
      description:
        "List training courses assigned to the signed-in user, with due date, status, and course details. Optionally filter by status.",
      inputSchema: {
        status: z
          .enum(["not_started", "in_progress", "complete"])
          .optional()
          .describe("Filter by assignment status."),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ status }) => {
      const sb = supabaseForUser(user);
      let query = sb
        .from("assignments")
        .select(
          "id, status, due_date, created_at, course:courses(id, title, description, category, content_type)",
        )
        .eq("user_id", user.userId)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) {
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
        structuredContent: { assignments: data ?? [] },
      };
    },
  );
}
