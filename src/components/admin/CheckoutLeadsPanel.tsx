import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  Ban,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShoppingCart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { CheckoutLead, CheckoutLeadCartItem, CheckoutLeadStatus } from "@/lib/store-types";
import { formatBDT } from "@/lib/store-types";
import { cn } from "@/lib/utils";

const STATUSES: ("All" | CheckoutLeadStatus)[] = [
  "All",
  "draft",
  "contacted",
  "converted",
  "ignored",
];

const STATUS_META: Record<
  CheckoutLeadStatus,
  { label: string; className: string; icon: ReactNode }
> = {
  draft: {
    label: "New",
    className: "bg-warning/15 text-warning border-warning/30",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  contacted: {
    label: "Contacted",
    className: "bg-info/15 text-info border-info/30",
    icon: <MessageCircle className="h-3.5 w-3.5" />,
  },
  converted: {
    label: "Converted",
    className: "bg-success/15 text-success border-success/30",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  ignored: {
    label: "Ignored",
    className: "bg-muted text-muted-foreground border-border",
    icon: <Ban className="h-3.5 w-3.5" />,
  },
};

function parseCartItems(value: unknown): CheckoutLeadCartItem[] {
  return Array.isArray(value) ? (value as CheckoutLeadCartItem[]) : [];
}

function toLead(row: Omit<CheckoutLead, "cart_items"> & { cart_items: unknown }): CheckoutLead {
  return {
    ...row,
    cart_items: parseCartItems(row.cart_items),
  };
}

export function CheckoutLeadsPanel({ canEdit = true }: { canEdit?: boolean }) {
  const [leads, setLeads] = useState<CheckoutLead[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | CheckoutLeadStatus>("All");
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from("checkout_leads")
      .select("*")
      .order("last_seen_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      return;
    }

    setLeads(
      ((data ?? []) as (Omit<CheckoutLead, "cart_items"> & { cart_items: unknown })[]).map(toLead),
    );
  };

  useEffect(() => {
    fetchLeads();

    const channel = supabase
      .channel("checkout-leads-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkout_leads" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string })?.id;
            if (id) setLeads((prev) => prev.filter((lead) => lead.id !== id));
            return;
          }

          const row = toLead(
            payload.new as Omit<CheckoutLead, "cart_items"> & { cart_items: unknown },
          );

          setLeads((prev) => {
            const exists = prev.some((lead) => lead.id === row.id);
            const next = exists
              ? prev.map((lead) => (lead.id === row.id ? row : lead))
              : [row, ...prev];
            return next.sort(
              (a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime(),
            );
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return leads.filter((lead) => {
      if (status !== "All" && lead.status !== status) return false;
      if (!q) return true;

      const hay = `${lead.customer_name ?? ""} ${lead.mobile ?? ""} ${lead.address ?? ""} ${
        lead.landing_page_slug ?? ""
      }`.toLowerCase();

      return hay.includes(q);
    });
  }, [leads, query, status]);

  const updateStatus = async (lead: CheckoutLead, nextStatus: CheckoutLeadStatus) => {
    setSavingId(lead.id);

    const { error } = await supabase
      .from("checkout_leads")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", lead.id);

    setSavingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setLeads((prev) =>
      prev.map((item) => (item.id === lead.id ? { ...item, status: nextStatus } : item)),
    );
    toast.success("Lead updated");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Checkout leads</h2>
          <p className="text-sm text-muted-foreground">
            Customers who filled checkout details before placing an order.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, address"
              className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary sm:w-72"
            />
          </label>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "All" | CheckoutLeadStatus)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All leads" : STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-border bg-card py-16 text-center shadow-soft">
          <ShoppingCart className="mb-3 h-8 w-8 text-muted-foreground" />
          <div className="text-sm font-semibold">No checkout leads yet</div>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Leads will appear here when a customer starts filling checkout details.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((lead) => {
            const meta = STATUS_META[lead.status];
            const waNumber = (lead.mobile ?? "").replace(/\D/g, "");
            const waUrl = waNumber ? `https://wa.me/88${waNumber}` : "";

            return (
              <article
                key={lead.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold">
                        {lead.customer_name || "Unnamed customer"}
                      </h3>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                          meta.className,
                        )}
                      >
                        {meta.icon}
                        {meta.label}
                      </span>
                      {lead.landing_page_slug && (
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                          /p/{lead.landing_page_slug}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                      {lead.mobile && (
                        <a
                          href={`tel:${lead.mobile}`}
                          className="inline-flex min-w-0 items-center gap-2 hover:text-foreground"
                        >
                          <Phone className="h-4 w-4 shrink-0" />
                          <span className="truncate">{lead.mobile}</span>
                        </a>
                      )}
                      {lead.address && (
                        <div className="inline-flex min-w-0 items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                          <span className="line-clamp-2">{lead.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-xs font-medium hover:bg-secondary"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    )}

                    <select
                      value={lead.status}
                      disabled={!canEdit || savingId === lead.id}
                      onChange={(e) => updateStatus(lead, e.target.value as CheckoutLeadStatus)}
                      className="h-9 rounded-full border border-input bg-background px-3 text-xs font-medium outline-none focus:border-primary disabled:opacity-60"
                    >
                      {STATUSES.filter((s) => s !== "All").map((s) => (
                        <option key={s} value={s}>
                          {STATUS_META[s].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-secondary/50 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>Last seen {new Date(lead.last_seen_at).toLocaleString()}</span>
                    <span className="font-semibold text-foreground">{formatBDT(lead.total)}</span>
                  </div>

                  <div className="space-y-2">
                    {lead.cart_items.map((item, idx) => (
                      <div
                        key={`${lead.id}-${item.product_id}-${idx}`}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{item.product_title}</div>
                          {item.variant_label && (
                            <div className="truncate text-xs text-muted-foreground">
                              {item.variant_label}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right text-xs text-muted-foreground">
                          {item.quantity} x {formatBDT(item.unit_price)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
