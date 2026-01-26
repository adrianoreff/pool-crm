-- Create trigger to handle new user signup
-- This creates the user record after they complete business onboarding

CREATE OR REPLACE FUNCTION public.handle_new_user_with_business()
RETURNS TRIGGER AS $$
DECLARE
  new_business_id UUID;
  user_email TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
BEGIN
  -- Get user metadata
  user_email := NEW.email;
  user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(user_email, '@', 1));
  user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  
  -- Check if user is accepting an invitation
  IF NEW.raw_user_meta_data->>'invitation_token' IS NOT NULL THEN
    -- Find the invitation and get business_id
    SELECT ti.business_id INTO new_business_id
    FROM public.team_invitations ti
    WHERE ti.token = NEW.raw_user_meta_data->>'invitation_token'
    AND ti.email = user_email
    AND ti.accepted_at IS NULL
    AND ti.expires_at > NOW();
    
    IF new_business_id IS NOT NULL THEN
      -- Create user with invitation's business and role
      INSERT INTO public.users (id, business_id, email, first_name, last_name, role)
      SELECT 
        NEW.id,
        ti.business_id,
        user_email,
        user_first_name,
        user_last_name,
        ti.role
      FROM public.team_invitations ti
      WHERE ti.token = NEW.raw_user_meta_data->>'invitation_token';
      
      -- Mark invitation as accepted
      UPDATE public.team_invitations
      SET accepted_at = NOW()
      WHERE token = NEW.raw_user_meta_data->>'invitation_token';
      
      RETURN NEW;
    END IF;
  END IF;
  
  -- No invitation - user needs to complete onboarding to create business
  -- We'll handle this in the application layer
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_with_business();

-- Function to create business and user together (called from app)
CREATE OR REPLACE FUNCTION public.create_business_with_owner(
  p_business_name TEXT,
  p_user_first_name TEXT DEFAULT NULL,
  p_user_last_name TEXT DEFAULT NULL,
  p_user_phone TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_business_id UUID;
  current_user_id UUID;
  user_email TEXT;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user already has a business
  IF EXISTS (SELECT 1 FROM public.users WHERE id = current_user_id) THEN
    RAISE EXCEPTION 'User already belongs to a business';
  END IF;
  
  -- Get user email from auth
  SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;
  
  -- Create the business
  INSERT INTO public.businesses (name, email)
  VALUES (p_business_name, user_email)
  RETURNING id INTO new_business_id;
  
  -- Create the user as owner
  INSERT INTO public.users (id, business_id, email, first_name, last_name, phone, role)
  VALUES (
    current_user_id,
    new_business_id,
    user_email,
    COALESCE(p_user_first_name, split_part(user_email, '@', 1)),
    p_user_last_name,
    p_user_phone,
    'owner'
  );
  
  RETURN new_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.create_business_with_owner TO authenticated;