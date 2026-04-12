/**
 * SignupForm — Inscription Naturegraph via OTP
 *
 * Wrapper léger autour de AuthForm (organism partagé avec LoginForm).
 */

import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { AuthForm, type AuthSubmitResult } from './AuthForm'

interface SignupFormProps {
  onSwitchToLogin: () => void
  onSuccess?: (email: string) => void
  onNavigateToLanding?: () => void
  onDiscoverAsGuest?: () => void
}

export function SignupForm({
  onSwitchToLogin,
  onSuccess,
  onNavigateToLanding,
  onDiscoverAsGuest,
}: SignupFormProps) {
  const { t } = useTranslation()
  const { signUp } = useAuth()

  async function handleSignup(value: string): Promise<AuthSubmitResult> {
    const result = await signUp(value)
    if (!result.success) {
      return { success: false, error: result.error }
    }
    onSuccess?.(value)
    return { success: true }
  }

  return (
    <AuthForm
      title={t('auth.signup.title')}
      description={t('auth.signup.description')}
      inputLabel={t('auth.signup.emailLabel')}
      inputHelperText={t('auth.signup.emailHelper')}
      inputType="text"
      submitLabel={t('auth.signup.createAccount')}
      guestLabel={t('auth.signup.discoverWithout')}
      switchPrompt={t('auth.signup.alreadyAccount')}
      switchLabel={t('auth.signup.login')}
      orContinueLabel={t('auth.signup.orContinueWith')}
      onSubmit={handleSignup}
      onSwitch={onSwitchToLogin}
      onDiscoverAsGuest={onDiscoverAsGuest}
      onNavigateToLanding={onNavigateToLanding}
    />
  )
}
