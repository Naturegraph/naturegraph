/**
 * SettingsNotificationsView : Sous-vue "Notifications" du SettingsPanel
 * =====================================================================
 *
 * Refonte 2026-08-24 (« repenser le panneau ») : on repond a DEUX questions
 * claires au lieu de trois sections qui se chevauchaient.
 *
 *   1. "Comment etre prevenu·e" (les CANAUX) : 2 toggles independants.
 *      · "Dans l'application" : cloche = au moins un type actif (enabled). La
 *        bascule active/coupe les types en preservant leur canal email.
 *      · "Par courriel" : user_settings.email_notifications (master email
 *        global). Sous-titre honnete : un resume, une fois par semaine (E7).
 *
 *   2. "De quoi etre prevenu·e" (les TYPES) -> notification_preferences
 *      (enabled + email_enabled, les 2 canaux d'un coup). Couper un type coupe
 *      la cloche ET l'email de ce type (is_notif_enabled + is_email_enabled,
 *      backend NG-045). Le type "Echanges et identifications" (pref `comment`)
 *      etait invisible avant cette refonte : il gouverne pourtant le digest.
 *
 *   3. "Nouvelles et mises a jour" -> user_settings.newsletter.
 *
 *   + Lien discret "Tout desactiver" (remplace l'ancien gros toggle "Aucune") :
 *     coupe cloche + email en un clic.
 *
 * Disparu : la section "Frequence par courriel" (temps reel / quotidien / hebdo)
 * ne pilotait plus rien depuis la refonte email (un seul resume hebdo), on l'a
 * retiree pour ne pas mentir. Le temps reel reste dans l'application (canal 1).
 *
 * Layout : chaque option est une "card" relevee (bg-card + border) avec label
 * (et sous-titre optionnel) a gauche + ToggleSwitch a droite. Couleurs 100 %
 * tokens design system -> rendu correct en clair ET en sombre. Ecritures
 * optimistes via React Query.
 */

import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from '@/components/ui/ToggleSwitch'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'
import type { NotificationType } from '@/services/notificationService'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Types exposes dans "De quoi etre prevenu·e", dans l'ordre d'affichage.
 * 'comment' couvre les echanges ET les identifications (meme preference cote
 * backend). Ces 4 types forment aussi le perimetre du master "Dans l'application"
 * et du "Tout desactiver".
 */
const NOTIF_TYPES: NotificationType[] = ['reaction', 'comment', 'follow', 'post']

// ─── Composant ────────────────────────────────────────────────────────────────

