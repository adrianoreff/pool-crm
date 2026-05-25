-- Pool-only CRM: hide trade categories (plumbing, HVAC, etc.) for existing businesses
UPDATE public.service_categories
SET is_active = false, updated_at = now()
WHERE slug NOT IN ('pool', 'pool-cleaning');

UPDATE public.services s
SET is_active = false, updated_at = now()
FROM public.service_categories sc
WHERE s.category_id = sc.id
  AND sc.slug NOT IN ('pool', 'pool-cleaning');

-- New businesses: only pool defaults (no trade categories)
CREATE OR REPLACE FUNCTION public.on_business_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  INSERT INTO public.booking_rules (business_id) VALUES (NEW.id);
  INSERT INTO public.notification_settings (business_id) VALUES (NEW.id);
  INSERT INTO public.widget_config (business_id) VALUES (NEW.id);

  PERFORM public.seed_pool_business_defaults(NEW.id);

  RETURN NEW;
END;
$$;
