/**
 * FeedFilterPanel — Panneau de filtres du feed (pixel-perfect Figma node 6385-103213)
 *
 * Desktop : sidebar fixe à droite (w-[448px]), shadow large
 * Mobile  : bottom sheet plein écran scrollable
 *
 * Filtres disponibles :
 *   - Catégorie d'espèces (chips toggle, multi-select)
 *   - Demandes d'aide uniquement (checkbox) — mappé sur identification_status = 'pending'
 *   - Type de partage (checkbox) — nature_encounter (Instant masqué pour MVP)
 *   - Rayon géographique (chips radio: Tout, 100, 200, 500 km)
 *     Nécessite locationCoords (LocationContext) — filtré client-side via Haversine
 *   - Période (chips radio: Tout, Aujourd'hui, Cette semaine, Ce mois)
 *   - Mobile uniquement : tri (select Récent/Populaire/Pour vous)
 *
 * Actions : Sauvegarder (applique), Réinitialiser (reset tous les filtres)
 *
 * Design tokens (Figma) :
 *   - Width panneau : 448px
 *   - Chip default  : border 1px #C4C4CC, rounded-full, h-8
 *   - Chip selected : bg-primary-light #E7E9F7, border-primary #5F5DD8
 *   - Checkbox      : 20px, bg-primary quand coché, rounded-[4px]
 *   - Titre section : Muli 16px 400 color text-muted-foreground
 *   - Titre panneau : Quicksand 32px 700
 *   - Bouton save   : bg-primary, rounded-full, h-12, Muli 700 16px white
 *   - Reset         : text-primary Muli 700 16px souligné
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronDown, Check, Bird, MountainSnow } from 'lucide-react'
import type { FeedTab } from './FeedSection'
import { Button } from '@/components/ui/Button'
import { useLocation } from '@/contexts/LocationContext'

// ─── Types et constantes ─────────────────────────────────────────────────────

/**
 * Catégories d'espèces visibles dans l'UI (labels FR) + mapping vers le champ DB
 * `taxonomic_group` (enum backend). Seules les 5 plus courantes sont exposées au
 * MVP — extensibles plus tard (fish, plants, arachnids, etc.).
 */
const SPECIES_CATEGORIES: { label: string; value: string }[] = [
  { label: 'Oiseaux', value: 'birds' },
  { label: 'Mammifères', value: 'mammals' },
  { label: 'Insectes', value: 'insects' },
  { label: 'Amphibiens', value: 'amphibians' },
  { label: 'Reptiles', value: 'reptiles' },
]

/** Options de rayon géographique en km (0 = pas de filtre) */
const RADIUS_OPTIONS = [
  { value: 0, labelKey: 'home.filters.radiusAll' },
  { value: 100, label: '100 km' },
  { value: 200, label: '200 km' },
  { value: 500, label: '500 km' },
] as const

/** Options de période — mappées sur posts.published_at côté backend */
const PERIOD_OPTIONS = [
  { value: 'all', labelKey: 'home.filters.periodAll' },
  { value: 'today', labelKey: 'home.filters.periodToday' },
  { value: 'week', labelKey: 'home.filters.periodWeek' },
  { value: 'month', labelKey: 'home.filters.periodMonth' },
] as const

export type PeriodFilter = (typeof PERIOD_OPTIONS)[number]['value']

export interface FeedFilters {
  /** Valeurs du champ posts.taxonomic_group (birds, mammals, etc.) */
  categories: string[]
  /** Si true → filtre sur identification_status = 'pending' (proxy demande d'aide) */
  helpOnly: boolean
  /** Type de partage (Instant masqué — seul encounter actif au MVP) */
  shareTypes: { encounter: boolean; instant: boolean }
  /** Rayon en km (0 = pas de filtre) */
  radius: number
  period: PeriodFilter
}

// eslint-disable-next-line react-refresh/only-export-components
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
  activeTab: FeedTab
  onTabChange: (tab: FeedTab) => void
}

// ─── Sous-composants pixel-perfect ───────────────────────────────────────────

