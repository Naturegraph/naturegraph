/**
 * StatsSidebar — Colonne droite : Impact + Tendances
 *
 * Affichée en mode invité et authentifié.
 * Les données sont mockées en attendant l'API Supabase.
 *
 * TODO [BACKEND] — Impact :
 *   Requête agrégée Supabase sur la table `posts` :
 *   SELECT count(*) FROM posts WHERE created_at >= début_période AND status='published'
 *   Pour le trend (+12%), comparer avec la période précédente.
 *   Table concernée : `posts`, vue : `platform_stats` (à créer).
 *   Brancher via useQuery avec invalidation quotidienne (staleTime: 1 jour).
 *
 * TODO [BACKEND] — Tendances :
 *   Requête sur les espèces les plus observées sur la période sélectionnée :
 *   SELECT species_name, count(*) FROM posts GROUP BY species_name ORDER BY count DESC LIMIT 3
 *   Table concernée : `posts` (champ species_identified) ou table `species_stats`.
 *   Le sélecteur de période ("Ce mois-ci", "Cette semaine") doit passer un paramètre
 *   `period: 'week' | 'month' | 'year'` à l'endpoint.
 */

import { useTranslation } from 'react-i18next'
import { TrendingUp, ChevronRight, ChevronDown, Globe } from 'lucide-react'

// ─── Données mock ─────────────────────────────────────────────────────────────
// TODO [BACKEND] — Remplacer TRENDS et les chiffres Impact par des appels à statsService
// (à créer dans src/services/statsService.ts) qui interrogent Supabase.

const TRENDS = [
  {
    id: '1',
    name: 'Rouge-gorge familier',
    observations: 24,
    image:
      'https://images.unsplash.com/photo-1606567595334-d39972c85dbe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  },
  {
    id: '2',
    name: 'Chevreuil européen',
    observations: 7,
    image:
      'https://images.unsplash.com/photo-1511172889608-21d24d0d1995?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  },
  {
    id: '3',
    name: 'Renard roux',
    observations: 4,
    image:
      'https://images.unsplash.com/photo-1474511320723-9a56873867b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  },
]

// ─── Composant ───────────────────────────────────────────────────────────────

export function StatsSidebar() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-4">
      {/* Carte Impact */}
      <div className="bg-cream-lighter border-[0.5px] border-border rounded-card px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-teal-dark size-8 rounded-full flex items-center justify-center shrink-0">
              <Globe className="size-4 text-white" aria-hidden="true" />
            </div>
            <p className="font-bold">{t('home.stats.impact')}</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-xs tracking-[0.48px] text-foreground hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
            aria-label={t('home.stats.changePeriod')}
          >
            <span>{t('home.stats.thisMonth')}</span>
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex gap-3">
          {/* Observations */}
          <div className="flex-1 bg-card rounded-xl p-4 flex flex-col gap-2">
            <p className="text-xs text-muted-foreground tracking-[0.48px]">
              {t('home.stats.observations')}
            </p>
            <p className="text-2xl font-bold text-foreground">12,847</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="size-4 text-[#00673f]" aria-hidden="true" />
              <span className="text-xs text-[#00673f] tracking-[0.48px]">+12%</span>
            </div>
          </div>
          {/* Migrateurs */}
          <div className="flex-1 bg-card rounded-xl p-4 flex flex-col gap-2">
            <p className="text-xs text-muted-foreground tracking-[0.48px]">
              {t('home.stats.migrators')}
            </p>
            <p className="text-2xl font-bold text-foreground">2,341</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="size-4 text-[#00673f]" aria-hidden="true" />
              <span className="text-xs text-[#00673f] tracking-[0.48px]">+8%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Carte Tendances */}
      <div className="bg-cream-lighter border-[0.5px] border-border rounded-card px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-teal-dark size-8 rounded-full flex items-center justify-center shrink-0">
              <TrendingUp className="size-4 text-white" aria-hidden="true" />
            </div>
            <p className="font-bold">{t('home.trending.title')}</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-xs tracking-[0.48px] text-foreground hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
            aria-label={t('home.stats.changeTrendPeriod')}
          >
            <span>{t('home.trending.thisWeek')}</span>
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {TRENDS.map((trend) => (
            <button
              key={trend.id}
              type="button"
              className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
            >
              <div className="size-12 rounded-xl overflow-hidden shrink-0">
                <img src={trend.image} alt={trend.name} className="size-full object-cover" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-bold text-sm text-foreground truncate mb-1">{trend.name}</p>
                <p className="text-xs text-muted-foreground tracking-[0.48px]">
                  {t('home.stats.observationCount', { count: trend.observations })}
                </p>
              </div>
              <div className="size-8 rounded-full border-[0.5px] border-border flex items-center justify-center shrink-0">
                <ChevronRight className="size-4 text-foreground" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="w-full mt-6 h-12 border-[0.5px] border-border rounded-full font-bold hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {t('home.trending.viewAll')}
        </button>
      </div>
    </div>
  )
}
