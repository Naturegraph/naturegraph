/**
 * demoAuth — Gestion OTP en mémoire pour le mode démonstration
 *
 * Utilisé par DemoAuthProvider dans AuthContext quand Supabase n'est pas configuré.
 * À remplacer par les appels Supabase réels une fois le back-end en place.
 *
 * Flux :
 *  1. signUp(email)           → generateAndStoreOtp(email) → log console
 *  2. verifyOtp(email, token) → validateOtp(email, token)  → true/false
 */

// ─── Store OTP en mémoire ─────────────────────────────────────────────────────

interface OtpEntry {
  otp: string
  /** Timestamp d'expiration (ms) */
  expiresAt: number
}

/** Map email → { otp, expiresAt } — vidée après chaque utilisation réussie */
const otpStore = new Map<string, OtpEntry>()

/** Durée de validité de l'OTP : 2 minutes (identique au TTL Supabase configuré en prod) */
const OTP_TTL_MS = 2 * 60 * 1000

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Génère un code OTP à 6 chiffres, le stocke en mémoire et le logue en console.
 *
 * @param email - Adresse e-mail de l'utilisateur
 * @returns Le code OTP généré (utile pour les tests unitaires)
 */
export function generateAndStoreOtp(email: string): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString()

  otpStore.set(email, {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
  })

  // Log stylisé — visible dans DevTools (F12 → Console)
  console.log(
    `%c[DEMO] 🔐 Code OTP pour ${email} : ${otp}`,
    [
      'color: #7c3aed',
      'font-size: 16px',
      'font-weight: bold',
      'padding: 4px 10px',
      'background: #f3e8ff',
      'border-radius: 6px',
      'border: 1px solid #a78bfa',
    ].join('; '),
  )
  console.log('%c[DEMO] ⏱ Valide 2 minutes — usage unique', 'color: #6b7280; font-size: 12px;')

  return otp
}

/**
 * Valide un code OTP saisi par l'utilisateur.
 *
 * @param email - Adresse e-mail associée à l'OTP
 * @param token - Code saisi par l'utilisateur
 * @returns true si valide et supprime l'entrée (usage unique), false sinon
 */
export function validateOtp(email: string, token: string): boolean {
  const trimmed = token.trim()

  // Mode démo : tout code à 6 chiffres est accepté (facilite les tests)
  // TODO [BACKEND] — Supprimer ce bypass quand Supabase est connecté ;
  //   la vraie validation passe par supabase.auth.verifyOtp() côté serveur.
  if (/^\d{6}$/.test(trimmed)) {
    otpStore.delete(email) // nettoyage quand même
    return true
  }

  return false
}

/**
 * Retourne le code OTP actuel pour un email — uniquement pour l'affichage en mode démo.
 * Ne pas utiliser en production (Supabase gère les OTP côté serveur).
 *
 * @returns Le code OTP si valide, null s'il est expiré ou inexistant
 */
export function getDemoOtp(email: string): string | null {
  const entry = otpStore.get(email)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(email)
    return null
  }
  return entry.otp
}

/**
 * Vérifie si un OTP est en attente de validation pour cet email.
 * Utilisé pour affichage conditionnel en UI (ex. renvoi de code).
 */
export function hasPendingOtp(email: string): boolean {
  const entry = otpStore.get(email)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(email)
    return false
  }
  return true
}
