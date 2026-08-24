/**
 * SettingsNotificationsView : Sous-vue "Notifications" du SettingsPanel
 * =====================================================================
 *
 * Panneau ENTIEREMENT FONCTIONNEL depuis NG-045 (systeme email live). Chaque
 * section ecrit dans la vraie source et est respectee par le backend :
 *
 *   1. "Quelles notifications recevoir" (reaction / follow / post)
 *      -> notification_preferences.enabled + email_enabled (les 2 canaux).
 *         Couper un type coupe la cloche (is_notif_enabled, triggers) ET
 *         l'email de ce type (is_email_enabled, dispatcher NG-045).
 *
 *   2. "Methodes de notification" : 2 toggles INDEPENDANTS (cochables ensemble)
 *      · "Dans l'application" : cloche = au moins un type actif (enabled).
 *        La bascule active/coupe les 3 types en preservant leur canal email.
 *      · "Par courriel" : user_settings.email_notifications (master email
 *        global, is_email_enabled le verifie en premier).
 *      · "Aucune notification" : raccourci, coche quand tout est coupe et
 *        coupe cloche + email au clic.
 *
 *   3. "Nouvelles et mises a jour" -> user_settings.newsletter.
 *
 *   4. "Frequence par courriel" (refonte email 2026-08-22) : INFORMATIF. On
 *      n'envoie plus qu'UN resume hebdomadaire par courriel (E7, dimanche) ; les
 *      anciens radios temps reel/quotidien/hebdo pilotaient `notif_frequency` que
 *      les digests n'utilisent plus, on les a retires pour ne pas mentir. Le temps
 *      reel reste dans l'application (canal "Dans l'application", section 1).
 *
 * Layout : chaque option est une "card" bordured (rounded-md border-[0.5px])
 * avec label gauche + ToggleSwitch droite. Ecritures optimistes via React Query.
 */

