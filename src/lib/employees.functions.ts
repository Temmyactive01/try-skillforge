import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateEmployeeSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  team_id: z.string().uuid().nullable().optional(),
  redirect_origin: z.string().url(),
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

    // Send an invite email — user sets their own password via the secure link.
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        redirectTo: `${data.redirect_origin}/accept-invite`,
        data: {
          name: data.name,
          role: "employee",
          company_id: companyId,
        },
      },
    );
    if (cErr || !created.user) {
      throw new Error(cErr?.message ?? "Failed to invite employee.");
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
