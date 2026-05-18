ALTER TABLE public.site_sessions
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS mobile text;

CREATE INDEX IF NOT EXISTS idx_site_sessions_mobile
  ON public.site_sessions (mobile)
  WHERE mobile IS NOT NULL;
