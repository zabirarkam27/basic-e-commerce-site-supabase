import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AnalyticsSessionSchema = z.object({
  session_id: z
    .string()
    .min(12)
    .max(80)
    .regex(/^[a-zA-Z0-9_-]+$/),
  current_path: z.string().trim().max(300).optional(),
  landing_page_slug: z.string().trim().max(120).nullable().optional(),
  referrer: z.string().trim().max(1000).nullable().optional(),
  user_agent: z.string().trim().max(1000).nullable().optional(),
  customer_name: z.string().trim().max(100).optional(),
  mobile: z.string().trim().max(30).optional(),
  checkout_started: z.boolean().optional(),
  order_placed: z.boolean().optional(),
});

export const saveAnalyticsSession = createServerFn({ method: "POST" })
  .inputValidator((input) => AnalyticsSessionSchema.parse(input))
  .handler(async ({ data }) => {
    const now = new Date();
    const nowIso = now.toISOString();

    const { data: existing, error: selectError } = await supabaseAdmin
      .from("site_sessions")
      .select("checkout_started_at, customer_name, mobile, order_placed_at")
      .eq("session_id", data.session_id)
      .maybeSingle();

    if (selectError) throw new Error(selectError.message);

    const checkoutStartedAt = data.checkout_started
      ? (existing?.checkout_started_at ?? nowIso)
      : (existing?.checkout_started_at ?? null);
    const orderPlacedAt = data.order_placed
      ? (existing?.order_placed_at ?? nowIso)
      : (existing?.order_placed_at ?? null);
    const orderDurationSeconds =
      checkoutStartedAt && orderPlacedAt
        ? Math.max(
            0,
            Math.round(
              (new Date(orderPlacedAt).getTime() - new Date(checkoutStartedAt).getTime()) / 1000,
            ),
          )
        : null;

    const { error } = await supabaseAdmin.from("site_sessions").upsert(
      {
        session_id: data.session_id,
        last_seen_at: nowIso,
        current_path: data.current_path ?? null,
        landing_page_slug: data.landing_page_slug ?? null,
        referrer: data.referrer ?? null,
        user_agent: data.user_agent ?? null,
        customer_name: data.customer_name?.trim() || existing?.customer_name || null,
        mobile: data.mobile?.trim() || existing?.mobile || null,
        checkout_started_at: checkoutStartedAt,
        order_placed_at: orderPlacedAt,
        order_duration_seconds: orderDurationSeconds,
        updated_at: nowIso,
      },
      { onConflict: "session_id" },
    );

    if (error) throw new Error(error.message);
    return { ok: true };
  });
