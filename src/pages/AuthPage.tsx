/**
 * AuthPage — Page d'authentification unifiée
 *
 * Gère tous les modes en un seul composant :
 *  signup → verification → onboarding
 *  login  → verification → home (si déjà onboardé)
 *
 * Adapté du design Figma Make — design system Naturegraph appliqué.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotification } from '@/contexts/NotificationContext'
import { SignupForm, LoginForm, VerificationForm, AuthPatterns } from '@/components/auth'
import OnboardingComponent from '@/components/onboarding'

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthMode = 'signup' | 'login' | 'verification' | 'onboarding'

interface AuthPageProps {
  /** Mode initial — 'signup' par défaut */
  initialMode?: 'signup' | 'login'
  /** Callback externe pour naviguer vers la landing (optionnel — useNavigate par défaut) */
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
  const { user, completeOnboarding } = useAuth()
  const { success, error: notifyError } = useNotification()

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [initialAuthMode, setInitialAuthMode] = useState<'signup' | 'login'>(initialMode)
  const [pendingEmail, setPendingEmail] = useState('')

  // Raccourcis de navigation avec fallback useNavigate
  const goto = {
    landing: () => (onNavigateToLanding ? onNavigateToLanding() : navigate('/')),
    home: () => (onAuthComplete ? onAuthComplete() : navigate('/home')),
    guest: () => (onDiscoverAsGuest ? onDiscoverAsGuest() : navigate('/home')),
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSignupSuccess(email: string) {
    setPendingEmail(email)
    setInitialAuthMode('signup')
    setMode('verification')
    success(t('auth.success.codeSent'), t('auth.success.codeSentDescription'))
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleLoginSuccess(_email: string) {
    // Connexion par mot de passe — pas d'OTP nécessaire, aller directement à l'accueil
    success(t('auth.success.loginTitle'), t('auth.success.loginDescription'))
    goto.home()
  }

  function handleVerificationSuccess() {
    if (initialAuthMode === 'signup') {
      setMode('onboarding')
    } else if (user && !user.user_metadata?.onboarding_completed) {
      // Utilisateur existant sans onboarding → onboarding aussi
      setMode('onboarding')
    } else {
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
      data-theme="light"
      className={`flex items-center justify-center min-h-screen w-full relative overflow-hidden ${
        mode === 'onboarding' ? 'bg-warm-beige' : 'bg-off-white md:bg-teal-dark'
      }`}
    >
      {/* Motifs décoratifs desktop (hors onboarding) */}
      {mode !== 'onboarding' && (
        <div className="hidden lg:block absolute inset-0 pointer-events-none">
          <div className="relative size-full max-w-[1728px] mx-auto">
            <AuthPatterns />
          </div>
        </div>
      )}

      {/* Contenu avec transitions fluides */}
      <div className="relative z-10 w-full md:w-auto flex items-center justify-center md:p-6">
        <AnimatePresence mode="wait">
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
