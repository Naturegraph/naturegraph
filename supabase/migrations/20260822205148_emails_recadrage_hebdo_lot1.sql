-- 20260822205148_emails_recadrage_hebdo_lot1.sql
-- NOTIFICATIONS EMAIL : Lot 1 "cadence" (refonte strategie email, 2026-08-22).
-- =============================================================================
-- Probleme (analyse prod) : 3 digests QUOTIDIENS (social 18h, followed 19h,
-- species 10h) faisaient monter un user actif jusqu'a ~10 emails/semaine. Le
-- ticket vise ~2 emails pertinents/semaine (pertinence > frequence).
--
-- Ce lot NE TOUCHE PAS le contenu ni les preferences utilisateur : il change
-- seulement la CADENCE des crons (donc reversible, aucune perte de valeur, les
-- emails compte/securite/activation restent inchanges). Resultat : UN SEUL email
-- recurrent/semaine (E7, dimanche) + activation onboarding.
--   - E7 social digest (reactions/commentaires) : quotidien -> DIMANCHE 18h (garde)
--   - E8 digest posts suivis                     : DESACTIVE (redondant avec le
--     fil in-app "X nouveaux moments depuis ta derniere visite", livre V0.8.5)
--   - E6 jalons especes                          : DESACTIVE (evitait un 2e email
--     le dimanche ; rare, sera fondu dans le digest unifie du Lot 2)
--   - E3 rappel objectif                         : DESACTIVE (peu utile)
--   - E4 serie en danger (streak)                : DESACTIVE (nudge gamifie de
--     "rattrapage", contraire a la philo Naturegraph : decouverte, pas obligation)
--
-- Deja applique et verifie sur la PROD le 2026-08-22 (crons = objets prod, non
-- rejoues par un deploy de code). Ce fichier = trace repo + reproductibilite.
--
-- SUR : garde-fou `if job existe` -> no-op sur un environnement sans ces crons
-- (ex. dev, crons neutralises). Idempotent (re-set du meme planning).
-- Reste a faire (lots suivants) : unifier E7+E6+E3 en UN digest hebdo (code
-- edge functions), orchestrateur "pas de valeur = pas d'email" + plafond global,
-- refonte des preferences en 3 categories (Important / Resume activite / Decouvertes).
-- =============================================================================

do $$
declare
  j bigint;
begin
  -- E7 social digest -> dimanche 18h (le seul email recurrent conserve)
  select jobid into j from cron.job where jobname = 'daily_social_digest';
  if j is not null then perform cron.alter_job(j, schedule := '0 18 * * 0'); end if;

  -- E8 digest posts suivis -> desactive (redondant fil in-app)
  select jobid into j from cron.job where jobname = 'daily_followed_digest';
  if j is not null then perform cron.alter_job(j, active := false); end if;

  -- E6 jalons especes -> desactive (evite le 2e email du dimanche)
  select jobid into j from cron.job where jobname = 'daily_species_milestones';
  if j is not null then perform cron.alter_job(j, active := false); end if;

  -- E3 rappel objectif -> desactive (peu utile)
  select jobid into j from cron.job where jobname = 'weekly_goal_reminder';
  if j is not null then perform cron.alter_job(j, active := false); end if;

  -- E4 serie en danger -> desactive (nudge gamifie)
  select jobid into j from cron.job where jobname = 'weekly_streak_risk';
  if j is not null then perform cron.alter_job(j, active := false); end if;
end $$;
