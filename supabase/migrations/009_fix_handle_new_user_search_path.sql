-- Fix: SECURITY DEFINER functions must pin search_path to prevent schema injection attacks.
-- Without SET search_path, a malicious user could create a schema that shadows public,
-- causing the function to operate on the wrong tables.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'display_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
