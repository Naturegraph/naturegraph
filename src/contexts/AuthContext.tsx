/**
 * AuthContext, Gestion de l'authentification Naturegraph
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

import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { setRememberMe, clearAuthStorage } from '@/lib/authStorage'
import { generateAndStoreOtp, validateOtp } from '@/lib/demoAuth'
import type { Profile } from '@/types/database'
import {
  AuthContext,
  type AuthState,
  type SignUpResult,
  type SocialResult,
} from './authContextObject'

// Re-export `useAuth` depuis l'objet contexte séparé pour préserver le chemin
// d'import historique `@/contexts/AuthContext` utilisé dans 25+ fichiers.
// Le hook et le Context vivent dans `authContextObject.ts` pour respecter
// `react-refresh/only-export-components` (stabilité HMR Vite).
export { useAuth } from './authContextObject'

// ─── État par défaut ─────────────────────────────────────────────────────────

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
  // Le paramètre remember est ignoré en mode démo (pas de vraie session).
  async function signInWithOtp(email: string, _remember?: boolean) {
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
      return { error: new Error('Code invalide, vérifiez la console de votre navigateur') }
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
        // Champs localisation privacy-first (migration 20260420)
        city_name: null,
        region_name: null,
        country_code: 'FR',
        location_radius_km: 75,
        location_visibility: 'region',
        location_consent_source: null,
        location_updated_at: null,
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
        // Champs premium (migration 20260501), défaut free tier
        subscription_tier: 'free',
        subscription_expires_at: null,
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
    // Profil géré localement, pas d'appel réseau en mode démo
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
      console.warn('[Auth] getSession() timeout (5s), reset loading state')
    }, 5000)

    /**
     * BATCH 103 (2026-05-15) : detection refresh token mort.
     * Si le refresh token est invalide (sessions revoquees, token expire,
     * etc.), on purge le storage local et on force signOut pour eviter
     * une boucle infinie de retry Supabase qui bloque tout le chargement.
     */
    function isInvalidRefreshTokenError(err: unknown): boolean {
      if (!err || typeof err !== 'object') return false
      const msg = String((err as { message?: string }).message ?? '')
      return /refresh token (not found|expired|invalid)/i.test(msg)
    }

    async function handleAuthBoot() {
      try {
        const { data, error } = await supabase!.auth.getSession()
        clearTimeout(bootTimeout)

        if (error || isInvalidRefreshTokenError(error)) {
          // Token mort -> purge + reset state, pas de retry
          console.warn('[Auth] Refresh token invalide au boot, purge local storage')
          clearAuthStorage()
          await supabase!.auth.signOut({ scope: 'local' }).catch(() => {})
          setState(
            deriveState({
              user: null,
              session: null,
              profile: null,
              isLoading: false,
              isAuthenticated: false,
            }),
          )
          return
        }

        const session = data.session
        const user = session?.user ?? null
        const profile = user ? await fetchProfile(user.id) : null
        setState(deriveState({ user, session, profile, isLoading: false, isAuthenticated: !!user }))
      } catch (err) {
        clearTimeout(bootTimeout)
        if (isInvalidRefreshTokenError(err)) {
          console.warn('[Auth] Refresh token mort detecte au boot, purge')
          clearAuthStorage()
          await supabase!.auth.signOut({ scope: 'local' }).catch(() => {})
        } else {
          console.error('[Auth] getSession failed:', err)
        }
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    }

    void handleAuthBoot()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // BATCH 103 : SIGNED_OUT déclenché par un refresh fail -> purge propre
      if (event === 'SIGNED_OUT') {
        clearAuthStorage()
      }
      const user = session?.user ?? null
      const profile = user ? await fetchProfile(user.id) : null
      setState(deriveState({ user, session, profile, isLoading: false, isAuthenticated: !!user }))
    })

    // Refresh automatique de session toutes les 30 minutes
    // Évite qu'une session expirée côté serveur reste valide côté client.
    // BATCH 103 : si le refresh token est mort, on signOut() proprement plutôt
    // que de boucler sur des retry qui spamment la console et bloquent l'UI.
    const refreshInterval = setInterval(
      () => {
        supabase?.auth.refreshSession().catch(async (err) => {
          if (isInvalidRefreshTokenError(err)) {
            console.warn('[Auth] Refresh token mort -> signOut local')
            clearAuthStorage()
            await supabase!.auth.signOut({ scope: 'local' }).catch(() => {})
          } else {
            console.warn('[Auth] Session refresh failed:', err)
          }
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
    // Lookup exact d'abord
    if (safeMessages[message]) return safeMessages[message]

    // Détection souple (Supabase v2 renvoie parfois en lowercase ou avec variants)
    const lower = message.toLowerCase()
    if (lower.includes('rate limit') || lower.includes('over_email_send_rate_limit')) {
      return 'Trop de tentatives. Réessaie dans quelques minutes.'
    }
    if (lower.includes('invalid login')) return 'Identifiants incorrects.'
    if (lower.includes('not confirmed')) {
      return 'Adresse e-mail non confirmée. Vérifie ta boîte mail.'
    }
    if (lower.includes('already registered') || lower.includes('user_already_exists')) {
      return 'Un compte existe déjà avec cette adresse.'
    }

    return 'Une erreur est survenue. Réessaie plus tard.'
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
  // Le paramètre `remember` est posé AVANT l'envoi du code : quand l'utilisateur
  // validera l'OTP (verifyOtp), Supabase appellera storage.setItem() qui lira
  // ce flag et routera la session vers localStorage (persistante) ou
  // sessionStorage (éphémère, effacée à la fermeture navigateur).
  async function signInWithOtp(email: string, remember = false) {
    if (!supabase) return { error: new Error('Supabase not configured') }

    const now = Date.now()
    if (now - lastOtpSentAtRef.current < OTP_RATE_LIMIT_MS) {
      const remaining = Math.ceil((OTP_RATE_LIMIT_MS - (now - lastOtpSentAtRef.current)) / 1000)
      return { error: new Error(`Attends ${remaining} secondes avant de renvoyer un code.`) }
    }

    // Pose le choix "Se souvenir de moi" AVANT que la session soit créée
    setRememberMe(remember)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (!error) lastOtpSentAtRef.current = Date.now()
    return { error: error ? new Error(sanitizeAuthError(error.message)) : null }
  }

  // ─── OAuth social (stub) ─────────────────────────────────────────────────
  // TODO [BACKEND], Implémenter avec supabase.auth.signInWithOAuth() :
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
    // TODO [BACKEND], Remplacer par supabase.auth.signInWithOAuth (voir commentaire ci-dessus)
    return { success: false, error: 'Connexion sociale bientôt disponible' }
  }

  // ─── Vérification OTP ────────────────────────────────────────────────────
  //
  // V1.0.4 fix critique : on update le state IMMEDIATEMENT apres verifyOtp
  // au lieu d attendre que onAuthStateChange propage. Avant ce fix, le user
  // entrait son code et restait bloque sur la page de verif jusqu a F5
  // manuel (le navigate vers /home arrivait avant que isAuthenticated=true
  // soit propage, donc le guard renvoyait vers /login).
  async function verifyOtp(email: string, token: string) {
    if (!supabase) return { error: new Error('Supabase not configured') }
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    if (error) {
      return { error: new Error(error.message) }
    }
    // Update state synchrone depuis la response, evite la race condition
    const user = data.session?.user ?? data.user ?? null
    const session = data.session ?? null
    const profile = user ? await fetchProfile(user.id) : null
    setState(deriveState({ user, session, profile, isLoading: false, isAuthenticated: !!user }))
    return { error: null }
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
    // Purge systématique côté client (les deux storages + flag remember)
    // même si la révocation serveur a réussi, pour garantir qu'aucune trace
    // ne subsiste (cas multi-onglets, onglet "privé", etc.)
    clearAuthStorage()
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

// Le hook `useAuth` est défini dans `authContextObject.ts` et re-exporté en
// haut de ce module, ce qui garde l'import `@/contexts/AuthContext` stable.
