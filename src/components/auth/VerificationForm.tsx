/**
 * VerificationForm — Saisie du code OTP à 6 chiffres
 * Auto-avance entre les champs, auto-submit, copier/coller, timer 2 min.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getDemoOtp } from '@/lib/demoAuth'
import { Logo } from './Logo'
import { AuthHeroPhoto } from './AuthHeroPhoto'

const CODE_LENGTH = 6
const TIMER_SECONDS = 120

interface VerificationFormProps {
  email: string
  onBack: () => void
  onSuccess?: () => void
  onNavigateToLanding?: () => void
}

export function VerificationForm({
  email,
  onBack,
  onSuccess,
  onNavigateToLanding,
}: VerificationFormProps) {
  const { t } = useTranslation()
  const { verifyOtp, signInWithOtp } = useAuth()

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [timer, setTimer] = useState(TIMER_SECONDS)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Hint OTP en mode démo — recalculé après chaque renvoi
  const [demoOtp, setDemoOtp] = useState<string | null>(() =>
    !isSupabaseConfigured ? getDemoOtp(email) : null,
  )

  // Countdown
  useEffect(() => {
    if (timer <= 0) return
    const interval = setInterval(() => setTimer((t) => t - 1), 1000)
    return () => clearInterval(interval)
  }, [timer])

  const formatTime = useCallback((seconds: number) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0')
    const s = String(seconds % 60).padStart(2, '0')
    return `${m}:${s}`
  }, [])

  function handleChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return

    const next = [...code]
    next[index] = value
    setCode(next)
    setError(null)

    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
    if (next.every((d) => d !== '')) {
      handleVerify(next.join(''))
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return

    const next = [...code]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setCode(next)

    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1)
    inputRefs.current[focusIndex]?.focus()

    if (next.every((d) => d !== '')) handleVerify(next.join(''))
  }

  async function handleVerify(fullCode: string) {
    if (isLoading) return

    setIsLoading(true)
    // Routé via le contexte — fonctionne en mode démo ET avec Supabase réel
    const { error: verifyError } = await verifyOtp(email, fullCode)
    setIsLoading(false)

    if (verifyError) {
      setCode(Array(CODE_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
      setError(t('auth.errors.invalidCode'))
      return
    }

    onSuccess?.()
  }

  async function handleResend() {
    setCode(Array(CODE_LENGTH).fill(''))
    setTimer(TIMER_SECONDS)
    setError(null)

    // Régénère le code OTP — fonctionne en mode démo et Supabase réel
    await signInWithOtp(email)

    // En mode démo : mettre à jour le hint OTP affiché dans l'UI
    if (!isSupabaseConfigured) {
      setDemoOtp(getDemoOtp(email))
    }

    inputRefs.current[0]?.focus()
  }

  return (
    <div className="flex items-center overflow-hidden relative rounded-card md:rounded-[32px] md:h-[832px] w-full md:w-auto">
      {/* ── Colonne formulaire ─────────────────────────────────────────────── */}
      <div className="bg-off-white flex flex-col overflow-hidden p-6 md:p-16 h-full w-full md:w-[512px]">
        {/* Back + Logo */}
        <div className="flex items-center gap-4 mb-12">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-action-light)] transition-colors"
            aria-label={t('common.back')}
          >
            <ArrowLeft size={18} />
          </button>
          <Logo onNavigateToLanding={onNavigateToLanding} />
        </div>

        {/* Contenu centré verticalement */}
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-foreground mb-3">{t('auth.verify.title')}</h2>
          <p className="text-text-dark text-sm mb-10 leading-relaxed">
            {t('auth.verify.description', { email })}
          </p>

          {/* Label */}
          <p className="text-sm font-semibold text-foreground mb-3">{t('auth.verify.codeLabel')}</p>

          {/* Inputs OTP */}
          <div className="flex gap-2 mb-3" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={isLoading}
                className={`w-full aspect-square max-w-[56px] text-center text-xl font-semibold rounded-xl border bg-[var(--color-action-light)] text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-colors disabled:opacity-50 ${
                  error ? 'border-[var(--color-error)]' : 'border-transparent'
                }`}
                aria-label={`Chiffre ${i + 1}`}
              />
            ))}
          </div>

          {/* Erreur */}
          {error && (
            <p role="alert" className="text-xs text-[var(--color-error)] mb-3">
              {error}
            </p>
          )}

          {/* Timer */}
          <p className="text-sm text-[var(--color-text-tertiary)] mb-4">
            {t('auth.verify.timer', { time: formatTime(timer) })}
          </p>

          {/* Hint OTP — mode démo uniquement (Supabase non configuré) */}
          {!isSupabaseConfigured && demoOtp && (
            <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#f3e8ff] border border-[#a78bfa]">
              <span className="text-[#7c3aed] text-lg">🔐</span>
              <p className="text-sm font-semibold text-[#7c3aed]">
                {t('auth.verify.demoCode', { code: demoOtp })}
              </p>
            </div>
          )}

          {/* Renvoyer */}
          <div>
            <p className="text-sm text-text-dark">{t('auth.verify.noCode')}</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={timer > 0 || isLoading}
              className="text-sm font-semibold text-primary hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('auth.verify.resend')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Colonne photo héro (desktop uniquement) ────────────────────────── */}
      <AuthHeroPhoto />
    </div>
  )
}
