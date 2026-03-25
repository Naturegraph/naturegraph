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
import heroPhoto from '@/assets/images/mission-observer.png'

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
      <div className="hidden lg:flex relative h-full shrink-0 w-[512px]">
        <img
          src={heroPhoto}
          alt="Nature photography"
          className="absolute inset-0 w-full h-full object-cover rounded-r-[32px]"
        />

        {/* Crédit photo */}
        <div className="absolute bg-[rgba(12,12,20,0.32)] bottom-4 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg">
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-2 items-center">
              <InstagramIcon />
              <p className="italic text-text-light text-[12px] tracking-wide">
                {t('auth.signup.photoCredit')}
              </p>
            </div>
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

// ─── Icône Instagram ─────────────────────────────────────────────────────────

function InstagramIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className="text-text-light shrink-0"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}
