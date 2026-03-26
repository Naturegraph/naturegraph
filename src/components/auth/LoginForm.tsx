/**
 * LoginForm — Formulaire de connexion Naturegraph
 *
 * Layout  : colonne formulaire 512px + colonne photo 512px (desktop).
 * Champs  : email/username + mot de passe avec toggle visibilité (Eye/EyeOff).
 * Options : checkbox "Se souvenir de moi" + lien "Mot de passe oublié ?".
 * CSS     : pill inputs (rounded-button), bg-off-white, border-[0.5px] border-border.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Logo } from './Logo'
import { AuthInput } from './AuthInput'
import { AuthButton } from './AuthButton'
import { SocialButton } from './SocialButton'
import { AuthHeroPhoto } from './AuthHeroPhoto'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoginFormProps {
  onSwitchToSignup: () => void
  /** Appelé après une connexion réussie — reçoit l'identifiant saisi */
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
  const { signIn, signInWithSocial } = useAuth()

  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const identifier = emailOrUsername.trim()
    if (!identifier || !password) {
      setError(t('auth.errors.required'))
      return
    }

    setIsLoading(true)
    const result = await signIn(identifier, password)
    setIsLoading(false)

    if (result.success) {
      onSuccess?.(identifier)
    } else {
      setError(result.error ?? t('auth.errors.generic'))
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

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-start w-full">
          {/* Champ email / nom d'utilisateur */}
          <AuthInput
            label={t('auth.login.emailLabel')}
            isRequired
            type="text"
            inputMode="email"
            autoComplete="username"
            value={emailOrUsername}
            onChange={(e) => {
              setEmailOrUsername(e.target.value)
              setError('')
            }}
            error={error}
            disabled={isLoading}
          />

          {/* Champ mot de passe + toggle visibilité */}
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-semibold text-[var(--color-text-primary)] leading-none">
              {t('auth.login.passwordLabel')}
              <span className="text-[var(--color-error)] ml-0.5" aria-hidden="true">
                *
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                disabled={isLoading}
                required
                className={`h-12 w-full rounded-button border-[0.5px] px-6 pr-14 text-base bg-off-white text-foreground placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset focus:border-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  error ? 'border-[var(--color-error)]' : 'border-border'
                }`}
              />
              {/* Bouton toggle œil */}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={isLoading}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-foreground hover:opacity-70 active:opacity-50 transition-opacity disabled:opacity-50"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Se souvenir de moi + Mot de passe oublié */}
          <div className="flex items-center justify-between w-full">
            {/* Checkbox "Se souvenir de moi" */}
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  className="peer sr-only"
                />
                {/* Fond visuel de la checkbox */}
                <div
                  className={`size-5 rounded border transition-all duration-200 flex items-center justify-center
                    peer-focus:ring-2 peer-focus:ring-primary peer-focus:ring-offset-2
                    group-hover:border-primary
                    ${rememberMe ? 'bg-primary border-primary' : 'bg-off-white border-foreground'}
                    peer-disabled:opacity-50`}
                />
                {/* Coche SVG — visible quand checked */}
                {rememberMe && (
                  <svg
                    className="absolute w-3 h-3 text-white pointer-events-none"
                    viewBox="0 0 12 10"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M1 5L4.5 8.5L11 1"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span className="text-base text-text-dark group-hover:text-foreground transition-colors peer-disabled:opacity-50">
                {t('auth.login.rememberMe')}
              </span>
            </label>

            {/* Lien "Mot de passe oublié ?" */}
            <button
              type="button"
              disabled={isLoading}
              className="text-base text-primary underline decoration-solid font-bold hover:opacity-80 active:opacity-60 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('auth.login.forgotPassword')}
            </button>
          </div>

          {/* Boutons CTA */}
          <div className="flex flex-col gap-3 items-center w-full pt-1">
            <AuthButton type="submit" isLoading={isLoading}>
              {t('auth.login.connect')}
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
