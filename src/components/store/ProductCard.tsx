import { Plus, Star } from "lucide-react";
import type { ProductWithVariants } from "@/lib/store-types";
import { formatBDT } from "@/lib/store-types";
import { useStore, smoothScrollTo } from "@/lib/store-context";
import { useSiteSettings } from "@/lib/site-settings";
import { useI18n } from "@/lib/i18n";
import { ResponsiveImage } from "@/lib/responsive-image";

type Props = {
  product: ProductWithVariants;
  onQuickView: (p: ProductWithVariants) => void;
  /** First card on the page is LCP — fetch eagerly without blocking discovery of others. */
  priority?: boolean;
};

export function ProductCard({ product, onQuickView, priority = false }: Props) {
  const { addItem } = useStore();
  const { settings } = useSiteSettings();
  const { t } = useI18n();

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product);
  };

  const handleOrder = () => {
    addItem(product);
    smoothScrollTo("checkout");
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-pop">
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <button
          type="button"
          onClick={() => onQuickView(product)}
          className="block h-full w-full"
          aria-label={`${t("product.quick_view")} — ${product.title}`}
        >
          <ResponsiveImage
            src={product.image_url}
            alt={product.title}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
          />
        </button>

        <button
          type="button"
          onClick={handleAdd}
          aria-label={t("product.add_to_cart")}
          className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-pop transition-transform hover:scale-110 active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>

        {product.regular_price > product.sale_price && (
          <span className="absolute left-3 top-3 rounded-full bg-foreground/90 px-2.5 py-1 text-xs font-semibold text-background">
            -
            {Math.round(
              ((product.regular_price - product.sale_price) / product.regular_price) * 100,
            )}
            %
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <button
          type="button"
          onClick={() => onQuickView(product)}
          className="text-left text-base font-semibold leading-tight tracking-tight hover:text-primary"
        >
          {product.title}
        </button>

        {settings.show_product_ratings && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={
                  i < Math.round(product.rating)
                    ? "h-3.5 w-3.5 fill-warning text-warning"
                    : "h-3.5 w-3.5 text-muted"
                }
              />
            ))}
            <span className="ml-1">{product.rating.toFixed(1)}</span>
          </div>
        )}

        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-foreground">{formatBDT(product.sale_price)}</span>
          {product.regular_price > product.sale_price && (
            <span className="text-sm text-muted-foreground line-through">
              {formatBDT(product.regular_price)}
            </span>
          )}
        </div>

        <button
          onClick={handleOrder}
          className="mt-auto w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background transition-colors hover:bg-primary"
        >
          {t("product.order_now")}
        </button>
      </div>
    </article>
  );
}
