import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({
  phone: z.string().min(8).max(20),
});

export type CourierStat = {
  name: string;
  total_parcel: number;
  success_parcel: number;
  cancelled_parcel: number;
};

export type FraudReport = {
  phone: string;
  total_parcel: number;
  success_parcel: number;
  cancelled_parcel: number;
  success_rate: number; // 0..1
  cancel_rate: number; // 0..1
  risk: "low" | "medium" | "high" | "unknown";
  reasons: string[];
  couriers: CourierStat[];
  source: "bdcourier" | "unavailable";
  message?: string;
};

async function requireAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"])
    .limit(1);
  if (!data?.length) throw new Error("Unauthorized: admin only");
}

function normalizePhone(raw: string) {
  const digits = String(raw).replace(/\D/g, "");
  return digits.slice(-11);
}

function classify(
  total: number,
  success: number,
  cancelled: number,
): { risk: FraudReport["risk"]; reasons: string[] } {
  const reasons: string[] = [];
  if (total === 0) {
    reasons.push("নতুন কাস্টমার — কোনো পার্সেল হিস্টরি নেই");
    return { risk: "medium", reasons };
  }
  const cancelPct = Math.round((cancelled / total) * 100);
  const successPct = Math.round((success / total) * 100);
  if (cancelPct >= 50) reasons.push(`উচ্চ ক্যান্সেল রেট — ${cancelPct}% পার্সেল রিটার্ন`);
  else if (cancelPct >= 25) reasons.push(`মাঝারি ক্যান্সেল রেট — ${cancelPct}% রিটার্ন`);
  if (successPct >= 80) reasons.push(`ভালো রেপুটেশন — ${successPct}% সফল ডেলিভারি`);
  if (total < 3) reasons.push(`কম অর্ডার হিস্টরি — মাত্র ${total}টি পার্সেল`);

  let risk: FraudReport["risk"] = "low";
  if (cancelPct >= 50) risk = "high";
  else if (cancelPct >= 25 || total < 3) risk = "medium";
  return { risk, reasons };
}

/**
 * Aggregate parcel history across all Bangladeshi couriers via BD Courier API
 * (https://bdcourier.com — requires Bearer token saved in admin_secrets).
 */
export const checkPhoneFraud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => Schema.parse(input))
  .handler(async ({ data, context }): Promise<FraudReport> => {
    await requireAdmin(context.userId);
    const phone = normalizePhone(data.phone);

    const { data: row } = await supabaseAdmin
      .from("admin_secrets")
      .select("value")
      .eq("key", "bdcourier_api_key")
      .maybeSingle();
    const token = row?.value || process.env.BDCOURIER_API_KEY;

    if (!token) {
      return {
        phone,
        total_parcel: 0,
        success_parcel: 0,
        cancelled_parcel: 0,
        success_rate: 0,
        cancel_rate: 0,
        risk: "unknown",
        reasons: ["BD Courier API key configured নেই — Admin → Settings এ যোগ করুন"],
        couriers: [],
        source: "unavailable",
        message: "API key missing",
      };
    }

    try {
      const res = await fetch("https://bdcourier.com/api/courier-check", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        courierData?: Record<
          string,
          {
            total_parcel?: number;
            success_parcel?: number;
            cancelled_parcel?: number;
          }
        >;
        summary?: {
          total_parcel?: number;
          success_parcel?: number;
          cancelled_parcel?: number;
        };
        message?: string;
      };

      if (!res.ok) {
        return {
          phone,
          total_parcel: 0,
          success_parcel: 0,
          cancelled_parcel: 0,
          success_rate: 0,
          cancel_rate: 0,
          risk: "unknown",
          reasons: [`BD Courier API error [${res.status}]`],
          couriers: [],
          source: "unavailable",
          message: body.message ?? res.statusText,
        };
      }

      const couriers: CourierStat[] = [];
      let total = body.summary?.total_parcel ?? 0;
      let success = body.summary?.success_parcel ?? 0;
      let cancelled = body.summary?.cancelled_parcel ?? 0;

      if (body.courierData) {
        for (const [name, v] of Object.entries(body.courierData)) {
          const t = Number(v?.total_parcel ?? 0);
          const s = Number(v?.success_parcel ?? 0);
          const c = Number(v?.cancelled_parcel ?? 0);
          if (t > 0 || s > 0 || c > 0) {
            couriers.push({
              name,
              total_parcel: t,
              success_parcel: s,
              cancelled_parcel: c,
            });
          }
        }
        if (!body.summary) {
          total = couriers.reduce((a, c) => a + c.total_parcel, 0);
          success = couriers.reduce((a, c) => a + c.success_parcel, 0);
          cancelled = couriers.reduce((a, c) => a + c.cancelled_parcel, 0);
        }
      }

      const success_rate = total > 0 ? success / total : 0;
      const cancel_rate = total > 0 ? cancelled / total : 0;
      const { risk, reasons } = classify(total, success, cancelled);

      return {
        phone,
        total_parcel: total,
        success_parcel: success,
        cancelled_parcel: cancelled,
        success_rate,
        cancel_rate,
        risk,
        reasons,
        couriers: couriers.sort((a, b) => b.total_parcel - a.total_parcel),
        source: "bdcourier",
      };
    } catch (err) {
      return {
        phone,
        total_parcel: 0,
        success_parcel: 0,
        cancelled_parcel: 0,
        success_rate: 0,
        cancel_rate: 0,
        risk: "unknown",
        reasons: ["Network error contacting BD Courier"],
        couriers: [],
        source: "unavailable",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  });
