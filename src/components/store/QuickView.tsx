import { useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductWithVariants, Variant } from "@/lib/store-types";
import { formatBDT, variantPrice, variantImage } from "@/lib/store-types";
import { useStore, smoothScrollTo } from "@/lib/store-context";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ResponsiveImage } from "@/lib/responsive-image";

type Props = {
  product: ProductWithVariants | null;
  onClose: () => void;
};

export function QuickView({ product, onClose }: Props) {
  const { addItem } = useStore();
  const { t } = useI18n();
  const colorVariants = useMemo(
    () => (product ? product.variants.filter((v) => v.color_hex) : []),
    [product],
  );
  const sizeVariants = useMemo(
    () => (product ? product.variants.filter((v) => v.size_label) : []),
    [product],
  );

  const [color, setColor] = useState<Variant | null>(null);
  const [size, setSize] = useState<Variant | null>(null);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (!product) return;
    setColor(colorVariants[0] ?? null);
    setSize(sizeVariants[0] ?? null);
    setImgIdx(0);
  }, [product, colorVariants, sizeVariants]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (product) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKey);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [product, onClose]);

  if (!product) return null;

  // Combined variant = whichever is currently selected (size takes precedence if both exist)
  const activeVariant: Variant | null = size ?? color ?? product.variants[0] ?? null;
  const gallery = color?.image_url
    ? [color.image_url, ...product.gallery.filter((g) => g !== color.image_url)]
    : product.gallery.length
      ? product.gallery
      : [product.image_url];

  const currentImg = gallery[imgIdx] ?? variantImage(product, activeVariant);
  const price = variantPrice(product, activeVariant);

  const handleOrder = () => {
    addItem(product, activeVariant);
    onClose();
    setTimeout(() => smoothScrollTo("checkout"), 100);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl overflow-hidden rounded-t-3xl bg-card shadow-pop sm:rounded-3xl max-h-[92vh] flex flex-col"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-background/90 text-foreground shadow-soft hover:bg-background"
          aria-label={t("product.close")}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid flex-1 overflow-y-auto md:grid-cols-2">
          {/* Gallery */}
          <div className="relative bg-secondary">
            <div className="aspect-square w-full">
              <ResponsiveImage
                src={currentImg}
                alt={product.title}
                sizes="(min-width: 768px) 50vw, 100vw"
                loading="eager"
                className="h-full w-full object-cover"
              />
            </div>
            {gallery.length > 1 && (
              <>
                <button
                  onClick={() => setImgIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                  className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow-soft"
                  aria-label={t("product.prev_image")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setImgIdx((i) => (i + 1) % gallery.length)}
                  className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow-soft"
                  aria-label={t("product.next_image")}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {gallery.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === imgIdx ? "w-6 bg-primary" : "w-1.5 bg-foreground/30",
                      )}
                      aria-label={`Image ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-5 p-6 sm:p-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{product.title}</h2>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">{formatBDT(price)}</span>
                {product.regular_price > price && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatBDT(product.regular_price)}
                  </span>
                )}
              </div>
            </div>

            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {product.description
                .split(". ")
                .filter(Boolean)
                .slice(0, 4)
                .map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span>{s.replace(/\.$/, "")}.</span>
                  </li>
                ))}
            </ul>

            {colorVariants.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("product.color")}: <span className="text-foreground">{color?.color_name}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {colorVariants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setColor(v);
                        if (v.image_url) setImgIdx(0);
                      }}
                      aria-label={v.color_name ?? "color"}
                      className={cn(
                        "h-9 w-9 rounded-full border-2 transition-transform hover:scale-110",
                        color?.id === v.id ? "border-primary ring-coral" : "border-border",
                      )}
                      style={{ backgroundColor: v.color_hex ?? undefined }}
                    />
                  ))}
                </div>
              </div>
            )}

            {sizeVariants.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("product.size")}: <span className="text-foreground">{size?.size_label}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizeVariants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSize(v)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                        size?.id === v.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/40",
                      )}
                    >
                      {v.size_label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleOrder}
              className="mt-auto w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-pop transition-transform hover:scale-[1.01]"
            >
              {t("product.order_variant")} — {formatBDT(price)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
