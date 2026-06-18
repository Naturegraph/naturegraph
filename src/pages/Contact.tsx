/**
 * Contact : Page de contact publique (BATCH 67)
 *
 * Style : aligne sur /welcome et /waitlist via <BetaAuthLayout>.
 *   - Background teal-dark + pattern dots + orbes (md:)
 *   - Card cream centree, rounded-[32px] (md:)
 *
 * Backend : utilise un mailto: vers naturegraph.fr@gmail.com (CONTACT_EMAIL).
 * Pas d'edge function ni de table cote serveur pour la beta MVP :
 *   - Le user remplit le form, on prefill mailto subject/body
 *   - Au click "Envoyer", son client mail s'ouvre, il valide -> email arrive
 *     directement dans la boite gmail (zero perte, zero infra)
 *   - Phase 2 : edge function + Resend pour envoi automatique
 *
 * 5 sujets disponibles (alignes sur SettingsHelpView pour cohereence) :
 *   technical | help | suggestion | report | other
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Mail, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BetaAuthLayout } from '@/components/auth/BetaAuthLayout'
import { useToast } from '@/contexts/ToastContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { CONTACT_EMAIL } from '@/constants/contact'

type SubjectId = 'technical' | 'help' | 'suggestion' | 'report' | 'other'

const SUBJECTS: SubjectId[] = ['technical', 'help', 'suggestion', 'report', 'other']

const SUBJECT_LABELS: Record<SubjectId, string> = {
  technical: 'Problème technique',
  help: "Question ou besoin d'aide",
  suggestion: 'Suggestion ou amélioration',
  report: 'Signalement (contenu ou comportement)',
  other: 'Autre',
}

/**
 * Encode un texte pour un parametre mailto.
 * %0D%0A = retour ligne, %20 = espace, etc.
 */
function encodeMailParam(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+')
}

