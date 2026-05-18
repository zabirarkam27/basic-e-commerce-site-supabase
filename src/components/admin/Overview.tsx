import { TrendingUp, ShoppingCart, Clock, Truck, XCircle, Download } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Order } from "@/lib/store-types";
import { formatBDT } from "@/lib/store-types";
import { exportRowsCSV, csvTimestamp } from "@/lib/csv-export";

const dailyChartConfig = {
  revenue: { label: "Revenue", color: "#ef4444" },
  orders: { label: "Orders", color: "#0ea5e9" },
} satisfies ChartConfig;

const productChartConfig = {
  revenue: { label: "Revenue", color: "#16a34a" },
} satisfies ChartConfig;

const statusColors: Record<string, string> = {
  Pending: "#f59e0b",
  Confirmed: "#0ea5e9",
  Shipped: "#16a34a",
  Cancelled: "#ef4444",
};

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

  const dailyData = buildDailyData(orders);
  const statusData = Object.entries(counts).map(([status, count]) => ({
    status,
    count,
    fill: statusColors[status],
  }));
  const productData = buildProductData(orders);

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

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <ChartCard
          title="Daily sales trend"
          subtitle="Revenue and order count for the last 14 days"
        >
          <ChartContainer config={dailyChartConfig} className="h-72 w-full">
            <AreaChart data={dailyData} margin={{ left: 8, right: 8, top: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                yAxisId="revenue"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={72}
                tickFormatter={(value) => `৳${Number(value).toLocaleString("en-BD")}`}
              />
              <YAxis yAxisId="orders" orientation="right" hide />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <div className="flex min-w-28 items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {name === "revenue" ? "Revenue" : "Orders"}
                        </span>
                        <span className="font-mono font-medium text-foreground">
                          {name === "revenue"
                            ? formatBDT(Number(value))
                            : Number(value).toLocaleString("en-BD")}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Area
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                fill="var(--color-revenue)"
                fillOpacity={0.16}
                strokeWidth={2}
              />
              <Area
                yAxisId="orders"
                type="monotone"
                dataKey="orders"
                stroke="var(--color-orders)"
                fill="var(--color-orders)"
                fillOpacity={0.12}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard title="Order status" subtitle="Current order pipeline">
          <ChartContainer config={{}} className="h-72 w-full">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, name) => (
                      <div className="flex min-w-28 items-center justify-between gap-4">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-mono font-medium text-foreground">
                          {Number(value).toLocaleString("en-BD")}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Pie
                data={statusData}
                dataKey="count"
                nameKey="status"
                innerRadius={62}
                outerRadius={96}
                paddingAngle={2}
              >
                {statusData.map((entry) => (
                  <Cell key={entry.status} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="grid grid-cols-2 gap-2">
            {statusData.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2 text-xs"
              >
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  {item.status}
                </span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Top products" subtitle="Highest revenue products from non-cancelled orders">
        <ChartContainer config={productChartConfig} className="h-80 w-full">
          <BarChart data={productData} layout="vertical" margin={{ left: 8, right: 18 }}>
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `৳${Number(value).toLocaleString("en-BD")}`}
            />
            <YAxis
              dataKey="product"
              type="category"
              tickLine={false}
              axisLine={false}
              width={132}
              tickFormatter={(value) =>
                String(value).length > 18 ? `${String(value).slice(0, 18)}…` : String(value)
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <div className="flex min-w-28 items-center justify-between gap-4">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatBDT(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ChartContainer>
      </ChartCard>
    </div>
  );
}

function buildDailyData(orders: Order[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (13 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      date: date.toLocaleDateString("en-BD", { month: "short", day: "numeric" }),
      orders: 0,
      revenue: 0,
    };
  });
  const byDate = new Map(days.map((day) => [day.key, day]));

  for (const order of orders) {
    const key = new Date(order.created_at).toISOString().slice(0, 10);
    const entry = byDate.get(key);
    if (!entry) continue;
    entry.orders += 1;
    if (order.status !== "Cancelled") entry.revenue += Number(order.total);
  }

  return days;
}

function buildProductData(orders: Order[]) {
  const byProduct = new Map<string, { product: string; revenue: number; units: number }>();

  for (const order of orders) {
    if (order.status === "Cancelled") continue;
    const key = order.product_id ?? order.product_title;
    const entry = byProduct.get(key) ?? {
      product: order.product_title,
      revenue: 0,
      units: 0,
    };
    entry.revenue += Number(order.total);
    entry.units += order.quantity;
    byProduct.set(key, entry);
  }

  return [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
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
