/**
 * AdminBeta — Module 4 : Gestion beta fermee
 *
 * Refs : ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md v2.0 Module 4 + BATCH 32
 *
 * Fonctionnalites :
 *   - Vue d'ensemble : phase actuelle + quota + status accepting
 *   - Liste cles : code, batch, status, used_by, expires_at, actions
 *   - Generation cles : modal "Generer X cles (vague N)" -> RPC generate_beta_keys
 *   - Waitlist : liste emails en attente + bouton "Inviter X personnes"
 *   - Stats signups : success/echec breakdown 7j
 */

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Key, Plus, Copy, Mail, X, Loader2, Trash2, ExternalLink, BarChart3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/contexts/ToastContext'
import { useAdminAction } from '@/hooks/useAdminAction'
import { STALE_TIMES } from '@/constants/reactQuery'

// ─── Types DB rows ────────────────────────────────────────────────────────

interface BetaAccessKey {
  id: string
  code: string
  batch_number: number
  max_uses: number
  current_uses: number
  is_active: boolean
  expires_at: string
  created_at: string
  used_at: string | null
  used_by_user_id: string | null
  notes: string | null
}

interface BetaWaitlistEntry {
  id: string
  email: string
  motivation: string | null
  created_at: string
  invited_at: string | null
}

interface BetaQuota {
  current_phase: number
  max_users_total: number
  current_user_count: number
  accepting_new_signups: boolean
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const diffMs = date.getTime() - Date.now()
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return "aujourd'hui"
  if (diffDays > 0) return `dans ${diffDays}j`
  return `il y a ${Math.abs(diffDays)}j`
}

