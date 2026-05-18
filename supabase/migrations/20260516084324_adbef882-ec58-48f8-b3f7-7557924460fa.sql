ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS courier_provider text,
  ADD COLUMN IF NOT EXISTS courier_consignment_id text,
  ADD COLUMN IF NOT EXISTS courier_tracking_code text,
  ADD COLUMN IF NOT EXISTS courier_status text,
  ADD COLUMN IF NOT EXISTS courier_pushed_at timestamptz,
  ADD COLUMN IF NOT EXISTS courier_note text;

CREATE INDEX IF NOT EXISTS idx_orders_courier_tracking ON public.orders(courier_tracking_code);