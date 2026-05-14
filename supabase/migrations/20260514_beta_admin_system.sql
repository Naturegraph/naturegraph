-- ============================================================================
-- Migration : Beta closed access + Admin control center (foundation)
-- ============================================================================
--
-- Refs : T-200 (beta_*) + T-300 (admin_*) — BATCH 28
-- Date : 2026-05-14
--
-- Cette migration cree les fondations pour :
--   1. Beta fermee : cles d'acces, quota, waitlist, log signups
--   2. Admin control center : users admin, signalements, actions, audit logs
--
-- Pattern RLS : (SELECT auth.uid()) (BATCH 22)
-- Pattern audit : INSERT-ONLY via trigger
-- Pattern claim atomique : RPC SECURITY DEFINER

-- ============================================================================
-- SECTION 1 : ADMIN FOUNDATION
-- ============================================================================

-- 1.1 — Table admin_users (3 roles fixes)
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'moderator', 'support')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

CREATE INDEX idx_admin_users_active ON public.admin_users(user_id) WHERE is_active = TRUE;

-- 1.2 — Table moderation_reports (signalements user-generated)
CREATE TABLE public.moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post', 'comment', 'profile')),
  target_id UUID NOT NULL,
  reason VARCHAR(50) NOT NULL CHECK (reason IN (
    'spam', 'offensive', 'harassment', 'wrong_info',
    'protected_species_gps', 'illegal_content', 'other'
  )),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved', 'dismissed')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to UUID REFERENCES public.admin_users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.admin_users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_moderation_reports_status ON public.moderation_reports(status, priority, created_at DESC);
CREATE INDEX idx_moderation_reports_target ON public.moderation_reports(target_type, target_id);

-- 1.3 — Table admin_actions (actions effectuees par admin sur users/content)
CREATE TABLE public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(50) NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  target_content_id UUID,
  target_content_type VARCHAR(20),
  performed_by UUID NOT NULL REFERENCES public.admin_users(id),
  reason TEXT NOT NULL,
  duration_days INT,
  related_report_id UUID REFERENCES public.moderation_reports(id),
  is_reversible BOOLEAN NOT NULL DEFAULT TRUE,
  reverted_at TIMESTAMPTZ,
  reverted_by UUID REFERENCES public.admin_users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_target_user ON public.admin_actions(target_user_id, created_at DESC);
CREATE INDEX idx_admin_actions_performed_by ON public.admin_actions(performed_by, created_at DESC);

-- 1.4 — Table admin_audit_logs (IMMUTABLE — INSERT ONLY)
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.admin_users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  before_state JSONB,
  after_state JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_admin ON public.admin_audit_logs(admin_user_id, created_at DESC);
CREATE INDEX idx_admin_audit_logs_action ON public.admin_audit_logs(action, created_at DESC);
CREATE INDEX idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);

-- Trigger : empeche UPDATE/DELETE sur admin_audit_logs (immuabilite garantie)
CREATE OR REPLACE FUNCTION public.prevent_admin_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_logs is INSERT-ONLY — % refused', TG_OP;
END;
$$;

CREATE TRIGGER no_update_or_delete_admin_audit_logs
  BEFORE UPDATE OR DELETE ON public.admin_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_audit_log_modification();

-- ============================================================================
-- SECTION 2 : BETA CLOSED ACCESS
-- ============================================================================

-- 2.1 — Cles d'acces (format NG-XXXX-XXXX)
CREATE TABLE public.beta_access_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(15) UNIQUE NOT NULL,
  batch_number INT NOT NULL,
  max_uses INT NOT NULL DEFAULT 1,
  current_uses INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  used_by_user_id UUID REFERENCES auth.users(id),
  notes TEXT,
  CONSTRAINT positive_uses CHECK (current_uses >= 0 AND current_uses <= max_uses),
  CONSTRAINT code_format CHECK (code ~ '^NG-[A-Z0-9]{4}-[A-Z0-9]{4}$')
);

