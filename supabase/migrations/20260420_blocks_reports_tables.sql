-- =============================================================================
-- 20260420_blocks_reports_tables.sql
-- Tables de modération : blocks (silences) + reports (signalements)
-- =============================================================================
-- blocks  : relation asymétrique, un utilisateur en bloque un autre
-- reports : signalement d'un post OU d'un profil (au moins l'un des deux)
-- RLS     : politique stricte — chaque utilisateur ne voit que ses propres lignes
-- =============================================================================

-- ─── Table blocks ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  -- Contrainte : impossible de se bloquer soi-même
  CONSTRAINT blocks_no_self_block CHECK (blocker_id <> blocked_id)
);

-- Index pour la requête "est-ce que l'utilisateur X m'a bloqué ?"
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON public.blocks(blocked_id);

-- RLS
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Seul le blocker peut voir ses propres blocks
CREATE POLICY "blocks_select_own" ON public.blocks
  FOR SELECT USING (auth.uid() = blocker_id);

-- Seul le blocker peut créer un block
CREATE POLICY "blocks_insert_own" ON public.blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- Seul le blocker peut supprimer ses blocks
CREATE POLICY "blocks_delete_own" ON public.blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- ─── Table reports ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- La cible est soit un post, soit un profil (au moins l'un des deux)
  post_id      uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  profile_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason       text NOT NULL,
  details      text,
  status       text NOT NULL DEFAULT 'pending',  -- pending | reviewed | dismissed
  resolved_at  timestamptz,
  created_at   timestamptz DEFAULT now(),
  -- Contrainte : au moins une cible doit être renseignée
  CONSTRAINT reports_has_target CHECK (post_id IS NOT NULL OR profile_id IS NOT NULL)
);

-- Index pour les modérateurs (admin → voir tous les reports en attente)
CREATE INDEX IF NOT EXISTS idx_reports_status     ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_post_id     ON public.reports(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_profile_id  ON public.reports(profile_id) WHERE profile_id IS NOT NULL;

-- RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Un utilisateur peut voir ses propres signalements
CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Un utilisateur peut créer un signalement
CREATE POLICY "reports_insert_own" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Mise à jour interdite côté client (réservée aux admins via service_role)
-- Pas de policy UPDATE → bloqué par défaut avec RLS activé
