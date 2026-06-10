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
import { useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { setRememberMe, clearAuthStorage, hasStoredAuthToken } from '@/lib/authStorage'
import { authBreadcrumb } from '@/lib/monitoring'
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Borne une promesse : rejette apres `ms` si elle n'a pas resolu (NG-038).
 * Evite que le boot d'auth pende indefiniment sur un reseau lent / une requete
 * Supabase qui ne se regle jamais -> on aboutit TOUJOURS a une conclusion.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (v) => {
        clearTimeout(id)
        resolve(v)
      },
      (e) => {
        clearTimeout(id)
        reject(e)
      },
    )
  })
}

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
  const queryClient = useQueryClient()
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

    // NG-038 : un token est-il deja persiste (synchrone, sans reseau) ?
    // Tant qu'il existe, on ne conclut JAMAIS "deconnecte" -> on attend / on
    // reessaie la restauration (cause racine du faux etat deconnecte).
    const hasStoredToken = hasStoredAuthToken()
    authBreadcrumb('boot.start', { hasStoredToken })

    // Fail-safe boot : evite de figer l'app sur le spinner si l'init bloque.
    // NG-038 token-aware : avec un token stocke, on NE debloque PAS en mode
    // "deconnecte" (sinon Landing avant feed). handleAuthBoot reste seul juge
    // et debloquera avec le bon etat (ou purgera un token mort). Sans token,
    // l'utilisateur est bien anonyme -> on debloque.
    const bootTimeout = setTimeout(() => {
      setState((prev) => {
        if (!prev.isLoading) return prev
        if (hasStoredToken) {
          authBreadcrumb('boot.failsafe.kept-loading (token present)')
          return prev
        }
        authBreadcrumb('boot.failsafe.anonymous (no token)')
        return { ...prev, isLoading: false }
      })
    }, 5000)

    /**
     * BATCH 103 : detection refresh token mort (sessions revoquees, expire).
     * On purge le storage + signOut local pour eviter une boucle de retry.
     */
    function isInvalidRefreshTokenError(err: unknown): boolean {
      if (!err || typeof err !== 'object') return false
      const msg = String((err as { message?: string }).message ?? '')
      return /refresh token (not found|expired|invalid)/i.test(msg)
    }

    // Purge propre d'un token mort -> etat anonyme deterministe.
    async function purgeAndAnonymous() {
      clearAuthStorage()
      await supabase!.auth.signOut({ scope: 'local' }).catch(() => {})
      clearTimeout(bootTimeout)
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

    // Profil avec timeout + 1 retry : le boot ne doit jamais pendre sur un
    // reseau lent. Retourne null si indisponible apres les tentatives.
    async function fetchProfileBounded(userId: string): Promise<Profile | null> {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          return await withTimeout(fetchProfile(userId), 4000)
        } catch {
          if (attempt === 0) authBreadcrumb('boot.profile.retry')
        }
      }
      return null
    }

    // Re-essaie le profil en arriere-plan (reseau KO au boot) sans bloquer l'UI.
    function retryProfileInBackground(userId: string) {
      let tries = 0
      const tick = () => {
        tries += 1
        fetchProfile(userId)
          .then((profile) => {
            if (profile) {
              authBreadcrumb('boot.profile.recovered-bg')
              setState((prev) =>
                prev.user?.id === userId ? deriveState({ ...prev, profile }) : prev,
              )
            } else if (tries < 4) {
              setTimeout(tick, 3000)
            }
          })
          .catch(() => {
            if (tries < 4) setTimeout(tick, 3000)
          })
      }
      setTimeout(tick, 2000)
    }

    async function handleAuthBoot() {
      try {
        const { data, error } = await withTimeout(supabase!.auth.getSession(), 4000)
        if (error && isInvalidRefreshTokenError(error)) {
          authBreadcrumb('boot.invalid-refresh-token -> purge')
          await purgeAndAnonymous()
          return
        }

        const session = data?.session ?? null
        const user = session?.user ?? null

        if (!user) {
          authBreadcrumb('boot.no-session -> anonymous')
          clearTimeout(bootTimeout)
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

        // Session valide -> on hydrate le profil (borne).
        const profile = await fetchProfileBounded(user.id)
        clearTimeout(bootTimeout)
        if (profile) {
          authBreadcrumb('boot.authenticated')
          setState(deriveState({ user, session, profile, isLoading: false, isAuthenticated: true }))
        } else {
          // Profil indisponible (reseau) : on authentifie quand meme et on
          // assume l'onboarding fait. NE JAMAIS forcer l'onboarding sur un
          // echec reseau transitoire -> retry profil en arriere-plan.
          authBreadcrumb('boot.authenticated-without-profile (optimistic)')
          setState({
            user,
            session,
            profile: null,
            isLoading: false,
            isAuthenticated: true,
            onboardingCompleted: true,
          })
          retryProfileInBackground(user.id)
        }
      } catch (err) {
        if (isInvalidRefreshTokenError(err)) {
          authBreadcrumb('boot.invalid-refresh-token(catch) -> purge')
          await purgeAndAnonymous()
          return
        }
        // getSession a timeout / echoue. NG-038 : si un token existe, on NE
        // conclut PAS "deconnecte" -> on tente un refresh explicite borne.
        if (hasStoredToken) {
          authBreadcrumb('boot.getSession-failed-with-token -> refresh retry', {
            err: String(err),
          })
          try {
            const { data } = await withTimeout(supabase!.auth.refreshSession(), 6000)
            const session = data?.session ?? null
            const user = session?.user ?? null
            if (user) {
              const profile = await fetchProfileBounded(user.id)
              clearTimeout(bootTimeout)
              if (profile) {
                setState(
                  deriveState({ user, session, profile, isLoading: false, isAuthenticated: true }),
                )
              } else {
                setState({
                  user,
                  session,
                  profile: null,
                  isLoading: false,
                  isAuthenticated: true,
                  onboardingCompleted: true,
                })
                retryProfileInBackground(user.id)
              }
              return
            }
          } catch (refreshErr) {
            if (isInvalidRefreshTokenError(refreshErr)) {
              await purgeAndAnonymous()
              return
            }
          }
          // Refresh KO (sans "token mort" explicite) : on purge pour repartir
          // propre (l'user re-OTP) plutot que de rester coince sur un spinner.
          authBreadcrumb('boot.refresh-retry-failed -> purge')
          await purgeAndAnonymous()
        } else {
          authBreadcrumb('boot.getSession-failed-no-token -> anonymous')
          clearTimeout(bootTimeout)
          setState((prev) => ({ ...prev, isLoading: false }))
        }
      }
    }

    void handleAuthBoot()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // V1.1.4 NG-004B round 12 (Nicolas 2026-06-03) : BUG critique session PWA.
      // On IGNORE l'event INITIAL_SESSION. Le boot est gere exclusivement par
      // handleAuthBoot() via getSession(), qui rafraichit l'access token si
      // necessaire (cas reouverture PWA apres plusieurs heures/jours : l'access
      // token est expire mais le refresh token valide 30j permet de restaurer).
      // Avant ce fix, onAuthStateChange recevait un INITIAL_SESSION avec
      // session=null transitoire (avant resolution du storage/refresh) et
      // mettait isLoading=false + isAuthenticated=false -> la Landing
      // s'affichait au lieu du feed, et il fallait un refresh manuel pour que
      // getSession recupere la vraie session. En laissant getSession seul
      // gerer le boot, l'utilisateur deja connecte arrive directement sur le feed.
      if (event === 'INITIAL_SESSION') return

      // BATCH 103 : SIGNED_OUT déclenché par un refresh fail -> purge propre
      if (event === 'SIGNED_OUT') {
        clearAuthStorage()
        // NG-004 (2026-05-31) : nettoie le cache React Query au signOut.
        // Sans ce clear, le prochain user qui se connecte sur le meme
        // navigateur voit brievement les donnees de l ancien user (feed,
        // profil, notifications). C est une des sources principales de la
        // sensation "app cassee, faut refresh" rapportee par les beta-testers.
        queryClient.clear()
      }
      const user = session?.user ?? null
      const profile = user ? await fetchProfile(user.id) : null
      setState(deriveState({ user, session, profile, isLoading: false, isAuthenticated: !!user }))
      // NG-004 : au login fresh, invalide aussi les queries pour repartir
      // sur des donnees propres (au cas ou un cache fantome aurait survecu).
      if (event === 'SIGNED_IN') {
        queryClient.invalidateQueries()
      }
      // V1.1.1 : pre-chauffe RPC search_taxonomy apres login pour eviter le
      // cold start serverless lors de la 1ere recherche d especes. Best-effort.
      if (user && event === 'SIGNED_IN') {
        import('@/services/searchService')
          .then(({ warmupTaxonomySearch }) => warmupTaxonomySearch())
          .catch(() => {})
      }
    })

    // NG-004 (2026-05-31) : sync auth entre onglets via storage event.
    // Si l user signOut dans l onglet A, l onglet B detecte le changement
    // sur localStorage et se met a jour aussi. Idem pour login.
    function handleStorageChange(e: StorageEvent) {
      if (e.key === 'naturegraph-auth' || e.key === null) {
        // Refresh la session pour propager l etat aux autres onglets.
        // getSession lit le storage et trigger onAuthStateChange si necessaire.
        supabase?.auth.getSession().catch(() => {})
      }
    }
    window.addEventListener('storage', handleStorageChange)

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

    // V1.1.4 NG-004 Phase 1 (Nicolas 2026-05-31) : refresh proactif quand
    // l user revient sur l onglet apres une longue absence (visibility change).
    // Symptome NG-004 #2/#3 : session instable apres 30 min usage / perte
    // d etat authentifie. Cause probable : token expire pendant l absence
    // mais le refresh interval ne se declenche que toutes les 30 min.
    // Solution : au visibility change visible, on force un refresh session
    // si la derniere mise a jour date de > 10 min.
    let lastSessionCheck = Date.now()
    function handleVisibility() {
      if (document.visibilityState !== 'visible') return
      const elapsed = Date.now() - lastSessionCheck
      if (elapsed < 10 * 60 * 1000) return
      lastSessionCheck = Date.now()
      supabase?.auth.refreshSession().catch(async (err) => {
        if (isInvalidRefreshTokenError(err)) {
          console.warn('[Auth] Refresh token mort au retour de tab -> signOut')
          clearAuthStorage()
          await supabase!.auth.signOut({ scope: 'local' }).catch(() => {})
        }
      })
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearTimeout(bootTimeout)
      subscription.unsubscribe()
      clearInterval(refreshInterval)
      window.removeEventListener('storage', handleStorageChange)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