CREATE INDEX idx_beta_access_keys_code_active ON public.beta_access_keys(code) WHERE is_active = TRUE;
CREATE INDEX idx_beta_access_keys_batch ON public.beta_access_keys(batch_number);

-- 2.2 — Config quota (singleton row id=1)
CREATE TABLE public.beta_quota_config (
  id INT PRIMARY KEY DEFAULT 1,
  current_phase INT NOT NULL DEFAULT 1,
  max_users_total INT NOT NULL DEFAULT 50,
  current_user_count INT NOT NULL DEFAULT 0,
  accepting_new_signups BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT singleton_row CHECK (id = 1)
);

INSERT INTO public.beta_quota_config (id) VALUES (1);

-- 2.3 — Audit trail signups (IP anonymisee J+30 par cron existant)
CREATE TABLE public.beta_signup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_code VARCHAR(15),
  outcome VARCHAR(50) NOT NULL CHECK (outcome IN (
    'success', 'invalid_code', 'expired', 'quota_full', 'already_used', 'rate_limited'
  )),
  ip_address INET,
  user_agent TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_beta_signup_log_outcome ON public.beta_signup_log(outcome, created_at DESC);
CREATE INDEX idx_beta_signup_log_ip ON public.beta_signup_log(ip_address, created_at DESC);

-- 2.4 — Waitlist (quota plein)
CREATE TABLE public.beta_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  motivation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_at TIMESTAMPTZ,
  invited_with_key_id UUID REFERENCES public.beta_access_keys(id),
  notes TEXT
);

CREATE INDEX idx_beta_waitlist_pending ON public.beta_waitlist(created_at) WHERE invited_at IS NULL;

-- ============================================================================
-- SECTION 3 : RPC FUNCTIONS (claim atomique + helpers admin)
-- ============================================================================

-- 3.1 — Claim atomique d'une cle beta (anti race condition)
CREATE OR REPLACE FUNCTION public.claim_beta_access_key(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key_id UUID;
BEGIN
  UPDATE public.beta_access_keys
  SET current_uses = current_uses + 1,
      used_at = COALESCE(used_at, NOW())
  WHERE code = p_code
    AND is_active = TRUE
    AND current_uses < max_uses
    AND expires_at > NOW()
  RETURNING id INTO v_key_id;

  RETURN v_key_id;
END;
$$;

-- 3.2 — Rollback (si quota plein apres claim)
CREATE OR REPLACE FUNCTION public.release_beta_access_key(p_key_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.beta_access_keys
  SET current_uses = GREATEST(current_uses - 1, 0),
      used_at = CASE WHEN current_uses <= 1 THEN NULL ELSE used_at END
  WHERE id = p_key_id AND current_uses > 0;
END;
$$;

-- 3.3 — Helper : check si un user est admin (utilise par RLS)
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = p_user_id AND is_active = TRUE
  );
$$;

-- 3.4 — Generation cle beta (admin only via RLS)
CREATE OR REPLACE FUNCTION public.generate_beta_keys(
  p_batch_number INT,
  p_count INT DEFAULT 10,
  p_max_uses INT DEFAULT 1,
  p_expires_days INT DEFAULT 7,
  p_notes TEXT DEFAULT NULL
)
RETURNS SETOF public.beta_access_keys
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_user_id UUID;
  v_chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_code TEXT;
  i INT;
  j INT;
BEGIN
  -- Verifier que l'appelant est admin
  v_admin_user_id := auth.uid();
  IF NOT public.is_admin(v_admin_user_id) THEN
    RAISE EXCEPTION 'Only admins can generate beta keys';
  END IF;

  -- Generer p_count cles
  FOR i IN 1..p_count LOOP
    -- Format NG-XXXX-XXXX
    v_code := 'NG-';
    FOR j IN 1..4 LOOP
      v_code := v_code || SUBSTRING(v_chars FROM (FLOOR(RANDOM() * LENGTH(v_chars))::INT + 1) FOR 1);
    END LOOP;
    v_code := v_code || '-';
    FOR j IN 1..4 LOOP
      v_code := v_code || SUBSTRING(v_chars FROM (FLOOR(RANDOM() * LENGTH(v_chars))::INT + 1) FOR 1);
    END LOOP;

    -- Insert (collision tres improbable mais ON CONFLICT au cas ou)
    INSERT INTO public.beta_access_keys (code, batch_number, max_uses, expires_at, created_by, notes)
    VALUES (v_code, p_batch_number, p_max_uses, NOW() + (p_expires_days || ' days')::INTERVAL, v_admin_user_id, p_notes)
    ON CONFLICT (code) DO NOTHING;
  END LOOP;

  -- Retourner les cles generees pour le batch en cours
  RETURN QUERY
  SELECT * FROM public.beta_access_keys
  WHERE batch_number = p_batch_number AND created_by = v_admin_user_id
  ORDER BY created_at DESC
  LIMIT p_count;
END;
$$;

-- 3.5 — Increment quota apres signup reussi (cale dans trigger post-confirm)
CREATE OR REPLACE FUNCTION public.increment_beta_user_count()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.beta_quota_config
  SET current_user_count = current_user_count + 1,
      updated_at = NOW()
  WHERE id = 1;
END;
$$;

-- ============================================================================
-- SECTION 4 : RLS POLICIES (pattern (SELECT auth.uid()) BATCH 22)
-- ============================================================================

-- 4.1 — admin_users : admins lisent, super_admin gere
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_admin_users" ON public.admin_users
  FOR SELECT TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

CREATE POLICY "super_admin_manage_admin_users" ON public.admin_users
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IN (
    SELECT user_id FROM public.admin_users
    WHERE is_active = TRUE AND role = 'super_admin'
  ));

