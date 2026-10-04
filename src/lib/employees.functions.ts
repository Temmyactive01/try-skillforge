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
    const inviteOptions = {
      redirectTo: `${data.redirect_origin}/accept-invite?type=invite`,
      data: {
        name: data.name,
      },
    };
    // The end-to-end tests' dev server sets E2E_SKIP_INVITE_EMAIL so no real email is sent:
    // generateLink creates the same invited user without emailing it. Never honoured in builds.
    const skipEmail = import.meta.env.DEV && process.env.E2E_SKIP_INVITE_EMAIL === "1";
    const { data: created, error: cErr } = skipEmail
      ? await supabaseAdmin.auth.admin.generateLink({
          type: "invite",
          email: data.email,
          options: inviteOptions,
        })
      : await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, inviteOptions);
    if (cErr || !created.user) {
      throw new Error(cErr?.message ?? "Failed to invite employee.");
    }

    // Create the profile server-side (trusted path; metadata is never trusted).
    const { error: profErr } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      company_id: companyId,
      name: data.name,
      email: data.email,
      role: "employee",
      team_id: data.team_id ?? null,
    });
    if (profErr) throw new Error(profErr.message);


    return { id: created.user.id };
  });

/**
 * Returns the ids of employees in the caller's company who have not yet
 * completed their invite (never signed in). Admin-only.
 */
export const listPendingEmployeeIds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: adminProfile, error: pErr } = await context.supabase
      .from("profiles")
      .select("company_id, role")
      .eq("id", context.userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!adminProfile || adminProfile.role !== "admin") {
      throw new Error("Only admins can view employee status.");
    }

    const { data: companyProfiles, error: cpErr } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("role", "employee");
    if (cpErr) throw new Error(cpErr.message);
    const ids = new Set((companyProfiles ?? []).map((p) => p.id));
    if (ids.size === 0) return { pendingIds: [] as string[] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const pendingIds: string[] = [];
    let page = 1;
    // Auth Admin API is paginated.
    for (; page <= 20; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      for (const u of data.users) {
        if (ids.has(u.id) && !u.last_sign_in_at) pendingIds.push(u.id);
      }
      if (data.users.length < 200) break;
    }

    return { pendingIds };
  });
