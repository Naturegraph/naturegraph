/**
 * Welcome — Page d'entree beta fermee
 *
 * Refs : strategie Nicolas BATCH 45 + corrections visuelles 51-58.
 *
 * Style : background teal-dark + pattern dots subtils + orbes anim (>=md).
 * Carte centree style AuthForm (sans photo). Pas de logo. Contenu centre.
 *
 * BATCH 64 : layout factorise via <BetaAuthLayout> partage avec /waitlist.
 *
 * Flow :
 *   - Etat initial : icon hermine + message bienvenue + 2 boutons
 *   - "J'ai un code" -> formulaire saisie code -> validation -> grantAccess -> redirect
 *   - "Je rejoins la waitlist" -> redirect /waitlist
 */

import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { KeyRound, Mail, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BetaAuthLayout } from '@/components/auth/BetaAuthLayout'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBetaAccess } from '@/hooks/useBetaAccess'
import { usePageTitle } from '@/hooks/usePageTitle'
import { checkBetaAccessKey, type BetaKeyReason } from '@/services/betaService'
import hermineIcon from '@/assets/images/hermine-icon.png'

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
        defaultValue:
          'Clé invalide ou déjà utilisée. Vérifie ou contacte-nous à naturegraph.fr@gmail.com.',
      })
    case 'expired':
      return t('auth.beta.errorExpired', {
        defaultValue:
          'Clé expirée. Contacte-nous à naturegraph.fr@gmail.com pour en obtenir une nouvelle.',
      })
    case 'quota_full':
      return t('auth.beta.errorQuotaFull', {
        defaultValue: 'La beta est complète. Rejoins la waitlist pour être notifié.',
      })
    case 'server_error':
      return t('auth.beta.errorServer', {
        defaultValue: 'Erreur serveur. Réessaie dans un instant.',
      })
    default:
      return t('auth.beta.errorGeneric', { defaultValue: 'Une erreur est survenue.' })
  }
}

