/**
 * SignupForm — Formulaire d'inscription Naturegraph
 * Layout : card 2 colonnes (formulaire 512px + photo héro 512px en desktop).
 * Adapté du design Figma Make — design system Naturegraph appliqué.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Logo } from './Logo'
import { AuthInput } from './AuthInput'
import { AuthButton } from './AuthButton'
import { SocialButton } from './SocialButton'
import { AuthHeroPhoto } from './AuthHeroPhoto'

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
  const { signUp, signInWithSocial } = useAuth()

  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const value = emailOrPhone.trim()
    if (!value) {
      setError(t('auth.errors.required'))
      return
    }

    setIsLoading(true)
    const result = await signUp(value)
    setIsLoading(false)

    if (result.success) {
      onSuccess?.(value)
    } else {
      setError(result.error ?? t('auth.errors.generic'))
    }
  }

  async function handleSocialLogin(provider: 'google' | 'apple' | 'facebook') {
    setIsLoading(true)
    const result = await signInWithSocial(provider)
    setIsLoading(false)
    if (!result.success) {
      setError(result.error ?? t('auth.errors.generic'))
    }
  }

  return (
    <div className="flex items-center overflow-hidden relative rounded-card md:rounded-[32px] md:h-[832px] w-full md:w-auto">
      {/* ── Colonne formulaire ─────────────────────────────────────────────── */}
      <div className="bg-off-white flex flex-col gap-6 md:gap-8 items-start justify-center overflow-hidden p-6 md:p-16 h-full w-full md:w-[512px]">
        <Logo onNavigateToLanding={onNavigateToLanding} />

        {/* Titre & description */}
        <div className="flex flex-col gap-3 items-start w-full">
          <h2 className="text-foreground">{t('auth.signup.title')}</h2>
          <p className="text-text-dark text-base">{t('auth.signup.description')}</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-start w-full">
          <AuthInput
            label={t('auth.signup.emailLabel')}
            helperText={t('auth.signup.emailHelper')}
            isRequired
            type="text"
            inputMode="email"
            autoComplete="email"
            value={emailOrPhone}
            onChange={(e) => {
              setEmailOrPhone(e.target.value)
              setError('')
            }}
            error={error}
            disabled={isLoading}
          />

          <div className="flex flex-col gap-3 items-center w-full">
            <AuthButton type="submit" isLoading={isLoading}>
              {t('auth.signup.createAccount')}
            </AuthButton>
            <AuthButton
              type="button"
              variant="secondary"
              onClick={onDiscoverAsGuest}
              disabled={isLoading}
            >
              {t('auth.signup.discoverWithout')}
            </AuthButton>
          </div>
        </form>

        {/* Séparateur */}
        <div className="relative w-full grid grid-cols-1 grid-rows-1 items-center">
          <div className="row-start-1 col-start-1 h-0 w-full">
            <div className="relative">
              <div className="h-px w-full bg-[var(--color-border)]" />
            </div>
          </div>
          <div className="row-start-1 col-start-1 bg-off-white flex h-8 items-center justify-center px-3 mx-auto rounded-full">
            <p className="text-text-dark text-sm">{t('auth.signup.orContinueWith')}</p>
          </div>
        </div>

        {/* Boutons sociaux */}
        <div className="flex gap-4 items-center w-full">
          <SocialButton
            provider="google"
            onClick={() => handleSocialLogin('google')}
            disabled={isLoading}
          />
          <SocialButton
            provider="apple"
            onClick={() => handleSocialLogin('apple')}
            disabled={isLoading}
          />
          <SocialButton
            provider="facebook"
            onClick={() => handleSocialLogin('facebook')}
            disabled={isLoading}
          />
        </div>

        {/* Lien vers login */}
        <div className="flex gap-1 items-center text-text-dark text-sm">
          <p>{t('auth.signup.alreadyAccount')}</p>
          <button
            type="button"
            onClick={onSwitchToLogin}
            disabled={isLoading}
            className="text-primary underline hover:opacity-80 active:opacity-60 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('auth.signup.login')}
          </button>
        </div>
      </div>

      {/* ── Colonne photo héro (desktop uniquement) ────────────────────────── */}
      <AuthHeroPhoto />
    </div>
  )
}
