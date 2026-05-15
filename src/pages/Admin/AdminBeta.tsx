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
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Key, Plus, Copy, Mail, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
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
      console.info('[admin] generated keys', data)
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

  async function handleCopyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      toast.success(t('admin.beta.copied', { defaultValue: `Copie : ${code}` }))
    } catch {
      toast.error(t('admin.beta.copyError', { defaultValue: 'Impossible de copier' }))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header + Quota ───────────────────────────────────────── */}
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
              className={
                quota.accepting_new_signups
                  ? 'text-[var(--color-success,#16a34a)]'
                  : 'text-[var(--color-error,#dc2626)]'
              }
            >
              {quota.accepting_new_signups ? '🟢 Accepting signups' : '🔴 Closed'}
            </span>
          </div>
        )}
      </div>

      {/* ── Actions ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" size="md" onClick={handleGenerateKeys} disabled={isGenerating}>
          {isGenerating ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
              Generation...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Plus className="size-4" aria-hidden="true" />
              Generer 10 cles (vague {nextBatch})
            </span>
          )}
        </Button>
      </div>

      {/* ── Cles ────────────────────────────────────────────────── */}
      <section className="bg-background border border-border rounded-lg overflow-hidden">
        <header className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground inline-flex items-center gap-2">
            <Key className="size-4" aria-hidden="true" />
            Cles d'acces ({keys.length})
          </h2>
        </header>
        {keys.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Aucune clé générée. Clique "Générer 10 clés" pour démarrer la vague 1.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground tracking-wider bg-[var(--color-bg-secondary)]/50">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Code</th>
                  <th className="text-left px-5 py-3 font-semibold">Batch</th>
                  <th className="text-left px-5 py-3 font-semibold">Statut</th>
                  <th className="text-left px-5 py-3 font-semibold">Expire</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k, idx) => {
                  const status = keyStatus(k)
                  return (
                    <tr
                      key={k.id}
                      className={`border-t border-border/40 transition-colors hover:bg-[var(--color-bg-secondary)]/60 ${
                        idx % 2 === 1 ? 'bg-[var(--color-bg-secondary)]/20' : ''
                      }`}
                    >
                      <td className="px-5 py-3 font-mono text-xs text-foreground">{k.code}</td>
                      <td className="px-5 py-3 text-muted-foreground">#{k.batch_number}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.badgeClass}`}
                        >
                          {status.label}
                        </span>
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
                          {k.is_active && k.current_uses < k.max_uses && (
                            <button
                              type="button"
                              onClick={() => handleDeactivateKey(k.id, k.code)}
                              aria-label={`Désactiver ${k.code}`}
                              className="size-8 inline-flex items-center justify-center rounded-full hover:bg-[var(--color-error-bg)] text-muted-foreground hover:text-[var(--color-error)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)]"
                            >
                              <X className="size-4" aria-hidden="true" />
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

      {/* ── Waitlist ────────────────────────────────────────────── */}
      <section className="bg-background border border-border rounded-lg overflow-hidden">
        <header className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground inline-flex items-center gap-2">
            <Mail className="size-4" aria-hidden="true" />
            Waitlist ({waitlist.length})
          </h2>
        </header>
        {waitlist.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">🟢 Waitlist vide.</p>
        ) : (
          <ul className="divide-y divide-border">
            {waitlist.map((entry) => (
              <li key={entry.id} className="px-5 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{entry.email}</p>
                  {entry.motivation && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      "{entry.motivation}"
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Inscrit {formatRelativeDate(entry.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Stats signups 7j ──────────────────────────────────── */}
      {signupStats && (
        <section className="bg-background border border-border rounded-lg p-5">
          <h2 className="text-base font-semibold text-foreground mb-3">
            Tentatives signups (7 derniers jours)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {Object.entries(signupStats).map(([outcome, count]) => (
              <div
                key={outcome}
                className="flex items-center justify-between p-3 bg-muted/30 rounded"
              >
                <span className="text-muted-foreground capitalize">
                  {outcome.replace(/_/g, ' ')}
                </span>
                <span className="font-bold text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
