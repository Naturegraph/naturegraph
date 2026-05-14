/**
 * Welcome — Page d'entree beta fermee (Nicolas BATCH 45)
 *
 * Ton : convivial / chaleureux (validation Nicolas).
 *
 * Flow :
 *   - Etat initial : message bienvenue + 2 boutons
 *   - "J'ai un code" -> formulaire saisie code -> validation -> grantAccess -> redirect
 *   - "Je rejoins la waitlist" -> redirect /waitlist
 *
 * UX :
 *   - Mobile-first, max-w-md centre
 *   - Aucun lien vers le reste du site visible (beta privee)
 *   - Format code auto NG-XXXX-XXXX
 *   - Messages erreur i18n
 *   - A11Y : aria-label sur tous les inputs/buttons, role=alert sur erreurs
 *
 * Refs : strategie revisee Nicolas + BetaKeyGate.tsx (formatage code)
 */

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { KeyRound, Mail, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import { useBetaAccess } from '@/hooks/useBetaAccess'
import { usePageTitle } from '@/hooks/usePageTitle'
import { checkBetaAccessKey, type BetaKeyReason } from '@/services/betaService'

type ViewState = 'initial' | 'enter-code'

/** Formate l'input live : NG-XXXX-XXXX (uppercase + auto-tirets). */
function formatBetaCode(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (clean.length === 0) return ''
  let formatted = 'NG-'
  let rest = clean
  if (rest.startsWith('NG')) rest = rest.slice(2)
  formatted += rest.slice(0, 4)
  if (rest.length >= 4) formatted += '-'
  formatted += rest.slice(4, 8)
  return formatted
}

/** Message d'erreur i18n selon la raison renvoyee par la RPC. */
function errorMessageForReason(
  reason: BetaKeyReason | undefined,
  t: (key: string, options?: { defaultValue?: string }) => string,
): string {
  switch (reason) {
    case 'invalid_format':
      return t('auth.beta.errorFormat', { defaultValue: 'Format invalide. Attendu : NG-XXXX-XXXX' })
    case 'invalid_or_used':
      return t('auth.beta.errorInvalid', {
        defaultValue: 'Cle invalide ou deja utilisee. Verifie ou contacte-nous.',
      })
    case 'expired':
      return t('auth.beta.errorExpired', {
        defaultValue: 'Cle expiree. Contacte-nous pour en obtenir une nouvelle.',
      })
    case 'quota_full':
      return t('auth.beta.errorQuotaFull', {
        defaultValue: 'La beta est complete. Rejoins la waitlist pour etre notifie.',
      })
    case 'server_error':
      return t('auth.beta.errorServer', {
        defaultValue: 'Erreur serveur. Reessaie dans un instant.',
      })
    default:
      return t('auth.beta.errorGeneric', { defaultValue: 'Une erreur est survenue.' })
  }
}

export default function Welcome() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const { hasAccess, grantAccess } = useBetaAccess()
  usePageTitle(t('welcome.title', { defaultValue: 'Bienvenue' }))

  const [view, setView] = useState<ViewState>('initial')
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Si l'utilisateur a deja l'acces, redirige vers la landing (ou path d'origine)
  useEffect(() => {
    if (hasAccess) {
      const from = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(from === '/welcome' ? '/' : from, { replace: true })
    }
  }, [hasAccess, location.state, navigate])

  // Auto-focus l'input quand on entre dans la vue "enter-code"
  // (alternative a11y-friendly a autoFocus prop, ref jsx-a11y/no-autofocus)
  useEffect(() => {
    if (view === 'enter-code') {
      const input = document.getElementById('welcome-beta-code')
      input?.focus()
    }
  }, [view])

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCode(formatBetaCode(e.target.value))
    if (error) setError(null)
  }

  async function handleSubmitCode(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return

    const trimmed = code.trim().toUpperCase()
    if (trimmed.length < 11) {
      setError(t('auth.beta.errorFormat', { defaultValue: 'Format incomplet (NG-XXXX-XXXX)' }))
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await checkBetaAccessKey(trimmed)

    if (result.valid) {
      grantAccess(trimmed)
      toast.success(t('welcome.success', { defaultValue: 'Bienvenue dans la beta Naturegraph !' }))
      // useEffect ci-dessus va detecter hasAccess === true et rediriger
      return
    }

    // Si quota plein -> redirection waitlist
    if (result.reason === 'quota_full') {
      navigate('/waitlist', { replace: true })
      return
    }

    setError(errorMessageForReason(result.reason, t))
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-lighter px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-8">
        {/* ── Header chaleureux ─────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Icon scintillant pour donner un cote "exclusif mais accueillant" */}
          <div className="size-20 rounded-full bg-primary-light flex items-center justify-center">
            <Sparkles className="size-10 text-primary" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold font-title text-foreground">
              {t('welcome.heading', { defaultValue: 'Bienvenue chez Naturegraph' })}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              {t('welcome.subheading', {
                defaultValue:
                  "Nous sommes ravis de te voir ! Naturegraph est actuellement en beta privee. Si tu as recu une cle d'acces, c'est par ici. Sinon, rejoins notre liste d'attente — chaque inscription compte.",
              })}
            </p>
          </div>
        </div>

        {/* ── View initiale : 2 CTAs ─────────────────────────────────── */}
        {view === 'initial' && (
          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setView('enter-code')}
              className="w-full"
              icon={<KeyRound className="size-5" aria-hidden="true" />}
            >
              {t('welcome.cta.haveKey', { defaultValue: "J'ai un code d'acces" })}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              to="/waitlist"
              className="w-full"
              icon={<Mail className="size-5" aria-hidden="true" />}
            >
              {t('welcome.cta.joinWaitlist', { defaultValue: "Rejoindre la liste d'attente" })}
            </Button>
          </div>
        )}

        {/* ── View "Entrer le code" ──────────────────────────────────── */}
        {view === 'enter-code' && (
          <form onSubmit={handleSubmitCode} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <label htmlFor="welcome-beta-code" className="text-sm font-medium text-foreground">
                {t('welcome.codeLabel', { defaultValue: "Ta cle d'acces beta" })}
              </label>
              <input
                id="welcome-beta-code"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="NG-XXXX-XXXX"
                value={code}
                onChange={handleCodeChange}
                maxLength={12}
                disabled={isSubmitting}
                aria-invalid={!!error}
                aria-describedby={error ? 'welcome-code-error' : undefined}
                className="w-full h-14 px-4 rounded-md border border-border bg-background text-foreground text-center text-xl font-mono tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
              />
              {error && (
                <p
                  id="welcome-code-error"
                  role="alert"
                  className="text-sm text-[var(--color-error,#dc2626)]"
                >
                  {error}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('welcome.codeHint', {
                  defaultValue:
                    "Le code se trouve dans l'email d'invitation. Il ressemble a NG-A1B2-C3D4.",
                })}
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting || code.length < 12}
              className="w-full"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" />
                  {t('welcome.validating', { defaultValue: 'Validation...' })}
                </span>
              ) : (
                t('welcome.validate', { defaultValue: 'Valider et entrer' })
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setView('initial')
                setCode('')
                setError(null)
              }}
              className="text-sm text-muted-foreground hover:text-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded text-center"
              disabled={isSubmitting}
            >
              {t('welcome.back', { defaultValue: '← Retour' })}
            </button>
          </form>
        )}

        {/* ── Footer minimal ─────────────────────────────────────────── */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>
            {t('welcome.footer.tagline', {
              defaultValue: 'La plateforme citoyenne de biodiversite — beta privee 2026',
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
