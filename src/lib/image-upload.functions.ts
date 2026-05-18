import { createServerFn } from "@tanstack/react-start";
import { Buffer } from "node:buffer";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MAX_BYTES = 15 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

async function assertImageManager(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["super_admin", "admin"])
    .limit(1);
  if (!data?.length) throw new Error("Forbidden: admin only");
}

export const uploadSiteImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        folder: z
          .string()
          .min(1)
          .max(64)
          .regex(/^[a-zA-Z0-9/_-]+$/),
        fileName: z
          .string()
          .min(1)
          .max(120)
          .regex(/^[a-zA-Z0-9._-]+$/),
        contentType: z.string().min(3).max(80),
        base64: z
          .string()
          .min(1)
          .max(Math.ceil(MAX_BYTES * 1.4)),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertImageManager(context.userId);
    if (!IMAGE_TYPES.has(data.contentType)) throw new Error("Unsupported image type");

    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > MAX_BYTES) throw new Error("Image too large (max 15 MB).");

    const path = `${data.folder}/${Date.now()}-${crypto.randomUUID()}-${data.fileName}`;
    const { error } = await supabaseAdmin.storage.from("site-assets").upload(path, bytes, {
      contentType: data.contentType,
      upsert: true,
      cacheControl: "31536000",
    });
    if (error) throw new Error(error.message);

    const { data: urlData } = supabaseAdmin.storage.from("site-assets").getPublicUrl(path);
    return { url: urlData.publicUrl };
  });
