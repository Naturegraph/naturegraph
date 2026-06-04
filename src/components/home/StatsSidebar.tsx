/**
 * StatsSidebar — Colonne droite : Impact + Tendances
 *
 * Affichée en mode invité et authentifié.
 * Données réelles Supabase via useImpactStats + useTrendingSpecies.
 *
 * Impact : observations publiées + comptes créés sur la période, avec trend %.
 * Tendances : top 3 espèces observées — filtrées par région si géolocalisé (PRD §10.4).
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, ChevronDown, ChevronRight, Globe } from 'lucide-react'
import { useImpactStats, useTrendingSpecies } from '@/hooks/useStats'
import { useLocation } from '@/contexts/LocationContext'
import { useSpecies } from '@/contexts/SpeciesContext'
import type { StatsPeriod } from '@/services/statsService'

// ─── Constantes ─────────────────────────────────────────────────────────────

/** Options du sélecteur de période Impact */
const IMPACT_PERIODS: { value: StatsPeriod; labelKey: string }[] = [
  { value: 'week', labelKey: 'home.stats.thisWeek' },
  { value: 'month', labelKey: 'home.stats.thisMonth' },
  { value: 'quarter', labelKey: 'home.stats.thisQuarter' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Formate un nombre avec séparateur de milliers (1234 → "1 234") */
function formatNumber(n: number): string {
  return n.toLocaleString('fr-FR')
}

// ─── Composant ───────────────────────────────────────────────────────────────

/**
 * @param onItemSelected V1.1.5 NG-032 : appele quand l'utilisateur clique une
 *   espece tendance. Permet au StatsSheet (tiroir mobile) de se fermer apres
 *   l'application du filtre. Optionnel (sidebar desktop n'en a pas besoin).
 */
export function StatsSidebar({ onItemSelected }: { onItemSelected?: () => void } = {}) {
  const { t } = useTranslation()
  const { locationLabel } = useLocation()
  const navigate = useNavigate()
  // V1.1.5 NG-032 : meme filtre espece que le chip d'un post (Species Context).
  const { setActiveSpecies } = useSpecies()

  /** Clic sur une espece tendance : applique le filtre espece (comme dans un
   *  post) et ramene au feed, au lieu d'ouvrir la page explorer. */
  function handleTrendingClick(species: {
    name: string
    taxrefId: string | null
    scientificName: string | null
    category: string | null
  }) {
    if (species.taxrefId) {
      setActiveSpecies({
        taxref_id: species.taxrefId,
        scientific_name: species.scientificName ?? species.name,
        common_name: species.name !== species.scientificName ? species.name : null,
        group_label: species.category,
      })
    }
    onItemSelected?.()
    navigate('/home')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  // Périodes sélectionnées par l'utilisateur (Impact + Tendances indépendants)
  const [impactPeriod, setImpactPeriod] = useState<StatsPeriod>('month')
  const [trendingPeriod, setTrendingPeriod] = useState<StatsPeriod>('week')

  // État d'ouverture des dropdowns
  const [impactDropdownOpen, setImpactDropdownOpen] = useState(false)
  const [trendingDropdownOpen, setTrendingDropdownOpen] = useState(false)

  // Extraire la région du locationLabel pour le filtre territorial
  // Format attendu : "Ville, Région" → on prend la partie après la virgule
  const region = locationLabel.includes(',')
    ? (locationLabel.split(',').pop()?.trim() ?? null)
    : null

  // ── Données Supabase ──────────────────────────────────────────────────────
  const { data: impact, isLoading: impactLoading } = useImpactStats(impactPeriod)

  // Tendances : période sélectionnable (semaine / mois / trimestre)
  const { data: trendingRaw, isLoading: trendingLoading } = useTrendingSpecies(
    trendingPeriod,
    region,
  )
  /**
   * Règles Tendances — V1.1.5 NG-032 (Nicolas 2026-06-03).
   *
   * Contexte : en beta fermée (faible volume), l'ancien seuil (≥ 7 obs)
   * rendait la section quasi toujours vide. On abaisse le seuil pour refleter
   * l'activite reelle, MAIS on garde une regle stricte : une espece n'apparait
   * QUE si elle a au moins une observation AVEC photo (sinon pas comptabilisee
   * dans les tendances). Ce filtrage est fait cote service (getTrendingSpecies
   * retourne deja au plus 3 especes ayant une photo, fallback all-time inclus).
   * Le composant affiche donc directement ce que le service renvoie.
   */
  const trending = trendingRaw

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* ── Carte Impact ── */}
      <div className="bg-cream-lighter border-[0.5px] border-border rounded-card px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-teal-dark size-8 rounded-full flex items-center justify-center shrink-0">
              <Globe className="size-5 text-white" aria-hidden="true" />
            </div>
            <p className="text-base text-foreground">{t('home.stats.impact')}</p>
          </div>

          {/* Sélecteur de période */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setImpactDropdownOpen((o) => !o)}
              className="flex items-center gap-1 text-xs tracking-[0.48px] text-foreground hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
              aria-label={t('home.stats.changePeriod')}
              aria-expanded={impactDropdownOpen}
            >
              <span>{t(IMPACT_PERIODS.find((p) => p.value === impactPeriod)!.labelKey)}</span>
              <ChevronDown className="size-4" aria-hidden="true" />
            </button>
            {impactDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 z-10 bg-cream-lighter border border-border rounded-md shadow-lg overflow-hidden min-w-[120px]">
                {IMPACT_PERIODS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setImpactPeriod(p.value)
                      setImpactDropdownOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-muted/50 ${
                      impactPeriod === p.value ? 'font-bold text-primary' : 'text-foreground'
                    }`}
                  >
                    {t(p.labelKey)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cartes stats */}
        <div className="flex gap-3">
          {/* Observations */}
          <div className="flex-1 bg-card rounded-md p-4 flex flex-col gap-2">
            <p className="text-xs text-muted-foreground tracking-[0.48px]">
              {t('home.stats.observations')}
            </p>
            {impactLoading ? (
              <div className="h-8 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <p className="text-2xl font-bold text-foreground">
                  {formatNumber(impact?.observations ?? 0)}
                </p>
                <TrendBadge value={impact?.observationsTrend ?? 0} />
              </>
            )}
          </div>
          {/* Migrateurs */}
          <div className="flex-1 bg-card rounded-md p-4 flex flex-col gap-2">
            <p className="text-xs text-muted-foreground tracking-[0.48px]">
              {t('home.stats.migrators')}
            </p>
            {impactLoading ? (
              <div className="h-8 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <p className="text-2xl font-bold text-foreground">
                  {formatNumber(impact?.migrateurs ?? 0)}
                </p>
                <TrendBadge value={impact?.migrateursTrend ?? 0} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Carte Tendances — Top 3 espèces avec navigation vers filtre ──
          Specs Figma node 6385-92997 :
           - Container : border 0.5px, rounded 12px, padding 24px 0
           - Header : pastille teal-dark 32px + TrendingUp 20px + titre Muli
             16px (pas bold) + période "Cette semaine" + ChevronDown 16px
           - Item : gap 12px, image 48×48 rounded-lg, nom Muli bold 14px,
             count Muli 400 12px, chevron cercle 32px border 0.5px
           - 2 états : rempli (3 items) / vide (message discret) */}
      <div className="bg-cream-lighter border-[0.5px] border-border rounded-card py-6 flex flex-col gap-6">
        {/* Header — titre + période */}
        <div className="flex items-center justify-between gap-6 px-6">
          <div className="flex items-center gap-3">
            <div className="bg-teal-dark size-8 rounded-full flex items-center justify-center shrink-0">
              <TrendingUp className="size-5 text-white" aria-hidden="true" />
            </div>
            <p className="text-base text-foreground">{t('home.trending.title')}</p>
          </div>

          {/* Sélecteur de période — même logique que le dropdown Impact */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setTrendingDropdownOpen((o) => !o)}
              className="flex items-center gap-2 text-xs tracking-[0.04em] text-foreground hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
              aria-label={t('home.stats.changePeriod')}
              aria-expanded={trendingDropdownOpen}
            >
              <span>{t(IMPACT_PERIODS.find((p) => p.value === trendingPeriod)!.labelKey)}</span>
              <ChevronDown className="size-4" aria-hidden="true" />
            </button>
            {trendingDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 z-10 bg-cream-lighter border border-border rounded-md shadow-lg overflow-hidden min-w-[120px]">
                {IMPACT_PERIODS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setTrendingPeriod(p.value)
                      setTrendingDropdownOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-muted/50 ${
                      trendingPeriod === p.value ? 'font-bold text-primary' : 'text-foreground'
                    }`}
                  >
                    {t(p.labelKey)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Loader — skeleton 3 items aligné sur le layout final */}
        {trendingLoading && (
          <div className="flex flex-col gap-3 px-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="size-12 rounded-md bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-2 bg-muted rounded w-1/3" />
                </div>
                <div className="size-8 rounded-full bg-muted shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* État rempli — 3 espèces cliquables. V1.1.5 NG-032 : clic = applique
            le filtre espece (Species Context Layer) + retour feed, MEME
            comportement que le chip espece d'un post (au lieu de /explore). */}
        {!trendingLoading && trending && trending.length > 0 && (
          <ul className="flex flex-col gap-3 px-6">
            {trending.slice(0, 3).map((species) => {
              return (
                <li key={species.name}>
                  <button
                    type="button"
                    onClick={() => handleTrendingClick(species)}
                    aria-label={t('home.trending.openSpecies', { species: species.name })}
                    className="w-full flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 group text-left"
                  >
                    {/* Image espèce — 48×48. Le service garantit une photo
                        (regle NG-032 : pas d'espece sans photo dans tendances). */}
                    <div className="size-12 rounded-md overflow-hidden shrink-0 bg-[var(--color-action-light)]">
                      {species.imageUrl && (
                        <img
                          src={species.imageUrl}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                          width={48}
                          height={48}
                        />
                      )}
                    </div>

                    {/* Nom commun + nombre d'observations */}
                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <p className="font-bold text-sm text-foreground truncate leading-none group-hover:underline">
                        {species.name}
                      </p>
                      <p className="text-xs text-foreground tracking-[0.04em] leading-none">
                        {t('home.stats.observationCount', { count: species.observations })}
                      </p>
                    </div>

                    {/* Chevron droite — cercle 32px border 0.5px */}
                    <span
                      aria-hidden="true"
                      className="size-8 rounded-full border-[0.5px] border-border flex items-center justify-center shrink-0 text-foreground group-hover:bg-white transition-colors"
                    >
                      <ChevronRight className="size-4" />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {/* État vide — aucune espèce tendance disponible */}
        {!trendingLoading && (!trending || trending.length === 0) && (
          <p className="text-xs text-muted-foreground px-6">{t('home.trending.empty')}</p>
        )}
      </div>
    </div>
  )
}

// ─── Sous-composant : badge trend (+X% / -X%) ──────────────────────────────

/** Affiche le trend en vert (positif) ou rouge (négatif) avec icône */
function TrendBadge({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-xs text-muted-foreground tracking-[0.48px]">—</span>
  }

  const isPositive = value > 0
  const Icon = isPositive ? TrendingUp : TrendingDown
  const colorClass = isPositive ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'

  return (
    <div className="flex items-center gap-1">
      <Icon className={`size-4 ${colorClass}`} aria-hidden="true" />
      <span className={`text-xs ${colorClass} tracking-[0.48px]`}>
        {isPositive ? '+' : ''}
        {value}%
      </span>
    </div>
  )
}
