-- Add mapbox_public_token column to businesses table
ALTER TABLE public.businesses
ADD COLUMN mapbox_public_token text;