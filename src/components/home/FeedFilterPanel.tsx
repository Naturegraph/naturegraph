/**
 * FeedFilterPanel — Panneau de filtres du feed
 *
 * Desktop : sidebar fixe à droite du feed, overlay semi-transparent
 * Mobile : bottom sheet plein écran avec scroll
 *
 * Filtres disponibles :
 *   - Catégorie d'espèces (chips toggle)
 *   - Demandes d'aide uniquement (checkbox)
 *   - Type de partage (checkboxes : Rencontre / Instant)
 *   - Rayon géographique (chips : Tout, 100, 200, 500 km)
 *   - Période (chips : Tout, Aujourd'hui, Cette semaine, Ce mois)
 *   - Mobile uniquement : tri (select dropdown)
 *
 * Actions : Sauvegarder (applique), Réinitialiser (reset tous les filtres)
 *
 * TODO [BACKEND] — Ces filtres seront transmis à postService.getFeed()
 * via des paramètres de requête Supabase (.in(), .gte(), ST_DWithin).
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronDown } from 'lucide-react'
import type { FeedTab } from './FeedSection'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Catégories d'espèces disponibles pour le filtrage */
const SPECIES_CATEGORIES = ['Oiseaux', 'Mammifères', 'Insectes', 'Amphibiens', 'Reptiles'] as const

/** Options de rayon géographique en km (0 = tout) */
const RADIUS_OPTIONS = [
  { value: 0, labelKey: 'home.filters.radiusAll' },
  { value: 100, label: '100 km' },
  { value: 200, label: '200 km' },
  { value: 500, label: '500 km' },
] as const

/** Options de période */
const PERIOD_OPTIONS = [
  { value: 'all', labelKey: 'home.filters.periodAll' },
  { value: 'today', labelKey: 'home.filters.periodToday' },
  { value: 'week', labelKey: 'home.filters.periodWeek' },
  { value: 'month', labelKey: 'home.filters.periodMonth' },
] as const

export type PeriodFilter = (typeof PERIOD_OPTIONS)[number]['value']

export interface FeedFilters {
  categories: string[]
  helpOnly: boolean
  shareTypes: { encounter: boolean; instant: boolean }
  radius: number
  period: PeriodFilter
}

export const DEFAULT_FILTERS: FeedFilters = {
  categories: [],
  helpOnly: false,
  shareTypes: { encounter: true, instant: true },
  radius: 0,
  period: 'all',
}

interface FeedFilterPanelProps {
  filters: FeedFilters
  onApply: (filters: FeedFilters) => void
  onClose: () => void
  /** Onglet actif du feed — affiché dans le select mobile */
  activeTab: FeedTab
  onTabChange: (tab: FeedTab) => void
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function FeedFilterPanel({
  filters,
  onApply,
  onClose,
  activeTab,
  onTabChange,
}: FeedFilterPanelProps) {
  const { t } = useTranslation()

  // État local pour édition avant sauvegarde
  const [local, setLocal] = useState<FeedFilters>({ ...filters })

  /** Toggle une catégorie dans la sélection */
  function toggleCategory(cat: string) {
    setLocal((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }))
  }

  /** Réinitialise tous les filtres à leur valeur par défaut */
  function handleReset() {
    setLocal({ ...DEFAULT_FILTERS })
  }

  /** Applique les filtres et ferme le panneau */
  function handleSave() {
    onApply(local)
    onClose()
  }

  // ── Contenu partagé desktop/mobile ────────────────────────────────────────

