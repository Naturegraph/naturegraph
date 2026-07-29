-- NG-045 refonte E2 : "Cette semaine sur Naturegraph", rendez-vous du dimanche
-- =============================================================================
-- APPLIQUEE sur naturegraph-prod le 2026-07-27 (version 20260727174036).
--
-- E2 (`check-missed-feed`) passe d'un envoi QUOTIDIEN (relance ciblee, ~7
-- destinataires) a un DIGEST HEBDOMADAIRE du dimanche envoye au plus grand
-- nombre (~48 mesures). Voir docs/EMAIL_E2_CETTE_SEMAINE_SPEC.md.
--
-- Etat LIVE constate avant migration (cron.job, pas seulement les fichiers) :
--   jobid 9  daily_missed_feed  '0 12 * * *'  active  -> E2
--   jobid 15 weekly_summary     '0 18 * * 0'  active  -> E1
--
-- Deux changements :
--   1. E2 : quotidien 12h UTC  ->  dimanche 16h UTC (12h Quebec EDT / 18h France).
--   2. E1 (weekly_summary) : DESACTIVE. E2 le remplace le dimanche ; garder les
--      deux enverrait deux emails hebdo concurrents au meme public.
--
-- On cible les jobs PAR NOM (stable) et non par jobid (susceptible de changer).
-- Le job E2 GARDE son nom `daily_missed_feed` bien qu'il tourne desormais le
-- dimanche : renommer un job cron touche a des references (Vault) et n'apporte
-- rien au comportement (spec section 7, renommage cosmetique repousse).
-- =============================================================================

do $$
declare
  v_e2 bigint;
  v_e1 bigint;
begin
  select jobid into v_e2 from cron.job where jobname = 'daily_missed_feed';
  select jobid into v_e1 from cron.job where jobname = 'weekly_summary';

  if v_e2 is null then
    raise exception 'Job E2 (daily_missed_feed) introuvable : verifier cron.job avant de rejouer';
  end if;

  -- E2 : nouveau planning dominical. `schedule` seul suffit, la commande ne
  -- change pas (meme fonction, comportement reecrit cote code).
  perform cron.alter_job(job_id => v_e2, schedule => '0 16 * * 0');

  -- E1 : desactive plutot que supprime, pour pouvoir le reactiver sans
  -- reconstruire la commande (qui porte le secret d'appel).
  if v_e1 is not null then
    perform cron.alter_job(job_id => v_e1, active => false);
  end if;
end $$;
