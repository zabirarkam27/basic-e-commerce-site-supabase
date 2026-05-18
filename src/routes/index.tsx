import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { Toaster } from "sonner";
import { Header } from "@/components/store/Header";
import { Hero } from "@/components/store/Hero";
import { ProductCard } from "@/components/store/ProductCard";
import { WhyShop } from "@/components/store/TrustReviews";
import { DeferRender } from "@/components/DeferRender";
import { StoreProvider } from "@/lib/store-context";
import { useSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { useI18n } from "@/lib/i18n";
import { Phone, Mail, MapPin, Facebook, Instagram, Youtube, Twitter, Linkedin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ProductWithVariants, Category, Brand } from "@/lib/store-types";
import { cn } from "@/lib/utils";

const QuickView = lazy(() =>
  import("@/components/store/QuickView").then((m) => ({ default: m.QuickView })),
);

const TrustReviews = lazy(() =>
  import("@/components/store/TrustReviews").then((m) => ({ default: m.TrustReviews })),
);

const VideoSection = lazy(() =>
  import("@/components/store/VideoSection").then((m) => ({ default: m.VideoSection })),
);

const FaqSection = lazy(() =>
  import("@/components/store/FaqSection").then((m) => ({ default: m.FaqSection })),
);

const CheckoutForm = lazy(() =>
  import("@/components/store/CheckoutForm").then((m) => ({ default: m.CheckoutForm })),
);

const HOME_TITLE = "Noor Honey — 100% Pure Bangladeshi Honey";
const HOME_DESCRIPTION =
  "Raw, unfiltered honey hand-harvested from the Sundarbans. Cash on delivery across Bangladesh. Order online in 30 seconds.";
const HOME_URL = "https://basic-e-commerce-site-supabase.vercel.app/";
const FAVICON_URL = "/noor-honey-favicon.svg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: HOME_TITLE },
      {
        name: "description",
        content: HOME_DESCRIPTION,
      },

      { property: "og:title", content: HOME_TITLE },
      {
        property: "og:description",
        content: HOME_DESCRIPTION,
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: HOME_URL },
      { property: "og:site_name", content: "Noor Honey" },

      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: HOME_TITLE },
      { name: "twitter:description", content: HOME_DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: HOME_URL },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: FAVICON_URL,
      },
      {
        rel: "apple-touch-icon",
        href: FAVICON_URL,
      },
      {
        rel: "preconnect",
        href: "https://fuzsimcakubybrvfhson.supabase.co",
        crossOrigin: "anonymous",
      },
      {
        rel: "preconnect",
        href: "https://images.unsplash.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "dns-prefetch",
        href: "https://images.unsplash.com",
      },
      {
        rel: "preload",
        as: "image",
        href: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=75&fm=webp",
        imageSrcSet:
          "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=480&q=70&fm=webp 480w, https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=75&fm=webp 800w, https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1200&q=80&fm=webp 1200w",
        imageSizes: "(max-width: 768px) 100vw, 50vw",
        fetchpriority: "high",
      },
    ],
  }),
  component: StorePage,
});

function StorePage() {
  return (
    <StoreProvider>
      <Toaster position="top-center" richColors />
      <Store />
    </StoreProvider>
  );
}

