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
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, ChevronDown, Globe, Leaf } from 'lucide-react'
import { useImpactStats, useTrendingSpecies } from '@/hooks/useStats'
import { useLocation } from '@/contexts/LocationContext'
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

export function StatsSidebar() {
  const { t } = useTranslation()
  const { locationLabel } = useLocation()

  // Périodes sélectionnées par l'utilisateur
  const [impactPeriod, setImpactPeriod] = useState<StatsPeriod>('month')

  // Dropdown Impact ouvert
  const [impactDropdownOpen, setImpactDropdownOpen] = useState(false)

  // Extraire la région du locationLabel pour le filtre territorial
  // Format attendu : "Ville, Région" → on prend la partie après la virgule
  const region = locationLabel.includes(',')
    ? (locationLabel.split(',').pop()?.trim() ?? null)
    : null

  // ── Données Supabase ──────────────────────────────────────────────────────
  const { data: impact, isLoading: impactLoading } = useImpactStats(impactPeriod)

  // Tendances : toujours sur la semaine en cours (widget simplifié MVP)
  const { data: trending, isLoading: trendingLoading } = useTrendingSpecies('week', region)

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* ── Carte Impact ── */}
      <div className="bg-cream-lighter border-[0.5px] border-border rounded-card px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-teal-dark size-8 rounded-full flex items-center justify-center shrink-0">
              <Globe className="size-4 text-white" aria-hidden="true" />
            </div>
            <p className="font-bold">{t('home.stats.impact')}</p>
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
              <div className="absolute right-0 top-full mt-1 z-10 bg-cream-lighter border border-border rounded-lg shadow-lg overflow-hidden min-w-[120px]">
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
          <div className="flex-1 bg-card rounded-lg p-4 flex flex-col gap-2">
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
          <div className="flex-1 bg-card rounded-lg p-4 flex flex-col gap-2">
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

      {/* ── Carte Tendances (MVP — widget passif, top 3 espèces) ── */}
      {/* Masquée si 0 résultats après chargement (PRD §10.4) */}
      {(trendingLoading || (trending && trending.length > 0)) && (
        <div className="bg-cream-lighter border-[0.5px] border-border rounded-card px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-teal-dark size-8 rounded-full flex items-center justify-center shrink-0">
              <TrendingUp className="size-4 text-white" aria-hidden="true" />
            </div>
            <p className="font-bold">{t('home.trending.title')}</p>
          </div>

          {/* Liste des espèces tendances */}
          {trendingLoading ? (
            <div className="flex flex-col gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="size-12 rounded-xl bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-2/3" />
                    <div className="h-2 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {(trending ?? []).map((species) => (
                <div key={species.name} className="flex items-center gap-3">
                  {/* Photo espèce ou placeholder */}
                  <div className="size-12 rounded-xl overflow-hidden shrink-0 bg-muted">
                    {species.imageUrl ? (
                      <img
                        src={species.imageUrl}
                        alt={species.name}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center">
                        <Leaf className="size-5 text-muted-foreground" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate mb-1">
                      {species.name}
                    </p>
                    <p className="text-xs text-muted-foreground tracking-[0.48px]">
                      {t('home.stats.observationCount', { count: species.observations })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
