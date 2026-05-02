/**
 * SettingsNotificationsView — Sous-vue "Notifications" du SettingsPanel
 * =====================================================================
 *
 * Pixel-perfect Figma — 3 sections séparées par dividers :
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
 * granulaire — voir notes backend ci-dessous).
 *
 * ── TODO [BACKEND] Phase 2 ────────────────────────────────────────────
 *
 *   ## Tables à enrichir / créer
 *
 *   Option A — Étendre `notification_preferences` existante :
 *     ALTER TABLE notification_preferences ADD COLUMN delivery TEXT
 *       NOT NULL DEFAULT 'in_app'
 *       CHECK (delivery IN ('in_app','email','none'));
 *     ALTER TABLE notification_preferences ADD COLUMN frequency TEXT
 *       NOT NULL DEFAULT 'realtime'
 *       CHECK (frequency IN ('realtime','daily','weekly','monthly'));
 *
 *   Option B (recommandée) — Nouvelle table de réglages globaux user :
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

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryMethod = 'in_app' | 'email' | 'none'
/**
 * Fréquence de notification (digest) — stockée dans `user_settings.notif_frequency`
 * (colonne ajoutée par migration `20260502_settings_notif_frequency.sql`).
 *
 * 'realtime' = notif immédiate dès qu'un événement survient.
 * 'daily'    = digest quotidien (cron 8h UTC).
 * 'weekly'   = digest hebdomadaire (cron lundi 8h UTC).
 */
type Frequency = 'realtime' | 'daily' | 'weekly'

// ─── Helpers : mapping settings DB <-> UI radios ─────────────────────────────
//
// Le DS UI propose des **radios exclusifs** ("Dans l'application | Par courriel
// | Aucune"), mais la DB (table `user_settings`) stocke 2 booléens indépendants
// `email_notifications` + `push_notifications`. On dérive l'un depuis l'autre
// pour respecter le pattern radio sans changer le schéma existant.

function deliveryFromSettings(email: boolean, push: boolean): DeliveryMethod {
  // Si les deux sont actifs (legacy), on privilégie 'email' (plus fiable).
  if (email) return 'email'
  if (push) return 'in_app'
  return 'none'
}

function deliveryToSettings(d: DeliveryMethod): {
  email_notifications: boolean
  push_notifications: boolean
} {
  return {
    email_notifications: d === 'email',
    push_notifications: d === 'in_app',
  }
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function SettingsNotificationsView() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const toast = useToast()

  // Lecture des settings actuels (cache 5 min via useSettings).
  const { data: settings, isLoading } = useSettings(user?.id)
  const updateSettings = useUpdateSettings(user?.id)

  // Valeurs courantes — fallback sur les défauts si pas encore chargé/persisté.
  // ⚠️ On lit directement depuis `settings` (pas de state local) pour rester
  // synchronisé avec React Query — l'optimistic update se fait via `setQueryData`.
  const delivery: DeliveryMethod = settings
    ? deliveryFromSettings(settings.email_notifications, settings.push_notifications)
    : 'email'
  const productUpdates: boolean = settings?.newsletter ?? true
  const frequency: Frequency =
    (settings as unknown as { notif_frequency?: Frequency } | null)?.notif_frequency ?? 'weekly'

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

  // En attente du premier load — on rend tout de même les contrôles avec leurs
  // valeurs par défaut pour éviter le layout shift. Les toggles sont disabled.
  const disabled = isLoading || !user?.id

  return (
    <div className="flex flex-col">
      {/* ── Section 1 : Méthodes de notification ───────────────────────── */}
      <section className="flex flex-col gap-4 px-6 pt-2 pb-6">
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
            onChange={(v) => v && handleUpdate(deliveryToSettings('in_app'))}
          />
          <ToggleCard
            label={t('settings.notifications.methodEmail', {
              defaultValue: 'Par courriel',
            })}
            checked={delivery === 'email'}
            disabled={disabled}
            onChange={(v) => v && handleUpdate(deliveryToSettings('email'))}
          />
          <ToggleCard
            label={t('settings.notifications.methodNone', {
              defaultValue: 'Aucune notification',
            })}
            checked={delivery === 'none'}
            disabled={disabled}
            onChange={(v) => v && handleUpdate(deliveryToSettings('none'))}
          />
        </div>
      </section>

      {/* Séparateur 4px solid bg-border edge-to-edge (mêmes specs que
          FeedPost mobile + EditPhotoTab — cohérence DS produit). */}
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
          FeedPost mobile + EditPhotoTab — cohérence DS produit). */}
      <div className="h-1 bg-border" aria-hidden="true" />

      {/* ── Section 3 : Fréquence de notification ──────────────────────── */}
      <section className="flex flex-col gap-4 px-6 pt-6 pb-6">
        <h3 className="font-title font-bold text-lg text-foreground leading-tight">
          {t('settings.notifications.freqTitle', {
            defaultValue: 'Fréquence de notification',
          })}
        </h3>
        {/* Ordre Figma : Temps réel → Une fois par jour → Une fois par semaine
            (du plus fréquent au moins fréquent — Nicolas 2026-05-02). */}
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
