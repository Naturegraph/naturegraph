-- ============================================================================
-- notifications : policy DELETE manquante (fix bouton "Supprimer")
-- ============================================================================
-- Bug constate (Nicolas 2026-06-23) : le bouton "Supprimer" d'une notification
-- (et le swipe-to-delete) ne supprime rien. Cause : la table `notifications`
-- n'avait QUE des policies SELECT + UPDATE, aucune DELETE. Avec RLS active, un
-- DELETE sans policy correspondante est refuse SILENCIEUSEMENT par PostgREST
-- (0 ligne affectee, pas d'erreur) -> le client croit avoir supprime, mais la
-- notif reapparait au refetch.
--
-- Fix : autoriser un utilisateur authentifie a supprimer SES PROPRES notifs.
-- `( SELECT auth.uid() )` (forme wrappee) pour le cache d'initplan, coherent
-- avec les policies SELECT/UPDATE existantes. Cible `authenticated` (anon n'a
-- pas de notifs, et auth.uid() serait NULL de toute facon).

CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (( SELECT auth.uid() ) = user_id);