import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from '@/components/ui/ToggleSwitch'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Types de notification exposes dans "Quelles notifications recevoir". */
const NOTIF_TYPES = ['reaction', 'follow', 'post'] as const

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
  // Les 2 methodes sont INDEPENDANTES (cochables ensemble) :
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

  /**
   * Canal "Dans l'application" (independant de l'email) : active/coupe la cloche
   * pour les 3 types d'un coup, en PRESERVANT le canal email de chaque type
   * (les 2 canaux sont independants : couper la cloche ne coupe pas l'email).
   */
  function setInAppChannel(value: boolean) {
    for (const tp of NOTIF_TYPES) {
      setTypePref({ type: tp, enabled: value, emailEnabled: isTypeEmailEnabled(tp) })
    }
  }

  /** "Aucune notification" : coupe TOUT (cloche + email + les 2 canaux par type). */
  function setNoneAll() {
    handleUpdate({ email_notifications: false })
    for (const tp of NOTIF_TYPES) setTypePref({ type: tp, enabled: false, emailEnabled: false })
  }

  const disabled = isLoading || !user?.id
  const typePrefsDisabled = !user?.id

  return (
    <div className="flex flex-col">
      {/* ── Section 0 : Types de notifications (FONCTIONNEL) ──────────────
          Branche sur notification_preferences. L'utilisateur choisit ce qu'il
          recoit ; desactiver un type coupe reellement la notif (trigger DB). */}
      <section className="flex flex-col gap-4 px-6 pt-4 pb-6">
        <h3 className="font-title font-bold text-lg text-foreground leading-tight">
          {t('settings.notifications.typesTitle', {
            defaultValue: 'Quelles notifications recevoir',
          })}
        </h3>
        <div className="flex flex-col gap-3">
          <ToggleCard
            label={t('settings.notifications.typeReaction', {
              defaultValue: 'Réactions à mes publications',
            })}
            checked={isTypeEnabled('reaction')}
            disabled={typePrefsDisabled}
            onChange={(v) => setTypePref({ type: 'reaction', enabled: v, emailEnabled: v })}
          />
          <ToggleCard
            label={t('settings.notifications.typeFollow', {
              defaultValue: 'Nouveaux migrateurs (abonnés)',
            })}
            checked={isTypeEnabled('follow')}
            disabled={typePrefsDisabled}
            onChange={(v) => setTypePref({ type: 'follow', enabled: v, emailEnabled: v })}
          />
          <ToggleCard
            label={t('settings.notifications.typePost', {
              defaultValue: 'Nouvelles publications des profils suivis',
            })}
            checked={isTypeEnabled('post')}
            disabled={typePrefsDisabled}
            onChange={(v) => setTypePref({ type: 'post', enabled: v, emailEnabled: v })}
          />
        </div>
      </section>

      <div className="h-1 bg-border" aria-hidden="true" />

      {/* ── Section 1 : Méthodes de notification (master email) ─────────── */}
      <section className="flex flex-col gap-4 px-6 pt-6 pb-6">
        <h3 className="font-title font-bold text-lg text-foreground leading-tight">
          {t('settings.notifications.methodTitle', {
            defaultValue: 'Méthodes de notification',
          })}
        </h3>
        {/* Toggles INDEPENDANTS : in-app et email peuvent etre actifs ensemble.
            "Aucune" est un raccourci (coche quand tout est coupe, coupe tout au clic). */}
        <div className="flex flex-col gap-3" role="group">
          <ToggleCard
            label={t('settings.notifications.methodInApp', {
              defaultValue: "Dans l'application",
            })}
            checked={inAppOn}
            disabled={disabled}
            onChange={(v) => setInAppChannel(v)}
          />
          <ToggleCard
            label={t('settings.notifications.methodEmail', {
              defaultValue: 'Par courriel',
            })}
            checked={emailOn}
            disabled={disabled}
            onChange={(v) => handleUpdate({ email_notifications: v })}
          />
          <ToggleCard
            label={t('settings.notifications.methodNone', {
              defaultValue: 'Aucune notification',
            })}
            checked={!inAppOn && !emailOn}
            disabled={disabled}
            onChange={(v) => {
              if (v) setNoneAll()
            }}
          />
        </div>
      </section>

      {/* Séparateur 4px solid bg-border edge-to-edge (mêmes specs que
          FeedPost mobile + EditPhotoTab : cohérence DS produit). */}
      <div className="h-1 bg-border" aria-hidden="true" />

      {/* ── Section 2 : Nouvelles et mises à jour ──────────────────────── */}
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

      {/* Séparateur 4px solid bg-border edge-to-edge (mêmes specs que
          FeedPost mobile + EditPhotoTab : cohérence DS produit). */}
      <div className="h-1 bg-border" aria-hidden="true" />

      {/* ── Section 3 : Fréquence par courriel ─────────────────────────────
          Refonte email (2026-08-22) : on n'envoie plus qu'UN resume hebdomadaire
          par courriel (fini les emails quotidiens/temps reel). Les 3 radios
          d'avant (temps reel / quotidien / hebdo) pilotaient notif_frequency, que
          les digests n'utilisent plus -> on remplace par une info honnete. Le
          temps reel, lui, reste dans l'application (section Methodes ci-dessus). */}
      <section className="flex flex-col gap-3 px-6 pt-6 pb-6">
        <h3 className="font-title font-bold text-lg text-foreground leading-tight">
          {t('settings.notifications.emailFreqTitle', {
            defaultValue: 'Fréquence par courriel',
          })}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {t('settings.notifications.emailFreqInfo', {
            defaultValue:
              'Par courriel, tu reçois seulement un résumé hebdomadaire de ton activité, jamais de quotidien. Les notifications instantanées, elles, restent dans l’application.',
          })}
        </p>
      </section>
    </div>
  )
}

// ─── Sous-composant : ToggleCard ──────────────────────────────────────────────

interface ToggleCardProps {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}

/**
 * Card bordured avec label à gauche + ToggleSwitch à droite.
 * Pattern Figma : rounded-md border-[0.5px], padding 16px, h-12.
 */
function ToggleCard({ label, checked, onChange, disabled }: ToggleCardProps) {
  return (
    <label
      className={`flex items-center gap-4 px-4 py-3 rounded-md border-[0.5px] border-border bg-background transition-colors ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'
      }`}
    >
      <span className="flex-1 text-sm font-medium text-foreground leading-snug">{label}</span>
      <ToggleSwitch checked={checked} onChange={onChange} ariaLabel={label} disabled={disabled} />
    </label>
  )
}
