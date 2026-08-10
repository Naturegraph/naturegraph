-- Anti-fantome C4 Phase 2 (suite) : GC des posts 'pending'.
-- Auto-reparant : un pending AVEC media (flip apres upload rate) est REPUBLIE (rien
-- perdu) ; un pending SANS media (submit interrompu avant upload, ou doublon d'un
-- retour reseau) est SUPPRIME (vrai orphelin). Seuils : reconcile 5 min (bien au-dela
-- de la duree d'une publication normale, watchdog 60 s), suppression 30 min.
-- Planifie toutes les 10 minutes via pg_cron.

CREATE OR REPLACE FUNCTION public.gc_pending_posts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $fn$
BEGIN
  -- Reconcilie : pending de +5 min AVEC au moins un media = flip rate -> on publie
  -- (le trigger notify/compteur s'applique au passage a 'published').
  UPDATE public.posts p SET status = 'published'
  WHERE p.status = 'pending' AND p.created_at < now() - interval '5 minutes'
    AND EXISTS (SELECT 1 FROM public.media m WHERE m.post_id = p.id);

  -- Supprime : pending de +30 min SANS aucun media = vrai orphelin.
  DELETE FROM public.posts p
  WHERE p.status = 'pending' AND p.created_at < now() - interval '30 minutes'
    AND NOT EXISTS (SELECT 1 FROM public.media m WHERE m.post_id = p.id);
END; $fn$;

-- Non appelable par les clients (anon/authenticated) : uniquement par le cron.
REVOKE EXECUTE ON FUNCTION public.gc_pending_posts() FROM anon, authenticated;

-- Toutes les 10 minutes.
SELECT cron.schedule('gc_pending_posts', '*/10 * * * *', $job$SELECT public.gc_pending_posts();$job$);
