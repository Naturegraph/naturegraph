-- ============================================================================
-- BATCH 60 — Extension TTL des clés beta : 7j → 30j
-- ============================================================================
-- Date : 2026-05-15 (Nicolas decision : test beta sur plus longue duree)
--
-- Aligne l'expiration cote DB sur le TTL localStorage etendu a 30 jours
-- (cf src/hooks/useBetaAccess.ts ligne 22). Sans cet alignement, un user
-- pourrait naviguer 30j sur le welcome mais voir "expired" au signup apres J+7.
--
-- 3 changements :
--   1. DEFAULT de beta_access_keys.expires_at : 7d → 30d
--   2. Function generate_beta_keys : p_expires_days INT DEFAULT 30 (au lieu de 7)
--   3. UPDATE des cles actives non utilisees : push expires_at a NOW() + 30j
--
-- Idempotent : peut etre re-execute sans casser l'etat.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. DEFAULT de la colonne expires_at
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.beta_access_keys
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '30 days');

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Function generate_beta_keys : default p_expires_days passe de 7 a 30
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_beta_keys(
  p_batch_number INT,
  p_count INT DEFAULT 10,
  p_max_uses INT DEFAULT 1,
  p_expires_days INT DEFAULT 30,
  p_notes TEXT DEFAULT NULL
)
RETURNS SETOF public.beta_access_keys
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_user_id UUID;
  v_chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_code TEXT;
  i INT;
  j INT;
BEGIN
  v_admin_user_id := auth.uid();
  IF NOT public.is_admin(v_admin_user_id) THEN
    RAISE EXCEPTION 'Only admins can generate beta keys';
  END IF;

  FOR i IN 1..p_count LOOP
    v_code := 'NG-';
    FOR j IN 1..4 LOOP
      v_code := v_code || SUBSTRING(v_chars FROM (FLOOR(RANDOM() * LENGTH(v_chars))::INT + 1) FOR 1);
    END LOOP;
    v_code := v_code || '-';
    FOR j IN 1..4 LOOP
      v_code := v_code || SUBSTRING(v_chars FROM (FLOOR(RANDOM() * LENGTH(v_chars))::INT + 1) FOR 1);
    END LOOP;

    INSERT INTO public.beta_access_keys (code, batch_number, max_uses, expires_at, created_by, notes)
    VALUES (v_code, p_batch_number, p_max_uses, NOW() + (p_expires_days || ' days')::INTERVAL, v_admin_user_id, p_notes)
    ON CONFLICT (code) DO NOTHING;
  END LOOP;

  RETURN QUERY
  SELECT * FROM public.beta_access_keys
  WHERE batch_number = p_batch_number AND created_by = v_admin_user_id
  ORDER BY created_at DESC
  LIMIT p_count;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Extension des cles actives non utilisees
-- ────────────────────────────────────────────────────────────────────────────
-- On NE touche PAS les cles deja claim (current_uses >= max_uses) ni les cles
-- desactivees (is_active = FALSE). On etend seulement les cles encore valides
-- ET pas encore expirees pour ne pas "ressusciter" des cles expirees par accident.

UPDATE public.beta_access_keys
SET expires_at = NOW() + INTERVAL '30 days'
WHERE is_active = TRUE
  AND current_uses < max_uses
  AND expires_at > NOW()
  AND expires_at < NOW() + INTERVAL '30 days';
