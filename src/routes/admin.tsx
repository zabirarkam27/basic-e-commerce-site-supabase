import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useEffect,
  useState,
  useCallback,
  useRef,
  lazy,
  Suspense,
  type ComponentType,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { Toaster, toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminExists, bootstrapAdmin } from "@/lib/admin.functions";
import { Overview } from "@/components/admin/Overview";
import { OrdersTable } from "@/components/admin/OrdersTable";
import type { Order } from "@/lib/store-types";

// Heavy panels are lazy-loaded so the initial admin bundle stays small.
// After a redeploy, the browser may still hold an old index.html that references
// stale chunk filenames. Reload once when a dynamic import fails so the user
// picks up the latest manifest instead of seeing an error boundary.
function lazyWithReload<T extends Record<string, unknown>, C extends ComponentType<unknown>>(
  loader: () => Promise<T>,
  pick: (m: T) => C,
) {
  return lazy(async () => {
    const RELOAD_KEY = "lovable:chunk-reload";
    try {
      const mod = await loader();
      sessionStorage.removeItem(RELOAD_KEY);
      return { default: pick(mod) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isChunkErr =
        /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
          msg,
        );
      if (isChunkErr && typeof window !== "undefined" && !sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
        // Return a never-resolving promise while reload happens.
        return await new Promise<{ default: C }>(() => {});
      }
      throw err;
    }
  });
}

const ProductsManager = lazyWithReload(
  () => import("@/components/admin/ProductsManager"),
  (m) => m.ProductsManager,
);
const SettingsPanel = lazyWithReload(
  () => import("@/components/admin/SettingsPanel"),
  (m) => m.SettingsPanel,
);
const LandingPagesManager = lazyWithReload(
  () => import("@/components/admin/LandingPagesManager"),
  (m) => m.LandingPagesManager,
);
const TeamPanel = lazyWithReload(
  () => import("@/components/admin/TeamPanel"),
  (m) => m.TeamPanel,
);
const CatalogManager = lazyWithReload(
  () => import("@/components/admin/CatalogManager"),
  (m) => m.CatalogManager,
);
const FaqsManager = lazyWithReload(
  () => import("@/components/admin/FaqsManager"),
  (m) => m.FaqsManager,
);
const ReviewsManager = lazyWithReload(
  () => import("@/components/admin/ReviewsManager"),
  (m) => m.ReviewsManager,
);
const VideosManager = lazyWithReload(
  () => import("@/components/admin/VideosManager"),
  (m) => m.VideosManager,
);
const DeliveryManager = lazyWithReload(
  () => import("@/components/admin/DeliveryManager"),
  (m) => m.DeliveryManager,
);
const WhyUsManager = lazyWithReload(
  () => import("@/components/admin/WhyUsManager"),
  (m) => m.WhyUsManager,
);
const CheckoutLeadsPanel = lazyWithReload(
  () => import("@/components/admin/CheckoutLeadsPanel"),
  (m) => m.CheckoutLeadsPanel,
);
const AnalyticsPanel = lazyWithReload(
  () => import("@/components/admin/AnalyticsPanel"),
  (m) => m.AnalyticsPanel,
);

type Role = "super_admin" | "admin" | "sales" | "viewer";

const STAFF_ROLES: Role[] = ["super_admin", "admin", "sales", "viewer"];
const CAN_MANAGE_PRODUCTS: Role[] = ["super_admin", "admin"];
const CAN_MANAGE_SETTINGS: Role[] = ["super_admin", "admin"];
const CAN_MANAGE_LANDING: Role[] = ["super_admin", "admin"];
const CAN_MANAGE_TEAM: Role[] = ["super_admin"];

function hasAny(roles: Role[], allowed: Role[]) {
  return roles.some((r) => allowed.includes(r));
}

function PanelFallback() {
  return (
    <div className="grid place-items-center rounded-2xl border border-border bg-card py-16 text-sm text-muted-foreground shadow-soft">
      Loading…
    </div>
  );
}
import {
  LogOut,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Bell,
  ShoppingCart,
  Sparkles,
  Users,
  Tags,
  HelpCircle,
  MessageSquare,
  Video as VideoIcon,
  Award,
  ExternalLink,
  Truck,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Noor Honey" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://noorhoney.lovable.app/admin" }],
  }),
  component: AdminPage,
});

