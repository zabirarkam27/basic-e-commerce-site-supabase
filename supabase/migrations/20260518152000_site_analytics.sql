CREATE TABLE IF NOT EXISTS public.site_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  current_path text,
  landing_page_slug text,
  referrer text,
  user_agent text,
  checkout_started_at timestamptz,
  order_placed_at timestamptz,
  order_duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_sessions_last_seen
  ON public.site_sessions (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_sessions_checkout_started
  ON public.site_sessions (checkout_started_at DESC)
  WHERE checkout_started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_site_sessions_order_placed
  ON public.site_sessions (order_placed_at DESC)
  WHERE order_placed_at IS NOT NULL;

ALTER TABLE public.site_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read site sessions" ON public.site_sessions;
DROP POLICY IF EXISTS "Staff delete site sessions" ON public.site_sessions;

CREATE POLICY "Staff read site sessions" ON public.site_sessions FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','sales','viewer']::public.app_role[]));

CREATE POLICY "Staff delete site sessions" ON public.site_sessions FOR DELETE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::public.app_role[]));

ALTER PUBLICATION supabase_realtime ADD TABLE public.site_sessions;