/**
 * Chip toggle (catégorie / rayon / période).
 * Styles Figma : border 1px #C4C4CC, rounded-full, h-8.
 * Actif : bg primary-light (#E7E9F7), border primary (#5F5DD8).
 */
function FilterChip({
  active,
  onClick,
  children,
  ariaPressed,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  ariaPressed?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed ?? active}
      className={[
        'inline-flex items-center justify-center h-8 px-3 rounded-full',
        'font-body text-sm leading-[1.5] transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        active
          ? 'bg-primary-light border border-primary text-foreground'
          : 'bg-transparent border border-border text-foreground hover:border-foreground/40',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

/**
 * Checkbox custom (conforme Figma — aucun comportement natif visible).
 * 20px carré, bg #5F5DD8 avec Check blanc quand coché, bordure 1.5px #C4C4CC sinon.
 */
function FilterCheckbox({
  checked,
  onChange,
  id,
  ariaLabel,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  id?: string
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={[
        'flex items-center justify-center size-5 rounded-[4px] shrink-0 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        checked
          ? 'bg-primary border border-primary'
          : 'bg-background border-[1.5px] border-border hover:border-foreground/40',
      ].join(' ')}
    >
      {checked && (
        <Check className="size-3.5 text-primary-foreground" strokeWidth={3} aria-hidden="true" />
      )}
    </button>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function FeedFilterPanel({
  filters,
  onApply,
  onClose,
  activeTab,
  onTabChange,
}: FeedFilterPanelProps) {
  const { t } = useTranslation()
  const { isLocalized } = useLocation()

  /**
   * Filtres dynamiques selon le contexte (second-agent/23) :
   *   - Rayon : visible UNIQUEMENT si l'utilisateur est localisé. Sinon
   *             aucun intérêt — on cache la section pour éviter le bruit.
   *   - Demandes d'aide : feature non implémentée côté UX (pas de bouton
   *             "Demander de l'aide" dans le formulaire de contribution).
   *             On marque "Bientôt" pour transparence.
   */
  const showRadiusFilter = isLocalized
  const helpOnlyComingSoon = true

  // État local — édition avant validation via "Sauvegarder". Initialisé
  // une seule fois au mount (panel unmount sur close → ré-initialisation
  // automatique à la ré-ouverture). Pas de useEffect sync ici (lint
  // react-hooks/set-state-in-effect).
  const [local, setLocal] = useState<FeedFilters>({ ...filters })

  /** Toggle d'une catégorie dans la sélection multiple */
  function toggleCategory(value: string) {
    setLocal((prev) => ({
      ...prev,
      categories: prev.categories.includes(value)
        ? prev.categories.filter((c) => c !== value)
        : [...prev.categories, value],
    }))
  }

  function handleReset() {
    setLocal({ ...DEFAULT_FILTERS })
  }

  function handleSave() {
    // BATCH 89 : on force une nouvelle reference d'objet + deep-copy des sous-objets
    // pour garantir que React detecte le changement (Object.is en useState).
    // Sans ca, si l'user re-save les memes valeurs ou si l'objet local mute, le
    // re-render parent peut etre skip.
    onApply({
      ...local,
      categories: [...local.categories],
      shareTypes: { ...local.shareTypes },
    })
    onClose()
  }

  // ── Contenu partagé desktop / mobile ──────────────────────────────────────

  const sectionLabelClass = 'font-body text-base font-normal text-muted-foreground'
  const dividerClass = 'border-t-[0.5px] border-border'

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

      {/* ───── 1. Par catégorie d'espèces ───── */}
      <div className="flex flex-col gap-3">
        <p className={sectionLabelClass}>{t('home.filters.byCategory')}</p>
        <div className="flex flex-wrap gap-2">
          {SPECIES_CATEGORIES.map((cat) => (
            <FilterChip
              key={cat.value}
              active={local.categories.includes(cat.value)}
              onClick={() => toggleCategory(cat.value)}
            >
              {cat.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* ───── 2. Demandes d'aide uniquement ─────
          Filtre conditionnel : aujourd'hui pas de fonctionnalité "demande d'aide"
          côté formulaire de contribution → on affiche le filtre désactivé avec
          badge "Bientôt" pour transparence (second-agent/23). */}
      {helpOnlyComingSoon ? (
        <>
          <hr className={dividerClass} />
          <div
            className="flex items-center gap-3 select-none opacity-60 cursor-not-allowed"
            aria-disabled="true"
          >
            <FilterCheckbox
              checked={false}
              onChange={() => {}}
              ariaLabel={t('home.filters.helpOnly')}
            />
            <span className="font-body text-base text-foreground">
              {t('home.filters.helpOnly')}
            </span>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Bientôt
            </span>
          </div>
          <hr className={dividerClass} />
        </>
      ) : (
        <>
          <hr className={dividerClass} />
          <div className="flex items-center gap-3 select-none">
            <FilterCheckbox
              checked={local.helpOnly}
              onChange={(next) => setLocal((prev) => ({ ...prev, helpOnly: next }))}
              ariaLabel={t('home.filters.helpOnly')}
            />
            <span className="font-body text-base text-foreground">
              {t('home.filters.helpOnly')}
            </span>
          </div>
          <hr className={dividerClass} />
        </>
      )}

      {/* ───── 3. Par type de partages ─────
          Rencontre nature (actif) + Instant nature (badge "Bientôt", disabled).
          Couleurs et icônes Figma : teal-dark (#006666) + Bird / orange (#CC7A00) + MountainSnow. */}
      <div className="flex flex-col gap-3">
        <p className={sectionLabelClass}>{t('home.filters.byShareType')}</p>

        {/* Wrapper interne — les 2 rows restent collées l'une à l'autre (gap-3). */}
        <div className="flex flex-col gap-3">
          {/* Rencontre nature — actif.
              Utilisation d'un <div> plutôt qu'un <label> car FilterCheckbox rend
              un <button role="checkbox"> custom (pas un <input> natif). */}
          <div className="flex items-center gap-4 select-none">
            <FilterCheckbox
              checked={local.shareTypes.encounter}
              onChange={(next) =>
                setLocal((prev) => ({
                  ...prev,
                  shareTypes: { ...prev.shareTypes, encounter: next },
                }))
              }
              ariaLabel={t('home.filters.natureEncounter')}
            />
            <span className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex items-center justify-center size-6 rounded-[4px] bg-teal-dark"
              >
                <Bird className="size-[18px] text-primary-foreground" strokeWidth={1.8} />
              </span>
              <span className="font-body text-base text-foreground">
                {t('home.filters.natureEncounter')}
              </span>
            </span>
          </div>

          {/* Instant nature — désactivé avec badge "Bientôt" */}
          <div
            className="flex items-center gap-4 select-none opacity-60 cursor-not-allowed"
            aria-disabled="true"
          >
            <FilterCheckbox checked={false} onChange={() => {}} ariaLabel="" />
            <span className="flex items-center gap-2.5 flex-1 min-w-0">
              <span
                aria-hidden="true"
                className="flex items-center justify-center size-6 rounded-[4px] bg-[#CC7A00]"
              >
                <MountainSnow className="size-[18px] text-primary-foreground" strokeWidth={1.8} />
              </span>
              <span className="font-body text-base text-foreground">
                {t('home.filters.instantNature')}
              </span>
              <span className="ml-auto inline-flex items-center h-6 px-2 rounded-full bg-primary-light text-primary text-[11px] font-bold leading-none uppercase tracking-wide">
                {t('home.filters.comingSoon')}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ───── 4. Rayon géographique ─────
          Affiché UNIQUEMENT si l'utilisateur est localisé (second-agent/23).
          Sans localisation, le filtre n'a aucun effet — on cache la section
          plutôt que d'afficher des chips inactifs. */}
      {showRadiusFilter && (
        <>
          <hr className={dividerClass} />
          <div className="flex flex-col gap-3">
            <p className={sectionLabelClass}>{t('home.filters.radiusTitle')}</p>
            <div className="flex flex-wrap gap-2">
              {RADIUS_OPTIONS.map((opt) => {
                const label = 'labelKey' in opt ? t(opt.labelKey) : opt.label
                return (
                  <FilterChip
                    key={opt.value}
                    active={local.radius === opt.value}
                    onClick={() => setLocal((prev) => ({ ...prev, radius: opt.value }))}
                  >
                    {label}
                  </FilterChip>
                )
              })}
            </div>
          </div>
          <hr className={dividerClass} />
        </>
      )}

      {!showRadiusFilter && <hr className={dividerClass} />}

      {/* ───── 5. Période ───── */}
      <div className="flex flex-col gap-3">
        <p className={sectionLabelClass}>{t('home.filters.period')}</p>
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              active={local.period === opt.value}
              onClick={() => setLocal((prev) => ({ ...prev, period: opt.value as PeriodFilter }))}
            >
              {t(opt.labelKey)}
            </FilterChip>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Footer (Save + Reset) — partagé ──────────────────────────────────────

  // Footer actions — utilise le composant Button du design system pour
  // cohérence (variant primary avec effet btn-press 3D). Le reset reste un
  // lien souligné (pattern "action destructive douce" du Figma).
  const panelFooter = (
    <div className="flex flex-col items-center gap-3 pt-2">
      <Button variant="primary" size="md" onClick={handleSave} className="w-full">
        {t('home.filters.save')}
      </Button>
      <button
        type="button"
        onClick={handleReset}
        className={[
          'font-body font-bold text-base leading-[1.5] text-primary underline underline-offset-4',
          'hover:opacity-80 transition-opacity',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded',
        ].join(' ')}
      >
        {t('home.filters.reset')}
      </button>
    </div>
  )

  return (
    <>
      {/* ═══════ Desktop : sidebar droite 448px ═══════ */}
      <div className="hidden md:block">
        {/* Backdrop semi-transparent BATCH 89 : focus visuel sur le panneau,
            click pour fermer. Avant : transparent total — pas de feedback visuel. */}
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
          onClick={onClose}
          aria-hidden="true"
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label={t('home.filters.title')}
          className="fixed top-0 right-0 z-50 w-[448px] h-full bg-background overflow-y-auto shadow-[0_6px_16px_-4px_rgba(0,0,0,0.1)] flex flex-col"
        >
          {/* Header — titre + croix close */}
          <div className="flex items-center justify-between px-6 pt-6 pb-0 sticky top-0 bg-background z-10">
            <h2 className="font-heading text-[32px] font-bold leading-[1.2] text-foreground">
              {t('home.filters.title')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="flex items-center justify-center size-8 rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-6 text-foreground" aria-hidden="true" />
            </button>
          </div>

          {/* Contenu scrollable */}
          <div className="px-6 pt-6 pb-6 flex-1">{panelContent}</div>

          {/* Footer actions — collé en bas */}
          <div className="px-6 pt-4 pb-6 bg-background border-t-[0.5px] border-border">
            {panelFooter}
          </div>
        </aside>
      </div>

      {/* ═══════ Mobile : bottom sheet ═══════
          Positionné au-dessus de la MobileBottomNav (h-14 + safe-area) pour
          que le bouton "Sauvegarder" reste tactile. z-[60] > navbar z-50. */}
      <div className="md:hidden">
        <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />

        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('home.filters.title')}
          className="fixed inset-x-0 bottom-0 z-[60] bg-background rounded-t-2xl max-h-[95vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
        >
          {/* Handle bar — cohérence visuelle avec les autres bottom sheets. */}
          <div className="flex justify-center pt-3 pb-1 shrink-0" aria-hidden="true">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>
          <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              {t('home.filters.title')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="flex items-center justify-center size-8 rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-5 text-foreground" aria-hidden="true" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-5 pb-4">{panelContent}</div>

          {/* Footer collé en bas du sheet (le sheet est lui-même au-dessus de la navbar). */}
          <div className="shrink-0 border-t-[0.5px] border-border px-5 py-4">{panelFooter}</div>
        </div>
      </div>
    </>
  )
}
