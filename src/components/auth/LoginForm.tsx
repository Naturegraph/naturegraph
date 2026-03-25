/**
 * LoginForm — Formulaire de connexion Naturegraph
 * Même layout que SignupForm — magic link OTP.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Logo } from './Logo'
import { AuthInput } from './AuthInput'
import { AuthButton } from './AuthButton'
import { SocialButton } from './SocialButton'
import heroPhoto from '@/assets/images/mission-observer.png'

interface LoginFormProps {
  onSwitchToSignup: () => void
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
    // signUp envoie un OTP — même endpoint pour login et signup
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
          <h2 className="text-foreground">{t('auth.login.title')}</h2>
          <p className="text-text-dark text-base">{t('auth.login.description')}</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-start w-full">
          <AuthInput
            label={t('auth.login.emailLabel')}
            helperText={t('auth.login.emailHelper')}
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
              {t('auth.login.login')}
            </AuthButton>
            <AuthButton
              type="button"
              variant="secondary"
              onClick={onDiscoverAsGuest}
              disabled={isLoading}
            >
              {t('auth.login.discoverWithout')}
            </AuthButton>
          </div>
        </form>

        {/* Séparateur */}
        <div className="relative w-full grid grid-cols-1 grid-rows-1 items-center">
          <div className="row-start-1 col-start-1 h-px w-full bg-[var(--color-border)]" />
          <div className="row-start-1 col-start-1 bg-off-white flex h-8 items-center justify-center px-3 mx-auto rounded-full">
            <p className="text-text-dark text-sm">{t('auth.login.orContinueWith')}</p>
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

        {/* Lien vers signup */}
        <div className="flex gap-1 items-center text-text-dark text-sm">
          <p>{t('auth.login.noAccount')}</p>
          <button
            type="button"
            onClick={onSwitchToSignup}
            disabled={isLoading}
            className="text-primary underline hover:opacity-80 active:opacity-60 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('auth.login.signup')}
          </button>
        </div>
      </div>

      {/* ── Colonne photo héro (desktop uniquement) ────────────────────────── */}
      <div className="hidden lg:flex relative h-full shrink-0 w-[512px]">
        <img
          src={heroPhoto}
          alt="Nature photography"
          className="absolute inset-0 w-full h-full object-cover rounded-r-[32px]"
        />
        <div className="absolute bg-[rgba(12,12,20,0.32)] bottom-4 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg">
          <div className="flex gap-2 items-center">
            <span className="text-text-light text-xs italic">{t('auth.signup.photoCredit')}</span>
            <a
              href="https://www.instagram.com/emie_photographie_nature"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-text-light text-sm underline hover:opacity-80 transition-opacity"
            >
              {t('auth.signup.photographer')}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
