/**
 * Waitlist — Page d'inscription a la liste d'attente
 *
 * Refs : BETA_CLOSED_ACCESS_STRATEGY.md v2.0 + BATCH 30
 *
 * Affichee quand :
 *   - L'user clique "Pas de cle ? Rejoindre la waitlist" depuis BetaKeyGate
 *   - L'Edge Function valide la cle MAIS le quota est plein (redirect auto)
 *   - Acces direct via /waitlist
 *
 * Flow :
 *   1. Form simple : email + motivation (optionnel)
 *   2. Submit -> betaService.joinWaitlist
 *   3. Toast success + ecran de confirmation
 *   4. Si email deja inscrit : "Tu es deja sur la waitlist"
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, Mail, Sparkles, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { joinWaitlist } from '@/services/betaService'

export default function Waitlist() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  usePageTitle(t('waitlist.title', { defaultValue: 'Liste d attente' }))

  const [email, setEmail] = useState('')
  const [motivation, setMotivation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [alreadyOnList, setAlreadyOnList] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error(t('waitlist.errorEmail', { defaultValue: 'Email invalide' }))
      return
    }

    setIsSubmitting(true)
    const result = await joinWaitlist({
      email: trimmedEmail,
      motivation: motivation.trim() || undefined,
    })

    if (result.success) {
      setSubmitted(true)
      setAlreadyOnList(!!result.alreadyOnWaitlist)
      toast.success(
        result.alreadyOnWaitlist
          ? t('waitlist.alreadyMsg', { defaultValue: 'Tu es deja sur la liste !' })
          : t('waitlist.successMsg', { defaultValue: 'Inscrit a la waitlist !' }),
      )
    } else {
      toast.error(
        t('waitlist.errorServer', {
          defaultValue: 'Erreur lors de l inscription. Reessaie plus tard.',
        }),
      )
    }

    setIsSubmitting(false)
  }

  // Ecran de confirmation post-submit
  if (submitted) {
    return (
      <main
        id="main-content"
        className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-cream-lighter"
      >
        <div className="max-w-md w-full flex flex-col items-center gap-6 text-center">
          <div className="size-20 rounded-full bg-primary-light flex items-center justify-center">
            <Sparkles className="size-10 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {alreadyOnList
              ? t('waitlist.alreadyTitle', { defaultValue: 'Tu es deja sur la liste' })
              : t('waitlist.successTitle', { defaultValue: 'Inscription enregistree' })}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            {t('waitlist.successDesc', {
              defaultValue:
                'On t enverra un email avec ta cle d acces des qu une place se libere. En attendant, retrouve nous sur Discord !',
            })}
          </p>
          <Button variant="primary" size="md" onClick={() => navigate('/')}>
            {t('waitlist.backHome', { defaultValue: 'Retour a l accueil' })}
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main
      id="main-content"
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-cream-lighter"
    >
      <div className="max-w-md w-full flex flex-col gap-6">
        {/* Back link */}
        <button
          type="button"
          onClick={() => navigate('/auth')}
          className="self-start flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('common.back', { defaultValue: 'Retour' })}
        </button>

        {/* Header */}
        <div className="flex flex-col gap-2 text-center">
          <div className="mx-auto size-16 rounded-full bg-primary-light flex items-center justify-center">
            <Mail className="size-8 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('waitlist.formTitle', { defaultValue: 'Rejoindre la waitlist' })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('waitlist.formDesc', {
              defaultValue:
                'Inscris ton email pour etre notifie des qu une place se libere dans la beta.',
            })}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <label htmlFor="waitlist-email" className="text-sm font-medium text-foreground">
              {t('waitlist.emailLabel', { defaultValue: 'Email' })}
            </label>
            <input
              id="waitlist-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-12 px-4 rounded-md border border-border bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="waitlist-motivation" className="text-sm font-medium text-foreground">
              {t('waitlist.motivationLabel', { defaultValue: 'Pourquoi rejoindre ? (optionnel)' })}
            </label>
            <textarea
              id="waitlist-motivation"
              rows={3}
              maxLength={500}
              placeholder={t('waitlist.motivationPlaceholder', {
                defaultValue: 'Photographe nature, etudiant en biologie, ...',
              })}
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-md border border-border bg-background text-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground text-right">{motivation.length} / 500</p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting || !email}
            className="w-full"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                {t('common.loading', { defaultValue: 'Envoi...' })}
              </span>
            ) : (
              t('waitlist.submit', { defaultValue: 'Rejoindre la waitlist' })
            )}
          </Button>
        </form>
      </div>
    </main>
  )
}
