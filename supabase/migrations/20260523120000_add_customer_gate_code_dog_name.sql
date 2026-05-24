-- Gate code and dog name on customer (pool access / pet info for technicians)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS gate_code text,
  ADD COLUMN IF NOT EXISTS dog_name text;

COMMENT ON COLUMN public.customers.gate_code IS 'Gate or access code for service address';
COMMENT ON COLUMN public.customers.dog_name IS 'Dog name on property (technician safety)';
