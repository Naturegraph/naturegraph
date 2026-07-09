/**
 * SettingsNotificationsView : Sous-vue "Notifications" du SettingsPanel
 * =====================================================================
 *
 * Pixel-perfect Figma : 3 sections séparées par dividers :
 *
 *   1. Méthodes de notification (RADIO exclusif via switches stylisés)
 *      - Dans l'application
 *      - Par courriel
 *      - Aucune notification
 *
 *   2. Nouvelles et mises à jour (TOGGLE simple)
 *      - "Obtenez des informations sur les mises à jour du produit
 *         et des fonctionnalités"
 *
 *   3. Fréquence de notification (RADIO exclusif via switches stylisés)
 *      - Temps réel
 *      - Une fois par semaine
 *      - Une fois par jour
 *
 * Layout : chaque option est dans une "card" bordured (rounded-md
 * border-[0.5px]) avec label gauche + ToggleSwitch droite.
 *
 * ── CONNEXION AVEC L'ONBOARDING ──────────────────────────────────────
 *
 * L'onboarding (étape 2) collecte une préférence `frequency` parmi :
 *   `daily | weekly | monthly | occasionally`
 *
 * Ce choix est utilisé dans `onboarding/index.tsx` pour activer ou non
 * `notification_preferences.species_digest` (digest hebdomadaire opt-in
 * RGPD). Cf. service `notificationPreferencesService.setPreference()`.
 *
 * Mapping onboarding → settings (à confirmer Phase 2 avec Nicolas) :
 *   - onboarding 'daily'        → settings.frequency = 'realtime'
 *   - onboarding 'weekly'       → settings.frequency = 'weekly'
 *   - onboarding 'monthly'      → settings.frequency = 'monthly' (à ajouter)
 *   - onboarding 'occasionally' → settings.delivery = 'none'
 *
 * Pour la **cohérence de l'écosystème**, cette vue doit lire/écrire dans la
 * MÊME source que l'onboarding (la table `notification_preferences` +
 * éventuellement une nouvelle table `user_notification_settings` plus
 * granulaire : voir notes backend ci-dessous).
 *
 * ── TODO [BACKEND] Phase 2 ────────────────────────────────────────────
 *
 *   ## Tables à enrichir / créer
 *
 *   Option A : Étendre `notification_preferences` existante :
 *     ALTER TABLE notification_preferences ADD COLUMN delivery TEXT
 *       NOT NULL DEFAULT 'in_app'
 *       CHECK (delivery IN ('in_app','email','none'));
 *     ALTER TABLE notification_preferences ADD COLUMN frequency TEXT
 *       NOT NULL DEFAULT 'realtime'
 *       CHECK (frequency IN ('realtime','daily','weekly','monthly'));
 *
 *   Option B (recommandée) : Nouvelle table de réglages globaux user :
 *     CREATE TABLE user_notification_settings (
 *       user_id    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
 *       delivery   TEXT NOT NULL DEFAULT 'in_app'
 *                       CHECK (delivery IN ('in_app','email','none')),
 *       frequency  TEXT NOT NULL DEFAULT 'realtime'
 *                       CHECK (frequency IN ('realtime','daily','weekly')),
 *       product_updates BOOLEAN NOT NULL DEFAULT TRUE,
 *       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
 *     );
 *     -- RLS : SELECT/UPDATE owner only (auth.uid() = user_id)
 *
 *   ## Hooks React Query
 *
 *   - `useNotificationSettings()` → SELECT settings actuels
 *   - `useUpdateNotificationSettings()` → UPDATE optimistic
 *
 *   ## Synchronisation onboarding
 *
 *   Au moment où l'onboarding sauvegarde la frequency :
 *     1. INSERT dans `user_notification_settings (user_id, frequency)`
 *     2. Ce settings page lit/met à jour cette même row
 *     → l'utilisateur retrouve son choix dans Settings après onboarding
 *
 *   ## Délivery des notifications côté backend
 *
 *   Edge Function ou pg_cron qui consomme la table `notifications` (queue) :
 *     - Pour chaque notif, lit `user_notification_settings.delivery` :
 *       · 'in_app' → INSERT dans table notifications (Phase 1 actuelle)
 *       · 'email'  → envoyer via Resend / Supabase email avec template
 *       · 'none'   → drop la notif
 *     - Si `frequency` != 'realtime', mise en buffer + cron daily/weekly digest
 */

