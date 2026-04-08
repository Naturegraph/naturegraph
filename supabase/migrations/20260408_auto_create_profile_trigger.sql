-- Migration : trigger auto-création profil après inscription
-- Crée un profil minimal lorsqu'un nouvel utilisateur s'inscrit via auth.signInWithOtp.
--
-- NOTE : Ce trigger crée un profil avec un username temporaire (user_ + 8 chars du uuid).
-- L'onboarding côté client remplacera ce username via upsertProfile().
-- Sans ce trigger, l'onboarding doit obligatoirement passer par upsertProfile (ce qui est le cas).
-- Ce trigger est une sécurité supplémentaire pour les flux OAuth futurs.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Génère un username temporaire unique basé sur l'UUID
  -- L'onboarding le remplacera par le vrai username choisi par l'utilisateur
  INSERT INTO public.profiles (
    id,
    username,
    email,
    first_name,
    last_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    'user_' || substring(NEW.id::text, 1, 8),
    COALESCE(NEW.email, NEW.id || '@placeholder.local'),
    '',
    '',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;  -- Idempotent : ne rien faire si le profil existe déjà

  RETURN NEW;
END;
$$;

-- Attache le trigger à auth.users (INSERT uniquement)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
