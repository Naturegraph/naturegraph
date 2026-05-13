-- Migration : DROP 4 indexes dupliques (T-066 / BATCH 14)
-- =====================================================================
--
-- Contexte : la migration 20260503_backfill_saved_hidden_posts.sql a cree
-- de nouveaux indexes avec un nommage court alors que les migrations
-- originales (20260501_saved_posts.sql + 20260501_hidden_posts.sql) en
-- avaient deja cree avec suffixe `_id` ou `_at`. On garde les versions
-- les plus descriptives (avec suffixe) qui suivent la convention
-- "colonne_role".
--
-- Impact :
--   - Storage : -4 indexes redondants
--   - Maintenance : moins d'overhead INSERT/UPDATE sur ces tables
--   - Plans de query : Postgres utilisera l'index restant (identique)
--
-- Reversibilite : si necessaire, recreer via les migrations originales
-- (20260501_*) ou via :
--   CREATE INDEX idx_follows_following ON follows(following_id);
--   etc.
--
-- Refs : T-066 (MASTER_TODO) + advisor `duplicate_index` x4

DROP INDEX IF EXISTS public.idx_follows_following; -- garde idx_follows_following_id
DROP INDEX IF EXISTS public.idx_hidden_posts_post; -- garde idx_hidden_posts_post_id
DROP INDEX IF EXISTS public.idx_saved_posts_post; -- garde idx_saved_posts_post_id
DROP INDEX IF EXISTS public.idx_saved_posts_user_saved; -- garde idx_saved_posts_user_saved_at
