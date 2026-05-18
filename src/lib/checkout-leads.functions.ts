import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CartItemSchema = z.object({
  product_id: z.string().uuid(),
  product_title: z.string().max(200),
  product_image: z.string().max(1000).nullable(),
  variant_label: z.string().max(200).nullable(),
  unit_price: z.number().finite().nonnegative(),
  quantity: z.number().int().positive().max(99),
  line_total: z.number().finite().nonnegative(),
});

const CheckoutLeadSchema = z.object({
  session_id: z
    .string()
    .min(12)
    .max(80)
    .regex(/^[a-zA-Z0-9_-]+$/),
  customer_name: z.string().trim().max(100).optional(),
  mobile: z.string().trim().max(30).optional(),
  address: z.string().trim().max(500).optional(),
  area: z.enum(["Inside Dhaka", "Outside Dhaka"]),
  delivery_charge: z.number().finite().nonnegative(),
  subtotal: z.number().finite().nonnegative(),
  total: z.number().finite().nonnegative(),
  landing_page_slug: z.string().trim().max(120).nullable(),
  cart_items: z.array(CartItemSchema).max(50),
  status: z.enum(["draft", "converted"]).default("draft"),
});

export const saveCheckoutLead = createServerFn({ method: "POST" })
  .inputValidator((input) => CheckoutLeadSchema.parse(input))
  .handler(async ({ data }) => {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("checkout_leads").upsert(
      {
        session_id: data.session_id,
        customer_name: data.customer_name?.trim() || null,
        mobile: data.mobile?.trim() || null,
        address: data.address?.trim() || null,
        area: data.area,
        delivery_charge: data.delivery_charge,
        subtotal: data.subtotal,
        total: data.total,
        landing_page_slug: data.landing_page_slug,
        cart_items: data.cart_items,
        status: data.status,
        last_seen_at: now,
        updated_at: now,
      },
      { onConflict: "session_id" },
    );

    if (error) throw new Error(error.message);
    return { ok: true };
  });
