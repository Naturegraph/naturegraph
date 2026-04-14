/**
 * AuthForm — Organism partagé Login + Signup
 * =============================================
 * Factorise le pattern commun aux deux formulaires d'authentification :
 *   - Logo + titre + description
 *   - AuthInput email (avec helper optionnel)
 *   - Bouton submit + bouton ghost "Découvrir sans compte"
 *   - Séparateur "ou continuer avec"
 *   - 3 boutons sociaux (Google / Apple / Facebook)
 *   - Lien de bascule vers l'autre écran
 *   - Photo héro desktop
 *
 * Les divergences entre Login et Signup sont passées en props :
 *   - copy (titre, description, labels)
 *   - handler de submit asynchrone
 *   - handler de switch
 */

import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Logo } from './Logo'
import { AuthInput } from './AuthInput'
import { SocialButton } from './SocialButton'
import { AuthHeroPhoto } from './AuthHeroPhoto'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Résultat normalisé d'un submit auth — un seul format pour Login + Signup */
export interface AuthSubmitResult {
  success: boolean
  error?: string
}

export interface AuthFormProps {
  /** Titre principal (h2) */
  title: string
  /** Description sous le titre */
  description: string
  /** Label de l'input email */
  inputLabel: string
  /** Helper text optionnel sous l'input */
  inputHelperText?: string
  /** Type HTML de l'input — défaut: email */
  inputType?: 'email' | 'text'
  /** autocomplete HTML — défaut: email */
  autoComplete?: string
  /** Label du bouton submit principal */
  submitLabel: string
  /** Label du bouton "Découvrir sans compte" (variante ghost) */
  guestLabel: string
  /** Texte avant le lien de bascule (ex: "Pas encore de compte ?") */
  switchPrompt: string
  /** Label du lien de bascule (ex: "Créer un compte") */
  switchLabel: string
  /** Label du séparateur central (ex: "ou continuer avec") */
  orContinueLabel: string
  /** Handler de submit — reçoit la valeur trimée, renvoie un résultat normalisé */
  onSubmit: (value: string) => Promise<AuthSubmitResult>
  /** Handler du lien de bascule (login ↔ signup) */
  onSwitch: () => void
  /** Handler du bouton invité */
  onDiscoverAsGuest?: () => void
  /** Handler du logo (retour landing) */
  onNavigateToLanding?: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AuthForm({
  title,
  description,
  inputLabel,
  inputHelperText,
  inputType = 'email',
  autoComplete = 'email',
  submitLabel,
  guestLabel,
  switchPrompt,
  switchLabel,
  orContinueLabel,
  onSubmit,
  onSwitch,
  onDiscoverAsGuest,
  onNavigateToLanding,
}: AuthFormProps) {
  const { t } = useTranslation()
  const { signInWithSocial } = useAuth()

  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const trimmed = value.trim()
    if (!trimmed) {
      setError(t('auth.errors.required'))
      return
    }

    setIsLoading(true)
    const result = await onSubmit(trimmed)
    setIsLoading(false)

    if (!result.success) {
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
    <div className="flex items-center overflow-hidden relative rounded-sm md:rounded-[32px] md:h-[832px] w-full md:w-auto">
      {/* ── Colonne formulaire ──────────────────────────────────────────── */}
      <div className="bg-[var(--color-bg-primary)] flex flex-col gap-6 md:gap-8 items-start justify-center overflow-hidden p-6 md:p-16 h-full w-full md:w-[512px]">
        <Logo onNavigateToLanding={onNavigateToLanding} />

        {/* Titre & description */}
        <div className="flex flex-col gap-3 items-start w-full">
          <h2 className="text-[var(--color-text-primary)]">{title}</h2>
          <p className="text-[var(--color-text-secondary)] text-base">{description}</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-start w-full">
          <AuthInput
            label={inputLabel}
            helperText={inputHelperText}
            isRequired
            type={inputType}
            inputMode="email"
            autoComplete={autoComplete}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
            }}
            error={error}
            disabled={isLoading}
          />

          <div className="flex flex-col gap-3 items-center w-full pt-1">
            <Button type="submit" className="w-full" isLoading={isLoading}>
              {submitLabel}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={onDiscoverAsGuest}
              disabled={isLoading}
            >
              {guestLabel}
            </Button>
          </div>
        </form>

        {/* Séparateur "ou continuer avec" */}
        <div className="relative w-full grid grid-cols-1 grid-rows-1 items-center">
          <div className="row-start-1 col-start-1 h-px w-full bg-[var(--color-border)]" />
          <div className="row-start-1 col-start-1 bg-[var(--color-bg-primary)] flex h-8 items-center justify-center px-3 mx-auto rounded-full">
            <p className="text-[var(--color-text-secondary)] text-base">{orContinueLabel}</p>
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

        {/* Lien de bascule */}
        <div className="flex gap-1 items-center text-[var(--color-text-secondary)] text-base pb-0.5">
          <p>{switchPrompt}</p>
          <button
            type="button"
            onClick={onSwitch}
            disabled={isLoading}
            className="text-[var(--color-action-default)] underline decoration-solid font-bold hover:opacity-80 active:opacity-60 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {switchLabel}
          </button>
        </div>
      </div>

      {/* ── Colonne photo héro (desktop uniquement) ────────────────────── */}
      <AuthHeroPhoto />
    </div>
  )
}
