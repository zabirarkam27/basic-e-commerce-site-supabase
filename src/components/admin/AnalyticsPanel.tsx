import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Clock3,
  ExternalLink,
  MousePointerClick,
  ShoppingBag,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SiteSession } from "@/lib/store-types";

const ACTIVE_WINDOW_MS = 60_000;

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

function sessionDuration(session: SiteSession, now: number) {
  const start = new Date(session.first_seen_at).getTime();
  const end =
    now - new Date(session.last_seen_at).getTime() <= ACTIVE_WINDOW_MS
      ? now
      : new Date(session.last_seen_at).getTime();
  return Math.max(0, Math.round((end - start) / 1000));
}

export function AnalyticsPanel() {
  const [sessions, setSessions] = useState<SiteSession[]>([]);
  const [now, setNow] = useState(Date.now());

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from("site_sessions")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(300);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSessions((data ?? []) as SiteSession[]);
  };

  useEffect(() => {
    fetchSessions();

    const channel = supabase
      .channel("site-analytics-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_sessions" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string })?.id;
            if (id) setSessions((prev) => prev.filter((session) => session.id !== id));
            return;
          }

          const row = payload.new as SiteSession;
          setSessions((prev) => {
            const exists = prev.some((session) => session.id === row.id);
            const next = exists
              ? prev.map((session) => (session.id === row.id ? row : session))
              : [row, ...prev];
            return next.sort(
              (a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime(),
            );
          });
        },
      )
      .subscribe();

    const timer = window.setInterval(() => setNow(Date.now()), 5000);

    return () => {
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const metrics = useMemo(() => {
    const active = sessions.filter(
      (session) => now - new Date(session.last_seen_at).getTime() <= ACTIVE_WINDOW_MS,
    );
    const durations = sessions.map((session) => sessionDuration(session, now));
    const checkoutSessions = sessions.filter((session) => session.checkout_started_at);
    const completedSessions = sessions.filter((session) => session.order_placed_at);
    const orderDurations = sessions
      .map((session) => session.order_duration_seconds)
      .filter((value): value is number => typeof value === "number" && value >= 0);

    const avgSession =
      durations.length > 0
        ? durations.reduce((sum, value) => sum + value, 0) / durations.length
        : 0;
    const avgOrder =
      orderDurations.length > 0
        ? orderDurations.reduce((sum, value) => sum + value, 0) / orderDurations.length
        : 0;
    const checkoutConversion =
      checkoutSessions.length > 0 ? (completedSessions.length / checkoutSessions.length) * 100 : 0;

    return {
      active,
      avgOrder,
      avgSession,
      checkoutConversion,
      checkoutSessions,
      completedSessions,
    };
  }, [now, sessions]);

  const recentSessions = sessions.slice(0, 30);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <h2 className="text-lg font-bold tracking-tight">Site analytics</h2>
        <p className="text-sm text-muted-foreground">
          Real-time visitors, checkout timing, and order placement speed.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric
          icon={Activity}
          label="Live customers"
          value={metrics.active.length.toString()}
          hint="Active in the last 60s"
        />
        <Metric
          icon={Clock3}
          label="Avg. site time"
          value={formatDuration(metrics.avgSession)}
          hint={`${sessions.length} recent sessions`}
        />
        <Metric
          icon={MousePointerClick}
          label="Checkout starts"
          value={metrics.checkoutSessions.length.toString()}
          hint="Customers who began checkout"
        />
        <Metric
          icon={ShoppingBag}
          label="Placed orders"
          value={metrics.completedSessions.length.toString()}
          hint={`${metrics.checkoutConversion.toFixed(0)}% checkout conversion`}
        />
        <Metric
          icon={Timer}
          label="Avg. order time"
          value={formatDuration(metrics.avgOrder)}
          hint="Checkout start to order"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h3 className="text-base font-semibold">Recent sessions</h3>
            <p className="text-xs text-muted-foreground">Newest visitors update live.</p>
          </div>
        </div>

        {recentSessions.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <Activity className="mb-3 h-8 w-8 text-muted-foreground" />
            <div className="text-sm font-semibold">No analytics sessions yet</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Visitors will appear here after the analytics migration is applied.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentSessions.map((session) => {
              const active = now - new Date(session.last_seen_at).getTime() <= ACTIVE_WINDOW_MS;
              const duration = sessionDuration(session, now);

              return (
                <div
                  key={session.id}
                  className="grid gap-3 p-4 text-sm lg:grid-cols-[1.2fr_1fr_1fr_1fr]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          active ? "bg-success" : "bg-muted-foreground/40"
                        }`}
                      />
                      <span className="font-semibold">{active ? "Online now" : "Inactive"}</span>
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {session.customer_name || "Unknown customer"}
                      {session.mobile ? ` · ${session.mobile}` : ""}
                    </div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground/80">
                      {session.session_id}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="truncate font-medium">{session.current_path || "/"}</div>
                    {session.landing_page_slug && (
                      <div className="text-xs text-muted-foreground">
                        Landing: /p/{session.landing_page_slug}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="font-medium">{formatDuration(duration)}</div>
                    <div className="text-xs text-muted-foreground">
                      Last seen {new Date(session.last_seen_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {session.checkout_started_at && (
                      <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                        Checkout
                      </span>
                    )}
                    {session.order_placed_at && (
                      <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                        Ordered in {formatDuration(session.order_duration_seconds ?? 0)}
                      </span>
                    )}
                    {session.referrer && (
                      <a
                        href={session.referrer}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-secondary"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Referrer
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 inline-grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-sm font-medium">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
