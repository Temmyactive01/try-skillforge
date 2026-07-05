import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase-for-user";

export default defineTool({
  name: "list_my_assignments",
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
  handler: async ({ status }, ctx) => {
    const userId = ctx.getUserId();
    if (!ctx.isAuthenticated() || !userId) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let query = sb
      .from("assignments")
      .select(
        "id, status, due_date, created_at, course:courses(id, title, description, category, content_type)",
      )
      .eq("user_id", userId)
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
});