export default function Contact() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  usePageTitle(t('contact.title', { defaultValue: 'Contact' }))

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState<SubjectId | null>(null)
  const [message, setMessage] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const canSubmit =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    subject !== null &&
    message.trim().length >= 20

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !subject) return

    // Construit l'email avec contexte (nom, email expediteur + sujet + message)
    const subjectLabel = SUBJECT_LABELS[subject]
    const subjectLine = `[Naturegraph] ${subjectLabel} : ${name.trim()}`
    const body = [
      `Bonjour Naturegraph,`,
      ``,
      `Nom : ${name.trim()}`,
      `Email : ${email.trim()}`,
      `Sujet : ${subjectLabel}`,
      ``,
      `Message :`,
      message.trim(),
      ``,
      `---`,
      `Envoyé depuis le formulaire de contact Naturegraph`,
    ].join('\n')

    const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${encodeMailParam(subjectLine)}&body=${encodeMailParam(body)}`
    window.location.href = mailtoUrl

    // Petit delai puis affiche la confirmation (le mailto s'ouvre quasi-instant)
    setTimeout(() => {
      setSubmitted(true)
      toast.success(
        t('contact.successTitle', { defaultValue: 'Client mail ouvert' }),
        t('contact.successDesc', {
          defaultValue: "Valide l'envoi dans ton application mail pour finaliser.",
        }),
      )
    }, 400)
  }

  return (
    <BetaAuthLayout>
      {submitted ? (
        // ─── Confirmation post-submit ─────────────────────────────────────
        <>
          <div className="flex flex-col gap-3 items-center text-center w-full">
            <div className="size-20 rounded-full bg-primary-light flex items-center justify-center">
              <Send className="size-10 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-[var(--color-text-primary)]">
              {t('contact.sentTitle', { defaultValue: 'Message prêt à partir' })}
            </h2>
            <p className="text-[var(--color-text-secondary)] text-base leading-relaxed">
              {t('contact.sentDesc', {
                defaultValue:
                  "Ton client mail a dû s'ouvrir avec ton message pré-rempli. Valide l'envoi pour que nous le recevions. Sinon, écris-nous directement à",
              })}{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[var(--color-action-default)] underline font-medium"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>

          <Button variant="primary" size="lg" onClick={() => navigate('/')} className="w-full">
            {t('contact.backHome', { defaultValue: "Retour à l'accueil" })}
          </Button>

          <p className="text-center text-sm text-[var(--color-text-secondary)] italic w-full pt-4 border-t border-[var(--color-border)]/30">
            {t('welcome.slogan', { defaultValue: 'Partageons nos émotions' })}
          </p>
        </>
      ) : (
        // ─── Formulaire principal ────────────────────────────────────────
        <>
          {/* Header */}
          <div className="flex flex-col gap-2 items-center text-center w-full">
            <div className="size-14 md:size-16 rounded-full bg-primary-light flex items-center justify-center">
              <Mail className="size-7 md:size-8 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-[var(--color-text-primary)]">
              {t('contact.title', { defaultValue: 'Contacte-nous' })}
            </h2>
            <p className="text-[var(--color-text-secondary)] text-sm md:text-base leading-relaxed">
              {t('contact.intro', {
                defaultValue:
                  'Une question, un bug, une idée ? Écris-nous, nous lisons chaque message.',
              })}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:gap-4 w-full" noValidate>
            {/* Nom */}
            <div className="flex flex-col gap-1.5 w-full">
              <label
                htmlFor="contact-name"
                className="text-sm font-medium text-[var(--color-text-primary)]"
              >
                {t('contact.nameLabel', { defaultValue: 'Ton prénom' })}
                <span aria-hidden="true" className="text-[var(--color-error)] ml-0.5">
                  *
                </span>
              </label>
              <input
                id="contact-name"
                type="text"
                autoComplete="given-name"
                required
                placeholder={t('contact.namePlaceholder', { defaultValue: 'Marie' })}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="w-full h-12 px-4 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)]"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5 w-full">
              <label
                htmlFor="contact-email"
                className="text-sm font-medium text-[var(--color-text-primary)]"
              >
                {t('contact.emailLabel', { defaultValue: 'Ton email' })}
                <span aria-hidden="true" className="text-[var(--color-error)] ml-0.5">
                  *
                </span>
              </label>
              <input
                id="contact-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)]"
              />
            </div>

            {/* Sujet : dropdown custom */}
            <div className="flex flex-col gap-1.5 w-full">
              <label
                htmlFor="contact-subject-trigger"
                className="text-sm font-medium text-[var(--color-text-primary)]"
              >
                {t('contact.subjectLabel', { defaultValue: 'Sujet' })}
                <span aria-hidden="true" className="text-[var(--color-error)] ml-0.5">
                  *
                </span>
              </label>
              <div className="relative">
                <button
                  id="contact-subject-trigger"
                  type="button"
                  onClick={() => setDropdownOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                  className={`w-full h-12 px-4 rounded-md border bg-[var(--color-bg-primary)] flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] transition-colors ${
                    dropdownOpen
                      ? 'border-[var(--color-action-default)]'
                      : 'border-[var(--color-border)]'
                  }`}
                >
                  <span
                    className={
                      subject
                        ? 'text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-secondary)]'
                    }
                  >
                    {subject
                      ? t(`contact.subjects.${subject}`, { defaultValue: SUBJECT_LABELS[subject] })
                      : t('contact.subjectPlaceholder', { defaultValue: 'Sélectionne un sujet' })}
                  </span>
                  <ChevronDown
                    className={`size-4 text-[var(--color-text-secondary)] shrink-0 transition-transform ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {dropdownOpen && (
                  <ul
                    role="listbox"
                    aria-label={t('contact.subjectLabel', { defaultValue: 'Sujet' })}
                    className="absolute left-0 right-0 top-full mt-2 z-10 bg-[var(--color-bg-primary)] rounded-md border border-[var(--color-border)] shadow-lg overflow-hidden"
                  >
                    {SUBJECTS.map((id) => {
                      const isSelected = subject === id
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setSubject(id)
                              setDropdownOpen(false)
                            }}
                            className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                              isSelected
                                ? 'bg-primary-light text-primary font-medium'
                                : 'text-[var(--color-text-primary)] hover:bg-primary-light hover:text-primary'
                            }`}
                          >
                            {t(`contact.subjects.${id}`, { defaultValue: SUBJECT_LABELS[id] })}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Message */}
            <div className="flex flex-col gap-1.5 w-full">
              <label
                htmlFor="contact-message"
                className="text-sm font-medium text-[var(--color-text-primary)]"
              >
                {t('contact.messageLabel', { defaultValue: 'Ton message' })}
                <span aria-hidden="true" className="text-[var(--color-error)] ml-0.5">
                  *
                </span>
              </label>
              <textarea
                id="contact-message"
                rows={4}
                maxLength={1500}
                placeholder={t('contact.messagePlaceholder', {
                  defaultValue: 'Décris ta question ou ton retour en quelques phrases…',
                })}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)]"
              />
              <p className="text-xs text-[var(--color-text-secondary)] text-right">
                {message.length} / 1500
                {message.trim().length < 20 && message.length > 0 && (
                  <span className="ml-2 text-[var(--color-error)]">
                    ({t('contact.minChars', { defaultValue: 'min. 20 caractères' })})
                  </span>
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 md:gap-3 items-center w-full pt-1">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!canSubmit}
                className="w-full"
                icon={<Send className="size-5" aria-hidden="true" />}
              >
                {t('contact.submit', { defaultValue: 'Envoyer le message' })}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => navigate('/')}
                className="w-full"
              >
                {t('common.back', { defaultValue: 'Retour' })}
              </Button>
            </div>
          </form>

          {/* Footer avec info contact directe + slogan */}
          <p className="text-center text-xs text-[var(--color-text-secondary)] w-full">
            {t('contact.directInfo', { defaultValue: 'Tu peux aussi nous écrire directement à' })}{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[var(--color-action-default)] underline font-medium"
            >
              {CONTACT_EMAIL}
            </a>
          </p>

          <p className="text-center text-sm text-[var(--color-text-secondary)] italic w-full pt-4 border-t border-[var(--color-border)]/30">
            {t('welcome.slogan', { defaultValue: 'Partageons nos émotions' })}
          </p>
        </>
      )}
    </BetaAuthLayout>
  )
}
