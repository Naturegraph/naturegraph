/**
 * SettingsHelpView — Sous-vue "Besoin d'aide ?" du SettingsPanel
 * ================================================================
 *
 * Pixel-perfect Figma — formulaire de contact :
 *   - Titre "Tu as une question ?"
 *   - Description (3 lignes ton de réassurance)
 *   - Sélecteur "Sujet*" (dropdown custom, 5 options)
 *   - Textarea "Ton message*"
 *   - Boutons [Annuler] + [Envoyer]
 *
 * Le dropdown ouvre une liste de cards où l'option sélectionnée est
 * surlignée en primary-light (cohérent avec le DS Naturegraph).
 *
 * Style du dropdown :
 *   - Trigger : pill rounded-full bordured + chevron down (chevron up si ouvert)
 *   - Liste : card border 0.5px, items au hover bg-primary-light + text-primary
 *   - Item sélectionné : bg-primary-light + text-primary persistant
 *
 * TODO [BACKEND] Phase 2 — voir second-agent/03-profil-backend-notes.md §15
 *
 *   ## Soumission du formulaire
 *
 *   Option A (recommandée MVP) — Discord webhook :
 *     - Edge Function `submit_help_request(subject, message)` qui POST sur
 *       l'URL d'un webhook Discord configuré côté secrets
 *     - Avantage : pas de DB, pas de service email, déploiement instantané
 *     - L'équipe répond directement dans Discord à l'utilisateur
 *
 *   Option B (Phase 3) — Table support_tickets :
 *     CREATE TABLE support_tickets (
 *       id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *       user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
 *       subject     TEXT NOT NULL CHECK (subject IN ('technical','help',
 *                       'suggestion','report','other')),
 *       message     TEXT NOT NULL,
 *       status      TEXT NOT NULL DEFAULT 'new'
 *                       CHECK (status IN ('new','in_progress','resolved','closed')),
 *       email_sent  BOOLEAN NOT NULL DEFAULT FALSE,
 *       created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
 *       resolved_at TIMESTAMPTZ
 *     );
 *     -- Email transactionnel (Resend) à naturegraph.fr@gmail.com + accusé user
 *     -- ⚠️ Pendant la beta : utiliser naturegraph.fr@gmail.com (cf src/constants/contact.ts).
 *     -- Migrer vers staff@naturegraph.fr quand le domaine sera transféré côté Hostinger.
 *     -- RLS : user peut SELECT ses propres tickets (transparence RGPD)
 *
 *   ## Validation côté serveur (Edge Function)
 *
 *   - Anti-spam : limit 3 messages / 24h / user (cooldown)
 *   - Sanitize message (DOMPurify ou markdown only — pas de HTML brut)
 *   - Min message length : 20 caractères
 *
 *   ## i18n (clés à ajouter)
 *
 *   - settings.help.title, intro, subjectLabel, subjectPlaceholder, messageLabel,
 *     subjects.* (technical, help, suggestion, report, other), send
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { useSubmitHelpRequest } from '@/hooks/useSupport'
import type { SupportSubject } from '@/services/supportService'
import {
  INPUT_PILL_CLASS,
  TEXTAREA_CLASS,
  BUTTON_PRIMARY_CLASS,
  BUTTON_OUTLINE_CLASS,
} from '@/styles/inputs'

// ─── Types ────────────────────────────────────────────────────────────────────

type SubjectId = SupportSubject

const SUBJECTS: SubjectId[] = ['technical', 'help', 'suggestion', 'report', 'other']

// ─── Composant ────────────────────────────────────────────────────────────────

export function SettingsHelpView() {
  const { t } = useTranslation()
  const toast = useToast()
  const submitMutation = useSubmitHelpRequest()

  const [subject, setSubject] = useState<SubjectId | null>(null)
  const [message, setMessage] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fermeture du dropdown au clic extérieur
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', onClickOutside)
      return () => document.removeEventListener('mousedown', onClickOutside)
    }
  }, [dropdownOpen])

  function handleCancel() {
    setSubject(null)
    setMessage('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject || message.trim().length < 20) return
    try {
      await submitMutation.mutateAsync({ subject, message })
      toast.success(
        t('settings.help.successTitle', {
          defaultValue: 'Message envoyé',
        }),
        t('settings.help.successDesc', {
          defaultValue: 'Merci ! Nous reviendrons vers toi rapidement.',
        }),
      )
      setSubject(null)
      setMessage('')
    } catch (err) {
      console.error('[Help] submit failed', err)
      toast.error(
        t('settings.help.errorSubmit', {
          defaultValue: "Impossible d'envoyer le message pour l'instant.",
        }),
        err instanceof Error ? err.message : undefined,
      )
    }
  }

  const canSubmit = !submitMutation.isPending && subject !== null && message.trim().length >= 20

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 pt-2 pb-6">
      {/* Header section */}
      <div className="flex flex-col gap-2">
        <h3 className="font-title font-bold text-lg text-foreground leading-tight">
          {t('settings.help.title', { defaultValue: 'Tu as une question ?' })}
        </h3>
        <p className="text-sm text-foreground leading-relaxed">
          {t('settings.help.intro', {
            defaultValue:
              'Nous sommes à ton écoute ! Tes retours nous aident à perfectionner Naturegraph en continu pour que la solution réponde encore mieux à tes attentes.',
          })}
        </p>
      </div>

      {/* Sujet — dropdown custom */}
      <div className="flex flex-col gap-2" ref={dropdownRef}>
        <label htmlFor="help-subject-trigger" className="text-sm font-medium text-foreground">
          {t('settings.help.subjectLabel', { defaultValue: 'Sujet' })}
          <span aria-hidden="true" className="text-[var(--color-error)] ml-0.5">
            *
          </span>
        </label>
        <div className="relative">
          <button
            id="help-subject-trigger"
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            className={`${INPUT_PILL_CLASS} flex items-center justify-between text-left ${
              dropdownOpen ? 'bg-primary-light border-primary' : ''
            }`}
          >
            <span className={subject ? 'text-foreground' : 'text-muted-foreground'}>
              {subject
                ? t(`settings.help.subjects.${subject}`, {
                    defaultValue: SUBJECT_LABELS[subject],
                  })
                : t('settings.help.subjectPlaceholder', {
                    defaultValue: 'Sélectionne un sujet',
                  })}
            </span>
            <ChevronDown
              className={`size-4 text-foreground shrink-0 transition-transform ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {/* Liste des options — affichée au-dessous du trigger */}
          {dropdownOpen && (
            <ul
              role="listbox"
              aria-label={t('settings.help.subjectLabel', { defaultValue: 'Sujet' })}
              className="absolute left-0 right-0 top-full mt-2 z-10 bg-background rounded-2xl border-[0.5px] border-border shadow-lg overflow-hidden"
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
                      className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                        isSelected
                          ? 'bg-primary-light text-primary'
                          : 'text-foreground hover:bg-primary-light hover:text-primary'
                      }`}
                    >
                      {t(`settings.help.subjects.${id}`, {
                        defaultValue: SUBJECT_LABELS[id],
                      })}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Message */}
      <div className="flex flex-col gap-2">
        <label htmlFor="help-message" className="text-sm font-medium text-foreground">
          {t('settings.help.messageLabel', { defaultValue: 'Ton message' })}
          <span aria-hidden="true" className="text-[var(--color-error)] ml-0.5">
            *
          </span>
        </label>
        <textarea
          id="help-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          maxLength={1000}
          className={TEXTAREA_CLASS}
        />
      </div>

      {/* Actions — boutons partagés via styles/inputs.ts */}
      <div className="flex gap-3 mt-2">
        <button type="button" onClick={handleCancel} className={`flex-1 ${BUTTON_OUTLINE_CLASS}`}>
          {t('common.cancel', { defaultValue: 'Annuler' })}
        </button>
        <button type="submit" disabled={!canSubmit} className={`flex-1 ${BUTTON_PRIMARY_CLASS}`}>
          {submitMutation.isPending
            ? t('common.loading', { defaultValue: 'Envoi…' })
            : t('settings.help.send', { defaultValue: 'Envoyer' })}
        </button>
      </div>
    </form>
  )
}

// ─── Labels par défaut (i18n fallback) ────────────────────────────────────────

const SUBJECT_LABELS: Record<SubjectId, string> = {
  technical: 'Problème technique',
  help: "Question ou besoin d'aide",
  suggestion: 'Suggestion ou amélioration',
  report: 'Signalement (contenu ou comportement)',
  other: 'Autre',
}
