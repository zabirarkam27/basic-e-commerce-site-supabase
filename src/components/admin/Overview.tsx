import { TrendingUp, ShoppingCart, Clock, Truck, XCircle, Download } from "lucide-react";
import type { Order } from "@/lib/store-types";
import { formatBDT } from "@/lib/store-types";
import { exportRowsCSV, csvTimestamp } from "@/lib/csv-export";

export function Overview({ orders }: { orders: Order[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todays = orders.filter((o) => new Date(o.created_at) >= today);
  const todaysSales = todays
    .filter((o) => o.status !== "Cancelled")
    .reduce((s, o) => s + Number(o.total), 0);

  const counts = {
    Pending: orders.filter((o) => o.status === "Pending").length,
    Confirmed: orders.filter((o) => o.status === "Confirmed").length,
    Shipped: orders.filter((o) => o.status === "Shipped").length,
    Cancelled: orders.filter((o) => o.status === "Cancelled").length,
  };

  const exportDaily = () => {
    const by = new Map<
      string,
      { orders: number; units: number; revenue: number; cancelled: number }
    >();
    for (const o of orders) {
      const date = new Date(o.created_at).toISOString().slice(0, 10);
      const entry = by.get(date) ?? { orders: 0, units: 0, revenue: 0, cancelled: 0 };
      entry.orders += 1;
      entry.units += o.quantity;
      if (o.status === "Cancelled") entry.cancelled += 1;
      else entry.revenue += Number(o.total);
      by.set(date, entry);
    }
    const rows = [...by.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, e]) => [date, e.orders, e.cancelled, e.units, e.revenue.toFixed(2)]);
    exportRowsCSV({
      filename: `sales_daily_${csvTimestamp()}.csv`,
      headers: ["Date", "Orders", "Cancelled", "Units", "Revenue (BDT)"],
      rows,
      emptyMessage: "No orders yet to build a report.",
    });
  };

  const exportProductSummary = () => {
    const by = new Map<
      string,
      { product: string; units: number; orders: number; revenue: number }
    >();
    for (const o of orders) {
      if (o.status === "Cancelled") continue;
      const key = o.product_id ?? o.product_title;
      const entry = by.get(key) ?? {
        product: o.product_title,
        units: 0,
        orders: 0,
        revenue: 0,
      };
      entry.units += o.quantity;
      entry.orders += 1;
      entry.revenue += Number(o.total);
      by.set(key, entry);
    }
    const rows = [...by.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .map((e) => [e.product, e.orders, e.units, e.revenue.toFixed(2)]);
    exportRowsCSV({
      filename: `sales_by_product_${csvTimestamp()}.csv`,
      headers: ["Product", "Orders", "Units", "Revenue (BDT)"],
      rows,
      emptyMessage: "No orders yet to build a report.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          icon={TrendingUp}
          label="Sales Today"
          value={formatBDT(todaysSales)}
          accent
          sub={`${todays.length} orders`}
        />
        <Stat icon={Clock} label="Pending" value={String(counts.Pending)} />
        <Stat icon={ShoppingCart} label="Confirmed" value={String(counts.Confirmed)} />
        <Stat icon={Truck} label="Shipped" value={String(counts.Shipped)} />
        <Stat icon={XCircle} label="Cancelled" value={String(counts.Cancelled)} />
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-soft">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Reports
        </div>
        <button
          onClick={exportDaily}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-secondary"
        >
          <Download className="h-3.5 w-3.5" /> Daily sales CSV
        </button>
        <button
          onClick={exportProductSummary}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-secondary"
        >
          <Download className="h-3.5 w-3.5" /> Sales by product CSV
        </button>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl border p-5 shadow-soft " +
        (accent
          ? "border-primary/20 bg-gradient-to-br from-primary/10 to-accent"
          : "border-border bg-card")
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <Icon className={"h-4 w-4 " + (accent ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className={"text-2xl font-bold " + (accent ? "text-primary" : "")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