// BATCH 102 : statut sous forme de badge pill colore (cohereent DS Toast)
function keyStatus(k: BetaAccessKey): { label: string; badgeClass: string } {
  if (!k.is_active)
    return {
      label: 'Désactivée',
      badgeClass: 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]',
    }
  if (k.current_uses >= k.max_uses)
    return {
      label: 'Utilisée',
      badgeClass: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
    }
  if (new Date(k.expires_at) < new Date())
    return {
      label: 'Expirée',
      badgeClass: 'bg-[var(--color-error-bg)] text-[var(--color-error)]',
    }
  return {
    label: 'Valide',
    badgeClass: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AdminBeta() {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  // BATCH 36 : hook centralise pour audit log (DRY, strategy ligne 562).
  // useIsAdmin n'est plus necessaire ici car useAdminAction l'utilise en interne.
  const { logAction } = useAdminAction()
  const [isGenerating, setIsGenerating] = useState(false)
  // BATCH 107 : modale double-confirmation pour suppression réelle
  const [keyToDelete, setKeyToDelete] = useState<BetaAccessKey | null>(null)
  // BATCH 108 : tab actif (cohérence AdminUsers : Clés / Waitlist / Stats)
  const [activeTab, setActiveTab] = useState<'keys' | 'waitlist' | 'stats'>('keys')
  // BATCH 110 : multi-select pour actions bulk (désactiver/supprimer plusieurs clés)
  const [selectedKeyIds, setSelectedKeyIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<'deactivate' | 'delete' | null>(null)
  const [bulkProcessing, setBulkProcessing] = useState(false)

  // Quota
  const { data: quota } = useQuery<BetaQuota | null>({
    queryKey: ['beta-quota'],
    queryFn: async () => {
      if (!supabase) return null
      const { data } = await supabase
        .from('beta_quota_config')
        .select('current_phase, max_users_total, current_user_count, accepting_new_signups')
        .eq('id', 1)
        .maybeSingle()
      return (data as BetaQuota | null) ?? null
    },
    staleTime: STALE_TIMES.MEDIUM,
  })

  // Liste cles
  const { data: keys = [] } = useQuery<BetaAccessKey[]>({
    queryKey: ['beta-keys'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase
        .from('beta_access_keys')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      return (data ?? []) as unknown as BetaAccessKey[]
    },
    staleTime: STALE_TIMES.MEDIUM,
  })

  // BATCH 107 : Map user_id → profil pour les clés utilisées (afficher qui a utilisé quoi)
  // On groupe les used_by_user_id et on les fetch en un seul query .in('id', ids)
  // pour éviter N+1 requests.
  const { data: keyUsersMap = {} } = useQuery<
    Record<string, { username: string; first_name: string; last_name: string }>
  >({
    queryKey: [
      'beta-keys-users',
      keys
        .map((k) => k.used_by_user_id)
        .filter(Boolean)
        .sort(),
    ],
    queryFn: async () => {
      const userIds = Array.from(
        new Set(keys.map((k) => k.used_by_user_id).filter((id): id is string => !!id)),
      )
      if (!supabase || userIds.length === 0) return {}
      const { data } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name')
        .in('id', userIds)
      const map: Record<string, { username: string; first_name: string; last_name: string }> = {}
      for (const p of data ?? []) {
        map[p.id] = { username: p.username, first_name: p.first_name, last_name: p.last_name }
      }
      return map
    },
    enabled: keys.length > 0,
    staleTime: STALE_TIMES.MEDIUM,
  })

  // Waitlist
  const { data: waitlist = [] } = useQuery<BetaWaitlistEntry[]>({
    queryKey: ['beta-waitlist'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase
        .from('beta_waitlist')
        .select('id, email, motivation, created_at, invited_at')
        .is('invited_at', null)
        .order('created_at', { ascending: true })
        .limit(50)
      return (data ?? []) as unknown as BetaWaitlistEntry[]
    },
    staleTime: STALE_TIMES.LONG,
  })

  // Stats signups 7j (groupes par outcome)
  const { data: signupStats } = useQuery({
    queryKey: ['beta-signup-stats'],
    queryFn: async () => {
      if (!supabase) return null
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('beta_signup_log')
        .select('outcome')
        .gte('created_at', sevenDaysAgo)
      const counts: Record<string, number> = {}
      for (const row of data ?? []) {
        const outcome = (row as { outcome: string }).outcome
        counts[outcome] = (counts[outcome] ?? 0) + 1
      }
      return counts
    },
    staleTime: STALE_TIMES.LONG,
  })

  // Next batch number (max + 1)
  const nextBatch = useMemo(() => {
    if (keys.length === 0) return 1
    return Math.max(...keys.map((k) => k.batch_number)) + 1
  }, [keys])

  async function handleGenerateKeys() {
    if (!supabase || isGenerating) return
    setIsGenerating(true)
    try {
      const { data, error } = await supabase.rpc('generate_beta_keys', {
        p_batch_number: nextBatch,
        p_count: 10,
        p_max_uses: 1,
        p_expires_days: 7,
        p_notes: `Vague ${nextBatch} — ${new Date().toISOString().slice(0, 10)}`,
      })
      if (error) throw error
      toast.success(
        t('admin.beta.generateSuccess', {
          defaultValue: `10 cles generees (vague ${nextBatch})`,
        }),
      )
      queryClient.invalidateQueries({ queryKey: ['beta-keys'] })
      // Log audit (BATCH 36 : via useAdminAction)
      await logAction({
        action: 'beta.key_gen',
        targetType: 'batch',
        metadata: { batch_number: nextBatch, count: 10 },
      })
      // Données loggées dans admin_audit_logs (action: beta.key_gen) — pas besoin de console
      void data
    } catch (err) {
      toast.error(
        t('admin.beta.generateError', { defaultValue: 'Erreur generation cles' }),
        err instanceof Error ? err.message : undefined,
      )
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleDeactivateKey(keyId: string, code: string) {
    if (!supabase) return
    const confirmed = window.confirm(`Desactiver la cle ${code} ?`)
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('beta_access_keys')
        .update({ is_active: false })
        .eq('id', keyId)
      if (error) throw error
      toast.success(t('admin.beta.deactivated', { defaultValue: 'Cle desactivee' }))
      queryClient.invalidateQueries({ queryKey: ['beta-keys'] })
      // Log audit (BATCH 36 : via useAdminAction)
      await logAction({
        action: 'beta.key_deactivate',
        targetType: 'beta_access_key',
        targetId: keyId,
        metadata: { code },
      })
    } catch (err) {
      toast.error(
        t('admin.beta.deactivateError', { defaultValue: 'Erreur desactivation' }),
        err instanceof Error ? err.message : undefined,
      )
    }
  }

  /**
   * BATCH 107 : Suppression réelle d'une clé (DELETE FROM beta_access_keys).
   * À distinguer de handleDeactivateKey qui ne fait qu'un UPDATE is_active = false.
   * Utile pour nettoyer les clés de test/erreur du tableau sans garder de trace.
   * Si la clé a déjà été utilisée, on bloque côté UI (la donnée est liée au signup).
   */
  async function handleDeleteKey() {
    if (!supabase || !keyToDelete) return
    const target = keyToDelete
    try {
      const { error } = await supabase.from('beta_access_keys').delete().eq('id', target.id)
      if (error) throw error
      toast.success(`Clé ${target.code} supprimée`)
      queryClient.invalidateQueries({ queryKey: ['beta-keys'] })
      await logAction({
        action: 'beta.key_delete',
        targetType: 'beta_access_key',
        targetId: target.id,
        metadata: { code: target.code, batch_number: target.batch_number },
      })
    } catch (err) {
      toast.error('Erreur suppression clé', err instanceof Error ? err.message : undefined)
    } finally {
      setKeyToDelete(null)
    }
  }

  async function handleCopyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      toast.success(t('admin.beta.copied', { defaultValue: `Copie : ${code}` }))
    } catch {
      toast.error(t('admin.beta.copyError', { defaultValue: 'Impossible de copier' }))
    }
  }

  // ─── Multi-select bulk actions (BATCH 110) ──────────────────────────────
  /** Toggle sélection d'une clé. Ne fonctionne que pour les clés non utilisées. */
  function toggleKeySelection(keyId: string) {
    setSelectedKeyIds((prev) => {
      const next = new Set(prev)
      if (next.has(keyId)) next.delete(keyId)
      else next.add(keyId)
      return next
    })
  }

  /** Sélectionne / désélectionne toutes les clés sélectionnables (= non utilisées). */
  function toggleAllSelectable() {
    const selectable = keys.filter((k) => k.current_uses < k.max_uses).map((k) => k.id)
    setSelectedKeyIds((prev) => {
      if (selectable.every((id) => prev.has(id))) return new Set()
      return new Set(selectable)
    })
  }

  /**
   * Exécute l'action bulk (désactiver ou supprimer) sur toutes les clés sélectionnées.
   * Loggée individuellement dans l'audit pour traçabilité.
   */
  async function handleBulkConfirm() {
    if (!supabase || selectedKeyIds.size === 0 || !bulkAction) return
    setBulkProcessing(true)
    const ids = Array.from(selectedKeyIds)
    const targetKeys = keys.filter((k) => ids.includes(k.id))
    try {
      if (bulkAction === 'deactivate') {
        const { error } = await supabase
          .from('beta_access_keys')
          .update({ is_active: false })
          .in('id', ids)
        if (error) throw error
        await logAction({
          action: 'beta.key_bulk_deactivate',
          targetType: 'batch',
          metadata: { count: ids.length, codes: targetKeys.map((k) => k.code) },
        })
        toast.success(`${ids.length} clé(s) désactivée(s)`)
      } else {
        const { error } = await supabase.from('beta_access_keys').delete().in('id', ids)
        if (error) throw error
        await logAction({
          action: 'beta.key_bulk_delete',
          targetType: 'batch',
          metadata: { count: ids.length, codes: targetKeys.map((k) => k.code) },
        })
        toast.success(`${ids.length} clé(s) supprimée(s)`)
      }
      setSelectedKeyIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['beta-keys'] })
    } catch (err) {
      toast.error('Erreur action bulk', err instanceof Error ? err.message : undefined)
    } finally {
      setBulkProcessing(false)
      setBulkAction(null)
    }
  }

  // Compte les clés sélectionnables (= non utilisées) pour la checkbox header
  const selectableKeyIds = keys.filter((k) => k.current_uses < k.max_uses).map((k) => k.id)
  const allSelectableSelected =
    selectableKeyIds.length > 0 && selectableKeyIds.every((id) => selectedKeyIds.has(id))

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header (BATCH 107 : bouton à droite pour cohérence avec AdminUsers) ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-foreground">
            {t('admin.beta.title', { defaultValue: 'Gestion beta fermee' })}
          </h1>
          {quota && (
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="px-3 py-1 rounded-full bg-primary-light text-primary font-medium">
                Phase {quota.current_phase}
              </span>
              <span className="text-foreground">
                <strong>{quota.current_user_count}</strong> / {quota.max_users_total} users (
                {Math.round((quota.current_user_count / quota.max_users_total) * 100)}%)
              </span>
              <span
                className={`inline-flex items-center gap-1.5 ${
                  quota.accepting_new_signups
                    ? 'text-[var(--color-success,#16a34a)]'
                    : 'text-[var(--color-error,#dc2626)]'
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    quota.accepting_new_signups
                      ? 'bg-[var(--color-success)]'
                      : 'bg-[var(--color-error)]'
                  }`}
                  aria-hidden="true"
                />
                {quota.accepting_new_signups ? 'Signups ouverts' : 'Signups fermés'}
              </span>
            </div>
          )}
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={handleGenerateKeys}
          disabled={isGenerating}
          icon={
            isGenerating ? (
              <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )
          }
        >
          {isGenerating ? 'Génération…' : `Générer 10 clés (vague ${nextBatch})`}
        </Button>
      </div>

      {/* ── BATCH 108 : Tabs pour cohérence avec AdminUsers (Clés / Waitlist / Stats) ── */}
      <div
        role="tablist"
        aria-label="Sections beta"
        className="flex items-center gap-1 border-b border-[var(--color-border)] overflow-x-auto"
      >
        {[
          { key: 'keys' as const, label: "Clés d'accès", icon: Key, count: keys.length },
          {
            key: 'waitlist' as const,
            label: 'Waitlist',
            icon: Mail,
            count: waitlist.length,
          },
          { key: 'stats' as const, label: 'Statistiques', icon: BarChart3, count: null },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-action-default)] whitespace-nowrap ${
                isActive
                  ? 'border-[var(--color-action-default)] text-[var(--color-action-default)]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {tab.label}
              {tab.count !== null && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-[var(--color-action-default)]/10 text-[var(--color-action-default)]'
                      : 'bg-[var(--color-bg-secondary)] text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── BATCH 110 : Barre d'actions bulk (visible si au moins 1 clé sélectionnée) ── */}
      {activeTab === 'keys' && selectedKeyIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-primary-light/30 border border-primary/30 rounded-lg">
          <p className="text-sm font-medium text-foreground">
            <span className="font-bold tabular-nums">{selectedKeyIds.size}</span> clé(s)
            sélectionnée(s)
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSelectedKeyIds(new Set())}>
              Annuler la sélection
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBulkAction('deactivate')}
              icon={<X className="size-3.5" aria-hidden="true" />}
            >
              Désactiver
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setBulkAction('delete')}
              icon={<Trash2 className="size-3.5" aria-hidden="true" />}
            >
              Supprimer
            </Button>
          </div>
        </div>
      )}

      {/* ── Tab : Clés d'accès ─────────────────────────────────── */}
      {activeTab === 'keys' && (
        <section className="bg-background border border-border rounded-lg overflow-hidden">
          {keys.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Aucune clé générée. Clique "Générer 10 clés" pour démarrer la vague 1.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground tracking-wider bg-[var(--color-bg-secondary)]/50">
                  <tr>
                    {/* BATCH 110 : checkbox header pour tout sélectionner */}
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelectableSelected}
                        onChange={toggleAllSelectable}
                        aria-label="Tout sélectionner"
                        disabled={selectableKeyIds.length === 0}
                        className="size-4 rounded border-border accent-[var(--color-action-default)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </th>
                    <th className="text-left px-5 py-3 font-semibold">Code</th>
                    <th className="text-left px-5 py-3 font-semibold">Batch</th>
                    <th className="text-left px-5 py-3 font-semibold">Statut</th>
                    <th className="text-left px-5 py-3 font-semibold">Utilisateur</th>
                    <th className="text-left px-5 py-3 font-semibold">Expire</th>
                    <th className="text-right px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k, idx) => {
                    const status = keyStatus(k)
                    const usedBy = k.used_by_user_id ? keyUsersMap[k.used_by_user_id] : null
                    const isUsed = k.current_uses >= k.max_uses
                    const isSelected = selectedKeyIds.has(k.id)
                    return (
                      <tr
                        key={k.id}
                        className={`border-t border-border/40 transition-colors hover:bg-[var(--color-bg-secondary)]/60 ${
                          isSelected
                            ? 'bg-primary-light/20'
                            : idx % 2 === 1
                              ? 'bg-[var(--color-bg-secondary)]/20'
                              : ''
                        }`}
                      >
                        {/* BATCH 110 : checkbox de sélection par ligne (uniquement non utilisées) */}
                        <td className="px-3 py-3 w-10">
                          {!isUsed ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleKeySelection(k.id)}
                              aria-label={`Sélectionner ${k.code}`}
                              className="size-4 rounded border-border accent-[var(--color-action-default)] cursor-pointer"
                            />
                          ) : (
                            <span
                              className="text-muted-foreground"
                              title="Clé utilisée — non sélectionnable"
                            >
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-foreground">{k.code}</td>
                        <td className="px-5 py-3 text-muted-foreground">#{k.batch_number}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.badgeClass}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        {/* BATCH 107 : utilisateur ayant consommé la clé (si used) */}
                        <td className="px-5 py-3 text-xs">
                          {usedBy ? (
                            <Link
                              to={`/profile/${usedBy.username}`}
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                              title={`${usedBy.first_name} ${usedBy.last_name}`}
                            >
                              @{usedBy.username}
                              <ExternalLink className="size-3 opacity-60" aria-hidden="true" />
                            </Link>
                          ) : isUsed && k.used_by_user_id ? (
                            <span className="text-muted-foreground italic">
                              utilisateur supprimé
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {formatRelativeDate(k.expires_at)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopyCode(k.code)}
                              aria-label={`Copier ${k.code}`}
                              className="size-8 inline-flex items-center justify-center rounded-full hover:bg-[var(--color-bg-secondary)] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <Copy className="size-4" aria-hidden="true" />
                            </button>
                            {k.is_active && !isUsed && (
                              <button
                                type="button"
                                onClick={() => handleDeactivateKey(k.id, k.code)}
                                aria-label={`Désactiver ${k.code}`}
                                title="Désactiver (conserve la trace)"
                                className="size-8 inline-flex items-center justify-center rounded-full hover:bg-[var(--color-warning-bg)] text-muted-foreground hover:text-[var(--color-warning)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-warning)]"
                              >
                                <X className="size-4" aria-hidden="true" />
                              </button>
                            )}
                            {/* BATCH 107 : suppression réelle (DELETE).
                              Bloquée si la clé a déjà été utilisée pour préserver l'audit. */}
                            {!isUsed && (
                              <button
                                type="button"
                                onClick={() => setKeyToDelete(k)}
                                aria-label={`Supprimer ${k.code}`}
                                title="Supprimer définitivement"
                                className="size-8 inline-flex items-center justify-center rounded-full hover:bg-[var(--color-error-bg)] text-muted-foreground hover:text-[var(--color-error)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)]"
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── Tab : Waitlist (BATCH 108 : refonte en tableau, cohérent avec Clés) ── */}
      {activeTab === 'waitlist' && (
        <section className="bg-background border border-border rounded-lg overflow-hidden">
          {waitlist.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Waitlist vide — personne n'attend de clé pour le moment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground tracking-wider bg-[var(--color-bg-secondary)]/50">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold">Email</th>
                    <th className="text-left px-5 py-3 font-semibold">Motivation</th>
                    <th className="text-left px-5 py-3 font-semibold">Inscrit</th>
                    <th className="text-right px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.map((entry, idx) => (
                    <tr
                      key={entry.id}
                      className={`border-t border-border/40 transition-colors hover:bg-[var(--color-bg-secondary)]/60 ${
                        idx % 2 === 1 ? 'bg-[var(--color-bg-secondary)]/20' : ''
                      }`}
                    >
                      <td className="px-5 py-3 text-foreground font-medium">{entry.email}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground max-w-md">
                        {entry.motivation ? (
                          <span className="line-clamp-2" title={entry.motivation}>
                            « {entry.motivation} »
                          </span>
                        ) : (
                          <span className="italic">aucune</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeDate(entry.created_at)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Copier l'email pour invitation manuelle (mailto:) */}
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(entry.email)
                                toast.success(`Email copié : ${entry.email}`)
                              } catch {
                                toast.error('Impossible de copier')
                              }
                            }}
                            aria-label={`Copier l'email ${entry.email}`}
                            title="Copier l'email"
                            className="size-8 inline-flex items-center justify-center rounded-full hover:bg-[var(--color-bg-secondary)] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Copy className="size-4" aria-hidden="true" />
                          </button>
                          {/* Ouvrir un mailto avec template d'invitation */}
                          <a
                            href={`mailto:${entry.email}?subject=${encodeURIComponent('Ton accès Naturegraph est prêt')}&body=${encodeURIComponent("Bonjour,\n\nMerci pour ton intérêt pour Naturegraph !\n\nVoici ta clé d'accès beta : [INSÉRER LA CLÉ DEPUIS L'ONGLET CLÉS]\n\nÀ très vite sur la plateforme,\nL'équipe Naturegraph")}`}
                            aria-label={`Envoyer un email à ${entry.email}`}
                            title="Envoyer une invitation par email"
                            className="size-8 inline-flex items-center justify-center rounded-full hover:bg-primary-light text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Mail className="size-4" aria-hidden="true" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* BATCH 107 : Modal de confirmation pour la suppression définitive d'une clé.
          Action irréversible : DELETE FROM beta_access_keys WHERE id = X. */}
      {keyToDelete && (
        <ConfirmModal
          title={`Supprimer définitivement la clé ${keyToDelete.code} ?`}
          description="Cette action est irréversible. La clé sera supprimée du tableau et de l'audit. À utiliser uniquement pour nettoyer des clés générées par erreur. Pour conserver la trace, préférer 'Désactiver'."
          confirmLabel="Supprimer définitivement"
          variant="danger"
          onCancel={() => setKeyToDelete(null)}
          onConfirm={handleDeleteKey}
        />
      )}

      {/* BATCH 110 : Modal de confirmation pour les actions bulk (désactiver/supprimer en masse) */}
      {bulkAction && (
        <ConfirmModal
          title={
            bulkAction === 'delete'
              ? `Supprimer ${selectedKeyIds.size} clé(s) définitivement ?`
              : `Désactiver ${selectedKeyIds.size} clé(s) ?`
          }
          description={
            bulkAction === 'delete'
              ? 'Action irréversible. Les clés seront supprimées du tableau et de l\'audit. Préférer "Désactiver" pour conserver la trace.'
              : "Les clés seront marquées comme inactives. Elles ne pourront plus être utilisées pour s'inscrire mais resteront visibles dans le tableau et l'audit."
          }
          confirmLabel={
            bulkAction === 'delete'
              ? `Supprimer ${selectedKeyIds.size} clé(s)`
              : `Désactiver ${selectedKeyIds.size} clé(s)`
          }
          variant={bulkAction === 'delete' ? 'danger' : 'default'}
          confirmDisabled={bulkProcessing}
          onCancel={() => setBulkAction(null)}
          onConfirm={handleBulkConfirm}
        />
      )}

      {/* ── Tab : Statistiques (BATCH 108 : section dédiée avec interprétation) ── */}
      {activeTab === 'stats' && (
        <section className="bg-background border border-border rounded-lg p-5 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-foreground inline-flex items-center gap-2">
              <BarChart3 className="size-4" aria-hidden="true" />
              Tentatives de signups (7 derniers jours)
            </h2>
            <p className="text-xs text-muted-foreground">
              Mesure le pipeline beta : combien tentent, combien réussissent, et où ça casse.
            </p>
          </div>

          {!signupStats || Object.keys(signupStats).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucune tentative enregistrée cette semaine.
            </p>
          ) : (
            <>
              {(() => {
                const total = Object.values(signupStats).reduce((sum, n) => sum + n, 0)
                const success = signupStats['success'] ?? 0
                const conversionRate = total > 0 ? Math.round((success / total) * 100) : 0
                return (
                  <>
                    {/* Score global */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-[var(--color-bg-secondary)]/40 rounded-lg p-4 flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">
                          Total
                        </span>
                        <span className="text-2xl font-bold text-foreground">{total}</span>
                      </div>
                      <div className="bg-[var(--color-success-bg)] rounded-lg p-4 flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wider text-[var(--color-success)]">
                          Succès
                        </span>
                        <span className="text-2xl font-bold text-[var(--color-success)]">
                          {success}
                        </span>
                      </div>
                      <div className="bg-[var(--color-error-bg)] rounded-lg p-4 flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wider text-[var(--color-error)]">
                          Échecs
                        </span>
                        <span className="text-2xl font-bold text-[var(--color-error)]">
                          {total - success}
                        </span>
                      </div>
                      <div className="bg-primary-light rounded-lg p-4 flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wider text-primary">
                          Conversion
                        </span>
                        <span className="text-2xl font-bold text-primary">{conversionRate}%</span>
                      </div>
                    </div>

                    {/* Breakdown par outcome avec bar visuelle */}
                    <div className="flex flex-col gap-2">
                      <h3 className="text-sm font-semibold text-foreground">Détail par issue</h3>
                      <ul className="flex flex-col gap-2">
                        {Object.entries(signupStats)
                          .sort(([, a], [, b]) => b - a)
                          .map(([outcome, count]) => {
                            const pct = total > 0 ? (count / total) * 100 : 0
                            const isSuccess = outcome === 'success'
                            return (
                              <li key={outcome} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-foreground capitalize">
                                    {outcome.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-muted-foreground tabular-nums">
                                    {count} ({Math.round(pct)}%)
                                  </span>
                                </div>
                                {/* Bar CSS pure (éco-conception : aucun lib graph) */}
                                <div
                                  className="h-2 rounded-full bg-[var(--color-bg-secondary)] overflow-hidden"
                                  role="progressbar"
                                  aria-valuenow={count}
                                  aria-valuemin={0}
                                  aria-valuemax={total}
                                  aria-label={`${outcome} : ${count} sur ${total}`}
                                >
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      isSuccess
                                        ? 'bg-[var(--color-success)]'
                                        : 'bg-[var(--color-error)]'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </li>
                            )
                          })}
                      </ul>
                    </div>
                  </>
                )
              })()}
            </>
          )}
        </section>
      )}
    </div>
  )
}