export default function Welcome() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const { hasAccess, grantAccess } = useBetaAccess()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  usePageTitle(t('welcome.title', { defaultValue: 'Bienvenue' }))

  // Lien d'invitation /welcome?code=NG-XXXX-XXXX (présent dans l'email beta).
  // On dérive l'état initial directement du paramètre d'URL : pré-remplissage
  // du code + bascule sur l'écran de saisie, sans useEffect — donc sans render
  // en cascade (cf. règle react-hooks/set-state-in-effect).
  const codeFromUrl = searchParams.get('code')
  const [view, setView] = useState<ViewState>(codeFromUrl ? 'enter-code' : 'initial')
  const [code, setCode] = useState(() => (codeFromUrl ? formatBetaCode(codeFromUrl) : ''))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirection immédiate si l'accès est déjà acquis :
  //   - clé beta valide en localStorage (hasAccess), OU
  //   - session authentifiée (un invité qui a activé son compte est déjà
  //     membre — il n'a rien à saisir sur cet écran).
  useEffect(() => {
    if (hasAccess || isAuthenticated) {
      const from = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(from === '/welcome' ? '/' : from, { replace: true })
    }
  }, [hasAccess, isAuthenticated, location.state, navigate])

  // Auto-focus input quand on bascule sur la vue enter-code
  useEffect(() => {
    if (view === 'enter-code') {
      const input = document.getElementById('welcome-beta-code')
      input?.focus()
    }
  }, [view])

  // Affiche un toast quand l user arrive ici suite a une session expiree
  // (assertActiveSession a redirige + pose le flag dans sessionStorage).
  // Nicolas 2026-05-25, cas Flo.d.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem('naturegraph-session-expired') === '1') {
        window.sessionStorage.removeItem('naturegraph-session-expired')
        toast.error(
          t('auth.sessionExpired.title', {
            defaultValue: 'Ta session a expiré',
          }),
          t('auth.sessionExpired.desc', {
            defaultValue: 'Reconnecte-toi avec ton email pour continuer.',
          }),
        )
      }
    } catch {
      // sessionStorage indisponible, on ignore
    }
  }, [toast, t])

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
      return
    }

    if (result.reason === 'quota_full') {
      navigate('/waitlist', { replace: true })
      return
    }

    setError(errorMessageForReason(result.reason, t))
    setIsSubmitting(false)
  }

  // V1.1.4 NG-004B (Nicolas 2026-06-01) : pendant le boot session, afficher
  // un loader plutot que la vue initiale (boutons "J'ai un code" / "Waitlist").
  // Sans ce loader, un user deja authentifie qui rouvre l app voit Welcome
  // pendant 1-3s puis est redirige -> ressenti "app casse, je dois cliquer".
  if (isAuthLoading || (isAuthenticated && !hasAccess)) {
    return (
      <BetaAuthLayout>
        <div className="flex items-center justify-center min-h-[40vh] w-full">
          <Loader2
            className="size-8 text-[var(--color-primary)] motion-safe:animate-spin"
            aria-label={t('common.loading', { defaultValue: 'Chargement' })}
          />
        </div>
      </BetaAuthLayout>
    )
  }

  return (
    <BetaAuthLayout>
      {/* Header : icon hermine + titre + description, tout centre */}
      <div className="flex flex-col gap-3 items-center text-center w-full">
        <img src={hermineIcon} alt="Naturegraph" className="size-16 mb-2" width={64} height={64} />
        <h2 className="text-[var(--color-text-primary)]">
          {t('welcome.heading', { defaultValue: 'Bienvenue' })}
        </h2>
        <p className="text-[var(--color-text-secondary)] text-base leading-relaxed">
          {t('welcome.subheading', {
            defaultValue:
              "Naturegraph est en beta privée. Si tu as une clé d'accès, c'est par ici. Sinon, rejoins la liste d'attente.",
          })}
        </p>
      </div>

      {/* Contenu dynamique selon la vue */}
      {view === 'initial' && (
        <div className="flex flex-col gap-3 items-center w-full">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setView('enter-code')}
            className="w-full"
            icon={<KeyRound className="size-5" aria-hidden="true" />}
          >
            {t('welcome.cta.haveKey', { defaultValue: "J'ai un code d'accès" })}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            to="/waitlist"
            className="w-full"
            icon={<Mail className="size-5" aria-hidden="true" />}
          >
            {t('welcome.cta.joinWaitlist', {
              defaultValue: "Rejoindre la liste d'attente",
            })}
          </Button>
        </div>
      )}

      {view === 'enter-code' && (
        <form
          onSubmit={handleSubmitCode}
          className="flex flex-col gap-4 items-center w-full"
          noValidate
        >
          <div className="flex flex-col gap-2 w-full">
            <label
              htmlFor="welcome-beta-code"
              className="text-sm font-medium text-[var(--color-text-primary)] text-center"
            >
              {t('welcome.codeLabel', { defaultValue: "Ta clé d'accès beta" })}
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
              className="w-full h-14 px-4 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-center text-xl font-mono tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] disabled:opacity-50"
            />
            {error && (
              <p
                id="welcome-code-error"
                role="alert"
                className="text-sm text-[var(--color-error,#dc2626)] text-center"
              >
                {error}
              </p>
            )}
            <p className="text-xs text-[var(--color-text-secondary)] text-center">
              {t('welcome.codeHint', {
                defaultValue: "Le code se trouve dans l'email d'invitation.",
              })}
            </p>
          </div>

          <div className="flex flex-col gap-3 items-center w-full pt-1">
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

            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                setView('initial')
                setCode('')
                setError(null)
              }}
              disabled={isSubmitting}
              className="w-full"
            >
              {t('welcome.back', { defaultValue: 'Retour' })}
            </Button>
          </div>
        </form>
      )}

      {/* Slogan Naturegraph avec separateur fin */}
      <p className="text-center text-sm text-[var(--color-text-secondary)] italic w-full pt-4 border-t border-[var(--color-border)]/30">
        {t('welcome.slogan', { defaultValue: 'Partageons nos émotions' })}
      </p>
    </BetaAuthLayout>
  )
}
