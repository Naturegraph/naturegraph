/**
 * AdminUsers, Module 2 : Gestion utilisateurs (MVP)
 *
 * Refs : ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md v2.0 Module 2 + BATCH 33
 *
 * Fonctionnalites livrees :
 *   - Liste profils paginee (20 par page), pagination obligatoire (eco-conception)
 *   - Recherche par username / email / first/last name (debounced 300ms)
 *   - Filtre par statut admin (admin / regular / all)
 *   - Actions par utilisateur (menu) :
 *       * Voir profil public (/profile/:username)
 *       * Promouvoir admin (ouvre ConfirmModal si super_admin connecte)
 *       * Suspendre temporairement (ouvre ConfirmModal avec champ raison)
 *       * Bannir definitivement (super_admin uniquement, double confirmation)
 *   - Toutes les actions log dans admin_audit_logs (immutable)
 *
 * Hors scope BATCH 33 (Phase 2+) :
 *   - Edition profil (username, email) → manuel via Supabase Dashboard
 *   - Reset password → laisse a Supabase Auth flow standard
 *   - Bulk actions → 1 user at a time pour MVP
 *
 * Eco-conception :
 *   - Pagination 20 items (jamais de scroll infini)
 *   - Cache React Query 30s (stats fraiches mais pas trop de queries)
 *   - Pas d'avatar lazy-loaded ici (recharge a chaque scroll = OK pour 20 max)
 *
 * A11Y :
 *   - aria-label sur tous les inputs/buttons
 *   - role="alertdialog" via ConfirmModal
 *   - Focus management via ConfirmModal
 */

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { PAGE_SIZES, STALE_TIMES } from '@/constants/reactQuery'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Shield,
  ShieldOff,
  Ban,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  UserPlus,
  Info,
  ShieldCheck,
  Trash2,
  Code2,
  Users as UsersIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import hermineIcon from '@/assets/images/hermine-icon.png'
import { useToast } from '@/contexts/ToastContext'
import { useIsAdmin, type AdminRole } from '@/hooks/useIsAdmin'
import { useAdminAction } from '@/hooks/useAdminAction'
import type { Json } from '@/types/supabase'

// ─── Types ──────────────────────────────────────────────────────────────

interface UserRow {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  avatar_url: string | null
  posts_count: number | null
  followers_count: number | null
  created_at: string | null
  // BATCH 107 : suivi activité user
  last_login_at: string | null
  updated_at: string | null
  // Joined depuis admin_users (peut etre null si pas admin)
  admin_role: string | null
  admin_is_active: boolean | null
}

type ActionType = 'set_role' | 'suspend' | 'ban' | 'delete' | null

interface PendingAction {
  type: ActionType
  user: UserRow | null
}

const PAGE_SIZE = PAGE_SIZES.ADMIN_DEFAULT

/**
 * Libelle + style de badge par role (RBAC). Cf. migration 20260612_rbac_roles.sql
 * et hook useIsAdmin. developpeur = tag technique sans acces panneau.
 */
const ROLE_META: Record<string, { label: string; className: string }> = {
  super_admin: { label: 'Super-admin', className: 'bg-primary-light text-primary' },
  moderator: {
    label: 'Modérateur',
    className: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  },
  support: { label: 'Support', className: 'bg-[var(--color-info-bg)] text-[var(--color-info)]' },
  equipe_produit: {
    label: 'Équipe produit',
    className: 'bg-[var(--color-action-soft)] text-[var(--color-action-default)]',
  },
  developpeur: {
    label: 'Développeur',
    className: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]',
  },
}

/** Roles assignables via l'UI (super_admin reserve, non assignable depuis cette liste). */
const ASSIGNABLE_ROLES: { value: AdminRole; label: string; hint: string }[] = [
  { value: 'moderator', label: 'Modérateur', hint: 'modération + beta + suspension' },
  { value: 'support', label: 'Support', hint: 'panneau en lecture seule' },
  {
    value: 'equipe_produit',
    label: 'Équipe produit',
    hint: 'panneau en lecture (dashboard, analytics)',
  },
  { value: 'developpeur', label: 'Développeur', hint: 'AUCUN accès admin, tag technique' },
]

// ─── Helpers date (BATCH 107) ────────────────────────────────────────────

