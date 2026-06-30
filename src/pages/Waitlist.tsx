/**
 * Waitlist : Page d'inscription a la liste d'attente
 *
 * Refs : BETA_CLOSED_ACCESS_STRATEGY.md v2.0 + BATCH 30 + BATCH 56 (refonte UI)
 *        + BATCH 61 (fix focus loss) + BATCH 64 (layout factorise)
 *
 * Affichee quand :
 *   - L'user clique "Rejoindre la liste d'attente" depuis /welcome
 *   - L'Edge Function valide la cle MAIS le quota est plein (redirect auto)
 *   - Acces direct via /waitlist
 *
 * Style : layout partage <BetaAuthLayout> avec /welcome (BATCH 64).
 *   - Icon Mail dans cercle primary-light (pertinent thematique inscription)
 *   - Bouton "Retour" secondary en bas du form
 *   - Slogan "Partageons nos emotions" + separateur fin
 *
 * Flow :
 *   1. Form simple : email + motivation (optionnel)
 *   2. Submit -> betaService.joinWaitlist
 *   3. Toast success + ecran de confirmation
 *   4. Si email deja inscrit : "Tu es deja sur la waitlist"
 */

import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, Mail, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BetaAuthLayout } from '@/components/auth/BetaAuthLayout'
import { useToast } from '@/contexts/ToastContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { joinWaitlist } from '@/services/betaService'
import { MARKETING_CONSENT_ENABLED, OPEN_ACCESS_ENABLED } from '@/lib/featureFlags'

