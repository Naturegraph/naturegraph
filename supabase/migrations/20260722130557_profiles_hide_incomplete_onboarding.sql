-- Ne pas exposer publiquement un profil dont l'onboarding n'est pas fini
-- =============================================================================
-- Constat 2026-07-22 (Nicolas) : des profils crees automatiquement, dont la
-- personne n'avait jamais choisi de pseudo, etaient consultables publiquement
-- sans connexion (page profil complete, bouton s'abonner).
--
-- 71 profils fantomes issus des invitations ont ete supprimes. Mais le probleme
-- se reproduirait a CHAQUE nouvelle inscription : `profiles.is_public` vaut
-- `true` par defaut et le profil est cree AVANT l'onboarding. Il existe donc une
-- fenetre pendant laquelle un compte a moitie cree est deja public.
--
-- Correctif durable : la lecture publique exige desormais un pseudo CHOISI.
-- Un pseudo auto-genere (`user_xxxxxxxx`) signifie onboarding non termine.
--
-- S'auto-corrige : des que la personne choisit son pseudo, elle redevient
-- visible. Aucun drapeau a basculer, aucune migration de donnees.
--
-- Ce qui n'est PAS casse (verifie en role anon apres application) :
--   - chacun voit toujours son propre profil (branche auth.uid() = id), donc
--     l'onboarding fonctionne normalement ;
--   - les admins gardent leur policy dediee `admins_read_all_profiles` ;
--   - les envois d'emails passent en service_role, qui ignore la RLS ;
--   - publications et medias visibles par un visiteur : inchanges (95 et 251).
-- =============================================================================

DROP POLICY IF EXISTS "Profiles read access" ON public.profiles;

CREATE POLICY "Profiles read access" ON public.profiles
FOR SELECT
USING (
  (
    is_public = true
    AND is_internal = false
    -- Onboarding termine : pseudo choisi, pas le pseudo technique de creation.
    AND username NOT LIKE 'user\_%'
  )
  OR (( SELECT auth.uid() ) = id)
);
