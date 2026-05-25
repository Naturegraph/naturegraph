/**
 * NotificationsPage — Page dédiée /notifications
 *
 * EPIC 3.1 + 3.2 + 3.3 du PRD notifications
 *
 * Fonctionnalités :
 *   - Liste complète des notifications du user courant (vue notifications_with_actor)
 *   - Filtres par catégorie via tabs : Tous / Social / Espèces / Système
 *   - Pagination par curseur (created_at) — 20 par page — "Charger plus" explicite
 *     (pas de scroll infini — cf. GUIDELINES.md éco-conception)
 *   - Bouton "Tout marquer comme lu"
 *   - Regroupement 24h identique au panel (Alice + 3 autres)
 *   - Deep-link par reference_type (post / profile / species)
 *
 * Accessibilité :
 *   - Tabs ARIA (role=tablist / tab / tabpanel)
 *   - Skip link géré par MainLayout parent
 *   - Bouton "charger plus" visible clavier + aria-live pour l'état "you're all caught up"
 *
 * Eco-conception :
 *   - Pas de polling — Realtime déjà actif dans useNotifications côté panel
 *   - LIMIT 20 par requête, pas de scroll infini
 *   - Lazy-loadée dans le router
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifications'
import {
  listNotificationsPage,
  type Notification,
  type NotificationType,
} from '@/services/notificationService'
import { groupNotifications, formatGroupedActors } from '@/utils/groupNotifications'
import {
  NotifIcon,
  NotifChip,
  Avatar,
  getMessage,
  resolveDeepLink,
} from '@/components/notifications/NotifItem'
import { trackNotifEvent } from '@/utils/notificationAnalytics'
import { EmptyState, LoadingState } from '@/components/ui'
import { usePageTitle } from '@/hooks/usePageTitle'

// ─── Catégories de filtres ────────────────────────────────────────────────────

type FilterKey = 'all' | 'social' | 'species' | 'system'

/** Types de notifs inclus dans chaque onglet. `null` = pas de filtre (tous). */
const FILTER_TYPES: Record<FilterKey, NotificationType[] | null> = {
  all: null,
  social: ['reaction', 'follow', 'comment', 'mention'],
  species: ['post', 'species_digest', 'identification'],
  system: ['system'],
}

const PAGE_SIZE = 20

