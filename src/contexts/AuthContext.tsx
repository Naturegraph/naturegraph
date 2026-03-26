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
import { generateAndStoreOtp, validateOtp } from '@/lib/demoAuth'
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
  /** Connexion par mot de passe */
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
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

// ─── Demo Auth Provider (mode sans Supabase) ─────────────────────────────

/**
 * Fournisseur d'authentification en mode démo.
 * Actif lorsque Supabase n'est pas configuré (variables d'env manquantes).
 *
 * Flux : signup → OTP console → verification → onboarding → home
 * Toutes les interfaces sont identiques au flux Supabase réel.
 */
function DemoAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(defaultState)

  /** Calcul dérivé : onboarding terminé si le profil a un username */
  function deriveState(base: Omit<AuthState, 'onboardingCompleted'>): AuthState {
    return { ...base, onboardingCompleted: !!base.profile?.username }
  }

  // ── signUp : génère et logue l'OTP, retourne requiresVerification ────────
  async function signUp(emailOrPhone: string): Promise<SignUpResult> {
    generateAndStoreOtp(emailOrPhone)
    return { success: true, requiresVerification: true }
  }

  // ── signIn : non disponible en démo ─────────────────────────────────────
  async function signIn(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Connexion par mot de passe non disponible en mode démo' }
  }

  // ── signInWithOtp : génère un nouvel OTP (flux login) ───────────────────
  async function signInWithOtp(email: string) {
    generateAndStoreOtp(email)
    return { error: null }
  }

  // ── signInWithSocial : stub ──────────────────────────────────────────────
  async function signInWithSocial(): Promise<SocialResult> {
    return { success: false, error: 'Connexion sociale non disponible en mode démo' }
  }

  // ── verifyOtp : valide le code et crée un utilisateur démo en mémoire ───
  async function verifyOtp(email: string, token: string) {
    if (!validateOtp(email, token)) {
      return { error: new Error('Code invalide — vérifiez la console de votre navigateur') }
    }

    // Utilisateur démo : shape identique à supabase.auth.User
    const demoUser = {
      id: `demo-${Date.now()}`,
      email,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User

    setState(
      deriveState({
        user: demoUser,
        session: null,
        profile: null, // Peuplé après l'onboarding via completeOnboarding()
        isLoading: false,
        isAuthenticated: true,
      }),
    )

    return { error: null }
  }

  // ── completeOnboarding : crée un profil démo minimal ────────────────────
  async function completeOnboarding() {
    setState((prev) => {
      // Dérive le username depuis l'email (ex: alice@example.com → alice)
      const username = prev.user?.email?.split('@')[0] ?? 'demo-user'
      const now = new Date().toISOString()

      const demoProfile: Profile = {
        id: prev.user?.id ?? 'demo',
        username,
        email: prev.user?.email ?? '',
        first_name: username,
        last_name: '',
        gender: null,
        birth_date: null,
        bio: null,
        interests: [],
        city: null,
        region: null,
        country: null,
        instagram: null,
        twitter: null,
        website: null,
        is_public: true,
        email_verified: true,
        avatar_url: null,
        banner_url: null,
        posts_count: 0,
        followers_count: 0,
        following_count: 0,
        created_at: now,
        updated_at: now,
        last_login_at: now,
      }

      return deriveState({ ...prev, profile: demoProfile })
    })
  }

  // ── signOut : réinitialise l'état ────────────────────────────────────────
  async function signOut() {
    setState(defaultState)
  }

  // ── refreshProfile : no-op en démo ──────────────────────────────────────
  async function refreshProfile() {
    // Profil géré localement — pas d'appel réseau en mode démo
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

  // ─── Connexion par mot de passe ───────────────────────────────────────────
  async function signIn(email: string, password: string) {
    if (!supabase) return { success: false, error: 'Supabase not configured' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { success: !error, error: error?.message }
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
  // TODO [BACKEND] — Implémenter avec supabase.auth.signInWithOAuth() :
  //   const { error } = await supabase.auth.signInWithOAuth({
  //     provider,  // 'google' | 'apple' (Facebook = 'facebook', vérifier support Supabase)
  //     options: { redirectTo: `${window.location.origin}/auth/callback` }
  //   })
  //   Créer la route /auth/callback dans le router pour capturer le token de retour.
  //   Configurer les OAuth providers dans le dashboard Supabase (Auth > Providers).
  //   Apple Sign In requiert un compte Apple Developer ($99/an).
  async function signInWithSocial(
    provider: 'google' | 'apple' | 'facebook', // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<SocialResult> {
    // TODO [BACKEND] — Remplacer par supabase.auth.signInWithOAuth (voir commentaire ci-dessus)
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
    return <DemoAuthProvider>{children}</DemoAuthProvider>
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
