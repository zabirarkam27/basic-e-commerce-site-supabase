CREATE TABLE public.why_us_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  icon text NOT NULL DEFAULT 'Sparkles',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.why_us_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active why_us_items"
  ON public.why_us_items FOR SELECT
  USING (active = true);

CREATE POLICY "Admins full why_us_items"
  ON public.why_us_items FOR ALL
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

INSERT INTO public.why_us_items (icon, title, description, sort_order) VALUES
  ('Truck', 'Cash on Delivery', 'Pay only when you receive your order at your doorstep.', 0),
  ('ShieldCheck', 'Premium Quality', 'Lab-tested, 100% pure, sourced directly from beekeepers.', 1),
  ('RefreshCcw', 'Easy Returns', '7-day no-questions-asked return policy on every order.', 2);