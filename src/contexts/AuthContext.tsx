/**
 * AuthContext — Gestion de l'authentification Naturegraph
 *
 * Méthodes exposées :
 *  - signUp(emailOrPhone)        → Magic link OTP (signup + login unifié)
 *  - signIn(email, password)     → Connexion par mot de passe (admin/legacy)
 *  - signInWithOtp(email)        → Alias direct Supabase OTP
 *  - signInWithSocial(provider)  → OAuth Google / Apple / Facebook (stub)
 *  - verifyOtp(email, token)     → Vérification du code OTP
 *  - completeOnboarding()        → Rafraîchit le profil après onboarding
 *  - signOut()
 *  - refreshProfile()
 */

import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Profile } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  /** True si l'utilisateur a un username — indique que l'onboarding est terminé */
  onboardingCompleted: boolean
}

interface SignUpResult {
  success: boolean
  requiresVerification: boolean
  error?: string
}

interface SocialResult {
  success: boolean
  error?: string
}

interface AuthContextValue extends AuthState {
  /** Inscription / connexion via magic link OTP (email ou téléphone) */
  signUp: (emailOrPhone: string) => Promise<SignUpResult>
  /** Connexion par mot de passe (legacy) */
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  /** OTP direct via Supabase */
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>
  /** OAuth social (stub — affiche un message en attendant l'implémentation) */
  signInWithSocial: (provider: 'google' | 'apple' | 'facebook') => Promise<SocialResult>
  /** Vérification du code OTP */
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>
  /** Rafraîchit le profil après la fin de l'onboarding */
  completeOnboarding: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

const defaultState: AuthState = {
  user: null,
  session: null,
  profile: null,
  isLoading: false,
  isAuthenticated: false,
  onboardingCompleted: false,
}

const noopAuth: AuthContextValue = {
  ...defaultState,
  signUp: async () => ({
    success: false,
    requiresVerification: false,
    error: 'Supabase not configured',
  }),
  signIn: async () => ({ error: new Error('Supabase not configured') }),
  signInWithOtp: async () => ({ error: new Error('Supabase not configured') }),
  signInWithSocial: async () => ({ success: false, error: 'Supabase not configured' }),
  verifyOtp: async () => ({ error: new Error('Supabase not configured') }),
  completeOnboarding: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    ...defaultState,
    isLoading: isSupabaseConfigured,
  })

  // Calcul dérivé : onboarding terminé si le profil a un username
  function deriveState(base: Omit<AuthState, 'onboardingCompleted'>): AuthState {
    return { ...base, onboardingCompleted: !!base.profile?.username }
  }

  async function fetchProfile(userId: string) {
    if (!supabase) return null
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    return data
  }

  async function refreshProfile() {
    if (!state.user) return
    const profile = await fetchProfile(state.user.id)
    setState((prev) => deriveState({ ...prev, profile }))
  }

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null
      const profile = user ? await fetchProfile(user.id) : null
      setState(deriveState({ user, session, profile, isLoading: false, isAuthenticated: !!user }))
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null
      const profile = user ? await fetchProfile(user.id) : null
      setState(deriveState({ user, session, profile, isLoading: false, isAuthenticated: !!user }))
    })

    return () => subscription.unsubscribe()
  }, [])

  // ─── Magic link OTP signup/login ─────────────────────────────────────────
  async function signUp(emailOrPhone: string): Promise<SignUpResult> {
    if (!supabase)
      return { success: false, requiresVerification: false, error: 'Supabase not configured' }
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailOrPhone,
        options: { shouldCreateUser: true },
      })
      if (error) return { success: false, requiresVerification: false, error: error.message }
      return { success: true, requiresVerification: true }
    } catch {
      return { success: false, requiresVerification: false, error: 'Une erreur est survenue' }
    }
  }

  // ─── Connexion par mot de passe (legacy) ─────────────────────────────────
  async function signIn(email: string, password: string) {
    if (!supabase) return { error: new Error('Supabase not configured') }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(error.message) : null }
  }

  // ─── OTP direct ──────────────────────────────────────────────────────────
  async function signInWithOtp(email: string) {
    if (!supabase) return { error: new Error('Supabase not configured') }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    return { error: error ? new Error(error.message) : null }
  }

  // ─── OAuth social (stub) ─────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function signInWithSocial(
    provider: 'google' | 'apple' | 'facebook',
  ): Promise<SocialResult> {
    // TODO: implémenter OAuth avec Supabase signInWithOAuth
    return { success: false, error: 'Connexion sociale bientôt disponible' }
  }

  // ─── Vérification OTP ────────────────────────────────────────────────────
  async function verifyOtp(email: string, token: string) {
    if (!supabase) return { error: new Error('Supabase not configured') }
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    return { error: error ? new Error(error.message) : null }
  }

  // ─── Finaliser l'onboarding ──────────────────────────────────────────────
  async function completeOnboarding() {
    // Le profil a été sauvegardé par le composant Onboarding
    // On rafraîchit juste l'état pour mettre à jour onboardingCompleted
    await refreshProfile()
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  if (!isSupabaseConfigured) {
    return <AuthContext.Provider value={noopAuth}>{children}</AuthContext.Provider>
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signInWithOtp,
        signInWithSocial,
        verifyOtp,
        completeOnboarding,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
