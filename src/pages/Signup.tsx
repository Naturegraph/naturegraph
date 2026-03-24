import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import logoColor from '@/assets/logos/logo-simplified-color.svg'
import missionObserver from '@/assets/images/mission-observer.png'

export default function Signup() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signInWithOtp } = useAuth()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    const { error } = await signInWithOtp(email)
    if (error) {
      setError(t('auth.errors.generic'))
      setIsLoading(false)
      return
    }
    navigate('/verify', { state: { email } })
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--color-bg-primary)]">
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
            <Input
              label={t('auth.email')}
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button type="submit" size="lg" isLoading={isLoading} className="w-full">
              {t('auth.signup')}
            </Button>

            <p className="text-center">
              <Link
                to="/login"
                className="text-sm font-medium text-[var(--color-primary)] hover:underline"
              >
                {t('auth.login')}
              </Link>
            </p>
          </form>

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
            <SocialButton label="Google" icon="google" />
            <SocialButton label="Apple" icon="apple" />
            <SocialButton label="Facebook" icon="facebook" />
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
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-4 py-3 flex items-center gap-3">
            <span className="text-xs text-white/70">Credit photo</span>
            <span className="text-sm text-white">@emie_photographie_nature</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SocialButton({ label, icon }: { label: string; icon: string }) {
  const iconMap: Record<string, string> = {
    google: 'G',
    apple: '\uF8FF',
    facebook: 'f',
  }

  return (
    <button
      type="button"
      className="flex-1 flex items-center justify-center h-16 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg-secondary)] transition-colors"
      aria-label={`Continuer avec ${label}`}
    >
      <span className="text-lg font-bold text-[var(--color-text-primary)]">{iconMap[icon]}</span>
    </button>
  )
}
