-- Hardening issu de l'audit plateforme 2026-08-04 (advisors Supabase).
-- Cf docs/devops/AUDIT_PLATEFORME_2026-08-04.md. Changements SURS uniquement :
-- on NE touche PAS aux fonctions utilisees par le client (search_taxonomy,
-- search_cities, update_user_location, admin_set_user_role...) ni aux predicats
-- utilises DANS les policies RLS (is_internal_user, can_see_post, can_moderate).

-- 1. valider_espece_selon_type_post est une fonction de TRIGGER (retourne
--    `trigger`, aucun argument). Elle n'a aucune raison d'etre appelable via
--    /rest/v1/rpc. On retire l'EXECUTE aux roles exposes : le trigger continue de
--    fonctionner normalement (il s'execute via le mecanisme de trigger, pas via un
--    grant direct). Corrige le lint anon/authenticated_security_definer_function.
--    NB : le grant EXECUTE par defaut va a PUBLIC (dont anon/authenticated
--    heritent) -> on revoque sur PUBLIC, sinon le revoke nomme est sans effet.
revoke execute on function public.valider_espece_selon_type_post() from public, anon, authenticated;

-- 2. search_path fixe (lint function_search_path_mutable). Fonction de trigger
--    sans search_path defini -> on le fige a `public` (non-cassant, la fonction
--    garde acces au schema public) et on supprime la mutabilite.
alter function public.set_waitlist_marketing_consent_at() set search_path = public;

-- 3. Perf RLS (lint auth_rls_initplan) : envelopper auth.uid() dans un sous-select
--    pour qu'il soit evalue UNE fois par requete au lieu d'une fois par ligne.
--    Comportement fonctionnel identique, gain a l'echelle. Roles/cmd inchanges.
alter policy "email_send_log_select_own" on public.email_send_log
  using ((select auth.uid()) = user_id);
alter policy "Users insert own legal consents" on public.user_legal_consents
  with check ((select auth.uid()) = user_id);
alter policy "Users read own legal consents" on public.user_legal_consents
  using ((select auth.uid()) = user_id);

-- 4. Index de couverture sur 2 cles etrangeres sans index (lint
--    unindexed_foreign_keys). Ameliore les jointures/cascades sur ces FK.
create index if not exists idx_comment_reactions_user_id
  on public.comment_reactions (user_id);
create index if not exists idx_comments_taxonomy_node_id
  on public.comments (taxonomy_node_id);
