import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BootstrapSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(72),
});

/**
 * One-time bootstrap: creates the first admin user if none exists.
 * Safe to expose because it self-disables after the first admin is created.
 */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) => BootstrapSchema.parse(input))
  .handler(async ({ data }) => {
    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .in("role", ["admin", "super_admin"]);

    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) {
      throw new Error("Admin already exists. Use the login form.");
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Failed to create admin user");
    }

    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert([
      { user_id: created.user.id, role: "admin" },
      { user_id: created.user.id, role: "super_admin" },
    ]);

    if (roleErr) {
      // rollback user
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(roleErr.message);
    }

    return { ok: true };
  });

export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .in("role", ["admin", "super_admin"]);
  if (error) throw new Error(error.message);
  return { exists: (count ?? 0) > 0 };
});
