import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PROVIDERS = ["steadfast", "pathao", "redx", "paperfly", "ecourier"] as const;
type Provider = (typeof PROVIDERS)[number];

const PushSchema = z.object({
  orderId: z.string().uuid(),
  provider: z.enum(PROVIDERS),
  note: z.string().max(500).optional(),
});

const StatusSchema = z.object({ orderId: z.string().uuid() });

const SECRET_KEYS: Record<Provider, string[]> = {
  steadfast: ["steadfast_api_key", "steadfast_secret_key"],
  pathao: [
    "pathao_base_url",
    "pathao_client_id",
    "pathao_client_secret",
    "pathao_username",
    "pathao_password",
    "pathao_store_id",
  ],
  redx: ["redx_api_token"],
  paperfly: ["paperfly_api_key", "paperfly_user_name", "paperfly_user_password"],
  ecourier: ["ecourier_user_id", "ecourier_user_secret", "ecourier_api_key"],
};

async function getSecrets(keys: string[]): Promise<Record<string, string>> {
  const { data } = await supabaseAdmin.from("admin_secrets").select("key,value").in("key", keys);
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.value ?? "";
  return map;
}

async function assertAdmin(userId: string) {
  const { data: roleRows } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"])
    .limit(1);
  if (!roleRows?.length) throw new Error("Unauthorized: admin only");
}

async function loadOrder(orderId: string) {
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (error || !order) throw new Error("Order not found");
  return order;
}

function buildPayloadCommon(order: Awaited<ReturnType<typeof loadOrder>>, note?: string) {
  return {
    invoice: order.id.slice(0, 12),
    recipient_name: String(order.customer_name).slice(0, 100),
    recipient_phone: String(order.mobile).replace(/\D/g, "").slice(-11),
    recipient_address: `${order.address}${order.area ? `, ${order.area}` : ""}`.slice(0, 250),
    cod_amount: Number(order.total) || 0,
    note: (note || order.product_title || "").slice(0, 250),
    quantity: order.quantity ?? 1,
  };
}

