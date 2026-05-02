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

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from '@/components/ui/ToggleSwitch'

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryMethod = 'in_app' | 'email' | 'none'
type Frequency = 'realtime' | 'weekly' | 'daily'

// ─── Composant ────────────────────────────────────────────────────────────────

export function SettingsNotificationsView() {
  const { t } = useTranslation()

  // ── État local Phase 1 (mock) ──────────────────────────────────────────────
  // TODO [BACKEND] : remplacer par useNotificationSettings() qui lit depuis
  // user_notification_settings. État initial vient d'un useEffect qui hydrate
  // depuis la DB. À chaque changement → useUpdateNotificationSettings()
  // mutation optimistic.
  const [delivery, setDelivery] = useState<DeliveryMethod>('email')
  const [productUpdates, setProductUpdates] = useState(true)
  const [frequency, setFrequency] = useState<Frequency>('weekly')

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
            onChange={(v) => v && setDelivery('in_app')}
          />
          <ToggleCard
            label={t('settings.notifications.methodEmail', {
              defaultValue: 'Par courriel',
            })}
            checked={delivery === 'email'}
            onChange={(v) => v && setDelivery('email')}
          />
          <ToggleCard
            label={t('settings.notifications.methodNone', {
              defaultValue: 'Aucune notification',
            })}
            checked={delivery === 'none'}
            onChange={(v) => v && setDelivery('none')}
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
          onChange={setProductUpdates}
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
            onChange={(v) => v && setFrequency('realtime')}
          />
          <ToggleCard
            label={t('settings.notifications.freqDaily', {
              defaultValue: 'Une fois par jour',
            })}
            checked={frequency === 'daily'}
            onChange={(v) => v && setFrequency('daily')}
          />
          <ToggleCard
            label={t('settings.notifications.freqWeekly', {
              defaultValue: 'Une fois par semaine',
            })}
            checked={frequency === 'weekly'}
            onChange={(v) => v && setFrequency('weekly')}
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
}

/**
 * Card bordured avec label à gauche + ToggleSwitch à droite.
 * Pattern Figma : rounded-md border-[0.5px], padding 16px, h-12.
 */
function ToggleCard({ label, checked, onChange }: ToggleCardProps) {
  return (
    <label className="flex items-center gap-4 px-4 py-3 rounded-md border-[0.5px] border-border bg-background cursor-pointer hover:border-primary/50 transition-colors">
      <span className="flex-1 text-sm font-medium text-foreground leading-snug">{label}</span>
      <ToggleSwitch checked={checked} onChange={onChange} ariaLabel={label} />
    </label>
  )
}
