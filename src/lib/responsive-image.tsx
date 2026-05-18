import type { ImgHTMLAttributes } from "react";

const VARIANT_WIDTHS = [480, 960, 1920] as const;
const LARGEST_SUFFIX_RE = /-(\d+)\.webp(\?.*)?$/i;

/**
 * If `url` was produced by the upload pipeline (ends with `-{width}.webp`),
 * derive a full srcset covering all known variants. Otherwise return null.
 */
export function getSrcSet(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(LARGEST_SUFFIX_RE);
  if (!match) return null;
  const currentWidth = Number(match[1]);
  if (!VARIANT_WIDTHS.includes(currentWidth as (typeof VARIANT_WIDTHS)[number])) return null;
  return VARIANT_WIDTHS.map((w) => `${url.replace(LARGEST_SUFFIX_RE, `-${w}.webp$2`)} ${w}w`).join(
    ", ",
  );
}

type ResponsiveImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "srcSet"> & {
  src: string | null | undefined;
  alt: string;
  /** Hint to the browser about how wide the image will render. Defaults to 100vw. */
  sizes?: string;
};

/**
 * Drop-in <img> replacement that adds a responsive `srcset` when the URL
 * came from the variant pipeline. Falls back to a plain <img> otherwise.
 */
export function ResponsiveImage({
  src,
  alt,
  sizes = "100vw",
  loading = "lazy",
  decoding = "async",
  ...rest
}: ResponsiveImageProps) {
  const srcSet = getSrcSet(src ?? undefined);
  return (
    <img
      {...rest}
      src={src ?? undefined}
      alt={alt}
      sizes={srcSet ? sizes : undefined}
      srcSet={srcSet ?? undefined}
      loading={loading}
      decoding={decoding}
    />
  );
}
