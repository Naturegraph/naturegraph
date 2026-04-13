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

import { createContext, useContext, useEffect, useRef, useState } from 'react'
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
/**
 * Détecte les usernames temporaires créés par le trigger DB `handle_new_auth_user`.
 * Format : `user_` + 8 premiers chars de l'UUID (ex: user_86dd90bd).
 * Un user avec ce username doit OBLIGATOIREMENT passer par l'onboarding.
 */
function isTempUsername(username: string | null | undefined): boolean {
  return !!username && /^user_[a-f0-9]{8}$/i.test(username)
}

function DemoAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(defaultState)

  /** Calcul dérivé : onboarding terminé si le profil a un VRAI username (pas un temp) */
  function deriveState(base: Omit<AuthState, 'onboardingCompleted'>): AuthState {
    const username = base.profile?.username
    return { ...base, onboardingCompleted: !!username && !isTempUsername(username) }
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

  // Calcul dérivé : onboarding terminé si le profil a un VRAI username (pas un temp `user_xxxxxxxx`)
  function deriveState(base: Omit<AuthState, 'onboardingCompleted'>): AuthState {
    const username = base.profile?.username
    return { ...base, onboardingCompleted: !!username && !isTempUsername(username) }
  }

  async function fetchProfile(userId: string): Promise<Profile | null> {
    if (!supabase) return null
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) {
      console.error('[Auth] fetchProfile failed:', error.message)
      return null
    }
    // Cast nécessaire : Supabase retourne gender: string | null, Profile attend Gender | null
    return data as unknown as Profile
  }

  async function refreshProfile() {
    if (!state.user) return
    const profile = await fetchProfile(state.user.id)
    setState((prev) => deriveState({ ...prev, profile }))
  }

  // ─── Initialisation de session et écoute des changements d'état auth ────
  const lastOtpSentAtRef = useRef(0)
  const lastSignInAtRef = useRef(0)

  useEffect(() => {
    if (!supabase) return

    // Fail-safe : si getSession() bloque (token corrompu, lock navigator),
    // on force isLoading=false après 5s pour ne pas figer l'app sur le spinner.
    const bootTimeout = setTimeout(() => {
      setState((prev) => (prev.isLoading ? { ...prev, isLoading: false } : prev))
      console.warn('[Auth] getSession() timeout (5s) — reset loading state')
    }, 5000)

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        clearTimeout(bootTimeout)
        const user = session?.user ?? null
        const profile = user ? await fetchProfile(user.id) : null
        setState(deriveState({ user, session, profile, isLoading: false, isAuthenticated: !!user }))
      })
      .catch((err) => {
        clearTimeout(bootTimeout)
        console.error('[Auth] getSession failed:', err)
        setState((prev) => ({ ...prev, isLoading: false }))
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null
      const profile = user ? await fetchProfile(user.id) : null
      setState(deriveState({ user, session, profile, isLoading: false, isAuthenticated: !!user }))
    })

    // Refresh automatique de session toutes les 30 minutes
    // Évite qu'une session expirée côté serveur reste valide côté client
    const refreshInterval = setInterval(
      () => {
        supabase?.auth.refreshSession().catch((err) => {
          console.warn('[Auth] Session refresh failed:', err)
        })
      },
      30 * 60 * 1000,
    )

    return () => {
      clearTimeout(bootTimeout)
      subscription.unsubscribe()
      clearInterval(refreshInterval)
    }
  }, [])

  // ─── Rate limiting côté client ────────────────────────────────────────────
  //
  // Protection contre le brute-force / spam d'OTP côté navigateur.
  // Note : le vrai rate limiting DOIT être implémenté côté serveur (Supabase edge functions
  // ou règles Supabase Auth). Ceci est une couche supplémentaire, pas une garantie.

  // Refs initialisées dans le useEffect ci-dessous pour éviter des re-renders
  const OTP_RATE_LIMIT_MS = 30_000 // 30 secondes entre deux envois OTP
  const SIGNIN_RATE_LIMIT_MS = 5_000 // 5 secondes entre deux tentatives de login

  /**
   * Sanitise les messages d'erreur Supabase avant de les exposer à l'utilisateur.
   * Évite la fuite d'informations internes (énumération d'emails, structure DB, etc.)
   */
  function sanitizeAuthError(message: string): string {
    // Messages Supabase qu'on peut exposer à l'utilisateur (non-sensibles)
    const safeMessages: Record<string, string> = {
      'Invalid login credentials': 'Identifiants incorrects.',
      'Email not confirmed': 'Adresse e-mail non confirmée. Vérifie ta boîte mail.',
      'User already registered': 'Un compte existe déjà avec cette adresse.',
      'Email rate limit exceeded': 'Trop de tentatives. Réessaie dans quelques minutes.',
      'Phone not confirmed': 'Numéro de téléphone non confirmé.',
    }
    return safeMessages[message] ?? 'Une erreur est survenue. Réessaie plus tard.'
  }

  // ─── Magic link OTP signup/login ─────────────────────────────────────────
  async function signUp(emailOrPhone: string): Promise<SignUpResult> {
    if (!supabase)
      return { success: false, requiresVerification: false, error: 'Supabase not configured' }

    // Rate limiting côté client
    const now = Date.now()
    if (now - lastOtpSentAtRef.current < OTP_RATE_LIMIT_MS) {
      const remaining = Math.ceil((OTP_RATE_LIMIT_MS - (now - lastOtpSentAtRef.current)) / 1000)
      return {
        success: false,
        requiresVerification: false,
        error: `Attends ${remaining} secondes avant de renvoyer un code.`,
      }
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailOrPhone,
        options: { shouldCreateUser: true },
      })
      if (error)
        return {
          success: false,
          requiresVerification: false,
          error: sanitizeAuthError(error.message),
        }
      lastOtpSentAtRef.current = Date.now()
      return { success: true, requiresVerification: true }
    } catch {
      return {
        success: false,
        requiresVerification: false,
        error: 'Une erreur est survenue. Réessaie plus tard.',
      }
    }
  }

  // ─── Connexion par mot de passe ───────────────────────────────────────────
  async function signIn(email: string, password: string) {
    if (!supabase) return { success: false, error: 'Supabase not configured' }

    // Rate limiting côté client
    const now = Date.now()
    if (now - lastSignInAtRef.current < SIGNIN_RATE_LIMIT_MS) {
      return { success: false, error: 'Trop de tentatives. Attends quelques secondes.' }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    lastSignInAtRef.current = Date.now()
    return { success: !error, error: error ? sanitizeAuthError(error.message) : undefined }
  }

  // ─── OTP direct ──────────────────────────────────────────────────────────
  async function signInWithOtp(email: string) {
    if (!supabase) return { error: new Error('Supabase not configured') }

    const now = Date.now()
    if (now - lastOtpSentAtRef.current < OTP_RATE_LIMIT_MS) {
      const remaining = Math.ceil((OTP_RATE_LIMIT_MS - (now - lastOtpSentAtRef.current)) / 1000)
      return { error: new Error(`Attends ${remaining} secondes avant de renvoyer un code.`) }
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (!error) lastOtpSentAtRef.current = Date.now()
    return { error: error ? new Error(sanitizeAuthError(error.message)) : null }
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
    _provider: 'google' | 'apple' | 'facebook',
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
    const { error } = await supabase.auth.signOut()
    // En cas d'échec réseau, forcer la déconnexion côté client quand même
    if (error) {
      console.error('[Auth] signOut error (forced local logout):', error.message)
      setState(
        deriveState({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
        }),
      )
    }
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
