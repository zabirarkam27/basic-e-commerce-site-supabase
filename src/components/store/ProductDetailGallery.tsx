import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Images, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveImage } from "@/lib/responsive-image";

type ProductDetailGalleryProps = {
  title: string;
  images: string[];
  activeImage: string;
  onActiveImageChange: (image: string) => void;
};

type ZoomPosition = {
  x: number;
  y: number;
  percentX: number;
  percentY: number;
};

export function ProductDetailGallery({
  title,
  images,
  activeImage,
  onActiveImageChange,
}: ProductDetailGalleryProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);

  return (
    <div className="space-y-3 md:sticky md:top-20 md:self-start">
      <ImageMagnifier src={activeImage} alt={title} onOpenGallery={() => setGalleryOpen(true)} />
      <ThumbnailList
        title={title}
        images={images}
        activeImage={activeImage}
        onActiveImageChange={onActiveImageChange}
      />
      <GalleryLightbox
        title={title}
        images={images}
        activeImage={activeImage}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        onActiveImageChange={onActiveImageChange}
      />
    </div>
  );
}

function ImageMagnifier({
  src,
  alt,
  onOpenGallery,
}: {
  src: string;
  alt: string;
  onOpenGallery: () => void;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [zoomPosition, setZoomPosition] = useState<ZoomPosition | null>(null);
  const zoom = 2.5;
  const lensSize = 112;

  const updateZoom = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    const image = stage?.querySelector("img");
    if (!stage || !image) return;

    const rect = image.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);

    setZoomPosition({
      x: rect.left - stage.getBoundingClientRect().left + x,
      y: rect.top - stage.getBoundingClientRect().top + y,
      percentX: rect.width ? (x / rect.width) * 100 : 50,
      percentY: rect.height ? (y / rect.height) * 100 : 50,
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft">
      <div
        ref={stageRef}
        className="relative flex min-h-[320px] items-center justify-center overflow-visible rounded-2xl bg-secondary/40 p-3 sm:min-h-[460px] md:cursor-crosshair"
        onMouseEnter={(event) => updateZoom(event.clientX, event.clientY)}
        onMouseMove={(event) => updateZoom(event.clientX, event.clientY)}
        onMouseLeave={() => setZoomPosition(null)}
      >
        <ResponsiveImage
          src={src}
          alt={alt}
          sizes="(min-width: 768px) 480px, 100vw"
          loading="eager"
          fetchPriority="high"
          className="max-h-[520px] w-full select-none object-contain transition-opacity duration-150"
          draggable={false}
        />

        <div
          className="pointer-events-none absolute left-3 top-3 hidden h-9 w-9 place-items-center rounded-full bg-background/90 text-muted-foreground shadow-soft md:grid"
          aria-hidden="true"
        >
          <Search className="h-3.5 w-3.5" />
        </div>

        <button
          type="button"
          onClick={onOpenGallery}
          className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-foreground/90 px-4 py-2 text-xs font-semibold text-background shadow-pop transition hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Open gallery images"
        >
          <Images className="h-4 w-4" />
          Gallery
        </button>

        {zoomPosition && (
          <>
            <div
              className="pointer-events-none absolute hidden rounded-xl border border-primary/70 bg-primary/10 shadow-pop ring-1 ring-background/70 md:block"
              style={{
                width: lensSize,
                height: lensSize,
                left: zoomPosition.x - lensSize / 2,
                top: zoomPosition.y - lensSize / 2,
              }}
            />
            <div className="pointer-events-none absolute left-[calc(100%+1rem)] top-0 z-30 hidden h-full min-h-[420px] w-[min(460px,42vw)] overflow-hidden rounded-2xl border border-border bg-card shadow-pop md:block">
              <ResponsiveImage
                src={src}
                alt=""
                aria-hidden="true"
                sizes="900px"
                loading="eager"
                className="h-full w-full object-contain"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: `${zoomPosition.percentX}% ${zoomPosition.percentY}%`,
                }}
                draggable={false}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GalleryLightbox({
  title,
  images,
  activeImage,
  open,
  onOpenChange,
  onActiveImageChange,
}: ProductDetailGalleryProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const activeIndex = Math.max(
    0,
    images.findIndex((image) => image === activeImage),
  );

  useEffect(() => {
    if (!open || images.length === 0) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
      if (event.key === "ArrowLeft") {
        onActiveImageChange(images[(activeIndex - 1 + images.length) % images.length]);
      }
      if (event.key === "ArrowRight") {
        onActiveImageChange(images[(activeIndex + 1) % images.length]);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, images, onActiveImageChange, onOpenChange, open]);

  if (!open) return null;

  const goTo = (direction: -1 | 1) => {
    if (images.length === 0) return;
    onActiveImageChange(images[(activeIndex + direction + images.length) % images.length]);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} gallery`}
      className="fixed inset-0 z-50 flex flex-col bg-foreground/90 p-3 backdrop-blur-sm sm:p-5"
      onClick={() => onOpenChange(false)}
    >
      <div className="mb-3 flex items-center justify-between gap-3 text-background">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{title}</div>
          <div className="text-xs text-background/70">
            {activeIndex + 1} / {images.length}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background/15 text-background transition hover:bg-background/25 focus:outline-none focus:ring-2 focus:ring-background/40"
          aria-label="Close gallery"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => goTo(-1)}
            className="absolute left-0 z-10 grid h-11 w-11 place-items-center rounded-full bg-background/90 text-foreground shadow-pop transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 sm:left-3"
            aria-label="Previous gallery image"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        <ResponsiveImage
          src={activeImage}
          alt={title}
          sizes="100vw"
          loading="eager"
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />

        {images.length > 1 && (
          <button
            type="button"
            onClick={() => goTo(1)}
            className="absolute right-0 z-10 grid h-11 w-11 place-items-center rounded-full bg-background/90 text-foreground shadow-pop transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 sm:right-3"
            aria-label="Next gallery image"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {images.length > 1 && (
        <div
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
          role="listbox"
          aria-label={`${title} full gallery thumbnails`}
          onClick={(event) => event.stopPropagation()}
        >
          {images.map((image, index) => {
            const active = activeImage === image;
            return (
              <button
                key={image}
                type="button"
                onClick={() => onActiveImageChange(image)}
                className={cn(
                  "grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border bg-background/10 p-1 transition hover:border-background/70 focus:outline-none focus:ring-2 focus:ring-background/40",
                  active ? "border-background" : "border-background/20",
                )}
                role="option"
                aria-selected={active}
                aria-label={`View gallery image ${index + 1}`}
              >
                <ResponsiveImage
                  src={image}
                  alt=""
                  sizes="64px"
                  loading={index < 6 ? "eager" : "lazy"}
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ThumbnailList({
  title,
  images,
  activeImage,
  onActiveImageChange,
}: ProductDetailGalleryProps) {
  if (images.length <= 1) return null;

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      role="listbox"
      aria-label={`${title} gallery images`}
    >
      {images.map((image, index) => {
        const active = activeImage === image;
        return (
          <button
            key={image}
            type="button"
            onClick={() => onActiveImageChange(image)}
            onMouseEnter={() => onActiveImageChange(image)}
            onFocus={() => onActiveImageChange(image)}
            className={cn(
              "grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border bg-card p-1 transition hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40",
              active ? "border-primary ring-coral" : "border-border",
            )}
            role="option"
            aria-selected={active}
            aria-label={`View image ${index + 1}`}
          >
            <ResponsiveImage
              src={image}
              alt=""
              sizes="80px"
              loading={index < 4 ? "eager" : "lazy"}
              className="h-full w-full object-contain"
              draggable={false}
            />
          </button>
        );
      })}
    </div>
  );
}
