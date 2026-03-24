import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import logoColor from '@/assets/logos/logo-simplified-color.svg'
import missionObserver from '@/assets/images/mission-observer.png'

export default function Signup() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signInWithOtp } = useAuth()
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = emailOrPhone.trim()
    if (!value) return

    setIsLoading(true)
    setError(null)

    const { error: authError } = await signInWithOtp(value)
    if (authError) {
      setError(t('auth.errors.generic'))
      setIsLoading(false)
      return
    }
    navigate('/verify', { state: { email: value } })
  }

  return (
    <div
      data-theme="light"
      className="min-h-screen flex flex-col lg:flex-row bg-[var(--color-bg-primary)]"
    >
      {/* Left panel — form */}
      <div className="flex-1 flex flex-col justify-between px-6 py-16 lg:px-16 lg:max-w-[512px] xl:max-w-[640px]">
        <div>
          {/* Logo */}
          <div className="mb-14">
            <img src={logoColor} alt="Naturegraph" className="h-8 w-auto" />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)] mb-3">
              {t('auth.signupTitle')}
            </h1>
            <p className="text-base text-[var(--color-text-secondary)] leading-relaxed max-w-md">
              {t('auth.signupSubtitle')}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="max-w-sm p-3 rounded-lg bg-[var(--color-error-bg)] text-[var(--color-error)] text-sm mb-4"
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="emailOrPhone"
                className="text-sm font-medium text-[var(--color-text-primary)]"
              >
                {t('auth.emailOrPhone')}
                <span className="text-[var(--color-error)] ml-0.5" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="emailOrPhone"
                type="text"
                inputMode="email"
                autoComplete="email"
                placeholder={t('auth.emailPlaceholder')}
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                required
                className="w-full px-4 py-3 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg transition-colors placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
              <p className="text-xs italic text-[var(--color-text-secondary)]">
                {t('auth.emailHelper')}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !emailOrPhone.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-base font-medium rounded-full bg-[var(--color-primary)] text-[var(--color-text-inverse)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              {isLoading && (
                <span
                  className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
              )}
              {t('auth.createAccount')}
            </button>
          </form>

          {/* Discover without account — guest mode entry */}
          <div className="mt-4 max-w-sm text-center">
            <Link
              to="/home"
              className="text-sm font-medium text-[var(--color-primary)] underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              {t('auth.discoverWithout')}
            </Link>
          </div>

          {/* Divider */}
          <div className="relative my-8 max-w-sm">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--color-border)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[var(--color-bg-primary)] px-4 text-sm text-[var(--color-text-tertiary)]">
                {t('auth.continueWith')}
              </span>
            </div>
          </div>

          {/* Social buttons */}
          <div className="flex gap-4 max-w-sm">
            <SocialButton provider="google" label="Google" />
            <SocialButton provider="apple" label="Apple" />
            <SocialButton provider="facebook" label="Facebook" />
          </div>
        </div>

        {/* Bottom link */}
        <div className="mt-12">
          <p className="text-sm text-[var(--color-text-secondary)]">{t('auth.hasAccount')}</p>
          <Link
            to="/login"
            className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
          >
            {t('auth.connectNow')}
          </Link>
        </div>
      </div>

      {/* Right panel — image (desktop only) */}
      <div className="hidden lg:block flex-1 relative bg-[var(--color-highlight-primary)] rounded-l-2xl overflow-hidden">
        <img
          src={missionObserver}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          aria-hidden="true"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-highlight-secondary)]/80 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <InstagramIcon />
              <span className="text-xs text-white/70">{t('auth.creditPhoto')}</span>
            </div>
            <span className="text-sm text-white">@emie_photographie_nature</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Social provider buttons                                            */
/* ------------------------------------------------------------------ */

function SocialButton({
  provider,
  label,
}: {
  provider: 'google' | 'apple' | 'facebook'
  label: string
}) {
  return (
    <button
      type="button"
      className="flex-1 flex items-center justify-center h-16 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg-secondary)] transition-colors"
      aria-label={`${label}`}
    >
      {provider === 'google' && <GoogleIcon />}
      {provider === 'apple' && <AppleIcon />}
      {provider === 'facebook' && <FacebookIcon />}
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className="text-[var(--color-text-primary)]"
    >
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        fill="#1877F2"
      />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className="text-white/70 shrink-0"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}