function Store() {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickView, setQuickView] = useState<ProductWithVariants | null>(null);
  const [delivery, setDelivery] = useState({ inside: 60, outside: 120 });

  const { settings } = useSiteSettings();
  const { t } = useI18n();

  const brand = settings.brand_name || "Store";
  const initial = brand.trim().charAt(0).toUpperCase() || "S";

  useEffect(() => {
    let mounted = true;

    (async () => {
      const [{ data: prods }, { data: vars }, { data: delivRows }, { data: cats }, { data: brs }] =
        await Promise.all([
          supabase.from("products").select("*").eq("active", true).order("sort_order"),
          supabase.from("product_variants").select("*").order("sort_order"),
          supabase
            .from("settings")
            .select("key,value")
            .in("key", ["delivery_inside", "delivery_outside"]),
          supabase.from("categories").select("*").order("sort_order").order("name"),
          supabase.from("brands").select("*").order("sort_order").order("name"),
        ]);

      if (!mounted) return;

      const variantsByProduct = new Map<string, ProductWithVariants["variants"]>();

      (vars ?? []).forEach((v) => {
        const arr = variantsByProduct.get(v.product_id) ?? [];
        arr.push(v);
        variantsByProduct.set(v.product_id, arr);
      });

      const merged = (prods ?? []).map((p) => ({
        ...p,
        gallery: Array.isArray(p.gallery) ? (p.gallery as string[]) : [],
        variants: variantsByProduct.get(p.id) ?? [],
      })) as ProductWithVariants[];

      setProducts(merged);
      setCategories((cats ?? []) as Category[]);
      setBrands((brs ?? []) as Brand[]);

      const map = new Map((delivRows ?? []).map((s) => [s.key, s.value]));

      setDelivery({
        inside: Number(map.get("delivery_inside") ?? 60),
        outside: Number(map.get("delivery_outside") ?? 120),
      });

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const matchFilters = (p: ProductWithVariants) =>
    (!activeCategory || p.category_id === activeCategory) &&
    (!activeBrand || p.brand_id === activeBrand);

  const offers = products.filter((p) => p.regular_price > p.sale_price && matchFilters(p));
  const featured = products.filter((p) => p.featured && matchFilters(p));
  const visible = products.filter(matchFilters);
  const filtersActive = !!(activeCategory || activeBrand);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <Hero />

        {offers.length > 0 && (
          <section id="offers" className="pt-12">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <h2 className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                    {t("section.offers.title")}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("section.offers.subtitle")}
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {offers.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onQuickView={setQuickView}
                    priority={i === 0}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="pt-12">
          <WhyShop />
        </div>

        {(categories.length > 0 || brands.length > 0) && (
          <section id="filters" className="pt-12">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold tracking-tight sm:text-xl">
                    {t("section.filters.title")}
                  </h2>

                  {filtersActive && (
                    <button
                      onClick={() => {
                        setActiveBrand(null);
                        setActiveCategory(null);
                      }}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      {t("filters.clear_all")}
                    </button>
                  )}
                </div>

                {brands.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("filters.brand")}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setActiveBrand(null)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                          activeBrand === null
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-secondary",
                        )}
                      >
                        {t("filters.all_brands")}
                      </button>

                      {brands.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setActiveBrand(b.id)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                            activeBrand === b.id
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:bg-secondary",
                          )}
                        >
                          {b.logo_url && (
                            <img
                              src={b.logo_url}
                              alt=""
                              className="h-4 w-4 rounded object-contain"
                              loading="lazy"
                            />
                          )}
                          {b.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {categories.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("filters.category")}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setActiveCategory(null)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                          activeCategory === null
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-secondary",
                        )}
                      >
                        {t("filters.all_categories")}
                      </button>

                      {categories.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveCategory(c.id)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                            activeCategory === c.id
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:bg-secondary",
                          )}
                        >
                          {c.image_url && (
                            <img
                              src={c.image_url}
                              alt=""
                              className="h-4 w-4 rounded object-cover"
                              loading="lazy"
                            />
                          )}
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {featured.length > 0 && (
          <section id="featured" className="pt-12">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <h2 className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                    {t("section.featured.title")}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("section.featured.subtitle")}
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onQuickView={setQuickView}
                    priority={i === 0 && offers.length === 0}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="products" className="py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {activeCategory
                    ? (categories.find((c) => c.id === activeCategory)?.name ??
                      t("section.all.title"))
                    : t("section.all.title")}
                </h2>
                <p className="mt-2 text-muted-foreground">{t("section.all.subtitle")}</p>
              </div>

              {filtersActive && (
                <button
                  onClick={() => {
                    setActiveBrand(null);
                    setActiveCategory(null);
                  }}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                >
                  {t("filters.clear")}
                </button>
              )}
            </div>

            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-secondary" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border bg-secondary/30 px-6 py-16 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-background text-3xl shadow-soft">
                  🔎
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">{t("empty.title")}</h3>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {filtersActive ? t("empty.with_filters") : t("empty.no_products")}
                  </p>
                </div>

                {filtersActive && (
                  <button
                    onClick={() => {
                      setActiveBrand(null);
                      setActiveCategory(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop transition hover:scale-[1.02]"
                  >
                    {t("filters.clear")}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onQuickView={setQuickView}
                    priority={i === 0 && offers.length === 0 && featured.length === 0}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <DeferRender minHeight={400}>
          <Suspense fallback={null}>
            <TrustReviews />
          </Suspense>
        </DeferRender>

        <DeferRender minHeight={300}>
          <Suspense fallback={null}>
            <VideoSection />
          </Suspense>
        </DeferRender>

        <DeferRender minHeight={300}>
          <Suspense fallback={null}>
            <FaqSection />
          </Suspense>
        </DeferRender>

        <DeferRender minHeight={400}>
          <Suspense fallback={null}>
            <CheckoutForm deliveryInside={delivery.inside} deliveryOutside={delivery.outside} />
          </Suspense>
        </DeferRender>
      </main>

      <footer className="border-t border-border bg-card py-10">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              {settings.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={brand}
                  className="h-8 w-8 rounded-lg object-contain"
                />
              ) : (
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                  {initial}
                </div>
              )}

              <span className="text-sm font-semibold">{brand}</span>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              © {new Date().getFullYear()} {brand}. {t("footer.rights")}
            </p>

            <SocialLinks settings={settings} />
          </div>

          {(settings.contact_phone || settings.contact_email || settings.contact_address) && (
            <div>
              <h4 className="mb-3 text-sm font-semibold">{t("footer.contact")}</h4>

              <ul className="space-y-2 text-xs text-muted-foreground">
                {settings.contact_phone && (
                  <li className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <a href={`tel:${settings.contact_phone}`} className="hover:text-foreground">
                      {settings.contact_phone}
                    </a>
                  </li>
                )}

                {settings.contact_email && (
                  <li className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <a href={`mailto:${settings.contact_email}`} className="hover:text-foreground">
                      {settings.contact_email}
                    </a>
                  </li>
                )}

                {settings.contact_address && (
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                    {settings.contact_location_url ? (
                      <a
                        href={settings.contact_location_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground"
                      >
                        {settings.contact_address}
                      </a>
                    ) : (
                      <span>{settings.contact_address}</span>
                    )}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* <div className="md:text-right">
            <a
              href="/admin"
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              {t("footer.admin")}
            </a>
          </div> */}
        </div>
      </footer>

      {quickView && (
        <Suspense fallback={null}>
          <QuickView product={quickView} onClose={() => setQuickView(null)} />
        </Suspense>
      )}
    </div>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.5 3a5.5 5.5 0 0 0 5 3v3a8.4 8.4 0 0 1-5-1.6v7.4a6 6 0 1 1-6-6c.34 0 .67.03 1 .09v3.13a3 3 0 1 0 2 2.83V3h3z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.5 3.5A11 11 0 0 0 3.4 17l-1.4 5 5.2-1.4A11 11 0 1 0 20.5 3.5zM12 20a8 8 0 0 1-4.1-1.1l-.3-.2-3.1.8.8-3-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2a.5.5 0 0 0 0-.5l-.8-1.9c-.2-.4-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-1 2.3c0 1.3 1 2.6 1.1 2.8.1.2 2 3.2 5 4.4 1.9.8 2.6.8 3.5.7.6 0 1.4-.6 1.6-1.2.2-.6.2-1.1.1-1.2-.1-.1-.3-.2-.6-.3z" />
    </svg>
  );
}

function SocialLinks({ settings }: { settings: SiteSettings }) {
  const items: {
    url: string;
    label: string;
    Icon: ComponentType<{ className?: string }>;
  }[] = [];

  if (settings.social_facebook) {
    items.push({
      url: settings.social_facebook,
      label: "Facebook",
      Icon: Facebook,
    });
  }

  if (settings.social_instagram) {
    items.push({
      url: settings.social_instagram,
      label: "Instagram",
      Icon: Instagram,
    });
  }

  if (settings.social_youtube) {
    items.push({
      url: settings.social_youtube,
      label: "YouTube",
      Icon: Youtube,
    });
  }

  if (settings.social_tiktok) {
    items.push({
      url: settings.social_tiktok,
      label: "TikTok",
      Icon: TikTokIcon,
    });
  }

  if (settings.social_twitter) {
    items.push({
      url: settings.social_twitter,
      label: "Twitter / X",
      Icon: Twitter,
    });
  }

  if (settings.social_linkedin) {
    items.push({
      url: settings.social_linkedin,
      label: "LinkedIn",
      Icon: Linkedin,
    });
  }

  if (settings.social_whatsapp) {
    const raw = settings.social_whatsapp.trim();
    const url = raw.startsWith("http") ? raw : `https://wa.me/${raw.replace(/[^0-9]/g, "")}`;

    items.push({
      url,
      label: "WhatsApp",
      Icon: WhatsAppIcon,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {items.map(({ url, label, Icon }) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-muted-foreground transition hover:border-primary hover:bg-primary hover:text-primary-foreground"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}
