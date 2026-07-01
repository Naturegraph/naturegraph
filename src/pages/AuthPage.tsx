/**
 * AuthPage : Page d'authentification unifiée
 *
 * Gère tous les modes en un seul composant :
 *  signup → verification → onboarding
 *  login  → verification → home (si déjà onboardé)
 *
 * Adapté du design Figma Make : design system Naturegraph appliqué.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useBetaAccess } from '@/hooks/useBetaAccess'
import { SignupForm, LoginForm, VerificationForm } from '@/components/auth'
import { BetaKeyGate } from '@/components/auth/BetaKeyGate'
import { AuthOrbBackground, useAuthOrbTracking } from '@/components/auth/AuthOrbBackground'
import OnboardingComponent from '@/components/onboarding'
import { validateBetaKey } from '@/services/betaService'
import { recordSignupConsent } from '@/services/legalConsentService'
import { consumeInviteExpired, peekInviteExpired } from '@/lib/authUrlNotice'
import { OPEN_ACCESS_ENABLED } from '@/lib/featureFlags'

// ─── Types ────────────────────────────────────────────────────────────────────

// BATCH 30 / BETA_STRATEGY : mode 'beta-key' avant signup quand beta fermee.
// BATCH 48 : skip mode 'beta-key' si user a deja valide sa cle via /welcome
// (welcome screen est le point d'entree unique depuis BATCH 45). Le claim de
// la cle se fait silencieusement post-OTP via validateBetaKey().
type AuthMode = 'beta-key' | 'signup' | 'login' | 'verification' | 'onboarding'

// Gate beta au signup (saisie + claim d'une cle). Pilote par l'env
// VITE_BETA_GATE_ENABLED, et DESACTIVE des que l'acces ouvert (NG-029) est actif :
// en early access, l'inscription est libre, sans cle ni claim.
const BETA_GATE_ENABLED = !OPEN_ACCESS_ENABLED && import.meta.env.VITE_BETA_GATE_ENABLED === 'true'

interface AuthPageProps {
  /** Mode initial : 'signup' par défaut */
  initialMode?: 'signup' | 'login'
  /** Callback externe pour naviguer vers la landing (optionnel : useNavigate par défaut) */
  onNavigateToLanding?: () => void
  /** Callback externe à la fin de l'authentification (optionnel) */
  onAuthComplete?: () => void
  /** Callback pour le mode invité (optionnel) */
  onDiscoverAsGuest?: () => void
}

// ─── Transitions ─────────────────────────────────────────────────────────────

const slideVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

const slideTransition = { duration: 0.3, ease: 'easeInOut' as const }

// ─── Component ───────────────────────────────────────────────────────────────

