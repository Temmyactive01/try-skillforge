-- Stop trusting client-supplied role/company metadata during signup.
-- Profiles are now created explicitly by trusted server functions (service role).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Intentionally does nothing: privilege-bearing profile fields
  -- (company_id, role) must never come from raw_user_meta_data.
  RETURN NEW;
END;
$$;