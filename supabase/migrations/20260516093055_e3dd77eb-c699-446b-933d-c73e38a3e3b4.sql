
-- has_any_role helper
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO authenticated;

-- ORDERS policies — expand for sales/viewer/super_admin
DROP POLICY IF EXISTS "Admins read orders" ON public.orders;
DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins delete orders" ON public.orders;

CREATE POLICY "Staff read orders" ON public.orders FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','sales','viewer']::app_role[]));

CREATE POLICY "Staff update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','sales']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','sales']::app_role[]));

CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

-- PRODUCTS / LANDING / SETTINGS / ADMIN_SECRETS / VARIANTS — admin + super_admin write, viewer/sales read via existing public policies
DROP POLICY IF EXISTS "Admins full products" ON public.products;
CREATE POLICY "Admins full products" ON public.products FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

DROP POLICY IF EXISTS "Admins full variants" ON public.product_variants;
CREATE POLICY "Admins full variants" ON public.product_variants FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

DROP POLICY IF EXISTS "Admins full landing pages" ON public.landing_pages;
CREATE POLICY "Admins full landing pages" ON public.landing_pages FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

DROP POLICY IF EXISTS "Admins write settings" ON public.settings;
CREATE POLICY "Admins write settings" ON public.settings FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

DROP POLICY IF EXISTS "Admins read admin_secrets" ON public.admin_secrets;
DROP POLICY IF EXISTS "Admins write admin_secrets" ON public.admin_secrets;
CREATE POLICY "Admins manage admin_secrets" ON public.admin_secrets FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

-- USER_ROLES — super_admin manages
DROP POLICY IF EXISTS "Admins read roles" ON public.user_roles;
CREATE POLICY "Staff read own role" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Backfill: existing 'admin' users get 'super_admin' too (first admin becomes super admin)
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT user_id, 'super_admin'::app_role
FROM public.user_roles
WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;