// ─── Steadfast ────────────────────────────────────────────────────────────────
async function pushSteadfast(order: Awaited<ReturnType<typeof loadOrder>>, note?: string) {
  const s = await getSecrets(SECRET_KEYS.steadfast);
  const API_KEY = s.steadfast_api_key || process.env.STEADFAST_API_KEY;
  const SECRET_KEY = s.steadfast_secret_key || process.env.STEADFAST_SECRET_KEY;
  if (!API_KEY || !SECRET_KEY) {
    throw new Error("Steadfast credentials not configured. Admin → Settings → Couriers.");
  }
  const p = buildPayloadCommon(order, note);
  const res = await fetch("https://portal.packzy.com/api/v1/create_order", {
    method: "POST",
    headers: {
      "Api-Key": API_KEY,
      "Secret-Key": SECRET_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      invoice: p.invoice,
      recipient_name: p.recipient_name,
      recipient_phone: p.recipient_phone,
      recipient_address: p.recipient_address,
      cod_amount: p.cod_amount,
      note: p.note,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    status?: number;
    message?: string;
    consignment?: {
      consignment_id?: number | string;
      tracking_code?: string;
      status?: string;
    };
  };
  if (!res.ok || body.status !== 200 || !body.consignment) {
    throw new Error(`Steadfast error [${res.status}]: ${body.message ?? JSON.stringify(body)}`);
  }
  const c = body.consignment;
  return {
    consignment_id: c.consignment_id ? String(c.consignment_id) : null,
    tracking_code: c.tracking_code ?? null,
    status: c.status ?? "in_review",
  };
}

async function statusSteadfast(order: {
  courier_consignment_id: string | null;
  courier_tracking_code: string | null;
}) {
  const s = await getSecrets(SECRET_KEYS.steadfast);
  const API_KEY = s.steadfast_api_key || process.env.STEADFAST_API_KEY;
  const SECRET_KEY = s.steadfast_secret_key || process.env.STEADFAST_SECRET_KEY;
  if (!API_KEY || !SECRET_KEY) throw new Error("Steadfast credentials not configured.");
  const url = order.courier_tracking_code
    ? `https://portal.packzy.com/api/v1/status_by_trackingcode/${encodeURIComponent(order.courier_tracking_code)}`
    : `https://portal.packzy.com/api/v1/status_by_cid/${encodeURIComponent(String(order.courier_consignment_id))}`;
  const res = await fetch(url, { headers: { "Api-Key": API_KEY, "Secret-Key": SECRET_KEY } });
  const body = (await res.json().catch(() => ({}))) as {
    status?: number;
    delivery_status?: string;
    message?: string;
  };
  if (!res.ok || body.status !== 200) {
    throw new Error(`Steadfast status error: ${body.message ?? res.status}`);
  }
  return body.delivery_status ?? "unknown";
}

// ─── Pathao ───────────────────────────────────────────────────────────────────
async function pathaoToken(s: Record<string, string>) {
  const base = (s.pathao_base_url || "https://api-hermes.pathao.com").replace(/\/$/, "");
  const res = await fetch(`${base}/aladdin/api/v1/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: s.pathao_client_id,
      client_secret: s.pathao_client_secret,
      username: s.pathao_username,
      password: s.pathao_password,
      grant_type: "password",
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; message?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(`Pathao auth failed: ${body.message ?? res.status}`);
  }
  return { token: body.access_token, base };
}

async function pushPathao(order: Awaited<ReturnType<typeof loadOrder>>, note?: string) {
  const s = await getSecrets(SECRET_KEYS.pathao);
  for (const k of [
    "pathao_client_id",
    "pathao_client_secret",
    "pathao_username",
    "pathao_password",
    "pathao_store_id",
  ]) {
    if (!s[k])
      throw new Error(
        `Pathao not configured: missing ${k.replace("pathao_", "")}. Admin → Settings → Couriers.`,
      );
  }
  const { token, base } = await pathaoToken(s);
  const p = buildPayloadCommon(order, note);

  const res = await fetch(`${base}/aladdin/api/v1/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      store_id: Number(s.pathao_store_id),
      merchant_order_id: p.invoice,
      recipient_name: p.recipient_name,
      recipient_phone: p.recipient_phone,
      recipient_address: p.recipient_address,
      recipient_city: 1, // Dhaka by default; admin can refine later via city mapping
      recipient_zone: 1,
      delivery_type: 48, // 48hr standard
      item_type: 2, // parcel
      item_quantity: p.quantity,
      item_weight: 0.5,
      amount_to_collect: p.cod_amount,
      item_description: p.note,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    code?: number;
    message?: string;
    data?: { consignment_id?: string; merchant_order_id?: string; order_status?: string };
  };
  if (!res.ok || !body.data?.consignment_id) {
    throw new Error(`Pathao error [${res.status}]: ${body.message ?? JSON.stringify(body)}`);
  }
  return {
    consignment_id: body.data.consignment_id,
    tracking_code: body.data.consignment_id,
    status: body.data.order_status ?? "pickup_pending",
  };
}

async function statusPathao(order: { courier_consignment_id: string | null }) {
  if (!order.courier_consignment_id) throw new Error("No consignment id stored.");
  const s = await getSecrets(SECRET_KEYS.pathao);
  const { token, base } = await pathaoToken(s);
  const res = await fetch(
    `${base}/aladdin/api/v1/orders/${encodeURIComponent(order.courier_consignment_id)}/info`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
  );
  const body = (await res.json().catch(() => ({}))) as {
    data?: { order_status?: string; order_status_slug?: string };
    message?: string;
  };
  if (!res.ok) throw new Error(`Pathao status error: ${body.message ?? res.status}`);
  return body.data?.order_status_slug || body.data?.order_status || "unknown";
}

// ─── Manual providers (RedX / Paperfly / eCourier) ────────────────────────────
function manualNotSupported(name: string): never {
  throw new Error(
    `${name}-এর সরাসরি API পুশ এখনো সাপোর্টেড নয়। অর্ডারটি ${name} প্যানেলে ম্যানুয়ালি বুক করে নিচের ট্র্যাকিং কোড বসান।`,
  );
}

// ─── Public server functions ──────────────────────────────────────────────────
export const pushOrderToCourier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => PushSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const order = await loadOrder(data.orderId);
    if (order.courier_consignment_id) {
      throw new Error(
        `Already pushed (${order.courier_provider}: ${order.courier_tracking_code ?? order.courier_consignment_id}).`,
      );
    }

    let result: { consignment_id: string | null; tracking_code: string | null; status: string };
    switch (data.provider) {
      case "steadfast":
        result = await pushSteadfast(order, data.note);
        break;
      case "pathao":
        result = await pushPathao(order, data.note);
        break;
      case "redx":
        manualNotSupported("RedX");
        break;
      case "paperfly":
        manualNotSupported("Paperfly");
        break;
      case "ecourier":
        manualNotSupported("eCourier");
        break;
    }

    await supabaseAdmin
      .from("orders")
      .update({
        courier_provider: data.provider,
        courier_consignment_id: result.consignment_id,
        courier_tracking_code: result.tracking_code,
        courier_status: result.status,
        courier_pushed_at: new Date().toISOString(),
        courier_note: data.note ?? null,
      })
      .eq("id", order.id);

    return { ok: true as const, ...result };
  });

export const refreshCourierStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => StatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("courier_provider, courier_consignment_id, courier_tracking_code")
      .eq("id", data.orderId)
      .single();
    if (!order?.courier_provider) throw new Error("Order not pushed to a courier yet.");
    let delivery_status = "unknown";
    if (order.courier_provider === "steadfast") delivery_status = await statusSteadfast(order);
    else if (order.courier_provider === "pathao") delivery_status = await statusPathao(order);
    else
      throw new Error(
        `Status refresh not available for ${order.courier_provider} (manual provider).`,
      );

    await supabaseAdmin
      .from("orders")
      .update({ courier_status: delivery_status })
      .eq("id", data.orderId);
    return { ok: true as const, delivery_status };
  });

// ─── Manual tracking save (for RedX / Paperfly / eCourier) ────────────────────
const ManualSchema = z.object({
  orderId: z.string().uuid(),
  provider: z.enum(PROVIDERS),
  tracking_code: z.string().min(1).max(100),
  note: z.string().max(500).optional(),
});

export const saveManualCourierTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ManualSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin
      .from("orders")
      .update({
        courier_provider: data.provider,
        courier_tracking_code: data.tracking_code,
        courier_consignment_id: data.tracking_code,
        courier_status: "manual",
        courier_pushed_at: new Date().toISOString(),
        courier_note: data.note ?? null,
      })
      .eq("id", data.orderId);
    return { ok: true as const };
  });

// ─── Back-compat exports (legacy callers) ─────────────────────────────────────
export const pushOrderToSteadfast = pushOrderToCourier;
export const refreshSteadfastStatus = refreshCourierStatus;
