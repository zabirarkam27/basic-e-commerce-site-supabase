import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck, Truck, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type ProductWithVariants, type Variant, formatBDT, variantPrice } from "@/lib/store-types";
import { useSiteSettings } from "@/lib/site-settings";

export type PreviewData = {
  slug: string;
  title: string;
  hero_image: string;
  headline: string;
  subheadline: string;
  product_id: string | null;
  cta_text: string;
  cta_link: string;
};

/**
 * Mirrors the public `/p/$slug` layout so admins see what visitors will see
 * while editing. Loads the linked product live whenever product_id changes.
 */
export function LandingPagePreview({ data }: { data: PreviewData }) {
  const { settings } = useSiteSettings();
  const [product, setProduct] = useState<ProductWithVariants | null>(null);

  useEffect(() => {
    let cancelled = false;
    const productId = data.product_id;
    if (!productId) {
      setProduct(null);
      return;
    }
    (async () => {
      const { data: p } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();
      if (!p || cancelled) {
        if (!cancelled) setProduct(null);
        return;
      }
      const { data: variants } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", p.id)
        .order("sort_order");
      if (cancelled) return;
      const pd = p as Record<string, unknown>;
      setProduct({
        ...(pd as unknown as ProductWithVariants),
        description: (pd.description as string | null) ?? "",
        gallery: Array.isArray(pd.gallery) ? (pd.gallery as string[]) : [],
        variants: (variants ?? []) as Variant[],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [data.product_id]);

  const price = product ? variantPrice(product, product.variants[0] ?? null) : null;
  const brand = settings.brand_name || "Your store";

  return (
    <div className="min-h-full bg-background">
      {/* Mock header (mirrors store header at a glance) */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt={brand} className="h-7 w-7 rounded-md object-cover" />
          ) : (
            <div className="h-7 w-7 rounded-md bg-primary/15" />
          )}
          <span className="text-sm font-semibold">{brand}</span>
        </div>
        <span className="text-xs text-muted-foreground">Preview</span>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {data.hero_image ? (
          <div className="absolute inset-0">
            <img
              src={data.hero_image}
              alt={data.headline || data.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-background" />
        )}

        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 py-16 text-center sm:py-24">
          <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
            {data.title || "Untitled page"}
          </span>
          <h1 className="mt-4 text-balance text-3xl font-bold leading-tight sm:text-5xl">
            {data.headline || data.title || "Your headline appears here"}
          </h1>
          {data.subheadline && (
            <p className="mt-4 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
              {data.subheadline}
            </p>
          )}

          {product && price !== null && (
            <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-border bg-card/80 px-4 py-2.5 shadow-soft backdrop-blur">
              <img
                src={product.image_url}
                alt={product.title}
                className="h-10 w-10 rounded-lg object-cover"
              />
              <div className="text-left">
                <div className="text-xs font-semibold">{product.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  <span className="text-sm font-bold text-foreground">{formatBDT(price)}</span>
                  {product.regular_price > price && (
                    <span className="ml-2 line-through">{formatBDT(product.regular_price)}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            className="pointer-events-none mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-pop"
          >
            {data.cta_text || "Order Now"} <ArrowRight className="h-4 w-4" />
          </button>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> 100% authentic
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-primary" /> Cash on delivery
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" /> Quality guaranteed
            </span>
          </div>
        </div>
      </section>

      {/* Product detail */}
      {product && (
        <section className="mx-auto max-w-5xl px-4 py-12">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <img
                src={product.image_url}
                alt={product.title}
                className="aspect-square w-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="text-2xl font-bold">{product.title}</h2>
              {product.description && (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              )}
              <button
                type="button"
                className="pointer-events-none mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-pop"
              >
                {data.cta_text || "Order Now"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {!product && !data.product_id && (
        <div className="mx-auto max-w-5xl px-4 py-10 text-center text-xs text-muted-foreground">
          No featured product selected — the CTA will{" "}
          {data.cta_link ? "open your custom link" : "go to the homepage"}.
        </div>
      )}

      <footer className="border-t border-border bg-card py-6 text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} {brand}. All rights reserved.
      </footer>
    </div>
  );
}
