/**
 * legalConsentService : tracabilite de l'acceptation des documents legaux (NG-038)
 * ================================================================================
 *
 * Au signup, la mention "En creant ton compte, tu acceptes nos CGU + la politique
 * de confidentialite" est affichee (SignupForm). Ce service conserve une PREUVE de
 * cette acceptation cote serveur (table user_legal_consents) : qui a accepte quoi,
 * dans quelle version, et quand. Protection juridique (RGPD / Loi 25).
 *
 * On enregistre apres la verification OTP (le compte existe et la session est
 * active), pas a l'invitation : un compte cree par l'admin via inviteUserByEmail
 * ne vaut pas consentement tant que la personne n'a pas reellement fini le signup.
 */

import { supabase } from '@/lib/supabase'

/**
 * Version courante des documents legaux acceptes au signup.
 * A bumper en meme temps que le texte affiche dans SignupForm quand les CGU ou la
 * politique de confidentialite changent (cf. NG-010, passage en v1.0).
 */
export const LEGAL_VERSION = '2026-06-30'

/** Identifiant du point d'acceptation : le formulaire d'inscription (CGU + confidentialite groupees). */
const SIGNUP_DOCUMENT = 'signup'

/**
 * Enregistre le consentement legal de l'utilisateur authentifie courant.
 *
 * - Idempotent : upsert sur (user_id, document, version), un re-appel ne duplique pas.
 * - Best-effort : une erreur (reseau, RLS) ne doit JAMAIS bloquer la creation du
 *   compte ni l'onboarding. Le compte est deja cree cote Supabase Auth.
 */
export async function recordSignupConsent(): Promise<void> {
  if (!supabase) return
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) return
    await supabase
      .from('user_legal_consents')
      .upsert(
        { user_id: data.user.id, document: SIGNUP_DOCUMENT, version: LEGAL_VERSION },
        { onConflict: 'user_id,document,version', ignoreDuplicates: true },
      )
  } catch {
    // Best-effort : on n'interrompt pas le flow signup sur la trace de consentement.
  }
}
