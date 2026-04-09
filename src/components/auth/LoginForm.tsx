/**
 * LoginForm — Connexion Naturegraph via OTP
 *
 * Flux : email → code OTP reçu par mail → vérification → accès.
 * Identique au signup (Supabase signInWithOtp fonctionne pour les
 * comptes existants ET les nouveaux — pas de mot de passe).
 *
 * Wrapper léger autour de AuthForm (organism partagé avec SignupForm).
 */

import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { AuthForm, type AuthSubmitResult } from './AuthForm'

interface LoginFormProps {
  onSwitchToSignup: () => void
  /** Appelé après envoi OTP — reçoit l'email pour afficher VerificationForm */
  onSuccess?: (email: string) => void
  onNavigateToLanding?: () => void
  onDiscoverAsGuest?: () => void
}

export function LoginForm({
  onSwitchToSignup,
  onSuccess,
  onNavigateToLanding,
  onDiscoverAsGuest,
}: LoginFormProps) {
  const { t } = useTranslation()
  const { signInWithOtp } = useAuth()

  async function handleLogin(value: string): Promise<AuthSubmitResult> {
    const result = await signInWithOtp(value)
    if (result.error) {
      return { success: false, error: result.error.message }
    }
    onSuccess?.(value)
    return { success: true }
  }

  return (
    <AuthForm
      title={t('auth.login.title')}
      description={t('auth.login.description')}
      inputLabel={t('auth.login.emailLabel')}
      inputType="email"
      submitLabel={t('auth.login.connect')}
      guestLabel={t('auth.login.discoverWithout')}
      switchPrompt={t('auth.login.noAccount')}
      switchLabel={t('auth.login.signup')}
      orContinueLabel={t('auth.login.orContinueWith')}
      onSubmit={handleLogin}
      onSwitch={onSwitchToSignup}
      onDiscoverAsGuest={onDiscoverAsGuest}
      onNavigateToLanding={onNavigateToLanding}
    />
  )
}