/**
 * Format date courte localisée FR : 03/04/2026
 * Utilisée pour "Inscrit le", pas besoin d'heure, juste un repère temporel.
 */
function formatShortDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

/**
 * Format relatif : "il y a 5 min", "il y a 2j", "il y a 3 mois" ou date absolue si > 1 an.
 * Utilisé pour "Dernière activité", donne une lecture rapide de l'engagement.
 */
function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Jamais'
  try {
    const date = new Date(iso)
    const now = Date.now()
    const diffMs = now - date.getTime()
    const min = Math.floor(diffMs / 60_000)
    if (min < 1) return "À l'instant"
    if (min < 60) return `il y a ${min} min`
    const h = Math.floor(min / 60)
    if (h < 24) return `il y a ${h}h`
    const d = Math.floor(h / 24)
    if (d < 7) return `il y a ${d}j`
    if (d < 30) return `il y a ${Math.floor(d / 7)} sem.`
    if (d < 365) return `il y a ${Math.floor(d / 30)} mois`
    return formatShortDate(iso)
  } catch {
    return '—'
  }
}

// ─── Page ────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { adminUser, isSuperAdmin, canModerate } = useIsAdmin()
  // BATCH 36 : hook centralise pour audit log (DRY, strategy ligne 562).
  const { logAction } = useAdminAction()

  // BATCH 104 : 4 tabs au lieu d'un select. Plus visuel + plus de granularité.
  //   all          → tous les profils
  //   super_admin  → admin_role = 'super_admin'
  //   moderator    → admin_role IN ('moderator', 'support')
  //   migrateur    → admin_role IS NULL (utilisateurs normaux)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'staff' | 'developpeur' | 'migrateur'>('all')
  // BATCH 105c : 4 tri simples (created_at desc/asc, posts_count desc, username asc)
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'posts' | 'name'>('newest')
  const [page, setPage] = useState(0)
  const [showRolesInfo, setShowRolesInfo] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  // BATCH 105a : rect du bouton trigger pour positionner le menu via portal
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null)
  const menuTriggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [pending, setPending] = useState<PendingAction>({ type: null, user: null })
  const [reason, setReason] = useState('')
  // Role choisi dans la modale "Gérer le rôle" ('remove' = retirer tout role).
  const [roleChoice, setRoleChoice] = useState<AdminRole | 'remove'>('moderator')

  // Debounce search (300ms), eviter spam queries (BATCH 41 : hook DRY)
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  // Reset page quand le terme de recherche change
  useEffect(() => {
    setPage(0)
  }, [debouncedSearch])

  // Reset page quand filter change
  useEffect(() => {
    setPage(0)
  }, [filter])

  // BATCH 105c : config tri SQL pour chaque mode
  const sortConfig: Record<typeof sortMode, { column: string; ascending: boolean }> = {
    newest: { column: 'created_at', ascending: false },
    oldest: { column: 'created_at', ascending: true },
    posts: { column: 'posts_count', ascending: false },
    name: { column: 'username', ascending: true },
  }

  // Fetch users paginated + filtered
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', debouncedSearch, filter, sortMode, page],
    queryFn: async () => {
      if (!supabase) return { rows: [] as UserRow[], total: 0 }

      const sort = sortConfig[sortMode]
      let query = supabase
        .from('profiles')
        .select(
          'id, username, email, first_name, last_name, avatar_url, posts_count, followers_count, created_at, last_login_at, updated_at',
          { count: 'exact' },
        )
        .order(sort.column, { ascending: sort.ascending })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (debouncedSearch) {
        // OR ilike sur 4 champs : username, email, first_name, last_name
        query = query.or(
          `username.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,first_name.ilike.%${debouncedSearch}%,last_name.ilike.%${debouncedSearch}%`,
        )
      }

      const { data: profiles, count, error } = await query
      if (error) throw error

      // Fetch admin_users en parallel pour cette page
      const userIds = (profiles ?? []).map((p) => p.id)
      const adminMap = new Map<string, { role: string; is_active: boolean }>()
      if (userIds.length > 0) {
        const { data: admins } = await supabase
          .from('admin_users')
          .select('user_id, role, is_active')
          .in('user_id', userIds)
        for (const a of admins ?? []) {
          adminMap.set(a.user_id, { role: a.role, is_active: a.is_active })
        }
      }

      let rows = (profiles ?? []).map((p) => ({
        ...p,
        admin_role: adminMap.get(p.id)?.role ?? null,
        admin_is_active: adminMap.get(p.id)?.is_active ?? null,
      })) as UserRow[]

      // Filtre par categorie de role (RBAC) :
      //   staff       = role panneau actif (super_admin/moderator/support/equipe_produit)
      //   developpeur = role developpeur actif (tag technique, hors panneau)
      //   migrateur   = aucun role admin actif
      if (filter === 'staff') {
        rows = rows.filter(
          (r) => !!r.admin_role && r.admin_is_active === true && r.admin_role !== 'developpeur',
        )
      } else if (filter === 'developpeur') {
        rows = rows.filter((r) => r.admin_role === 'developpeur' && r.admin_is_active === true)
      } else if (filter === 'migrateur') {
        rows = rows.filter((r) => !r.admin_role || !r.admin_is_active)
      }

      return { rows, total: count ?? 0 }
    },
    staleTime: STALE_TIMES.MEDIUM,
  })

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ─── Audit log helper (BATCH 36 : delegate to useAdminAction) ───────
  async function logAudit(action: string, targetUserId: string, metadata: Json) {
    await logAction({ action, targetType: 'user', targetId: targetUserId, metadata })
  }

  // ─── Actions handlers ────────────────────────────────────────────────

  function openAction(type: Exclude<ActionType, null>, user: UserRow) {
    setOpenMenuId(null)
    setPending({ type, user })
    setReason('')
    if (type === 'set_role') {
      // Pre-selectionne le role actuel s'il est assignable, sinon Modérateur.
      const assignable = ASSIGNABLE_ROLES.map((r) => r.value as string)
      setRoleChoice(
        user.admin_role && assignable.includes(user.admin_role)
          ? (user.admin_role as AdminRole)
          : 'moderator',
      )
    }
  }

  function closeAction() {
    setPending({ type: null, user: null })
    setReason('')
  }

  async function confirmAction() {
    if (!pending.type || !pending.user || !supabase) return
    const user = pending.user

    try {
      switch (pending.type) {
        // Assignation / changement / retrait de role (super_admin uniquement, RLS).
        case 'set_role': {
          if (roleChoice === 'remove') {
            const { error } = await supabase
              .from('admin_users')
              .update({ is_active: false, notes: reason || 'Rôle retiré via /admin/users' })
              .eq('user_id', user.id)
            if (error) throw error
            await logAudit('user.role_remove', user.id, { reason })
            toast.success(`Rôle retiré pour @${user.username}`)
          } else {
            // Reactive/maj si une row existe deja (meme inactive), sinon insert.
            const hadRow = user.admin_role !== null
            if (hadRow) {
              const { error } = await supabase
                .from('admin_users')
                .update({
                  role: roleChoice,
                  is_active: true,
                  notes: reason || `Rôle ${roleChoice}`,
                })
                .eq('user_id', user.id)
              if (error) throw error
            } else {
              const { error } = await supabase.from('admin_users').insert({
                user_id: user.id,
                role: roleChoice,
                is_active: true,
                created_by: adminUser?.user_id ?? null,
                notes: reason || `Rôle ${roleChoice} via /admin/users`,
              })
              if (error) throw error
            }
            await logAudit('user.role_set', user.id, { role: roleChoice, reason })
            toast.success(`@${user.username} : ${ROLE_META[roleChoice]?.label ?? roleChoice}`)
          }
          break
        }
        case 'suspend': {
          if (!reason.trim()) {
            toast.error('Raison obligatoire pour suspendre')
            return
          }
          const { error } = await supabase.from('admin_actions').insert({
            performed_by: adminUser!.id,
            action_type: 'user_suspend',
            target_user_id: user.id,
            duration_days: 7,
            reason: reason.trim(),
            is_reversible: true,
          })
          if (error) throw error
          await logAudit('user.suspend', user.id, { duration_days: 7, reason })
          toast.success(`${user.username} suspendu 7 jours`)
          break
        }
        case 'ban': {
          if (!reason.trim()) {
            toast.error('Raison obligatoire pour bannir')
            return
          }
          const { error } = await supabase.from('admin_actions').insert({
            performed_by: adminUser!.id,
            action_type: 'user_ban',
            target_user_id: user.id,
            reason: reason.trim(),
            is_reversible: false,
          })
          if (error) throw error
          await logAudit('user.ban', user.id, { reason })
          toast.success(`${user.username} banni definitivement`)
          break
        }
        // BATCH 107 : suppression totale via edge function admin-delete-user
        case 'delete': {
          if (reason.trim().length < 10) {
            toast.error('Raison obligatoire (10 caractères min)')
            return
          }
          const { data: sessionData } = await supabase.auth.getSession()
          const accessToken = sessionData.session?.access_token
          if (!accessToken) throw new Error('Session expirée, reconnectez-vous')

          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ target_user_id: user.id, reason: reason.trim() }),
          })
          const json = await res.json().catch(() => null)
          if (!res.ok || !json?.ok) {
            throw new Error(json?.error ?? `Erreur HTTP ${res.status}`)
          }
          // Audit log déjà inséré côté edge function (avant la suppression CASCADE)
          toast.success(`Compte @${user.username} supprimé définitivement`)
          break
        }
      }
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] })
    } catch (err) {
      toast.error('Erreur action admin', err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      closeAction()
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────

  // BATCH 104 : configuration des 4 tabs (style ProfileTabs)
  const TABS = [
    { key: 'all' as const, label: 'Tous', icon: UsersIcon },
    { key: 'staff' as const, label: 'Équipe', icon: ShieldCheck },
    { key: 'developpeur' as const, label: 'Développeurs', icon: Code2 },
    { key: 'migrateur' as const, label: 'Migrateurs', icon: UsersIcon },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header + actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">
            {t('admin.users.title', { defaultValue: 'Utilisateurs' })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} {t('admin.users.totalLabel', { defaultValue: 'utilisateurs au total' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRolesInfo((v) => !v)}
            aria-expanded={showRolesInfo}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-[var(--color-bg-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)]"
          >
            <Info className="size-4" aria-hidden="true" />
            <span>Rôles</span>
          </button>
          {isSuperAdmin && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowAddUser(true)}
              icon={<UserPlus className="size-4" aria-hidden="true" />}
            >
              Ajouter un utilisateur
            </Button>
          )}
        </div>
      </div>

      {/* Encart explicatif des rôles (toggle via bouton Info) */}
      {showRolesInfo && (
        <aside
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-5 flex flex-col gap-3"
          role="region"
          aria-label="Définition des rôles"
        >
          <h2 className="text-sm font-bold text-foreground inline-flex items-center gap-2">
            <Info className="size-4 text-[var(--color-action-default)]" aria-hidden="true" />
            Permissions et objectifs de chaque rôle
          </h2>
          <ul className="grid md:grid-cols-3 gap-3 text-sm">
            <li className="bg-[var(--color-bg-primary)] rounded-lg p-3 border border-[var(--color-border)]">
              <p className="font-semibold text-foreground inline-flex items-center gap-1.5 mb-1">
                <ShieldCheck
                  className="size-4 text-[var(--color-action-default)]"
                  aria-hidden="true"
                />
                Super-admin
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Accès complet : gestion des rôles, modération, beta, suppression, taxonomie, audit.
              </p>
            </li>
            <li className="bg-[var(--color-bg-primary)] rounded-lg p-3 border border-[var(--color-border)]">
              <p className="font-semibold text-foreground inline-flex items-center gap-1.5 mb-1">
                <Shield className="size-4 text-[var(--color-warning)]" aria-hidden="true" />
                Modérateur
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Modération (signalements, suspension 7j) + gestion beta. Pas de ban définitif ni de
                gestion des rôles.
              </p>
            </li>
            <li className="bg-[var(--color-bg-primary)] rounded-lg p-3 border border-[var(--color-border)]">
              <p className="font-semibold text-foreground inline-flex items-center gap-1.5 mb-1">
                <Shield className="size-4 text-[var(--color-info)]" aria-hidden="true" />
                Support
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Accès au panneau en lecture seule. Aucune action destructive.
              </p>
            </li>
            <li className="bg-[var(--color-bg-primary)] rounded-lg p-3 border border-[var(--color-border)]">
              <p className="font-semibold text-foreground inline-flex items-center gap-1.5 mb-1">
                <ShieldCheck
                  className="size-4 text-[var(--color-action-default)]"
                  aria-hidden="true"
                />
                Équipe produit
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Panneau en lecture (dashboard, analytics, beta, feedbacks). Aucune action
                destructive.
              </p>
            </li>
            <li className="bg-[var(--color-bg-primary)] rounded-lg p-3 border border-[var(--color-border)]">
              <p className="font-semibold text-foreground inline-flex items-center gap-1.5 mb-1">
                <Code2 className="size-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
                Développeur
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tag technique pour les tests en profondeur. <strong>Aucun accès admin.</strong>{' '}
                Souvent couplé à un profil masqué de la communauté.
              </p>
            </li>
            <li className="bg-[var(--color-bg-primary)] rounded-lg p-3 border border-[var(--color-border)]">
              <p className="font-semibold text-foreground inline-flex items-center gap-1.5 mb-1">
                <UsersIcon
                  className="size-4 text-[var(--color-text-secondary)]"
                  aria-hidden="true"
                />
                Migrateur
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Utilisateur standard : observe, partage, interagit. Aucun accès admin. La majorité
                des comptes.
              </p>
            </li>
          </ul>
        </aside>
      )}

      {/* Tabs filtre par rôle */}
      <div
        role="tablist"
        aria-label="Filtrer par rôle"
        className="flex items-center gap-1 border-b border-[var(--color-border)] overflow-x-auto"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = filter === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilter(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-action-default)] whitespace-nowrap ${
                isActive
                  ? 'border-[var(--color-action-default)] text-[var(--color-action-default)]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Search + Tri (BATCH 105c) */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.users.searchPlaceholder', {
              defaultValue: 'Rechercher par nom, username, email...',
            })}
            aria-label={t('admin.users.searchLabel', { defaultValue: 'Recherche utilisateurs' })}
            className="w-full h-10 pl-10 pr-4 rounded-md border border-border bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
          aria-label="Trier les utilisateurs"
          className="h-10 pl-4 pr-9 rounded-md border border-border bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
        >
          <option value="newest">Plus récents</option>
          <option value="oldest">Plus anciens</option>
          <option value="posts">+ d'observations</option>
          <option value="name">Ordre alphabétique</option>
        </select>
      </div>

      {/* Table */}
      <section className="bg-background border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            {debouncedSearch
              ? `Aucun utilisateur trouve pour "${debouncedSearch}"`
              : 'Aucun utilisateur dans cette categorie.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground tracking-wide">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2">Utilisateur</th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">Posts</th>
                  <th className="text-left px-4 py-2">Inscrit le</th>
                  <th className="text-left px-4 py-2">Dernière activité</th>
                  <th className="text-left px-4 py-2">Rôle</th>
                  <th className="text-right px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {/* Photo de profil avec fallback hermine (cohérent
                            avec le reste de l'app, Nicolas 2026-05-24 : on
                            ne veut plus de cercles violets avec lettre). */}
                        <img
                          src={u.avatar_url ?? hermineIcon}
                          alt={u.username ?? 'Avatar'}
                          className="size-8 rounded-full object-cover shrink-0 bg-[var(--color-bg-secondary)]"
                          loading="lazy"
                        />
                        <div className="flex flex-col min-w-0">
                          <Link
                            to={`/profile/${u.username}`}
                            className="font-medium text-foreground hover:underline inline-flex items-center gap-1"
                          >
                            @{u.username}
                            <ExternalLink className="size-3 opacity-60" aria-hidden="true" />
                          </Link>
                          <span className="text-xs text-muted-foreground truncate">
                            {u.first_name} {u.last_name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs truncate max-w-[200px]">
                      {u.email}
                    </td>
                    <td className="px-4 py-2 text-foreground">{u.posts_count ?? 0}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {u.created_at ? formatShortDate(u.created_at) : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(u.last_login_at ?? u.updated_at)}
                    </td>
                    <td className="px-4 py-2">
                      {u.admin_role ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.admin_is_active
                              ? (ROLE_META[u.admin_role]?.className ??
                                'bg-primary-light text-primary')
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Shield className="size-3" aria-hidden="true" />
                          {ROLE_META[u.admin_role]?.label ?? u.admin_role}
                          {!u.admin_is_active && ' (inactif)'}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        ref={(el) => {
                          if (el) menuTriggerRefs.current.set(u.id, el)
                          else menuTriggerRefs.current.delete(u.id)
                        }}
                        onClick={(e) => {
                          const isOpen = openMenuId === u.id
                          if (isOpen) {
                            setOpenMenuId(null)
                            setMenuAnchorRect(null)
                          } else {
                            setMenuAnchorRect(e.currentTarget.getBoundingClientRect())
                            setOpenMenuId(u.id)
                          }
                        }}
                        aria-label={`Actions pour ${u.username}`}
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === u.id}
                        className="size-8 inline-flex items-center justify-center rounded hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <MoreVertical className="size-4" aria-hidden="true" />
                      </button>
                      {openMenuId === u.id && (
                        <UserActionMenu
                          user={u}
                          isSuperAdmin={isSuperAdmin}
                          canModerate={canModerate}
                          onAction={openAction}
                          onClose={() => {
                            setOpenMenuId(null)
                            setMenuAnchorRect(null)
                          }}
                          anchorRect={menuAnchorRect}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-between gap-3 text-sm"
          aria-label={t('admin.users.pagination', { defaultValue: 'Pagination utilisateurs' })}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span>Precedent</span>
          </Button>
          <span className="text-muted-foreground">
            Page {page + 1} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <span>Suivant</span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </nav>
      )}

      {/* BATCH 104 : Modale "Ajouter un utilisateur", stub MVP.
          Pour l'instant ouvre la doc d'invitation. Phase 2 : form direct + RPC. */}
      {showAddUser && (
        <ConfirmModal
          title="Ajouter un utilisateur"
          description="La création directe via l'admin sera disponible Phase 2. Pour la beta, deux options : (1) Envoyer une clé beta à la personne depuis Gestion beta. (2) Promouvoir un utilisateur existant en modérateur via le menu actions de cette liste."
          confirmLabel="J'ai compris"
          variant="default"
          onCancel={() => setShowAddUser(false)}
          onConfirm={() => setShowAddUser(false)}
        />
      )}

      {/* ── Confirm modals ────────────────────────────────────────────── */}
      {pending.type && pending.user && (
        <ConfirmModal
          title={
            pending.type === 'set_role'
              ? `Gérer le rôle de @${pending.user.username}`
              : pending.type === 'suspend'
                ? `Suspendre @${pending.user.username} 7 jours ?`
                : pending.type === 'delete'
                  ? `Supprimer définitivement @${pending.user.username} ?`
                  : `Bannir @${pending.user.username} definitivement ?`
          }
          description={
            pending.type === 'set_role'
              ? 'Développeur = aucun accès admin (tag technique). Support et Équipe produit = panneau en lecture seule. Modérateur = modération + beta + suspension. Action loggée dans l’audit.'
              : pending.type === 'suspend'
                ? 'Suspension de 7 jours. Reversible. Loggue dans admin_actions.'
                : pending.type === 'delete'
                  ? "⚠️ SUPPRESSION TOTALE, IRRÉVERSIBLE.\nLe compte, le profil, les posts, les carnets, les médias et toutes les données associées seront définitivement supprimés. Cette action est conforme RGPD (droit à l'oubli)."
                  : '⚠️ BAN PERMANENT. Action IRREVERSIBLE. Loggue dans admin_actions.'
          }
          confirmLabel={
            pending.type === 'set_role'
              ? 'Appliquer le rôle'
              : pending.type === 'ban'
                ? 'Bannir definitivement'
                : pending.type === 'suspend'
                  ? 'Suspendre'
                  : pending.type === 'delete'
                    ? 'Supprimer définitivement'
                    : 'Bannir'
          }
          variant={
            pending.type === 'ban' || pending.type === 'suspend' || pending.type === 'delete'
              ? 'danger'
              : 'default'
          }
          onCancel={closeAction}
          onConfirm={confirmAction}
          confirmDisabled={
            (pending.type === 'suspend' || pending.type === 'ban' || pending.type === 'delete') &&
            reason.trim().length < 10
          }
        >
          {pending.type === 'set_role' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="role-choice" className="text-xs font-medium text-foreground">
                  Rôle
                </label>
                <select
                  id="role-choice"
                  value={roleChoice}
                  onChange={(e) => setRoleChoice(e.target.value as AdminRole | 'remove')}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} — {r.hint}
                    </option>
                  ))}
                  <option value="remove">Retirer le rôle (redevient migrateur)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="role-reason" className="text-xs font-medium text-foreground">
                  Note (optionnel, audit log)
                </label>
                <textarea
                  id="role-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Ex: teste les nouvelles features en profondeur"
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>
          )}
          {(pending.type === 'suspend' || pending.type === 'ban' || pending.type === 'delete') && (
            <div className="flex flex-col gap-1">
              <label htmlFor="action-reason" className="text-xs font-medium text-foreground">
                Raison (10 caracteres min, affichee dans l'audit log)
              </label>
              <textarea
                id="action-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder={
                  pending.type === 'delete'
                    ? 'Ex: demande RGPD du user, compte de spam massif identifié...'
                    : 'Ex: harcelement repete, spam massif...'
                }
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <span className="text-xs text-muted-foreground self-end">{reason.length} / 500</span>
            </div>
          )}
        </ConfirmModal>
      )}
    </div>
  )
}

