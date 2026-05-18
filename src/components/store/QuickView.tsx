import { useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductWithVariants, Variant } from "@/lib/store-types";
import { formatBDT, variantPrice, variantImage } from "@/lib/store-types";
import { useStore, smoothScrollTo } from "@/lib/store-context";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ResponsiveImage } from "@/lib/responsive-image";
import { trackAddToCart } from "@/lib/tracking-events";

type Props = {
  product: ProductWithVariants | null;
  onClose: () => void;
};

function isRealColor(hex: string | null | undefined) {
  const h = (hex ?? "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/i.test(h);
}

export function QuickView({ product, onClose }: Props) {
  const { addItem } = useStore();
  const { t } = useI18n();
  const colorVariants = useMemo(
    () =>
      product ? product.variants.filter((v) => v.color_hex || v.color_name || v.image_url) : [],
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
  const selectedImage = color?.image_url ?? variantImage(product, activeVariant);
  const variantImages = product.variants.map((v) => v.image_url).filter(Boolean) as string[];
  const gallery = [selectedImage, ...variantImages, product.image_url, ...product.gallery].filter(
    Boolean,
  ) as string[];
  const uniqueGallery = [...new Set(gallery)];

  const currentImg = uniqueGallery[imgIdx] ?? selectedImage;
  const price = variantPrice(product, activeVariant);

  const handleOrder = () => {
    addItem(product, activeVariant);
    trackAddToCart(product, activeVariant);
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
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-card shadow-pop sm:rounded-3xl"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-background/90 text-foreground shadow-soft hover:bg-background"
          aria-label={t("product.close")}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid min-h-0 flex-1 md:grid-cols-2">
          {/* Gallery */}
          <div className="relative bg-card md:sticky md:top-0 md:self-start">
            <div className="flex aspect-square w-full items-center justify-center p-3 md:h-[92vh] md:max-h-[620px] md:min-h-[520px]">
              <ResponsiveImage
                src={currentImg}
                alt={product.title}
                sizes="(min-width: 768px) 50vw, 100vw"
                loading="eager"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            {uniqueGallery.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setImgIdx((i) => (i - 1 + uniqueGallery.length) % uniqueGallery.length)
                  }
                  className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-background/95 text-foreground shadow-pop transition hover:scale-105 hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                  aria-label={t("product.prev_image")}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setImgIdx((i) => (i + 1) % uniqueGallery.length)}
                  className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-background/95 text-foreground shadow-pop transition hover:scale-105 hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                  aria-label={t("product.next_image")}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-background/90 px-4 py-2 shadow-soft">
                  {uniqueGallery.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={cn(
                        "h-2 rounded-full transition-all",
                        i === imgIdx
                          ? "w-7 bg-primary"
                          : "w-2 bg-foreground/30 hover:bg-primary/50",
                      )}
                      aria-label={`Image ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Details */}
          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-6 sm:p-8 md:max-h-[92vh]">
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
                        "h-10 w-10 overflow-hidden rounded-full border-2 bg-secondary transition-transform hover:scale-110",
                        color?.id === v.id ? "border-primary ring-coral" : "border-border",
                      )}
                      style={{
                        backgroundColor: isRealColor(v.color_hex)
                          ? (v.color_hex ?? undefined)
                          : undefined,
                      }}
                    >
                      {!isRealColor(v.color_hex) && (
                        <img
                          src={
                            v.image_url ??
                            product.gallery[colorVariants.indexOf(v)] ??
                            product.image_url
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </button>
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
