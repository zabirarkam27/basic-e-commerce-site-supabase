CREATE TABLE public.landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  hero_image text NOT NULL DEFAULT '',
  headline text NOT NULL DEFAULT '',
  subheadline text NOT NULL DEFAULT '',
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  cta_text text NOT NULL DEFAULT 'Order Now',
  cta_link text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_landing_pages_slug ON public.landing_pages(slug);

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active landing pages"
  ON public.landing_pages FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Admins full landing pages"
  ON public.landing_pages FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- slug format check
ALTER TABLE public.landing_pages
  ADD CONSTRAINT landing_pages_slug_format
  CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND length(slug) BETWEEN 1 AND 100);