// ─── UserActionMenu sub-component ───────────────────────────────────────

interface UserActionMenuProps {
  user: UserRow
  isSuperAdmin: boolean
  canModerate: boolean
  onAction: (type: Exclude<ActionType, null>, user: UserRow) => void
  onClose: () => void
  /** Rect du bouton trigger pour positionner le menu via portal (BATCH 105a). */
  anchorRect: DOMRect | null
}

function UserActionMenu({
  user,
  isSuperAdmin,
  canModerate,
  onAction,
  onClose,
  anchorRect,
}: UserActionMenuProps) {
  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // BATCH 105a : positionnement fixed via getBoundingClientRect du bouton parent
  // (rendu via Portal au body pour eviter clip par overflow-x-auto de la table).
  const menuStyle: React.CSSProperties = anchorRect
    ? {
        position: 'fixed',
        top: anchorRect.bottom + 4,
        right: window.innerWidth - anchorRect.right,
      }
    : {}

  return createPortal(
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} aria-hidden="true" />
      <div
        role="menu"
        style={menuStyle}
        className="z-[70] min-w-[200px] bg-background border border-border rounded-md shadow-lg py-1 text-sm"
      >
        <Link
          to={`/profile/${user.username}`}
          role="menuitem"
          className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 focus-visible:outline-none focus-visible:bg-muted/30"
          onClick={onClose}
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          Voir profil
        </Link>
        {/* Gestion des roles : super_admin uniquement (RLS l'impose aussi). */}
        {isSuperAdmin && (
          <button
            type="button"
            role="menuitem"
            onClick={() => onAction('set_role', user)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 focus-visible:outline-none focus-visible:bg-muted/30 text-left"
          >
            <Shield className="size-3.5" aria-hidden="true" />
            Gérer le rôle
          </button>
        )}
        {/* Suspension : moderation (super_admin ou moderator). */}
        {canModerate && (
          <>
            <div className="my-1 border-t border-border" aria-hidden="true" />
            <button
              type="button"
              role="menuitem"
              onClick={() => onAction('suspend', user)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-warning,#ca8a04)]/10 focus-visible:outline-none focus-visible:bg-[var(--color-warning,#ca8a04)]/10 text-left text-[var(--color-warning,#ca8a04)]"
            >
              <ShieldOff className="size-3.5" aria-hidden="true" />
              Suspendre 7 jours
            </button>
          </>
        )}
        {isSuperAdmin && (
          <button
            type="button"
            role="menuitem"
            onClick={() => onAction('ban', user)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-error,#dc2626)]/10 focus-visible:outline-none focus-visible:bg-[var(--color-error,#dc2626)]/10 text-left text-[var(--color-error,#dc2626)]"
          >
            <Ban className="size-3.5" aria-hidden="true" />
            Bannir definitivement
          </button>
        )}
        {/* BATCH 107 : Suppression complète du compte (super_admin only).
            Différent de "bannir" : DELETE FROM auth.users → CASCADE supprime profil,
            posts, notebooks, storage, etc. RGPD-compliant + irréversible. */}
        {isSuperAdmin && (
          <button
            type="button"
            role="menuitem"
            onClick={() => onAction('delete', user)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-error,#dc2626)]/10 focus-visible:outline-none focus-visible:bg-[var(--color-error,#dc2626)]/10 text-left text-[var(--color-error,#dc2626)]"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Supprimer le compte
          </button>
        )}
      </div>
    </>,
    document.body,
  )
}