type Tab =
  | "overview"
  | "analytics"
  | "orders"
  | "leads"
  | "products"
  | "catalog"
  | "reviews"
  | "videos"
  | "faqs"
  | "whyus"
  | "landing"
  | "delivery"
  | "settings"
  | "team";

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    const checkRoles = async (userId: string | undefined) => {
      if (!userId) {
        setRoles([]);
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      setRoles((data ?? []).map((r) => r.role) as Role[]);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
      setTimeout(() => {
        checkRoles(sess?.user?.id);
      }, 0);
    });
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      await checkRoles(data.session?.user?.id);
      setLoading(false);
    })();
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-secondary/30">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const isStaff = hasAny(roles, STAFF_ROLES);

  return (
    <>
      <Toaster position="top-center" richColors />
      {!session || !isStaff ? (
        <LoginScreen authedNonAdmin={!!session && !isStaff} />
      ) : (
        <Dashboard roles={roles} userId={session.user!.id} />
      )}
    </>
  );
}

function LoginScreen({ authedNonAdmin }: { authedNonAdmin: boolean }) {
  const [mode, setMode] = useState<"login" | "bootstrap" | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const check = useServerFn(adminExists);
  const bootstrap = useServerFn(bootstrapAdmin);

  useEffect(() => {
    (async () => {
      try {
        const { exists } = await check();
        setMode(exists ? "login" : "bootstrap");
      } catch {
        setMode("login");
      } finally {
        setChecking(false);
      }
    })();
  }, [check]);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("If that email exists, a reset link has been sent.");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err) {
      // Don't leak whether email exists — show generic success
      toast.success("If that email exists, a reset link has been sent.");
      setForgotOpen(false);
    } finally {
      setForgotSubmitting(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "bootstrap") {
        await bootstrap({ data: { email, password } });
        toast.success("Admin created. Signing in…");
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-secondary/40 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-pop">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground font-bold shadow-soft">
            N
          </div>
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {authedNonAdmin
              ? "Your account is not an admin."
              : mode === "bootstrap"
                ? "First-time setup: create the admin account."
                : "Sign in to manage your store."}
          </p>
        </div>
        {authedNonAdmin && (
          <button
            onClick={() => supabase.auth.signOut()}
            className="mb-4 w-full rounded-full border border-border py-2 text-sm font-medium hover:bg-secondary"
          >
            Sign out
          </button>
        )}
        {checking ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Checking…</div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-coral"
              autoComplete="email"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-coral"
              autoComplete={mode === "bootstrap" ? "new-password" : "current-password"}
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
            >
              {submitting
                ? "Please wait…"
                : mode === "bootstrap"
                  ? "Create admin & sign in"
                  : "Sign in"}
            </button>
            {mode === "login" && (
              <div className="pt-1 text-right">
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotOpen(true);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </form>
        )}
        {forgotOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-pop">
              <h2 className="text-lg font-bold">Reset admin password</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter your admin email. We'll send a secure reset link.
              </p>
              <form onSubmit={onForgot} className="mt-4 space-y-3">
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                  autoComplete="email"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(false)}
                    className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotSubmitting}
                    className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
                  >
                    {forgotSubmitting ? "Sending…" : "Send link"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <div className="mt-4 text-center text-xs text-muted-foreground">
          <a href="/" className="hover:text-foreground">
            ← Back to store
          </a>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ roles, userId }: { roles: Role[]; userId: string }) {
  const canProducts = hasAny(roles, CAN_MANAGE_PRODUCTS);
  const canLanding = hasAny(roles, CAN_MANAGE_LANDING);
  const canSettings = hasAny(roles, CAN_MANAGE_SETTINGS);
  const canTeam = hasAny(roles, CAN_MANAGE_TEAM);
  const primaryRole: Role = roles.includes("super_admin")
    ? "super_admin"
    : roles.includes("admin")
      ? "admin"
      : roles.includes("sales")
        ? "sales"
        : "viewer";
  const roleLabel = (
    { super_admin: "Super Admin", admin: "Admin", sales: "Sales", viewer: "Viewer" } as const
  )[primaryRole];
  const [tab, setTab] = useState<Tab>("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setOrders(data as Order[]);
  }, []);

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel("orders-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const row = payload.new as Order;
        setOrders((prev) => (prev.some((o) => o.id === row.id) ? prev : [row, ...prev]));
        toast.success(`New order from ${row.customer_name}!`);
        audioRef.current?.play().catch(() => {});
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const row = payload.new as Order;
        // Patch in place — avoids a full select * on every status/courier update.
        setOrders((prev) => prev.map((o) => (o.id === row.id ? { ...o, ...row } : o)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, (payload) => {
        const id = (payload.old as { id?: string })?.id;
        if (id) setOrders((prev) => prev.filter((o) => o.id !== id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const ALL_TABS: {
    id: Tab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    visible: boolean;
  }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, visible: true },
    { id: "analytics", label: "Analytics", icon: BarChart3, visible: true },
    { id: "orders", label: "Orders", icon: Receipt, visible: true },
    { id: "leads", label: "Checkout Leads", icon: ShoppingCart, visible: true },
    { id: "products", label: "Products", icon: Package, visible: canProducts },
    { id: "catalog", label: "Catalog", icon: Tags, visible: canProducts },
    { id: "reviews", label: "Reviews", icon: MessageSquare, visible: canSettings },
    { id: "videos", label: "Videos", icon: VideoIcon, visible: canSettings },
    { id: "faqs", label: "FAQ", icon: HelpCircle, visible: canSettings },
    { id: "whyus", label: "Why Us", icon: Award, visible: canSettings },
    { id: "landing", label: "Landing Pages", icon: Sparkles, visible: canLanding },
    { id: "delivery", label: "Delivery", icon: Truck, visible: canTeam },
    { id: "settings", label: "Settings", icon: Settings, visible: canSettings },
    { id: "team", label: "Team", icon: Users, visible: canTeam },
  ];
  const TABS = ALL_TABS.filter((t) => t.visible);

  // Guard: if current tab is not visible for role, fall back
  useEffect(() => {
    if (!TABS.some((t) => t.id === tab)) setTab("overview");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canProducts, canLanding, canSettings, canTeam]);

  const pendingCount = orders.filter((o) => o.status === "Pending").length;

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Beep sound — short data-uri WAV */}
      <audio
        ref={audioRef}
        src="data:audio/wav;base64,UklGRl9vAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQBvAACA"
        preload="auto"
      />
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-bold shadow-soft">
              N
            </div>
            <div>
              <div className="text-sm font-semibold">Noor Honey</div>
              <div className="text-xs text-muted-foreground">Admin Dashboard</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {roleLabel}
            </span>
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
                <Bell className="h-3.5 w-3.5" /> {pendingCount} pending
              </span>
            )}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View site
            </a>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition",
                tab === t.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-secondary",
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {tab === "overview" && (
          <>
            <Overview orders={orders} />
            <div>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Recent orders</h2>
              <OrdersTable orders={orders.slice(0, 8)} refetch={refetch} />
            </div>
          </>
        )}
        {tab === "orders" && <OrdersTable orders={orders} refetch={refetch} />}
        {tab === "analytics" && (
          <Suspense fallback={<PanelFallback />}>
            <AnalyticsPanel />
          </Suspense>
        )}
        {tab === "leads" && (
          <Suspense fallback={<PanelFallback />}>
            <CheckoutLeadsPanel canEdit={primaryRole !== "viewer"} />
          </Suspense>
        )}
        {tab === "products" && canProducts && (
          <Suspense fallback={<PanelFallback />}>
            <ProductsManager />
          </Suspense>
        )}
        {tab === "catalog" && canProducts && (
          <Suspense fallback={<PanelFallback />}>
            <CatalogManager />
          </Suspense>
        )}
        {tab === "faqs" && canSettings && (
          <Suspense fallback={<PanelFallback />}>
            <FaqsManager />
          </Suspense>
        )}
        {tab === "whyus" && canSettings && (
          <Suspense fallback={<PanelFallback />}>
            <WhyUsManager />
          </Suspense>
        )}
        {tab === "reviews" && canSettings && (
          <Suspense fallback={<PanelFallback />}>
            <ReviewsManager />
          </Suspense>
        )}
        {tab === "videos" && canSettings && (
          <Suspense fallback={<PanelFallback />}>
            <VideosManager />
          </Suspense>
        )}
        {tab === "landing" && canLanding && (
          <Suspense fallback={<PanelFallback />}>
            <LandingPagesManager />
          </Suspense>
        )}
        {tab === "delivery" && canTeam && (
          <Suspense fallback={<PanelFallback />}>
            <DeliveryManager />
          </Suspense>
        )}
        {tab === "settings" && canSettings && (
          <Suspense fallback={<PanelFallback />}>
            <SettingsPanel />
          </Suspense>
        )}
        {tab === "team" && canTeam && (
          <Suspense fallback={<PanelFallback />}>
            <TeamPanel currentUserId={userId} />
          </Suspense>
        )}
      </main>
    </div>
  );
}
