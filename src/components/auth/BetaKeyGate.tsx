/**
 * BetaKeyGate : Formulaire de validation cle d'acces beta
 *
 * Refs : BETA_CLOSED_ACCESS_STRATEGY.md v2.0 + BATCH 30
 *
 * Flow :
 *   1. User saisit la cle (auto-format NG-XXXX-XXXX)
 *   2. Submit -> Edge Function validate-beta-key
 *   3. Si valide : `onValidated(keyId)` -> parent affiche SignupForm
 *   4. Si quota plein : redirige vers /waitlist
 *   5. Sinon : toast erreur explicite
 *
 * A11Y :
 *   - aria-label, aria-describedby pour erreurs
 *   - role="alert" pour message d'erreur
 *   - autoFocus sur l'input
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, Key } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import { useBetaAccess } from '@/hooks/useBetaAccess'
import { validateBetaKey, type BetaKeyReason } from '@/services/betaService'

interface BetaKeyGateProps {
  /** Appele quand la cle est validee. keyId est passe pour traçabilite future. */
  onValidated: (keyId: string) => void
  /** Lien vers le mode "deja un compte" pour cohereence avec AuthPage */
  onSwitchToLogin?: () => void
}

/** Formate l'input live : NG-XXXX-XXXX (uppercase + auto-tirets). */
function formatBetaCode(raw: string): string {
  // Strip tout sauf alphanumerique
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')

  // Format : NGxxxxxxxx -> NG-XXXX-XXXX
  if (clean.length === 0) return ''
  let formatted = ''

  // Prefixe NG- (si pas deja la)
  let rest = clean
  if (rest.startsWith('NG')) {
    formatted = 'NG-'
    rest = rest.slice(2)
  } else {
    formatted = 'NG-'
  }

  // 4 chars + tiret
  formatted += rest.slice(0, 4)
  if (rest.length >= 4) formatted += '-'
  formatted += rest.slice(4, 8)

  return formatted
}

/** Message d'erreur selon la raison renvoyee par l'Edge Function. */
function errorMessageForReason(
  reason: BetaKeyReason,
  t: (key: string, options?: { defaultValue?: string }) => string,
): string {
  switch (reason) {
    case 'invalid_format':
      return t('auth.beta.errorFormat', {
        defaultValue: 'Format invalide. Attendu : NG-XXXX-XXXX',
      })
    case 'invalid_or_used':
      return t('auth.beta.errorInvalid', {
        defaultValue:
          'Cle invalide ou deja utilisee. Verifie ou contacte-nous a naturegraph.fr@gmail.com.',
      })
    case 'expired':
      return t('auth.beta.errorExpired', {
        defaultValue:
          'Cle expiree. Contacte-nous a naturegraph.fr@gmail.com pour en obtenir une nouvelle.',
      })
    case 'rate_limited':
      return t('auth.beta.errorRateLimited', {
        defaultValue: 'Trop de tentatives. Reessaie dans 10 minutes.',
      })
    case 'server_error':
      return t('auth.beta.errorServer', {
        defaultValue: 'Erreur serveur. Reessaie dans un instant.',
      })
    default:
      return t('auth.beta.errorGeneric', {
        defaultValue: 'Une erreur est survenue.',
      })
  }
}

export function BetaKeyGate({ onValidated, onSwitchToLogin }: BetaKeyGateProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  // BATCH 45 : pre-fill avec le code valide depuis le welcome screen.
  // L'utilisateur a deja saisi son code sur /welcome (validation readonly).
  // Au signup, on consomme la cle via validateBetaKey() (claim atomic).
  const { code: storedCode } = useBetaAccess()
  const [code, setCode] = useState(storedCode ?? '')
  const [consent, setConsent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-focus l'input au mount (UX) : seulement si pas de code pre-rempli
  useEffect(() => {
    if (!storedCode) {
      const input = document.getElementById('beta-key-input')
      input?.focus()
    }
  }, [storedCode])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCode(formatBetaCode(e.target.value))
    if (error) setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return

    const trimmed = code.trim().toUpperCase()
    if (trimmed.length < 11) {
      setError(t('auth.beta.errorFormat', { defaultValue: 'Format incomplet (NG-XXXX-XXXX)' }))
      return
    }

    // BATCH 36 : consentement aux conditions beta obligatoire (strategy ligne 643).
    if (!consent) {
      setError(
        t('auth.beta.consentRequired', {
          defaultValue: 'Tu dois accepter les conditions de la beta pour continuer',
        }),
      )
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await validateBetaKey(trimmed)

    if (result.valid && result.key_id) {
      toast.success(t('auth.beta.success', { defaultValue: 'Cle validee !' }))
      onValidated(result.key_id)
      return
    }

    // Quota plein -> redirection waitlist
    if (result.reason === 'quota_full') {
      navigate('/waitlist')
      return
    }

    // Autres erreurs -> message inline
    setError(errorMessageForReason(result.reason ?? 'server_error', t))
    setIsSubmitting(false)
  }

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 text-center">
        <div className="mx-auto size-16 rounded-full bg-primary-light flex items-center justify-center">
          <Key className="size-8 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('auth.beta.title', { defaultValue: 'Beta fermee' })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('auth.beta.description', {
            defaultValue:
              "Naturegraph est en beta fermee. Entre ta cle d'acces pour creer ton compte.",
          })}
        </p>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor="beta-key-input" className="text-sm font-medium text-foreground">
            {t('auth.beta.codeLabel', { defaultValue: "Cle d'acces" })}
          </label>
          <input
            id="beta-key-input"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="NG-XXXX-XXXX"
            value={code}
            onChange={handleChange}
            maxLength={12}
            disabled={isSubmitting}
            aria-invalid={!!error}
            aria-describedby={error ? 'beta-key-error' : undefined}
            className="w-full h-12 px-4 rounded-md border border-border bg-background text-foreground text-center text-lg font-mono tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          />
          {error && (
            <p
              id="beta-key-error"
              role="alert"
              className="text-sm text-[var(--color-error,#dc2626)]"
            >
              {error}
            </p>
          )}
        </div>

        {/* Consentement beta (BATCH 36 : strategy ligne 643) */}
        <label className="flex items-start gap-3 text-sm text-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked)
              if (error) setError(null)
            }}
            disabled={isSubmitting}
            aria-describedby="beta-consent-text"
            className="mt-0.5 size-5 rounded border-border accent-primary cursor-pointer disabled:opacity-50"
          />
          <span id="beta-consent-text" className="leading-snug">
            {t('auth.beta.consentLabel', {
              defaultValue:
                "J'accepte les conditions de la beta : tester l'application, partager mes retours, respecter la communaute",
            })}
          </span>
        </label>

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isSubmitting || code.length < 12 || !consent}
          className="w-full"
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
              {t('common.loading', { defaultValue: 'Validation...' })}
            </span>
          ) : (
            t('auth.beta.submit', { defaultValue: 'Verifier ma cle' })
          )}
        </Button>
      </form>

      {/* Footer */}
      <div className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
        <button
          type="button"
          onClick={() => navigate('/waitlist')}
          className="underline hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          {t('auth.beta.noKey', { defaultValue: 'Pas de cle ? Rejoindre la waitlist' })}
        </button>
        {onSwitchToLogin && (
          <p>
            {t('auth.beta.alreadyAccount', { defaultValue: 'Deja un compte ?' })}{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="underline text-primary font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              {t('auth.beta.login', { defaultValue: 'Connexion' })}
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
