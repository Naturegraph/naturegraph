-- Securite : restreindre `supprimer_echange` aux utilisateurs authentifies
-- =============================================================================
-- La migration 20260728150000 grantait EXECUTE a `authenticated` mais laissait
-- le GRANT implicite a PUBLIC (donc `anon`). La fonction etait deja sure sur le
-- fond (elle leve une exception si `auth.uid()` n'est pas l'auteur, donc anon ne
-- peut rien supprimer), mais l'exposer a anon via /rpc est inutile et signale
-- par le linter Supabase (0028). On aligne sur la convention des autres
-- fonctions d'echange (`toggle_comment_helpful`, `trancher_echange_signale`),
-- qui revoquent anon.
-- =============================================================================

-- Supabase grante `anon` EXPLICITEMENT (default privileges), pas seulement via
-- PUBLIC : il faut donc revoquer anon nommement, sinon has_function_privilege
-- reste vrai malgre le revoke de PUBLIC.
revoke execute on function public.supprimer_echange(uuid) from public;
revoke execute on function public.supprimer_echange(uuid) from anon;
grant execute on function public.supprimer_echange(uuid) to authenticated;
