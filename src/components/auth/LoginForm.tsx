/**
 * LoginForm — Connexion Naturegraph via OTP
 *
 * Flux : email → code OTP reçu par mail → vérification → accès.
 * Identique au signup (Supabase signInWithOtp fonctionne pour les
 * comptes existants ET les nouveaux — pas de mot de passe).
 *
 * Layout : colonne formulaire 512px + colonne photo 512px (desktop).
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Logo } from './Logo'
import { AuthInput } from './AuthInput'
import { SocialButton } from './SocialButton'
import { AuthHeroPhoto } from './AuthHeroPhoto'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoginFormProps {
  onSwitchToSignup: () => void
  /** Appelé après envoi OTP — reçoit l'email pour afficher VerificationForm */
  onSuccess?: (email: string) => void
  onNavigateToLanding?: () => void
  onDiscoverAsGuest?: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LoginForm({
  onSwitchToSignup,
  onSuccess,
  onNavigateToLanding,
  onDiscoverAsGuest,
}: LoginFormProps) {
  const { t } = useTranslation()
  // signInWithOtp envoie un code OTP même pour un compte existant
  const { signInWithOtp, signInWithSocial } = useAuth()

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const value = email.trim()
    if (!value) {
      setError(t('auth.errors.required'))
      return
    }

    setIsLoading(true)
    const result = await signInWithOtp(value)
    setIsLoading(false)

    if (!result.error) {
      onSuccess?.(value)
    } else {
      setError(result.error.message ?? t('auth.errors.generic'))
    }
  }

  // ── Social ─────────────────────────────────────────────────────────────────

  async function handleSocialLogin(provider: 'google' | 'apple' | 'facebook') {
    setIsLoading(true)
    const result = await signInWithSocial(provider)
    setIsLoading(false)
    if (!result.success) {
      setError(result.error ?? t('auth.errors.generic'))
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex items-center overflow-hidden relative rounded-card md:rounded-[32px] md:h-[832px] w-full md:w-auto">
      {/* ── Colonne formulaire ────────────────────────────────────────────── */}
      <div className="bg-off-white flex flex-col gap-6 md:gap-8 items-start justify-center overflow-hidden p-6 md:p-16 h-full w-full md:w-[512px]">
        <Logo onNavigateToLanding={onNavigateToLanding} />

        {/* Titre & description */}
        <div className="flex flex-col gap-3 items-start w-full">
          <h2 className="text-foreground">{t('auth.login.title')}</h2>
          <p className="text-text-dark text-base">{t('auth.login.description')}</p>
        </div>

        {/* Formulaire — uniquement l'email, le code arrive par mail */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-start w-full">
          <AuthInput
            label={t('auth.login.emailLabel')}
            isRequired
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
            error={error}
            disabled={isLoading}
          />

          {/* Boutons CTA */}
          <div className="flex flex-col gap-3 items-center w-full pt-1">
            <Button type="submit" className="w-full" isLoading={isLoading}>
              {t('auth.login.connect')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onDiscoverAsGuest}
              disabled={isLoading}
            >
              {t('auth.login.discoverWithout')}
            </Button>
          </div>
        </form>

        {/* Séparateur "ou continuer avec" */}
        <div className="relative w-full grid grid-cols-1 grid-rows-1 items-center">
          <div className="row-start-1 col-start-1 h-px w-full bg-[var(--color-border)]" />
          <div className="row-start-1 col-start-1 bg-off-white flex h-8 items-center justify-center px-3 mx-auto rounded-full">
            <p className="text-text-dark text-base">{t('auth.login.orContinueWith')}</p>
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
        <div className="flex gap-1 items-center text-text-dark text-base pb-0.5">
          <p>{t('auth.login.noAccount')}</p>
          <button
            type="button"
            onClick={onSwitchToSignup}
            disabled={isLoading}
            className="text-primary underline decoration-solid font-bold hover:opacity-80 active:opacity-60 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('auth.login.signup')}
          </button>
        </div>
      </div>

      {/* ── Colonne photo héro (desktop uniquement) ──────────────────────── */}
      <AuthHeroPhoto />
    </div>
  )
}
