import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";
import { ArrowRight, ShieldCheck, Truck, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/store/Header";
import { CheckoutForm } from "@/components/store/CheckoutForm";
import { FaqSection } from "@/components/store/FaqSection";
import { ProductDetailGallery } from "@/components/store/ProductDetailGallery";
import { StoreProvider, smoothScrollTo, useStore } from "@/lib/store-context";
import { getLandingPageBySlug } from "@/lib/landing.functions";
import {
  type ProductWithVariants,
  type Variant,
  formatBDT,
  variantImage,
  variantPrice,
} from "@/lib/store-types";
import { useSiteSettings, applyTracking } from "@/lib/site-settings";
import { cn } from "@/lib/utils";

type LandingPage = {
  id: string;
  slug: string;
  title: string;
  hero_image: string;
  headline: string;
  subheadline: string;
  product_id: string | null;
  cta_text: string;
  cta_link: string;
  active: boolean;
  ga_measurement_id: string;
  meta_pixel_id: string;
  google_ads_id: string;
};

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => {
    const { page } = await getLandingPageBySlug({ data: { slug: params.slug } });
    return { page };
  },
  component: LandingPageView,
  head: ({ params, loaderData }) => {
    const page = loaderData?.page as LandingPage | undefined;
    const title = page?.title ? `${page.title} — Noor Honey` : `${params.slug} — Noor Honey`;
    const description = page?.subheadline ?? "Pure Sundarbans honey, delivered across Bangladesh.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: `https://noorhoney.lovable.app/p/${params.slug}` }],
    };
  },
});

function LandingPageView() {
  const { slug } = Route.useParams();
  return (
    <StoreProvider landingSlug={slug}>
      <Toaster position="top-center" richColors />
      <LandingInner slug={slug} />
    </StoreProvider>
  );
}

