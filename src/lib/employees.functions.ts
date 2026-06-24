import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateEmployeeSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  team_id: z.string().uuid().nullable().optional(),
});

export const createEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CreateEmployeeSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Verify caller is admin and get their company_id
    const { data: adminProfile, error: pErr } = await context.supabase
      .from("profiles")
      .select("company_id, role")
      .eq("id", context.userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!adminProfile || adminProfile.role !== "admin") {
      throw new Error("Only admins can create employees.");
    }
    const companyId = adminProfile.company_id;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Random temp password — user will reset via email.
    const tempPassword =
      crypto.randomUUID().replace(/-/g, "") + "Aa1!";

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: data.name,
        role: "employee",
        company_id: companyId,
      },
    });
    if (cErr || !created.user) {
      throw new Error(cErr?.message ?? "Failed to create employee.");
    }

    // Trigger creates the profile; set team_id if provided.
    if (data.team_id) {
      const { error: uErr } = await supabaseAdmin
        .from("profiles")
        .update({ team_id: data.team_id })
        .eq("id", created.user.id);
      if (uErr) throw new Error(uErr.message);
    }

    return { id: created.user.id };
  });
