-- 20260611_ng039_identification_help.sql
-- =============================================================================
-- NG-039 : Systeme d'aide a l'identification (V1.3.0) - SOCLE DB
--
-- Objectif : permettre a un auteur de demander l'aide de la communaute pour
-- identifier une espece, et a la communaute de proposer + voter.
--
-- Existant reutilise (PAS de doublon) :
--   - public.identification_proposals (id, post_id, author_id, species_name,
--     scientific_name, taxref_id, confidence, notes, votes_up, votes_down...)
--     + ses RLS (select via can_see_post, insert/update/delete par l'auteur).
--   - public.posts.identification_status ('pending'|'identified'|'disputed')
--   - public.posts.taxonomic_group (categories d'especes)
--
-- Ce que cette migration AJOUTE :
--   1. posts.identification_help (bool) + posts.identification_confidence (1..4)
--   2. identification_proposals.is_undetermined (proposition "impossible a
--      identifier", votable comme une espece)
--   3. public.identification_votes : 1 vote par utilisateur et par proposition
--      (UNIQUE) + trigger qui maintient identification_proposals.votes_up
--   4. RLS sur identification_votes (lecture publique, ecriture/suppression de
--      son propre vote uniquement)
--   5. Recreation de la vue posts_public pour exposer les 2 nouveaux champs post
--      (le feed lit posts_public ; sans ca le front ne verrait jamais l'aide).
--
-- Tout est additif + idempotent. Aucune donnee existante n'est modifiee.
-- NG-039C (validation par l'auteur -> statut "Identifiee") = migration future.
-- =============================================================================

-- ─── 1. Champs sur posts ─────────────────────────────────────────────────────
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS identification_help BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS identification_confidence SMALLINT
    CHECK (identification_confidence BETWEEN 1 AND 4);

COMMENT ON COLUMN public.posts.identification_help IS
  'NG-039 : true si l''auteur sollicite l''aide de la communaute (Cas 1 espece inconnue, ou Cas 2 doute).';
COMMENT ON COLUMN public.posts.identification_confidence IS
  'NG-039 : niveau de confiance auteur 1=pas sur .. 4=certain (Cas 2). NULL si non renseigne / espece inconnue.';

-- Index partiel : retrouver vite les demandes d'aide actives (filtre NG-039B).
CREATE INDEX IF NOT EXISTS idx_posts_identification_help
  ON public.posts(identification_help)
  WHERE identification_help = true;

-- ─── 2. Proposition "Impossible a identifier" (votable) ──────────────────────
ALTER TABLE public.identification_proposals
  ADD COLUMN IF NOT EXISTS is_undetermined BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.identification_proposals.is_undetermined IS
  'NG-039 : proposition speciale "Impossible a identifier avec les elements disponibles". Votable comme une espece.';

-- ─── 3. Table des votes (1 vote / user / proposition) ────────────────────────
CREATE TABLE IF NOT EXISTS public.identification_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.identification_proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (proposal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_identification_votes_proposal
  ON public.identification_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_identification_votes_user
  ON public.identification_votes(user_id);

COMMENT ON TABLE public.identification_votes IS
  'NG-039 : votes de la communaute sur les propositions d''identification. Contrainte UNIQUE(proposal_id, user_id) = 1 vote par user et par proposition (retirable/revotable).';

-- ─── 4. Trigger : maintenir identification_proposals.votes_up ────────────────
-- Le compteur denormalise votes_up reste la source d'affichage + de tri ; il
-- est recalcule par trigger (pas cote client), coherent avec le reste du schema.
CREATE OR REPLACE FUNCTION public.sync_proposal_votes_up()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.identification_proposals
      SET votes_up = votes_up + 1
      WHERE id = NEW.proposal_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.identification_proposals
      SET votes_up = GREATEST(votes_up - 1, 0)
      WHERE id = OLD.proposal_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_proposal_votes_up ON public.identification_votes;
CREATE TRIGGER trg_sync_proposal_votes_up
  AFTER INSERT OR DELETE ON public.identification_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_proposal_votes_up();

-- ─── 5. RLS sur identification_votes ─────────────────────────────────────────
ALTER TABLE public.identification_votes ENABLE ROW LEVEL SECURITY;

-- Lecture publique : afficher le nombre de votes + savoir si l'user a deja vote.
DROP POLICY IF EXISTS "identification_votes_select_all" ON public.identification_votes;
CREATE POLICY "identification_votes_select_all"
  ON public.identification_votes FOR SELECT
  USING (true);

-- Inserer uniquement SON propre vote (anti-usurpation).
DROP POLICY IF EXISTS "identification_votes_insert_own" ON public.identification_votes;
CREATE POLICY "identification_votes_insert_own"
  ON public.identification_votes FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Retirer uniquement SON propre vote.
DROP POLICY IF EXISTS "identification_votes_delete_own" ON public.identification_votes;
CREATE POLICY "identification_votes_delete_own"
  ON public.identification_votes FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ─── 6. Recreation de posts_public (ajout des 2 champs identification) ───────
-- IMPORTANT : security_invoker = true OBLIGATOIRE (sinon contournement des RLS
-- de posts -> fuite de posts prives, cf. incident 2026-06-06). CREATE OR REPLACE
-- ne preserve PAS cette option, on la respecifie.
CREATE OR REPLACE VIEW public.posts_public WITH (security_invoker = true) AS
SELECT
  id,
  short_id,
  user_id,
  type,
  status,
  visibility,
  title,
  description,
  tags,
  encounter_date,
  time_of_day,
  weather,
  habitat,
  multiple_observations,
  individuals_count,
  species_identified,
  species_name,
  scientific_name,
  taxonomic_group,
  identification_status,
  -- NG-039 : aide a l'identification demandee + niveau de confiance auteur.
  identification_help,
  identification_confidence,
  taxref_id,
  taxref_rank,
  taxref_source,
  taxref_license,
  taxref_updated_at,
  phenomenon,
  display_format,
  likes_count,
  comments_count,
  shares_count,
  views_count,
  created_at,
  updated_at,
  published_at,
  location_hidden,
  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid()) THEN NULL::character varying
    ELSE city
  END AS city,
  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid()) THEN NULL::character varying
    ELSE region
  END AS region,
  (country)::character varying AS country,
  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid()) THEN NULL::character varying
    ELSE location_name
  END AS location_name,
  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid()) THEN NULL::numeric
    ELSE latitude
  END AS latitude,
  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid()) THEN NULL::numeric
    ELSE longitude
  END AS longitude,
  CASE
    WHEN location_hidden AND (auth.uid() IS NULL OR user_id <> auth.uid()) THEN NULL::geography
    ELSE location_point
  END AS location_point,
  notebook_id,
  (SELECT n.species_count FROM public.notebooks n WHERE n.id = posts.notebook_id) AS notebook_species_count
FROM posts;