export function SettingsNotificationsView() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const toast = useToast()

  // Lecture des settings actuels (cache 5 min via useSettings).
  const { data: settings, isLoading } = useSettings(user?.id)
  const updateSettings = useUpdateSettings(user?.id)

  // Préférences PAR TYPE (table notification_preferences). Couper un type coupe
  // la cloche ET l'email de ce type (is_notif_enabled + is_email_enabled cote
  // backend NG-045).
  const {
    isEnabled: isTypeEnabled,
    isEmailEnabled: isTypeEmailEnabled,
    setChannels: setTypePref,
  } = useNotificationPreferences(user?.id)

  // Valeurs courantes : lues directement depuis `settings` (pas de state local)
  // pour rester synchro avec React Query (optimistic update via setQueryData).
  //   - "Par courriel" = user_settings.email_notifications (master email global).
  //   - "Dans l'application" = cloche = au moins un type actif (enabled).
  // email_notifications defaut true si pas de row (compte existant).
  const emailOn: boolean = settings?.email_notifications ?? true
  const inAppOn = NOTIF_TYPES.some((tp) => isTypeEnabled(tp))
  const productUpdates: boolean = settings?.newsletter ?? false

  /**
   * Wrapper mutation : update settings + toast d'erreur si échec.
   * Le succès est silencieux (l'UI reflète déjà la valeur via React Query).
   */
  function handleUpdate(patch: Record<string, unknown>) {
    updateSettings.mutate(patch as never, {
      onError: (err) => {
        console.error('[Notifications] update failed', err)
        toast.error(
          t('settings.notifications.updateError', {
            defaultValue: 'Impossible de sauvegarder pour le moment.',
          }),
        )
      },
    })
  }

  /** Bascule les 2 canaux d'un type d'un coup (cloche + email ensemble). */
  function toggleType(type: NotificationType, value: boolean) {
    setTypePref({ type, enabled: value, emailEnabled: value })
  }

  /**
   * Canal "Dans l'application" (independant de l'email) : active/coupe la cloche
   * pour tous les types d'un coup, en PRESERVANT le canal email de chaque type
   * (les 2 canaux sont independants : couper la cloche ne coupe pas l'email).
   */
  function setInAppChannel(value: boolean) {
    for (const tp of NOTIF_TYPES) {
      setTypePref({ type: tp, enabled: value, emailEnabled: isTypeEmailEnabled(tp) })
    }
  }

  /** "Tout desactiver" : coupe TOUT (cloche + email + les 2 canaux par type). */
  function disableAll() {
    handleUpdate({ email_notifications: false })
    for (const tp of NOTIF_TYPES) setTypePref({ type: tp, enabled: false, emailEnabled: false })
  }

  const disabled = isLoading || !user?.id
  const typePrefsDisabled = !user?.id
  const alreadyAllOff = !inAppOn && !emailOn

  return (
    <div className="flex flex-col">
      {/* ── Section 1 : Comment etre prevenu·e (les canaux) ───────────────
          Deux toggles INDEPENDANTS (cochables ensemble). "Par courriel" annonce
          sa vraie cadence : un resume hebdomadaire (E7), plus de radios. */}
      <section className="flex flex-col gap-4 px-6 pt-4 pb-6">
        <h3 className="font-title font-bold text-lg text-foreground leading-tight">
          {t('settings.notifications.channelsTitle', {
            defaultValue: 'Comment être prévenu·e',
          })}
        </h3>
        <div className="flex flex-col gap-3" role="group">
          <ToggleCard
            label={t('settings.notifications.methodInApp', { defaultValue: "Dans l'application" })}
            description={t('settings.notifications.methodInAppDesc', {
              defaultValue: 'En temps réel, dans la cloche',
            })}
            checked={inAppOn}
            disabled={disabled}
            onChange={(v) => setInAppChannel(v)}
          />
          <ToggleCard
            label={t('settings.notifications.methodEmail', { defaultValue: 'Par courriel' })}
            description={t('settings.notifications.methodEmailDesc', {
              defaultValue: 'Un résumé, une fois par semaine',
            })}
            checked={emailOn}
            disabled={disabled}
            onChange={(v) => handleUpdate({ email_notifications: v })}
          />
        </div>
      </section>

      {/* Séparateur 4px solid bg-border edge-to-edge (cohérence DS produit). */}
      <div className="h-1 bg-border" aria-hidden="true" />

      {/* ── Section 2 : De quoi etre prevenu·e (les types) ────────────────
          Branche sur notification_preferences. Chaque type coupe la cloche ET
          l'email de ce type. "Echanges et identifications" (pref comment) est
          expose ici pour la premiere fois. */}
      <section className="flex flex-col gap-3 px-6 pt-6 pb-6">
        <div className="flex flex-col gap-1">
          <h3 className="font-title font-bold text-lg text-foreground leading-tight">
            {t('settings.notifications.typesTitle', {
              defaultValue: 'De quoi être prévenu·e',
            })}
          </h3>
          <p className="text-xs text-muted-foreground leading-snug">
            {t('settings.notifications.typesHint', {
              defaultValue: 'S’applique à la cloche et au résumé hebdomadaire.',
            })}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <ToggleCard
            label={t('settings.notifications.typeReaction', {
              defaultValue: 'Réactions à mes publications',
            })}
            checked={isTypeEnabled('reaction')}
            disabled={typePrefsDisabled}
            onChange={(v) => toggleType('reaction', v)}
          />
          <ToggleCard
            label={t('settings.notifications.typeComment', {
              defaultValue: 'Échanges et identifications',
            })}
            description={t('settings.notifications.typeCommentDesc', {
              defaultValue: 'Commentaires et espèces proposées',
            })}
            checked={isTypeEnabled('comment')}
            disabled={typePrefsDisabled}
            onChange={(v) => toggleType('comment', v)}
          />
          <ToggleCard
            label={t('settings.notifications.typeFollow', {
              defaultValue: 'Nouveaux migrateurs (abonnés)',
            })}
            description={t('settings.notifications.typeFollowDesc', {
              defaultValue: 'Quand on commence à te suivre',
            })}
            checked={isTypeEnabled('follow')}
            disabled={typePrefsDisabled}
            onChange={(v) => toggleType('follow', v)}
          />
          <ToggleCard
            label={t('settings.notifications.typePost', {
              defaultValue: 'Nouvelles publications des profils suivis',
            })}
            checked={isTypeEnabled('post')}
            disabled={typePrefsDisabled}
            onChange={(v) => toggleType('post', v)}
          />
        </div>
      </section>

      {/* Séparateur 4px solid bg-border edge-to-edge (cohérence DS produit). */}
      <div className="h-1 bg-border" aria-hidden="true" />

      {/* ── Section 3 : Nouvelles et mises à jour ──────────────────────── */}
      <section className="flex flex-col gap-4 px-6 pt-6 pb-6">
        <h3 className="font-title font-bold text-lg text-foreground leading-tight">
          {t('settings.notifications.newsTitle', {
            defaultValue: 'Nouvelles et mises à jour',
          })}
        </h3>
        <ToggleCard
          label={t('settings.notifications.productUpdates', {
            defaultValue:
              'Obtenez des informations sur les mises à jour du produit et des fonctionnalités',
          })}
          checked={productUpdates}
          disabled={disabled}
          onChange={(v) => handleUpdate({ newsletter: v })}
        />
      </section>

      {/* ── "Tout desactiver" : lien discret (couleur lien produit) ──────
          Remplace l'ancien gros toggle "Aucune notification" : action rare,
          donc moins de poids visuel. Grise si tout est deja coupe. */}
      <div className="px-6 pb-6 pt-1">
        <button
          type="button"
          onClick={disableAll}
          disabled={disabled || alreadyAllOff}
          className="text-sm font-medium text-[var(--color-link)] underline underline-offset-2 hover:no-underline disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          {t('settings.notifications.disableAll', { defaultValue: 'Tout désactiver' })}
        </button>
      </div>
    </div>
  )
}

// ─── Sous-composant : ToggleCard ──────────────────────────────────────────────

interface ToggleCardProps {
  label: string
  /** Sous-titre optionnel affiché sous le label (contexte, cadence...). */
  description?: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}

/**
 * Card relevée (bg-card sur le fond du panneau) avec label + sous-titre optionnel
 * à gauche et ToggleSwitch à droite. Couleurs 100 % tokens -> clair + sombre OK.
 */
function ToggleCard({ label, description, checked, onChange, disabled }: ToggleCardProps) {
  return (
    <label
      className={`flex items-center gap-4 px-4 py-3 rounded-md border-[0.5px] border-border bg-card transition-colors ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'
      }`}
    >
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-foreground leading-snug">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-muted-foreground leading-snug">
            {description}
          </span>
        )}
      </span>
      <ToggleSwitch checked={checked} onChange={onChange} ariaLabel={label} disabled={disabled} />
    </label>
  )
}
