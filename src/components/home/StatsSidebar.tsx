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
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, ChevronDown, ChevronRight, Globe } from 'lucide-react'
import { useImpactStats, useTrendingSpecies } from '@/hooks/useStats'
import { useLocation } from '@/contexts/LocationContext'
import type { StatsPeriod } from '@/services/statsService'
// V1.1.5 NG-032 : fallback emoji categorie pour les especes tendance sans photo.
import { CATEGORY_EMOJIS } from '@/utils/badgeHelpers'

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
   * Règles Tendances — RÉVISÉES V1.1.5 NG-032 (Nicolas 2026-06-03).
   *
   * Contexte : en beta fermée (faible volume), l'ancienne regle (≥ 7 obs ET
   * photo obligatoire) rendait la section quasi toujours vide -> perception
   * d'un produit inactif. On privilegie desormais la "vie du produit percue".
   *
   * Nouvelle logique :
   *   1. Seuil minimum abaisse a 1 observation (toute espece observee peut
   *      apparaitre). Le tri par count decroissant (cote service) fait
   *      naturellement remonter les especes a 2+ obs en priorite.
   *   2. On n'exige PLUS de photo : une espece sans image s'affiche avec un
   *      emoji de sa categorie taxonomique (fallback), au lieu de disparaitre.
   * Si vraiment aucune espece identifiee sur la periode -> etat vide.
   */
  const TRENDING_MIN_OBS = 1
  const trending = trendingRaw?.filter((s) => s.observations >= TRENDING_MIN_OBS)

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

        {/* État rempli — 3 espèces cliquables (filtre sur /explore) */}
        {!trendingLoading && trending && trending.length > 0 && (
          <ul className="flex flex-col gap-3 px-6">
            {trending.slice(0, 3).map((species) => {
              return (
                <li key={species.name}>
                  <Link
                    to={`/explore?species=${encodeURIComponent(species.name)}`}
                    aria-label={t('home.trending.openSpecies', { species: species.name })}
                    className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 group"
                  >
                    {/*
                      Image espèce — 48×48 rounded-md.
                      V1.1.5 NG-032 : si une photo existe on l'affiche, sinon
                      fallback emoji de la categorie taxonomique (centre) pour
                      garder une tendance visuelle vivante meme sans image
                      (revise la regle second-agent/17 "pas de fallback emoji").
                    */}
                    <div className="size-12 rounded-md overflow-hidden shrink-0 bg-[var(--color-action-light)] flex items-center justify-center">
                      {species.imageUrl ? (
                        <img
                          src={species.imageUrl}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                          width={48}
                          height={48}
                        />
                      ) : (
                        <span className="text-2xl" aria-hidden="true">
                          {CATEGORY_EMOJIS[species.category as keyof typeof CATEGORY_EMOJIS] ??
                            '✨'}
                        </span>
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
                  </Link>
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