export default function Waitlist() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  usePageTitle(t('waitlist.title', { defaultValue: "Liste d'attente" }))

  const [email, setEmail] = useState('')
  const [motivation, setMotivation] = useState('')
  // Opt-in marketing RGPD : decoche par defaut (pas de consentement presume).
  const [marketingConsent, setMarketingConsent] = useState(false)
  // Honeypot anti-bot : champ cache que seuls les bots remplissent. Aucun
  // captcha ni appel reseau (eco-conception), invisible et neutre pour les
  // lecteurs d'ecran (aria-hidden + hors flux). Rempli => on simule un succes
  // sans rien inserer en base.
  const [honeypot, setHoneypot] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [alreadyOnList, setAlreadyOnList] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return

    // Honeypot : un humain ne voit pas ce champ et ne le remplit jamais.
    // On feint le succes (pas de signal exploitable pour le bot), sans INSERT.
    if (honeypot.trim() !== '') {
      setSubmitted(true)
      return
    }

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error(t('waitlist.errorEmail', { defaultValue: 'Email invalide' }))
      return
    }

    setIsSubmitting(true)
    const result = await joinWaitlist({
      email: trimmedEmail,
      motivation: motivation.trim() || undefined,
      marketingConsent,
    })

    if (result.success) {
      setSubmitted(true)
      setAlreadyOnList(!!result.alreadyOnWaitlist)
      toast.success(
        result.alreadyOnWaitlist
          ? t('waitlist.alreadyMsg', { defaultValue: 'Tu es déjà sur la liste !' })
          : t('waitlist.successMsg', { defaultValue: 'Inscrit à la waitlist !' }),
      )
    } else {
      toast.error(
        t('waitlist.errorServer', {
          defaultValue: "Erreur lors de l'inscription. Réessaie plus tard.",
        }),
      )
    }

    setIsSubmitting(false)
  }

  // Acces ouvert (NG-029) : plus de liste d'attente en early access (l'inscription
  // est libre). Toute visite de /waitlist repart vers la landing. La page reste
  // dans le code pour le mode beta ferme (flag OFF) et l'eventuel retour arriere.
  if (OPEN_ACCESS_ENABLED) {
    return <Navigate to="/" replace />
  }

  return (
    <BetaAuthLayout>
      {submitted ? (
        // ─── Ecran de confirmation post-submit ──────────────────────────
        <>
          <div className="flex flex-col gap-3 items-center text-center w-full">
            <div className="size-20 rounded-full bg-primary-light flex items-center justify-center">
              <Sparkles className="size-10 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-[var(--color-text-primary)]">
              {alreadyOnList
                ? t('waitlist.alreadyTitle', { defaultValue: 'Tu es déjà sur la liste' })
                : t('waitlist.successTitle', { defaultValue: 'Inscription enregistrée' })}
            </h2>
            <p className="text-[var(--color-text-secondary)] text-base leading-relaxed">
              {t('waitlist.successDesc', {
                defaultValue:
                  "On t'enverra un email avec ta clé d'accès dès qu'une place se libère. En attendant, retrouve-nous sur Discord !",
              })}
            </p>
          </div>

          <Button variant="primary" size="lg" onClick={() => navigate('/')} className="w-full">
            {t('waitlist.backWelcome', { defaultValue: "Retour à l'accueil" })}
          </Button>

          {/* Slogan Naturegraph avec separateur fin */}
          <p className="text-center text-sm text-[var(--color-text-secondary)] italic w-full pt-4 border-t border-[var(--color-border)]/30">
            {t('welcome.slogan', { defaultValue: 'Partageons nos émotions' })}
          </p>
        </>
      ) : (
        // ─── Formulaire principal ───────────────────────────────────────
        <>
          {/* Header : icon Mail + titre + description */}
          <div className="flex flex-col gap-2 items-center text-center w-full">
            <div className="size-14 md:size-16 rounded-full bg-primary-light flex items-center justify-center">
              <Mail className="size-7 md:size-8 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-[var(--color-text-primary)]">
              {t('waitlist.formTitle', { defaultValue: 'Rejoindre la waitlist' })}
            </h2>
            <p className="text-[var(--color-text-secondary)] text-sm md:text-base leading-relaxed">
              {t('waitlist.formDesc', {
                defaultValue:
                  "Inscris ton email pour être notifié dès qu'une place se libère dans la beta.",
              })}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:gap-4 w-full" noValidate>
            {/* Honeypot anti-bot : hors flux visuel + invisible aux lecteurs
                d'ecran (aria-hidden, tabIndex -1). Les humains ne le voient pas
                et ne le remplissent jamais ; les bots qui remplissent tous les
                champs se trahissent. */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                overflow: 'hidden',
                clip: 'rect(0 0 0 0)',
                whiteSpace: 'nowrap',
              }}
            >
              <label htmlFor="waitlist-website">Ne pas remplir ce champ</label>
              <input
                id="waitlist-website"
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label
                htmlFor="waitlist-email"
                className="text-sm font-medium text-[var(--color-text-primary)]"
              >
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
                className="w-full h-12 px-4 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label
                htmlFor="waitlist-motivation"
                className="text-sm font-medium text-[var(--color-text-primary)]"
              >
                {t('waitlist.motivationLabel', {
                  defaultValue: 'Pourquoi rejoindre ? (optionnel)',
                })}
              </label>
              <textarea
                id="waitlist-motivation"
                rows={2}
                maxLength={500}
                placeholder={t('waitlist.motivationPlaceholder', {
                  defaultValue: 'Photographe nature, étudiant en biologie, …',
                })}
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] disabled:opacity-50"
              />
              <p className="text-xs text-[var(--color-text-secondary)] text-right">
                {motivation.length} / 500
              </p>
            </div>

            <div className="flex flex-col gap-2 md:gap-3 items-center w-full pt-1">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting || !email}
                className="w-full"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" />
                    {t('common.loading', { defaultValue: 'Envoi…' })}
                  </span>
                ) : (
                  t('waitlist.submit', { defaultValue: 'Rejoindre la waitlist' })
                )}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => navigate('/')}
                disabled={isSubmitting}
                className="w-full"
              >
                {t('common.back', { defaultValue: 'Retour' })}
              </Button>
            </div>

            {/* Opt-in marketing RGPD (Art. 6/7) : consentement explicite et
                separe pour les communications marketing. Decoche par defaut,
                non bloquant. Condition prealable a l'import de l'email dans
                l'outil d'emailing (NG-009). L'email de cle d'acces, lui, est
                transactionnel et part independamment de cette case.
                Masque tant qu'on n'est pas en phase marketing (Nicolas 2026-06-24,
                cf. MARKETING_CONSENT_ENABLED) : reaffichage en 1 ligne pour aout. */}
            {MARKETING_CONSENT_ENABLED && (
              <label className="flex items-start gap-2.5 w-full cursor-pointer text-left">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-0.5 size-4 shrink-0 rounded border-[var(--color-border)] accent-[var(--color-action-default)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] disabled:opacity-50"
                />
                <span className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {t('waitlist.marketingConsentLabel', {
                    defaultValue:
                      'Je veux aussi recevoir les nouvelles de Naturegraph (lancement, nouveautés). Optionnel, désinscription à tout moment.',
                  })}
                </span>
              </label>
            )}

            {/* Mention de transparence RGPD (Art. 13) : finalite (transactionnelle)
                de la collecte de l'email + lien vers la politique de confidentialite. */}
            <p className="text-xs text-[var(--color-text-secondary)] text-center leading-relaxed">
              {t('waitlist.privacyNotice', {
                defaultValue:
                  "Ton email sert à t'envoyer ta clé d'accès dès qu'une place se libère.",
              })}{' '}
              <Link
                to="/privacy"
                className="underline text-[var(--color-action-default)] hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] rounded"
              >
                {t('waitlist.privacyLink', { defaultValue: 'Politique de confidentialité' })}
              </Link>
            </p>
          </form>

          {/* Slogan Naturegraph avec separateur fin */}
          <p className="text-center text-sm text-[var(--color-text-secondary)] italic w-full pt-4 border-t border-[var(--color-border)]/30">
            {t('welcome.slogan', { defaultValue: 'Partageons nos émotions' })}
          </p>
        </>
      )}
    </BetaAuthLayout>
  )
}