  const panelContent = (
    <div className="flex flex-col gap-6">
      {/* Mobile uniquement : sélecteur de tri */}
      <div className="md:hidden flex flex-col gap-2">
        <label htmlFor="filter-sort" className="text-sm text-muted-foreground">
          {t('home.filters.sortResults')}
        </label>
        <div className="relative">
          <select
            id="filter-sort"
            value={activeTab}
            onChange={(e) => onTabChange(e.target.value as FeedTab)}
            className="w-full h-11 px-4 pr-10 rounded-lg border border-border bg-background text-foreground text-base appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="recent">{t('home.feed.recent')}</option>
            <option value="for-you">{t('home.feed.forYou')}</option>
            <option value="popular">{t('home.feed.popular')}</option>
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Par catégorie d'espèces */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-base font-semibold text-foreground">
          {t('home.filters.byCategory')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {SPECIES_CATEGORIES.map((cat) => {
            const isActive = local.categories.includes(cat)
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                aria-pressed={isActive}
                className={[
                  'h-8 px-3 rounded-full text-sm border transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:border-foreground/40',
                ].join(' ')}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Séparateur */}
      <hr className="border-border border-[0.5px]" />

      {/* Demandes d'aide uniquement */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={local.helpOnly}
          onChange={(e) => setLocal((prev) => ({ ...prev, helpOnly: e.target.checked }))}
          className="size-5 rounded border-border accent-primary cursor-pointer"
        />
        <span className="text-base text-foreground">{t('home.filters.helpOnly')}</span>
      </label>

      {/* Séparateur */}
      <hr className="border-border border-[0.5px]" />

      {/* Par type de partages */}
      {/* NOTE : Instant nature masqué — version future. Filtre sur Rencontre nature uniquement. */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-base font-semibold text-foreground">
          {t('home.filters.byShareType')}
        </legend>

        {/* Rencontre nature */}
        <label
          htmlFor="filter-encounter-type"
          aria-label={t('home.filters.natureEncounter')}
          className="flex items-center gap-3 cursor-pointer"
        >
          <input
            id="filter-encounter-type"
            type="checkbox"
            checked={local.shareTypes.encounter}
            onChange={(e) =>
              setLocal((prev) => ({
                ...prev,
                shareTypes: { ...prev.shareTypes, encounter: e.target.checked },
              }))
            }
            className="size-5 rounded border-border accent-primary cursor-pointer"
          />
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex items-center justify-center size-7 rounded-full bg-primary-light"
            >
              🦅
            </span>
            <span className="text-base text-foreground">{t('home.filters.natureEncounter')}</span>
          </span>
        </label>
      </fieldset>

      {/* Séparateur */}
      <hr className="border-border border-[0.5px]" />

      {/* Rayon géographique */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-base font-semibold text-foreground">
          {t('home.filters.radiusTitle')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((opt) => {
            const isActive = local.radius === opt.value
            const label = 'labelKey' in opt ? t(opt.labelKey) : opt.label
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLocal((prev) => ({ ...prev, radius: opt.value }))}
                aria-pressed={isActive}
                className={[
                  'h-8 px-3 rounded-full text-sm border transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:border-foreground/40',
                ].join(' ')}
              >
                {label}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Séparateur */}
      <hr className="border-border border-[0.5px]" />

      {/* Période */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-base font-semibold text-foreground">
          {t('home.filters.period')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt) => {
            const isActive = local.period === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLocal((prev) => ({ ...prev, period: opt.value as PeriodFilter }))}
                aria-pressed={isActive}
                className={[
                  'h-8 px-3 rounded-full text-sm border transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:border-foreground/40',
                ].join(' ')}
              >
                {t(opt.labelKey)}
              </button>
            )
          })}
        </div>
      </fieldset>
    </div>
  )

  return (
    <>
      {/* ── Desktop : sidebar droite ─────────────────────────────────────── */}
      <div className="hidden md:block">
        {/* Backdrop transparent cliquable */}
        <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />

        {/* Panneau */}
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={t('home.filters.title')}
          className="fixed top-0 right-0 z-50 w-[380px] h-full bg-background border-l border-border shadow-lg overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 sticky top-0 bg-background z-10">
            <h2 className="text-2xl font-bold text-foreground">{t('home.filters.title')}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="flex items-center justify-center size-8 rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-5 text-foreground" aria-hidden="true" />
            </button>
          </div>

          {/* Contenu scrollable */}
          <div className="px-6 pb-6">{panelContent}</div>

          {/* Actions fixes en bas */}
          <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="w-full h-11 bg-primary text-primary-foreground rounded-button font-semibold text-base hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t('home.filters.save')}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="w-full text-center text-base text-foreground underline hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t('home.filters.reset')}
            </button>
          </div>
        </aside>
      </div>

      {/* ── Mobile : bottom sheet plein écran ────────────────────────────── */}
      <div className="md:hidden">
        {/* Backdrop */}
        <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />

        {/* Panneau */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('home.filters.title')}
          className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
            <h2 className="text-xl font-bold text-foreground">{t('home.filters.title')}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="flex items-center justify-center size-8 rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-5 text-foreground" aria-hidden="true" />
            </button>
          </div>

          {/* Contenu scrollable */}
          <div className="overflow-y-auto flex-1 px-5 pb-4">{panelContent}</div>

          {/* Actions fixes en bas */}
          <div className="shrink-0 border-t border-border px-5 py-4 flex flex-col gap-3 pb-safe">
            <button
              type="button"
              onClick={handleSave}
              className="w-full h-11 bg-primary text-primary-foreground rounded-button font-semibold text-base hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t('home.filters.save')}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="w-full text-center text-base text-foreground underline hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t('home.filters.reset')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
