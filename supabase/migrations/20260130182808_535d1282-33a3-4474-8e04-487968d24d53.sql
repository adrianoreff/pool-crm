-- Create storage bucket for business logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-logos',
  'business-logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- Create storage bucket for appointment photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'appointment-photos',
  'appointment-photos',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- RLS Policies for business-logos bucket

-- Anyone can view business logos (public bucket)
CREATE POLICY "Business logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-logos');

-- Users can upload logo for their own business
CREATE POLICY "Users can upload their business logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-logos' 
  AND (storage.foldername(name))[1] = (SELECT id::text FROM public.businesses WHERE id = get_user_business_id())
);

-- Users can update their business logo
CREATE POLICY "Users can update their business logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business-logos' 
  AND (storage.foldername(name))[1] = (SELECT id::text FROM public.businesses WHERE id = get_user_business_id())
);

-- Users can delete their business logo
CREATE POLICY "Users can delete their business logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-logos' 
  AND (storage.foldername(name))[1] = (SELECT id::text FROM public.businesses WHERE id = get_user_business_id())
);

-- RLS Policies for appointment-photos bucket

-- Anyone can view appointment photos (for customer portal access)
CREATE POLICY "Appointment photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'appointment-photos');

-- Users can upload photos for appointments in their business
CREATE POLICY "Users can upload appointment photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'appointment-photos' 
  AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id::text = (storage.foldername(name))[1]
    AND a.business_id = get_user_business_id()
  )
);

-- Users can update appointment photos
CREATE POLICY "Users can update appointment photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'appointment-photos' 
  AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id::text = (storage.foldername(name))[1]
    AND a.business_id = get_user_business_id()
  )
);

-- Users can delete appointment photos
CREATE POLICY "Users can delete appointment photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'appointment-photos' 
  AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id::text = (storage.foldername(name))[1]
    AND a.business_id = get_user_business_id()
  )
);