import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  companyName: z.string().trim().min(1, "Company name is required").max(120),
  email: z.string().trim().toLowerCase().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const signupCompanyAdmin = createServerFn({ method: "POST" })
  .validator((data: unknown) => signupSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Pre-check: is email already taken in profiles?
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();
    if (existing) {
      return { ok: false as const, error: "An account with this email already exists." };
    }

    // 1) Create company
    const { data: company, error: cErr } = await supabaseAdmin
      .from("companies")
      .insert({ name: data.companyName })
      .select("id")
      .single();
    if (cErr || !company) {
      return { ok: false as const, error: "Could not create company. Please try again." };
    }

    // 2) Create auth user (metadata is never trusted for privileges)
    const { data: createdUser, error: uErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        name: data.name,
      },
    });

    if (uErr || !createdUser?.user) {
      // Rollback the company we just made
      await supabaseAdmin.from("companies").delete().eq("id", company.id);
      const msg = uErr?.message?.toLowerCase() ?? "";
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        return { ok: false as const, error: "An account with this email already exists." };
      }
      return { ok: false as const, error: "Could not create account. Please try again." };
    }

    // 3) Create the admin profile server-side (trusted path)
    const { error: profErr } = await supabaseAdmin.from("profiles").insert({
      id: createdUser.user.id,
      company_id: company.id,
      name: data.name,
      email: data.email,
      role: "admin",
    });
    if (profErr) {
      await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);
      await supabaseAdmin.from("companies").delete().eq("id", company.id);
      return { ok: false as const, error: "Could not create account. Please try again." };
    }


    return { ok: true as const };
  });
