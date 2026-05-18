import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Order, OrderStatus, SiteSession } from "@/lib/store-types";
import { formatBDT } from "@/lib/store-types";
import {
  Copy,
  Check,
  Search,
  X,
  Globe,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Download,
  FileText,
  Receipt,
  Truck,
  RefreshCw,
  Printer,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Shield,
  Loader2,
  Phone,
  MessageCircle,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import {
  pushOrderToCourier,
  refreshCourierStatus,
  saveManualCourierTracking,
} from "@/lib/courier.functions";
import {
  COURIER_PROVIDERS,
  PROVIDER_BY_ID,
  providerLabel,
  type CourierProvider,
} from "@/lib/courier-providers";
import { checkPhoneFraud, type FraudReport } from "@/lib/fraud.functions";
import { printInvoice, printSlip, printBulkSlips } from "@/lib/order-print";
import { useSiteSettings } from "@/lib/site-settings";

const STATUSES: OrderStatus[] = ["Pending", "Confirmed", "Shipped", "Cancelled"];

const STATUS_COLORS: Record<OrderStatus, string> = {
  Pending: "bg-warning/15 text-warning border-warning/30",
  Confirmed: "bg-info/15 text-info border-info/30",
  Shipped: "bg-success/15 text-success border-success/30",
  Cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

const SOURCE_MAIN = "__main__";
const SOURCE_ANY_LP = "__any_landing__";

type LandingInfo = {
  slug: string;
  title: string;
  ga_measurement_id: string;
  meta_pixel_id: string;
  google_ads_id: string;
};

export function OrdersTable({ orders, refetch }: { orders: Order[]; refetch: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | OrderStatus>("All");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  /** "All" | "__main__" | "__any_landing__" | "<slug>" */
  const [source, setSource] = useState<string>("All");
  const [landingSlugs, setLandingSlugs] = useState<LandingInfo[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pushingId, setPushingId] = useState<string | null>(null);
  const { settings } = useSiteSettings();
  const pushCourier = useServerFn(pushOrderToCourier);
  const refreshCourier = useServerFn(refreshCourierStatus);
  const saveManual = useServerFn(saveManualCourierTracking);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("landing_pages")
        .select("slug,title,ga_measurement_id,meta_pixel_id,google_ads_id")
        .order("title");
      if (mounted) setLandingSlugs((data as LandingInfo[]) ?? []);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const landingBySlug = useMemo(() => {
    const m = new Map<string, LandingInfo>();
    for (const l of landingSlugs) m.set(l.slug, l);
    return m;
  }, [landingSlugs]);

  const copyValue = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(label);
    toast.success(`${label} copied`);
    setTimeout(() => setCopiedId(null), 1200);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromTs = fromDate ? new Date(fromDate).getTime() : null;
    const toTs = toDate ? new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1 : null;
    return orders.filter((o) => {
      if (filter !== "All" && o.status !== filter) return false;
      if (source !== "All") {
        if (source === SOURCE_MAIN && o.landing_page_slug) return false;
        else if (source === SOURCE_ANY_LP && !o.landing_page_slug) return false;
        else if (
          source !== SOURCE_MAIN &&
          source !== SOURCE_ANY_LP &&
          o.landing_page_slug !== source
        )
          return false;
      }
      if (q) {
        const hay = `${o.id} ${o.customer_name} ${o.mobile}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fromTs !== null || toTs !== null) {
        const ts = new Date(o.created_at).getTime();
        if (fromTs !== null && ts < fromTs) return false;
        if (toTs !== null && ts > toTs) return false;
      }
      return true;
    });
  }, [orders, filter, query, fromDate, toDate, source]);

  useEffect(() => {
    setPage(1);
  }, [filter, query, fromDate, toDate, source, orders.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  const sourceCounts = useMemo(() => {
    let main = 0;
    let landing = 0;
    for (const o of orders) {
      if (o.landing_page_slug) landing++;
      else main++;
    }
    return { main, landing };
  }, [orders]);

  const hasFilters = !!query || !!fromDate || !!toDate || filter !== "All" || source !== "All";
  const clearAll = () => {
    setQuery("");
    setFromDate("");
    setToDate("");
    setFilter("All");
    setSource("All");
  };

  const updateStatus = async (id: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Order marked as ${status}`);
    refetch();
  };

  const handlePushCourier = async (orderId: string, provider: CourierProvider) => {
    setPushingId(orderId);
    try {
      const r = await pushCourier({ data: { orderId, provider } });
      toast.success(
        `Pushed to ${PROVIDER_BY_ID[provider].name} · ${r.tracking_code ?? r.consignment_id}`,
      );
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to push to courier");
    } finally {
      setPushingId(null);
    }
  };

  const handleManualSave = async (orderId: string, provider: CourierProvider, tracking: string) => {
    setPushingId(orderId);
    try {
      await saveManual({ data: { orderId, provider, tracking_code: tracking } });
      toast.success(`${PROVIDER_BY_ID[provider].name} tracking saved`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save tracking");
    } finally {
      setPushingId(null);
    }
  };

  const handleRefreshCourier = async (orderId: string) => {
    try {
      const r = await refreshCourier({ data: { orderId } });
      toast.success(`Courier status: ${r.delivery_status}`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to refresh");
    }
  };

  const copyAddress = (o: Order) => {
    const text = `${o.customer_name}\n${o.mobile}\n${o.address} (${o.area})`;
    navigator.clipboard.writeText(text);
    setCopied(o.id);
    setTimeout(() => setCopied(null), 1500);
  };

  const landingTitle = (slug: string) => landingBySlug.get(slug)?.title ?? slug;

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast.error("No orders to export with current filters.");
      return;
    }
    const headers = [
      "Order ID",
      "Date",
      "Customer",
      "Mobile",
      "Address",
      "Area",
      "Product",
      "Variant",
      "Quantity",
      "Unit Price",
      "Delivery Charge",
      "Total",
      "Status",
      "Source",
      "Landing Slug",
      "Landing Title",
      "GA4 ID",
      "Meta Pixel ID",
      "Google Ads ID",
    ];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filtered.map((o) => {
      const lp = o.landing_page_slug ? landingBySlug.get(o.landing_page_slug) : null;
      return [
        o.id,
        new Date(o.created_at).toISOString(),
        o.customer_name,
        o.mobile,
        o.address,
        o.area,
        o.product_title,
        o.variant_label ?? "",
        o.quantity,
        o.unit_price,
        o.delivery_charge,
        o.total,
        o.status,
        o.landing_page_slug ? "Landing Page" : "Main store",
        o.landing_page_slug ?? "",
        o.landing_page_slug ? landingTitle(o.landing_page_slug) : "",
        lp?.ga_measurement_id ?? "",
        lp?.meta_pixel_id ?? "",
        lp?.google_ads_id ?? "",
      ]
        .map(esc)
        .join(",");
    });
    const csv = "\ufeff" + [headers.map(esc).join(","), ...rows].join("\r\n");
    const parts = [`status-${filter}`, `source-${source}`];
    if (fromDate) parts.push(`from-${fromDate}`);
    if (toDate) parts.push(`to-${toDate}`);
    if (query) parts.push("search");
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `orders_${stamp}_${parts.join("_")}.csv`.replace(/[^a-z0-9_.-]/gi, "_");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} order${filtered.length === 1 ? "" : "s"}.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Order ID, name, or mobile"
            className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <label className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Source
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
            >
              <option value="All">All orders</option>
              <option value={SOURCE_MAIN}>Main store ({sourceCounts.main})</option>
              <option value={SOURCE_ANY_LP}>Any landing page ({sourceCounts.landing})</option>
              {landingSlugs.length > 0 && <option disabled>──────────</option>}
              {landingSlugs.map((l) => (
                <option key={l.slug} value={l.slug}>
                  /p/{l.slug} — {l.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            From
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={toDate || undefined}
              className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="flex items-center gap-1.5">
            To
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate || undefined}
              className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
            />
          </label>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-secondary"
          title="Download filtered orders as CSV"
        >
          <Download className="h-3 w-3" /> Export CSV ({filtered.length})
        </button>
        <button
          onClick={() => {
            if (filtered.length === 0) return toast.error("No orders to print");
            printBulkSlips(filtered, settings);
          }}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-secondary"
          title="Print order slips for all filtered orders"
        >
          <Printer className="h-3 w-3" /> Bulk Slips ({filtered.length})
        </button>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["All", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              filter === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            {s} {s !== "All" && `(${orders.filter((o) => o.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-8 px-2 py-3"></th>
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    {hasFilters ? "No orders match your filters." : "No orders yet."}
                  </td>
                </tr>
              )}
              {pageRows.map((o) => {
                const isOpen = expanded === o.id;
                const lp = o.landing_page_slug ? landingBySlug.get(o.landing_page_slug) : null;
                const toggle = () => setExpanded(isOpen ? null : o.id);
                return (
                  <React.Fragment key={o.id}>
                    <tr
                      className={cn(
                        "cursor-pointer hover:bg-secondary/30",
                        isOpen && "bg-secondary/40",
                      )}
                      onClick={toggle}
                    >
                      <td className="px-2 py-3 text-muted-foreground">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        #{o.id.slice(0, 6)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{o.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{o.mobile}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyAddress(o);
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs hover:bg-secondary"
                          >
                            {copied === o.id ? (
                              <>
                                <Check className="h-3 w-3 text-success" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Copy Address
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {o.product_image && (
                            <img
                              src={o.product_image}
                              alt=""
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="truncate font-medium">{o.product_title}</div>
                            <div className="text-xs text-muted-foreground">
                              {o.variant_label ?? "—"} · Qty {o.quantity}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {o.landing_page_slug ? (
                          <div className="flex flex-col gap-0.5">
                            <span
                              className="inline-flex max-w-[180px] items-center gap-1 truncate rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                              title={landingTitle(o.landing_page_slug)}
                            >
                              /p/{o.landing_page_slug}
                            </span>
                            <span className="truncate text-[11px] text-muted-foreground">
                              {landingTitle(o.landing_page_slug)}
                            </span>
                          </div>
                        ) : (
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            Main store
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">
                        {formatBDT(o.total)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString("en-BD", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={o.status}
                          onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-medium outline-none",
                            STATUS_COLORS[o.status],
                          )}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s} className="bg-card text-foreground">
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-secondary/20">
                        <td colSpan={8} className="px-4 py-4">
                          <OrderDetails
                            order={o}
                            landing={lp ?? null}
                            slug={o.landing_page_slug ?? null}
                            copiedId={copiedId}
                            onCopy={copyValue}
                            settings={settings}
                            onPushCourier={(provider) => handlePushCourier(o.id, provider)}
                            onRefreshCourier={() => handleRefreshCourier(o.id)}
                            onSaveManual={(provider, tracking) =>
                              handleManualSave(o.id, provider, tracking)
                            }
                            pushing={pushingId === o.id}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              Showing {pageStart + 1}-{Math.min(pageStart + pageSize, filtered.length)} of{" "}
              {filtered.length} orders
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Rows
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">
                Page {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderDetails({
  order,
  landing,
  slug,
  copiedId,
  onCopy,
  settings,
  onPushCourier,
  onRefreshCourier,
  onSaveManual,
  pushing,
}: {
  order: Order;
  landing: LandingInfo | null;
  slug: string | null;
  copiedId: string | null;
  onCopy: (label: string, value: string) => void;
  settings: import("@/lib/site-settings").SiteSettings;
  onPushCourier: (provider: CourierProvider) => void;
  onRefreshCourier: () => void;
  onSaveManual: (provider: CourierProvider, tracking: string) => void;
  pushing: boolean;
}) {
  const idRows: {
    label: string;
    short: string;
    value: string;
    badge: string;
    dot: string;
  }[] = [];
  if (landing) {
    if (landing.ga_measurement_id)
      idRows.push({
        label: "GA4 Measurement ID",
        short: "GA4",
        value: landing.ga_measurement_id,
        badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        dot: "bg-amber-500",
      });
    if (landing.meta_pixel_id)
      idRows.push({
        label: "Meta Pixel ID",
        short: "Meta Pixel",
        value: landing.meta_pixel_id,
        badge: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
        dot: "bg-blue-500",
      });
    if (landing.google_ads_id)
      idRows.push({
        label: "Google Ads Conversion ID",
        short: "Google Ads",
        value: landing.google_ads_id,
        badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        dot: "bg-emerald-500",
      });
  }

  const tracked = !!order.courier_consignment_id || !!order.courier_tracking_code;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <button
          onClick={() => printInvoice(order, settings)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-secondary"
          title="Open A4 invoice — print or save as PDF"
        >
          <FileText className="h-3.5 w-3.5" /> Invoice (A4)
        </button>
        <button
          onClick={() => printSlip(order, settings)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-secondary"
          title="Open 80mm thermal-style slip — print or save as PDF"
        >
          <Receipt className="h-3.5 w-3.5" /> Order Slip (80mm)
        </button>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        {!tracked ? (
          <CourierPushControls
            onPush={onPushCourier}
            onSaveManual={onSaveManual}
            pushing={pushing}
          />
        ) : (
          <CourierTrackedChip order={order} onRefresh={onRefreshCourier} />
        )}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        {(() => {
          const raw = String(order.mobile || "").replace(/\D/g, "");
          const local = raw.startsWith("880") ? raw.slice(3) : raw.replace(/^0+/, "");
          const intl = `880${local}`;
          const telHref = `tel:+${intl}`;
          const waHref = `https://wa.me/${intl}`;

          // Forward-to-WhatsApp: opens chat with the admin's saved WhatsApp number
          // pre-filled with the full order summary.
          const adminWaRaw = String(settings.order_notification_whatsapp || "").replace(/\D/g, "");
          const adminWaIntl = adminWaRaw.startsWith("880")
            ? adminWaRaw
            : adminWaRaw.replace(/^0+/, "")
              ? `880${adminWaRaw.replace(/^0+/, "")}`
              : "";
          const items = [
            `🆕 *New Order* — ${order.status}`,
            `🆔 #${order.id.slice(0, 8)}`,
            ``,
            `👤 ${order.customer_name}`,
            `📞 ${order.mobile}`,
            `📍 ${order.address}, ${order.area}`,
            ``,
            `📦 ${order.product_title}${order.variant_label ? ` — ${order.variant_label}` : ""}`,
            `× ${order.quantity}  @  ৳${Math.round(order.unit_price)}`,
            `🚚 Delivery: ৳${Math.round(order.delivery_charge)}`,
            `💰 *Total: ৳${Math.round(order.total)}*`,
            ``,
            `🕒 ${new Date(order.created_at).toLocaleString()}`,
          ].join("\n");
          const forwardHref = adminWaIntl
            ? `https://wa.me/${adminWaIntl}?text=${encodeURIComponent(items)}`
            : "";

          return (
            <>
              <a
                href={telHref}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-secondary"
                title={`Call ${order.mobile}`}
              >
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                title={`Open WhatsApp chat with ${order.mobile}`}
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
              {forwardHref ? (
                <a
                  href={forwardHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/50 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                  title={`Forward this order to ${settings.order_notification_whatsapp}`}
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Forward to WhatsApp
                </a>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  title="Set your WhatsApp number in Settings → Order Notifications"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Forward to WhatsApp
                </span>
              )}
            </>
          );
        })()}
      </div>

      <FraudPanel phone={order.mobile} />
      <CustomerSessionDetails order={order} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Shipping
          </div>
          <div className="text-sm">
            <div className="font-medium">{order.customer_name}</div>
            <div className="text-muted-foreground">{order.mobile}</div>
            <div className="mt-1">
              {order.address}
              {order.area ? ` (${order.area})` : ""}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Delivery charge: {formatBDT(order.delivery_charge)}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Attribution & Marketing
            </div>
            {slug && (
              <a
                href={`/p/${slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Open page <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {!slug ? (
            <div className="text-sm text-muted-foreground">
              This order came from the main store. No landing page attribution.
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Source: </span>
                <span className="font-medium">{landing?.title ?? slug}</span>
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                  /p/{slug}
                </span>
              </div>
              {idRows.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  No marketing IDs configured for this landing page.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {idRows.map((r) => {
                      const key = `${order.id}:${r.label}:badge`;
                      return (
                        <button
                          key={r.label}
                          type="button"
                          onClick={() => onCopy(key, r.value)}
                          title={`${r.label}: ${r.value} (click to copy)`}
                          className={cn(
                            "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition hover:brightness-110",
                            r.badge,
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", r.dot)} />
                          <span className="font-semibold">{r.short}</span>
                          <span className="truncate font-mono text-[11px] opacity-80">
                            {r.value}
                          </span>
                          {copiedId === key ? (
                            <Check className="h-3 w-3 shrink-0" />
                          ) : (
                            <Copy className="h-3 w-3 shrink-0 opacity-60" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="divide-y divide-border rounded-lg border border-border">
                    {idRows.map((r) => {
                      const key = `${order.id}:${r.label}`;
                      return (
                        <div
                          key={r.label}
                          className="flex items-center justify-between gap-2 px-3 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={cn("h-2 w-2 shrink-0 rounded-full", r.dot)} />
                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground">{r.label}</div>
                              <div className="truncate font-mono text-xs">{r.value}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => onCopy(key, r.value)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs hover:bg-secondary"
                          >
                            {copiedId === key ? (
                              <>
                                <Check className="h-3 w-3 text-success" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Copy
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;

  if (hrs > 0) return `${hrs}h ${remMins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function sessionDuration(session: SiteSession) {
  const start = new Date(session.first_seen_at).getTime();
  const end = new Date(session.last_seen_at).getTime();
  return Math.max(0, Math.round((end - start) / 1000));
}

function orderPlacingDuration(order: Order, session: SiteSession) {
  if (session.order_duration_seconds !== null) return session.order_duration_seconds;
  if (!session.checkout_started_at) return null;

  const start = new Date(session.checkout_started_at).getTime();
  const end = new Date(order.created_at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;

  return Math.round((end - start) / 1000);
}

function pickOrderSession(order: Order, sessions: SiteSession[]) {
  const orderTs = new Date(order.created_at).getTime();

  return [...sessions].sort((a, b) => {
    const aTs = new Date(a.order_placed_at ?? a.last_seen_at).getTime();
    const bTs = new Date(b.order_placed_at ?? b.last_seen_at).getTime();
    return Math.abs(aTs - orderTs) - Math.abs(bTs - orderTs);
  })[0];
}

function mobileCandidates(mobile: string) {
  const raw = mobile.replace(/\D/g, "");
  const local = raw.startsWith("880") ? `0${raw.slice(3)}` : raw;
  const intl = raw.startsWith("880") ? raw : `880${raw.replace(/^0+/, "")}`;
  return [...new Set([mobile, raw, local, intl].filter(Boolean))];
}

function CustomerSessionDetails({ order }: { order: Order }) {
  const [session, setSession] = useState<SiteSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    (async () => {
      const { data } = await supabase
        .from("site_sessions")
        .select("*")
        .in("mobile", mobileCandidates(order.mobile))
        .order("last_seen_at", { ascending: false })
        .limit(20);

      if (!mounted) return;
      setSession(pickOrderSession(order, (data as SiteSession[] | null) ?? []) ?? null);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [order]);

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Customer site activity
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading customer session…</div>
      ) : !session ? (
        <div className="text-sm text-muted-foreground">
          No matching analytics session found for this customer yet.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="text-xs font-medium text-muted-foreground">Website visiting time</div>
              <div className="mt-1 text-xl font-bold text-primary">
                {formatDuration(sessionDuration(session))}
              </div>
            </div>
            <div className="rounded-xl border border-success/20 bg-success/5 p-3">
              <div className="text-xs font-medium text-muted-foreground">Order placing time</div>
              <div className="mt-1 text-xl font-bold text-success">
                {(() => {
                  const duration = orderPlacingDuration(order, session);
                  return duration !== null ? formatDuration(duration) : "Not captured";
                })()}
              </div>
            </div>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">Order placed at</div>
              <div className="font-semibold">{new Date(order.created_at).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">First seen</div>
              <div className="font-semibold">
                {new Date(session.first_seen_at).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Last seen</div>
              <div className="font-semibold">{new Date(session.last_seen_at).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Last page</div>
              <div className="truncate font-semibold">{session.current_path || "/"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CourierPushControls({
  onPush,
  onSaveManual,
  pushing,
}: {
  onPush: (provider: CourierProvider) => void;
  onSaveManual: (provider: CourierProvider, tracking: string) => void;
  pushing: boolean;
}) {
  const [provider, setProvider] = useState<CourierProvider>("steadfast");
  const [manualCode, setManualCode] = useState("");
  const meta = PROVIDER_BY_ID[provider];
  const isManual = !meta.apiPushSupported;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs">
        <Truck className="h-3.5 w-3.5 text-muted-foreground" />
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as CourierProvider)}
          className="bg-transparent text-xs font-medium outline-none"
          disabled={pushing}
        >
          {COURIER_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.apiPushSupported ? "" : "(manual)"}
            </option>
          ))}
        </select>
      </label>

      {isManual ? (
        <>
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder={`${meta.name} tracking code`}
            className="w-44 rounded-full border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
            disabled={pushing}
          />
          <button
            onClick={() => manualCode.trim() && onSaveManual(provider, manualCode.trim())}
            disabled={pushing || !manualCode.trim()}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
            title={`Manually book on ${meta.name} portal, then paste the tracking code here.`}
          >
            <Truck className="h-3.5 w-3.5" />
            {pushing ? "Saving…" : `Save ${meta.shortBn}`}
          </button>
          <span className="text-[10px] text-muted-foreground">
            {meta.name} API পুশ এখনো সাপোর্টেড নয় — ম্যানুয়ালি বুক করে কোড বসান।
          </span>
        </>
      ) : (
        <button
          onClick={() => onPush(provider)}
          disabled={pushing}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
          title={`Push this order to ${meta.name} via API`}
        >
          <Truck className="h-3.5 w-3.5" />
          {pushing ? "Pushing…" : `Push to ${meta.shortBn}`}
        </button>
      )}
    </div>
  );
}

function CourierTrackedChip({ order, onRefresh }: { order: Order; onRefresh: () => void }) {
  const pid = order.courier_provider as CourierProvider | null;
  const meta = pid ? PROVIDER_BY_ID[pid] : null;
  const code = order.courier_tracking_code ?? order.courier_consignment_id ?? "";
  const trackUrl = meta?.trackingUrl && code ? meta.trackingUrl(code) : null;
  const supportsRefresh = meta?.apiPushSupported ?? false;
  return (
    <>
      <span
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
        style={{
          borderColor: meta ? `${meta.accent}55` : undefined,
          background: meta ? `${meta.accent}15` : undefined,
          color: meta?.accent,
        }}
      >
        <Truck className="h-3.5 w-3.5" />
        {providerLabel(order.courier_provider)} · {code}
        {order.courier_status ? ` · ${order.courier_status}` : ""}
      </span>
      {supportsRefresh && (
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs hover:bg-secondary"
          title="Refresh delivery status"
        >
          <RefreshCw className="h-3 w-3" /> Status
        </button>
      )}
      {trackUrl && (
        <a
          href={trackUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs hover:bg-secondary"
        >
          Track <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </>
  );
}

const RISK_STYLE: Record<
  FraudReport["risk"],
  { wrap: string; chip: string; icon: React.ReactNode; label: string }
> = {
  low: {
    wrap: "border-emerald-500/30 bg-emerald-500/5",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    icon: <ShieldCheck className="h-4 w-4" />,
    label: "Low risk",
  },
  medium: {
    wrap: "border-amber-500/30 bg-amber-500/5",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    icon: <ShieldAlert className="h-4 w-4" />,
    label: "Medium risk",
  },
  high: {
    wrap: "border-destructive/40 bg-destructive/5",
    chip: "bg-destructive/15 text-destructive border-destructive/30",
    icon: <ShieldX className="h-4 w-4" />,
    label: "High risk — সাবধান",
  },
  unknown: {
    wrap: "border-border bg-secondary/30",
    chip: "bg-muted text-muted-foreground border-border",
    icon: <Shield className="h-4 w-4" />,
    label: "Unknown",
  },
};

// session-scoped cache so re-expanding the same order doesn't re-fetch
const fraudCache = new Map<string, FraudReport>();

function FraudPanel({ phone }: { phone: string }) {
  const checkFn = useServerFn(checkPhoneFraud);
  const normalized = String(phone).replace(/\D/g, "").slice(-11);
  const [report, setReport] = useState<FraudReport | null>(
    () => fraudCache.get(normalized) ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await checkFn({ data: { phone: normalized } });
      fraudCache.set(normalized, r);
      setReport(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to check");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!report && !loading) {
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized]);

  const style = report ? RISK_STYLE[report.risk] : RISK_STYLE.unknown;
  const successPct = report ? Math.round(report.success_rate * 100) : 0;
  const cancelPct = report ? Math.round(report.cancel_rate * 100) : 0;

  return (
    <div className={cn("rounded-xl border p-3", style.wrap)}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Fraud Check · {normalized || phone}
          </div>
          {report && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                style.chip,
              )}
            >
              {style.icon}
              {style.label}
            </span>
          )}
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:bg-secondary disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {loading ? "Checking" : "Re-check"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {!report && loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking phone history across all
          couriers…
        </div>
      )}

      {report && report.source === "unavailable" && (
        <div className="text-xs text-muted-foreground">
          {report.reasons.join(" · ") || report.message || "Fraud check unavailable."}
        </div>
      )}

      {report && report.source === "bdcourier" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-border bg-background p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total
              </div>
              <div className="text-lg font-bold">{report.total_parcel}</div>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2">
              <div className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Delivered
              </div>
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {report.success_parcel}
                <span className="ml-1 text-xs font-medium opacity-80">({successPct}%)</span>
              </div>
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2">
              <div className="text-[10px] uppercase tracking-wider text-destructive">Returned</div>
              <div className="text-lg font-bold text-destructive">
                {report.cancelled_parcel}
                <span className="ml-1 text-xs font-medium opacity-80">({cancelPct}%)</span>
              </div>
            </div>
          </div>

          {report.total_parcel > 0 && (
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${successPct}%` }}
                title={`${successPct}% delivered`}
              />
            </div>
          )}

          {report.reasons.length > 0 && (
            <div className="rounded-lg border border-border bg-background/60 p-2">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Matching Reasons
              </div>
              <ul className="space-y-0.5 text-xs">
                {report.reasons.map((r, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="opacity-60">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.couriers.length > 0 && (
            <details className="rounded-lg border border-border bg-background/60">
              <summary className="cursor-pointer px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Courier-wise breakdown ({report.couriers.length})
              </summary>
              <div className="divide-y divide-border">
                {report.couriers.map((c) => {
                  const pct =
                    c.total_parcel > 0 ? Math.round((c.success_parcel / c.total_parcel) * 100) : 0;
                  return (
                    <div
                      key={c.name}
                      className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-2 py-1.5 text-xs"
                    >
                      <div className="font-medium capitalize">{c.name}</div>
                      <div className="text-muted-foreground">Total {c.total_parcel}</div>
                      <div className="text-emerald-700 dark:text-emerald-300">
                        ✓ {c.success_parcel}
                      </div>
                      <div className="text-destructive">
                        ✗ {c.cancelled_parcel} · {pct}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