export default function AuthPage({
  initialMode = 'signup',
  onNavigateToLanding,
  onAuthComplete,
  onDiscoverAsGuest,
}: AuthPageProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { completeOnboarding, isAuthenticated, onboardingCompleted } = useAuth()
  const { success, error: notifyError } = useToast()
  const prefersReducedMotion = useReducedMotion()
  const { containerRef, mouse, handleMouseMove, handleMouseLeave } = useAuthOrbTracking()
  // BATCH 48 : si le user vient du welcome screen, il a deja valide sa cle.
  // On skip alors le BetaKeyGate intermediaire (qui ferait doublon UX).
  const { code: storedBetaCode, revokeAccess } = useBetaAccess()

  // BATCH 30 + 48 : mode 'beta-key' uniquement si beta gate active ET pas de cle stockee.
  // Le BetaAccessGuard (router-level) garantit deja qu'on a une cle valide,
  // donc en pratique storedBetaCode est presque toujours present ici.
  // Fallback 'beta-key' garde le filet de securite si le user arrive ici sans
  // passer par /welcome (cas degrade ou bypass du guard).
  const [mode, setMode] = useState<AuthMode>(() => {
    // Lien d'invitation expire/consomme : on demarre directement sur le signup
    // (acces ouvert). Le flag est consomme + le toast affiche dans l'effet plus bas.
    if (peekInviteExpired()) return 'signup'
    if (initialMode === 'signup' && BETA_GATE_ENABLED && !storedBetaCode) {
      return 'beta-key'
    }
    return initialMode
  })
  const [initialAuthMode, setInitialAuthMode] = useState<'signup' | 'login'>(initialMode)
  const [pendingEmail, setPendingEmail] = useState('')
  // BATCH 30 : keyId stocke apres validation beta : utile pour future traçabilite (Phase 2).
  const [, setValidatedKeyId] = useState<string | null>(null)

  // Raccourcis de navigation avec fallback useNavigate
  const goto = {
    landing: () => (onNavigateToLanding ? onNavigateToLanding() : navigate('/')),
    home: () => (onAuthComplete ? onAuthComplete() : navigate('/home')),
    guest: () => (onDiscoverAsGuest ? onDiscoverAsGuest() : navigate('/home')),
  }

  // V1.1.4 NG-004B (Nicolas 2026-06-01) : fallback navigate si on est en mode
  // verification ou onboarding et que isAuthenticated devient true. Cas typique :
  // l user valide son OTP, AuthContext.setState met isAuthenticated = true, mais
  // le navigate('/home') dans handleVerificationSuccess est interrompu par un
  // re-render (AnimatePresence, race condition motion, etc.) -> l user reste
  // bloque sur la page de verification jusqu a refresh manuel.
  // Cet effet detecte le cas et force la redirection.
  useEffect(() => {
    if (!isAuthenticated) return
    // Pas de redirect si on est dans le flow onboarding (l user a un compte
    // mais n a pas encore choisi son username / interets / etc).
    if (mode === 'onboarding') return
    if (mode === 'verification' && initialAuthMode === 'login') {
      const target = onboardingCompleted ? '/home' : '/onboarding'
      navigate(target, { replace: true })
    }
  }, [isAuthenticated, mode, initialAuthMode, onboardingCompleted, navigate])

  // Session expiree (NG-029) : l'ecran /welcome ayant ete supprime, c'est ici
  // (ecran de connexion) qu'on affiche le toast pose par assertActiveSession.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem('naturegraph-session-expired') === '1') {
        window.sessionStorage.removeItem('naturegraph-session-expired')
        notifyError(
          t('auth.sessionExpired.title', { defaultValue: 'Ta session a expiré' }),
          t('auth.sessionExpired.desc', {
            defaultValue: 'Reconnecte-toi avec ton email pour continuer.',
          }),
        )
      }
    } catch {
      // sessionStorage indisponible (Safari prive), on ignore
    }
  }, [notifyError, t])

  // Lien d'invitation / magic link deja consomme (pre-scan email) ou expire.
  // captureAuthUrlError() (main.tsx) a pose le flag au boot. En acces ouvert, pas
  // besoin de lien : on bascule sur le formulaire d'inscription et on explique.
  useEffect(() => {
    if (consumeInviteExpired()) {
      notifyError(
        t('auth.inviteExpired.title', { defaultValue: 'Ton lien d’invitation a expiré' }),
        t('auth.inviteExpired.desc', {
          defaultValue:
            "Pas de souci, l'accès est ouvert : crée ton compte ci-dessous pour rejoindre Naturegraph.",
        }),
      )
    }
  }, [notifyError, t])

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSignupSuccess(email: string) {
    setPendingEmail(email)
    setInitialAuthMode('signup')
    setMode('verification')
    success(t('auth.success.codeSent'), t('auth.success.codeSentDescription'))
  }

  function handleLoginSuccess(email: string) {
    // Connexion OTP : stocker l'email et afficher le formulaire de vérification
    setPendingEmail(email)
    setInitialAuthMode('login')
    setMode('verification')
    success(t('auth.success.codeSent'), t('auth.success.codeSentDescription'))
  }

  async function handleVerificationSuccess() {
    if (initialAuthMode === 'signup') {
      // NG-038 : le compte vient d'etre confirme (OTP verifie), on trace
      // l'acceptation des CGU + confidentialite affichee au signup. Best-effort :
      // n'interrompt jamais le flow (le compte est deja cree).
      void recordSignupConsent()
      // BATCH 48 : claim de la cle beta apres OTP verifie (signup confirme).
      // Le user a deja valide sa cle au welcome screen (readonly), maintenant
      // on consomme reellement (claim_beta_access_key incremente current_uses
      // + decrement quota global via Edge Function).
      // Si claim echoue (rare : cle expiree entre welcome et signup), on
      // affiche un toast mais on continue le flow (le compte est deja cree
      // dans Supabase Auth : pas de rollback).
      if (storedBetaCode && BETA_GATE_ENABLED) {
        const claimResult = await validateBetaKey(storedBetaCode)
        if (claimResult.valid && claimResult.key_id) {
          setValidatedKeyId(claimResult.key_id)
        } else {
          // Claim a echoue mais compte cree. Log + revoke access local.
          notifyError(
            t('auth.beta.claimWarning', {
              defaultValue: 'Compte cree mais validation cle echouee. Contacte le support.',
            }),
          )
          revokeAccess()
        }
      }
      setMode('onboarding')
    } else {
      // Login : vérifier si l'onboarding est terminé via le profil (username réel)
      // onboardingCompleted vient du AuthContext : basé sur le username dans le profil DB
      success(t('auth.success.loginTitle'), t('auth.success.loginDescription'))
      goto.home()
    }
  }

  async function handleOnboardingComplete() {
    try {
      await completeOnboarding()
      success(t('auth.success.signupTitle'), t('auth.success.signupDescription'))
      goto.home()
    } catch {
      notifyError(t('auth.errors.generic'))
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      data-theme="light"
      onMouseMove={prefersReducedMotion || mode === 'onboarding' ? undefined : handleMouseMove}
      onMouseLeave={prefersReducedMotion || mode === 'onboarding' ? undefined : handleMouseLeave}
      className={`flex items-center justify-center min-h-screen w-full relative overflow-hidden ${
        mode === 'onboarding' ? 'bg-warm-beige' : 'bg-off-white md:bg-teal-dark'
      }`}
    >
      {/* Orbes de gradient animées : desktop uniquement, désactivées en mode onboarding */}
      {mode !== 'onboarding' && !prefersReducedMotion && <AuthOrbBackground mouse={mouse} />}

      {/* Contenu avec transitions fluides */}
      <div className="relative z-10 w-full md:w-auto flex items-center justify-center md:p-6">
        <AnimatePresence mode="wait">
          {mode === 'beta-key' && (
            <motion.div key="beta-key" {...slideVariants} transition={slideTransition}>
              <BetaKeyGate
                onValidated={(keyId) => {
                  setValidatedKeyId(keyId)
                  setMode('signup')
                }}
                onSwitchToLogin={() => setMode('login')}
              />
            </motion.div>
          )}

          {mode === 'signup' && (
            <motion.div key="signup" {...slideVariants} transition={slideTransition}>
              <SignupForm
                onSwitchToLogin={() => setMode('login')}
                onSuccess={handleSignupSuccess}
                onNavigateToLanding={goto.landing}
                onDiscoverAsGuest={goto.guest}
              />
            </motion.div>
          )}

          {mode === 'login' && (
            <motion.div key="login" {...slideVariants} transition={slideTransition}>
              <LoginForm
                onSwitchToSignup={() => setMode('signup')}
                onSuccess={handleLoginSuccess}
                onNavigateToLanding={goto.landing}
                onDiscoverAsGuest={goto.guest}
              />
            </motion.div>
          )}

          {mode === 'verification' && (
            <motion.div key="verification" {...slideVariants} transition={slideTransition}>
              <VerificationForm
                email={pendingEmail}
                onBack={() => setMode(initialAuthMode)}
                onSuccess={handleVerificationSuccess}
                onNavigateToLanding={goto.landing}
              />
            </motion.div>
          )}

          {mode === 'onboarding' && (
            <motion.div
              key="onboarding"
              {...slideVariants}
              transition={slideTransition}
              className="w-full h-screen md:w-auto md:h-auto"
            >
              <OnboardingComponent
                onComplete={handleOnboardingComplete}
                onGoHome={goto.guest}
                onGoLogin={() => setMode('login')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