function LandingInner({ slug }: { slug: string }) {
  const [page, setPage] = useState<LandingPage | null>(null);
  const [product, setProduct] = useState<ProductWithVariants | null>(null);
  const [delivery, setDelivery] = useState({ inside: 60, outside: 120 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { settings } = useSiteSettings();
  const { addItem } = useStore();
  const navigate = useNavigate();
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: pageData } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();

      if (!pageData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const lp = pageData as LandingPage;
      setPage(lp);

      // page title for browser tab
      if (typeof document !== "undefined") {
        document.title = `${lp.title} — ${settings.brand_name}`;
      }

      // Layer per-landing-page tracking IDs on top of the global ones so
      // GA / Meta Pixel / Google Ads can attribute traffic to this page.
      applyTracking({
        ga_measurement_id: [settings.ga_measurement_id, lp.ga_measurement_id]
          .filter(Boolean)
          .join(","),
        meta_pixel_id: lp.meta_pixel_id || settings.meta_pixel_id,
        google_ads_id: [settings.google_ads_id, lp.google_ads_id].filter(Boolean).join(","),
      });

      const [{ data: settingsRows }, productResult] = await Promise.all([
        supabase.from("settings").select("*").in("key", ["delivery_inside", "delivery_outside"]),
        pageData.product_id
          ? supabase
              .from("products")
              .select("*")
              .eq("id", pageData.product_id)
              .eq("active", true)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const map = new Map((settingsRows ?? []).map((s) => [s.key, s.value]));
      setDelivery({
        inside: Number(map.get("delivery_inside") ?? 60),
        outside: Number(map.get("delivery_outside") ?? 120),
      });

      if (productResult.data) {
        const { data: variants } = await supabase
          .from("product_variants")
          .select("*")
          .eq("product_id", productResult.data.id)
          .order("sort_order");
        const pd = productResult.data as Record<string, unknown>;
        const full: ProductWithVariants = {
          ...(pd as unknown as ProductWithVariants),
          description: (pd.description as string | null) ?? "",
          gallery: Array.isArray(pd.gallery) ? (pd.gallery as string[]) : [],
          variants: (variants ?? []) as Variant[],
        };
        setProduct(full);
        setSelectedVariant(full.variants[0] ?? null);
      }

      setLoading(false);
    })();
  }, [
    slug,
    settings.brand_name,
    settings.ga_measurement_id,
    settings.google_ads_id,
    settings.meta_pixel_id,
  ]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-secondary/30">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="grid min-h-screen place-items-center bg-secondary/30 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold">Page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The landing page <span className="font-mono">/p/{slug}</span> doesn't exist or has been
            unpublished.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    );
  }

  const handleCta = () => {
    if (page.cta_link) {
      window.open(page.cta_link, "_blank", "noopener");
      return;
    }
    if (product) {
      addItem(product, selectedVariant);
      setTimeout(() => smoothScrollTo("checkout"), 50);
      return;
    }
    navigate({ to: "/" });
  };

  const price = product
    ? variantPrice(product, selectedVariant ?? product.variants[0] ?? null)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {page.hero_image ? (
          <div className="absolute inset-0">
            <img
              src={page.hero_image}
              alt={page.headline || page.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-background" />
        )}

        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
          <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
            {page.title}
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold leading-tight sm:text-6xl">
            {page.headline || page.title}
          </h1>
          {page.subheadline && (
            <p className="mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              {page.subheadline}
            </p>
          )}

          {product && price !== null && (
            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-border bg-card/80 px-5 py-3 shadow-soft backdrop-blur">
              <img
                src={product.image_url}
                alt={product.title}
                className="h-12 w-12 rounded-xl object-cover"
              />
              <div className="text-left">
                <div className="text-sm font-semibold">{product.title}</div>
                <div className="text-xs text-muted-foreground">
                  <span className="text-base font-bold text-foreground">{formatBDT(price)}</span>
                  {product.regular_price > price && (
                    <span className="ml-2 line-through">{formatBDT(product.regular_price)}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleCta}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-pop transition hover:scale-[1.02]"
          >
            {page.cta_text || "Order Now"} <ArrowRight className="h-4 w-4" />
          </button>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> 100% authentic
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-primary" /> Cash on delivery
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-primary" /> Quality guaranteed
            </span>
          </div>
        </div>
      </section>

      {/* Product detail */}
      {product && (
        <ProductDetailSection
          product={product}
          selectedVariant={selectedVariant}
          onVariantChange={setSelectedVariant}
          onOrder={handleCta}
          ctaText={page.cta_text || "Order Now"}
        />
      )}

      {/* Checkout (only meaningful when a product is attached and no external CTA link) */}
      {product && !page.cta_link && (
        <>
          <FaqSection />
          <CheckoutForm deliveryInside={delivery.inside} deliveryOutside={delivery.outside} />
        </>
      )}

      <footer className="border-t border-border bg-card py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {settings.brand_name}. All rights reserved.
      </footer>
    </div>
  );
}

function isRealColor(hex: string | null | undefined) {
  const h = (hex ?? "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/i.test(h);
}

function ProductDetailSection({
  product,
  selectedVariant,
  onVariantChange,
  onOrder,
  ctaText,
}: {
  product: ProductWithVariants;
  selectedVariant: Variant | null;
  onVariantChange: (variant: Variant | null) => void;
  onOrder: () => void;
  ctaText: string;
}) {
  const variantImages = useMemo(
    () => product.variants.map((v) => v.image_url).filter(Boolean) as string[],
    [product.variants],
  );
  const selectedImage = variantImage(product, selectedVariant);
  const gallery = useMemo(() => {
    const images = [selectedImage, ...variantImages, product.image_url, ...product.gallery].filter(
      Boolean,
    ) as string[];
    return [...new Set(images)];
  }, [product.gallery, product.image_url, selectedImage, variantImages]);
  const [activeImage, setActiveImage] = useState(selectedImage);
  const price = variantPrice(product, selectedVariant ?? product.variants[0] ?? null);

  useEffect(() => {
    setActiveImage(selectedImage);
  }, [selectedImage]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid gap-8 md:grid-cols-[minmax(0,520px)_minmax(0,1fr)] md:items-start">
        <ProductDetailGallery
          title={product.title}
          images={gallery}
          activeImage={activeImage}
          onActiveImageChange={setActiveImage}
        />

        <div className="md:max-h-[calc(100vh-6rem)] md:overflow-y-auto md:pr-2">
          <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
            <h2 className="text-3xl font-bold">{product.title}</h2>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">{formatBDT(price)}</span>
              {product.regular_price > price && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatBDT(product.regular_price)}
                </span>
              )}
            </div>

            {product.variants.length > 0 && (
              <div className="mt-6 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Variation
                  {selectedVariant?.color_name || selectedVariant?.size_label ? (
                    <span className="ml-2 text-foreground">
                      {[selectedVariant?.color_name, selectedVariant?.size_label]
                        .filter(Boolean)
                        .join(" • ")}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant, index) => {
                    const image = variant.image_url ?? product.gallery[index] ?? product.image_url;
                    const active = selectedVariant?.id === variant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => {
                          onVariantChange(variant);
                          setActiveImage(image);
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-full border bg-card px-2 py-1.5 text-sm transition hover:border-primary/50",
                          active ? "border-primary ring-coral" : "border-border",
                        )}
                      >
                        <span
                          className="h-8 w-8 overflow-hidden rounded-full border border-border bg-secondary"
                          style={{
                            backgroundColor: isRealColor(variant.color_hex)
                              ? (variant.color_hex ?? undefined)
                              : undefined,
                          }}
                        >
                          {!isRealColor(variant.color_hex) && (
                            <img src={image} alt="" className="h-full w-full object-cover" />
                          )}
                        </span>
                        <span className="max-w-32 truncate">
                          {[variant.color_name, variant.size_label].filter(Boolean).join(" / ") ||
                            `Option ${index + 1}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {product.description && (
              <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}
            <button
              onClick={onOrder}
              className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-pop"
            >
              {ctaText} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