// ─── Helpers date ─────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [filter, setFilter] = useState<FilterKey>('all')

  // BATCH 10 / QW-UX1 : titre dynamique pour onglet navigateur
  usePageTitle(t('nav.notifications'))

  const markAsRead = useMarkAsRead(user?.id)
  const markAllAsRead = useMarkAllAsRead(user?.id)

  // ── Requête paginée par curseur ─────────────────────────────────────────────
  const types = FILTER_TYPES[filter] ?? undefined
  const query = useInfiniteQuery({
    queryKey: ['notifications', user?.id, 'page', filter],
    enabled: !!user?.id,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listNotificationsPage(user!.id, {
        before: pageParam,
        limit: PAGE_SIZE,
        types,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30 * 1000,
  })

  // Aplatit les pages en une seule liste
  const flat: Notification[] = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  )
  const grouped = useMemo(() => groupNotifications(flat), [flat])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleClick = (n: Notification) => {
    trackNotifEvent('notif_clicked', { notif_type: n.type })
    if (!n.read) markAsRead.mutate(n.id)
    const url = resolveDeepLink(n)
    if (url) navigate(url)
  }

  const handleMarkAllRead = () => {
    trackNotifEvent('mark_all_read')
    markAllAsRead.mutate()
  }

  const handleTabChange = (k: FilterKey) => {
    trackNotifEvent('tab_changed', { tab: k })
    setFilter(k)
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-off-white">
      {/* Header de page */}
      <header className="sticky top-0 z-10 bg-cream-lighter border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label={t('home.notifications.page.back')}
              className="size-9 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowLeft className="size-5 text-foreground" aria-hidden="true" />
            </button>
            <h1 className="font-title font-bold text-lg text-foreground">
              {t('home.notifications.page.title')}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markAllAsRead.isPending || grouped.every((g) => g.read)}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2 py-1"
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('home.notifications.page.markAllRead')}</span>
          </button>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label={t('home.notifications.page.title')}
          className="max-w-3xl mx-auto flex gap-1 px-4 overflow-x-auto"
        >
          {(['all', 'social', 'species', 'system'] as FilterKey[]).map((k) => {
            const active = filter === k
            return (
              <button
                key={k}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => handleTabChange(k)}
                className={`relative px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(
                  k === 'all'
                    ? 'home.notifications.page.tabAll'
                    : k === 'social'
                      ? 'home.notifications.page.tabSocial'
                      : k === 'species'
                        ? 'home.notifications.page.tabSpecies'
                        : 'home.notifications.page.tabSystem',
                )}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                  />
                )}
              </button>
            )
          })}
        </div>
      </header>

      {/* Liste */}
      <main role="tabpanel" className="max-w-3xl mx-auto px-4 py-6">
        {query.isLoading && (
          <LoadingState
            variant="skeleton"
            rows={6}
            label={t('home.notifications.page.loading')}
            className="bg-cream-lighter border border-border rounded-xl"
          />
        )}

        {!query.isLoading && grouped.length === 0 && (
          <EmptyState
            title={t('home.notifications.page.empty')}
            description={t('home.notifications.page.emptyHint')}
          />
        )}

        {grouped.length > 0 && (
          <ul className="divide-y divide-border bg-cream-lighter border border-border rounded-xl overflow-hidden">
            {grouped.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                    n.read ? 'hover:bg-muted/30' : 'bg-primary-light/30 hover:bg-primary-light/50'
                  }`}
                >
                  {/* Avatar + icône */}
                  <div className="relative shrink-0 mt-0.5">
                    <Avatar
                      url={n.actor_avatar_url}
                      fallback={n.actor_username ?? n.title ?? '?'}
                    />
                    <NotifIcon type={n.type} />
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">
                      <NotifChip type={n.type} t={t} />
                    </div>
                    <p className="text-sm text-foreground leading-snug">
                      <span className="font-bold">
                        {formatGroupedActors(n, (nb) =>
                          nb === 1
                            ? t('home.notifications.othersOne')
                            : t('home.notifications.othersMany', { count: nb }),
                        ) ??
                          n.actor_username ??
                          n.title ??
                          ''}
                      </span>{' '}
                      <span className="text-muted-foreground">{getMessage(n.type, t)}</span>
                    </p>
                    {/*
                      Body sur plusieurs lignes (whitespace-pre-line preserve les \n).
                      Plus de line-clamp pour laisser respirer les notifs system longues.
                      Nicolas 2026-05-25.
                    */}
                    {n.body && (
                      <p className="mt-1 text-sm text-muted-foreground leading-snug whitespace-pre-line">
                        {n.body}
                      </p>
                    )}
                  </div>

                  {/* Heure + point non-lu */}
                  <div className="flex flex-col items-end gap-2 shrink-0 ml-1">
                    <span className="text-xs text-muted-foreground">
                      {formatTime(n.created_at)}
                    </span>
                    {!n.read && (
                      <div className="size-2.5 rounded-full bg-primary" aria-label="Non lu" />
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination — "Charger plus" (pas de scroll infini pour éco-conception) */}
        {grouped.length > 0 && (
          <div className="mt-6 text-center" aria-live="polite">
            {query.hasNextPage ? (
              <button
                type="button"
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
                className="inline-flex items-center px-5 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {query.isFetchingNextPage
                  ? t('home.notifications.page.loading')
                  : t('home.notifications.page.loadMore')}
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">{t('home.notifications.page.noMore')}</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
