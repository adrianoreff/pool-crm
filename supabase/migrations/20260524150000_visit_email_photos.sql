-- Pool visit email draft + photo roles for service report
ALTER TABLE public.visit_reports
  ADD COLUMN IF NOT EXISTS email_message TEXT;

ALTER TABLE public.appointment_photos
  ADD COLUMN IF NOT EXISTS photo_role TEXT DEFAULT 'general';

COMMENT ON COLUMN public.appointment_photos.photo_role IS 'top_email | extra_email | general';
