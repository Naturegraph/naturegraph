-- ============================================================================
-- 20260524_admin_delete_beta_waitlist.sql
-- ----------------------------------------------------------------------------
-- Ajoute la policy RLS manquante DELETE sur public.beta_waitlist. Sans elle,
-- les admins voyaient leur clic « Supprimer » silencieusement ignoré : la
-- query retournait sans erreur (RLS rejette par défaut sans exception côté
-- client) mais 0 ligne affectée → l'entrée réapparaissait après le refresh
-- React Query.
--
-- Nicolas 2026-05-24 : restaure la gestion CRUD complète du waitlist pour
-- pouvoir nettoyer les doublons et les emails invalides avant les vagues
-- d'invitations beta.
-- ============================================================================

CREATE POLICY "admin_delete_waitlist"
  ON public.beta_waitlist
  FOR DELETE
  USING (is_admin((SELECT auth.uid())));
