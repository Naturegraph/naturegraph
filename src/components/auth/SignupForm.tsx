/**
 * SignupForm : Inscription Naturegraph via OTP
 *
 * Wrapper léger autour de AuthForm (organism partagé avec LoginForm).
 */

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
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

  // Mention legale a l'inscription (NG-038) : acceptation CGU + Confidentialite,
  // et mention "acces anticipe / service tel quel" (protection juridique pendant
  // la phase de test). Liens cliquables vers /legal et /privacy. L'age minimum
  // (13 ans) reste defini dans les CGU, pas affiche ici (demande Nicolas).
  const linkClass =
    'underline text-[var(--color-action-default)] hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] rounded'
  const legalNotice = (
    <p className="m-0">
      {t('auth.signup.legalIntro', { defaultValue: 'En créant ton compte, tu acceptes nos' })}{' '}
      <Link to="/legal" className={linkClass}>
        {t('auth.signup.legalTerms', { defaultValue: "conditions d'utilisation" })}
      </Link>{' '}
      {t('auth.signup.legalAnd', { defaultValue: 'et notre' })}{' '}
      <Link to="/privacy" className={linkClass}>
        {t('auth.signup.legalPrivacy', { defaultValue: 'politique de confidentialité' })}
      </Link>
      {t('auth.signup.legalAge', {
        defaultValue: '.',
      })}{' '}
      {t('auth.signup.legalEarlyAccess', {
        defaultValue:
          'Naturegraph est en accès anticipé (phase de test) : le service est fourni tel quel, des imperfections peuvent subsister.',
      })}
    </p>
  )

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
      legalNotice={legalNotice}
    />
  )
}
