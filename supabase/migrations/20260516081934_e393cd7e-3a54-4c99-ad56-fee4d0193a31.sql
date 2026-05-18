ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS ga_measurement_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_pixel_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS google_ads_id text NOT NULL DEFAULT '';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS landing_page_slug text;

CREATE INDEX IF NOT EXISTS idx_orders_landing_page_slug
  ON public.orders (landing_page_slug)
  WHERE landing_page_slug IS NOT NULL;