CREATE TABLE public.checkout_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  customer_name text,
  mobile text,
  address text,
  area text,
  delivery_charge numeric(10,2) NOT NULL DEFAULT 0,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  landing_page_slug text,
  cart_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'contacted', 'converted', 'ignored')),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkout_leads_last_seen ON public.checkout_leads(last_seen_at DESC);
CREATE INDEX idx_checkout_leads_status ON public.checkout_leads(status);
CREATE INDEX idx_checkout_leads_mobile ON public.checkout_leads(mobile);

ALTER TABLE public.checkout_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read checkout leads"
  ON public.checkout_leads FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','sales','viewer']::app_role[]));

CREATE POLICY "Staff update checkout leads"
  ON public.checkout_leads FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','sales']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','sales']::app_role[]));

CREATE POLICY "Admins delete checkout leads"
  ON public.checkout_leads FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

ALTER PUBLICATION supabase_realtime ADD TABLE public.checkout_leads;