-- 4.2 — moderation_reports : users INSERT (signaler), admins manage
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_reports" ON public.moderation_reports
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = reporter_id);

CREATE POLICY "users_read_own_reports" ON public.moderation_reports
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = reporter_id);

CREATE POLICY "admins_manage_reports" ON public.moderation_reports
  FOR ALL TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- 4.3 — admin_actions : admins manage
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_admin_actions" ON public.admin_actions
  FOR ALL TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- 4.4 — admin_audit_logs : admins SELECT/INSERT, jamais UPDATE/DELETE (trigger)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_audit_logs" ON public.admin_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

CREATE POLICY "admins_insert_audit_logs" ON public.admin_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin((SELECT auth.uid())));

-- 4.5 — beta_access_keys : admin only
ALTER TABLE public.beta_access_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only_access_keys" ON public.beta_access_keys
  FOR ALL TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- 4.6 — beta_quota_config : lecture publique (afficher etat beta sur landing)
ALTER TABLE public.beta_quota_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_quota" ON public.beta_quota_config
  FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "admin_write_quota" ON public.beta_quota_config
  FOR UPDATE TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- 4.7 — beta_signup_log : admins read only (insert via Edge Function SECURITY DEFINER)
ALTER TABLE public.beta_signup_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_signup_log" ON public.beta_signup_log
  FOR SELECT TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- 4.8 — beta_waitlist : INSERT public (signup waitlist), admins read
ALTER TABLE public.beta_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_waitlist" ON public.beta_waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (TRUE);

CREATE POLICY "admin_read_waitlist" ON public.beta_waitlist
  FOR SELECT TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

CREATE POLICY "admin_update_waitlist" ON public.beta_waitlist
  FOR UPDATE TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- ============================================================================
-- FIN MIGRATION
-- ============================================================================
-- Apres apply :
--   1. INSERT manuel pour declarer Nicolas super_admin :
--      INSERT INTO public.admin_users (user_id, role, notes)
--      VALUES ('<NICOLAS_UUID>', 'super_admin', 'Fondateur');
--   2. Verifier advisors : aucune nouvelle ERROR
--   3. Tester via : SELECT public.is_admin('<NICOLAS_UUID>'); → TRUE
