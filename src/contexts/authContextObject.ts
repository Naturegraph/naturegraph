/**
 * authContextObject : Définition isolée du contexte d'authentification.
 *
 * Séparé de `AuthContext.tsx` (qui exporte le composant `AuthProvider`) pour
 * respecter `react-refresh/only-export-components` et éviter les glitches HMR
 * où l'identité du contexte est invalidée après un Fast Refresh, faisant
 * apparaître l'erreur « useAuth must be used within AuthProvider » alors
 * que le provider est pourtant bien monté.
 *
 * Ce module ne contient QUE des valeurs/types stables, donc Vite peut le
 * garder intact pendant le HMR.
 */

import { createContext, useContext } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  /** True si l'utilisateur a un username : indique que l'onboarding est terminé */
  onboardingCompleted: boolean
}

export interface SignUpResult {
  success: boolean
  requiresVerification: boolean
  error?: string
}

export interface SocialResult {
  success: boolean
  error?: string
}

export interface AuthContextValue extends AuthState {
  /** Inscription / connexion via magic link OTP (email ou téléphone) */
  signUp: (emailOrPhone: string) => Promise<SignUpResult>
  /** Connexion par mot de passe */
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  /**
   * OTP direct via Supabase.
   * @param email : adresse à laquelle envoyer le code
   * @param remember : si true, session persistée en localStorage (30j).
   *                   Sinon sessionStorage (effacée à la fermeture navigateur).
   */
  signInWithOtp: (email: string, remember?: boolean) => Promise<{ error: Error | null }>
  /** OAuth social (stub : affiche un message en attendant l'implémentation) */
  signInWithSocial: (provider: 'google' | 'apple' | 'facebook') => Promise<SocialResult>
  /** Vérification du code OTP */
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>
  /** Rafraîchit le profil après la fin de l'onboarding */
  completeOnboarding: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook pour consommer le contexte d'auth. Lance une erreur claire si utilisé
 * en-dehors du `AuthProvider` (cas d'oubli dans l'arbre de composants).
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