import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from '@/components/ui/ToggleSwitch'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryMethod = 'in_app' | 'email' | 'none'
/**
 * Fréquence de notification (digest) : stockée dans `user_settings.notif_frequency`.
 *
 * 'realtime' = notif immédiate dès qu'un événement survient.
 * 'daily'    = digest quotidien (NG-045 : E7/E8 respectent cette valeur).
 * 'weekly'   = digest hebdomadaire (couvert par le resume E1).
 */
type Frequency = 'realtime' | 'daily' | 'weekly'

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
  const { isEnabled: isTypeEnabled, setChannels: setTypePref } = useNotificationPreferences(
    user?.id,
  )

  // Valeurs courantes : lues directement depuis `settings` (pas de state local)
  // pour rester synchro avec React Query (optimistic update via setQueryData).
  // email_notifications = master email global (NG-045 : is_email_enabled le
  // verifie en premier). Defaut true si pas de row (compte existant).
  const emailOn: boolean = settings?.email_notifications ?? true
  const allTypesOff = NOTIF_TYPES.every((tp) => !isTypeEnabled(tp))
  // Radio "Methodes" derivee : email actif -> "Par courriel" ; sinon selon qu'il
  // reste au moins un type actif (cloche) ou plus rien du tout.
  const delivery: DeliveryMethod = emailOn ? 'email' : allTypesOff ? 'none' : 'in_app'
  const productUpdates: boolean = settings?.newsletter ?? false
  const frequency: Frequency = settings?.notif_frequency ?? 'weekly'

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

  /** Active/coupe les 3 types d'un coup (les 2 canaux). Utilise par "Aucune". */
  function setAllTypes(value: boolean) {
    for (const tp of NOTIF_TYPES) setTypePref({ type: tp, enabled: value, emailEnabled: value })
  }

  /**
   * Choix de la methode (radio exclusif) :
   *   - 'email'  : master email ON (les types actifs partent aussi par email)
   *   - 'in_app' : master email OFF (cloche seule)
   *   - 'none'   : master email OFF + tous les types coupes (silence total)
   * En sortant d'un etat "Aucune" (tout coupe), 'email'/'in_app' reactivent les
   * types pour que la cloche reparte ; sinon on respecte les choix par type.
   */
  function handleDelivery(method: DeliveryMethod) {
    if (method === 'none') {
      handleUpdate({ email_notifications: false })
      setAllTypes(false)
      return
    }
    handleUpdate({ email_notifications: method === 'email' })
    if (allTypesOff) setAllTypes(true)
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
        <div className="flex flex-col gap-3" role="radiogroup">
          <ToggleCard
            label={t('settings.notifications.methodInApp', {
              defaultValue: "Dans l'application",
            })}
            checked={delivery === 'in_app'}
            disabled={disabled}
            onChange={(v) => v && handleDelivery('in_app')}
          />
          <ToggleCard
            label={t('settings.notifications.methodEmail', {
              defaultValue: 'Par courriel',
            })}
            checked={delivery === 'email'}
            disabled={disabled}
            onChange={(v) => v && handleDelivery('email')}
          />
          <ToggleCard
            label={t('settings.notifications.methodNone', {
              defaultValue: 'Aucune notification',
            })}
            checked={delivery === 'none'}
            disabled={disabled}
            onChange={(v) => v && handleDelivery('none')}
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

      {/* ── Section 3 : Fréquence de notification ──────────────────────── */}
      <section className="flex flex-col gap-4 px-6 pt-6 pb-6">
        <h3 className="font-title font-bold text-lg text-foreground leading-tight">
          {t('settings.notifications.freqTitle', {
            defaultValue: 'Fréquence de notification',
          })}
        </h3>
        {/* Ordre Figma : Temps réel → Une fois par jour → Une fois par semaine
            (du plus fréquent au moins fréquent : Nicolas 2026-05-02). */}
        <div className="flex flex-col gap-3" role="radiogroup">
          <ToggleCard
            label={t('settings.notifications.freqRealtime', {
              defaultValue: 'Temps réel',
            })}
            checked={frequency === 'realtime'}
            disabled={disabled}
            onChange={(v) => v && handleUpdate({ notif_frequency: 'realtime' })}
          />
          <ToggleCard
            label={t('settings.notifications.freqDaily', {
              defaultValue: 'Une fois par jour',
            })}
            checked={frequency === 'daily'}
            disabled={disabled}
            onChange={(v) => v && handleUpdate({ notif_frequency: 'daily' })}
          />
          <ToggleCard
            label={t('settings.notifications.freqWeekly', {
              defaultValue: 'Une fois par semaine',
            })}
            checked={frequency === 'weekly'}
            disabled={disabled}
            onChange={(v) => v && handleUpdate({ notif_frequency: 'weekly' })}
          />
        </div>
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
