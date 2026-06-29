/**
 * AdminBeta, Module 4 : Prelancement (ex gestion beta fermee)
 *
 * Refs : ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md v2.0 Module 4 + BATCH 32
 *
 * Fonctionnalites :
 *   - Vue d'ensemble : phase actuelle + quota + status accepting
 *   - Liste cles : code, batch, status, used_by, expires_at, actions
 *   - Generation cles : modal "Generer X cles (vague N)" -> RPC generate_beta_keys
 *   - Waitlist : suivi complet de chaque inscrit (En attente → Invité →
 *     Inscrit), invitation/renvoi via Supabase Auth, statut d'envoi
 *   - Stats signups : success/echec breakdown 7j
 */

import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Key,
  Plus,
  Copy,
  Mail,
  X,
  Loader2,
  Trash2,
  ExternalLink,
  BarChart3,
  Eye,
  Send,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/contexts/ToastContext'
import { useAdminAction } from '@/hooks/useAdminAction'
import { useBetaAccess } from '@/hooks/useBetaAccess'
import { STALE_TIMES } from '@/constants/reactQuery'
import {
  sendBetaInvite,
  importPrelaunchEmails,
  type BetaInviteResult,
} from '@/services/betaService'

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
  /** Nombre d'invitations envoyées avec succès (renvois inclus). */
  invite_count: number
  /** Résultat du dernier envoi d'invitation. */
  email_status: 'sent' | 'failed' | null
  /** Détail de l'échec du dernier envoi (NULL si OK). */
  email_error: string | null
  /** Origine : 'organic' (formulaire public) ou 'prelaunch' (cohorte cible). */
  source: string
  /** Numéro de vague d'envoi (NULL tant que pas invité). */
  wave: number | null
}

/** Profil minimal d'un inscrit, pour relier une entrée waitlist à son compte. */
interface RegisteredProfile {
  id: string
  username: string
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

/**
 * Statut de suivi d'une entrée waitlist, dérivé de son état réel :
 *   - Inscrit       : compte créé ET onboarding terminé (priorité absolue)
 *   - Échec d'envoi : le dernier email d'invitation n'est pas parti
 *   - En cours      : compte créé mais inscription pas finalisée (onboarding
 *                     inachevé, pseudo auto "user_xxxx")
 *   - Invité        : email envoyé, en attente de création de compte
 *   - En attente    : sur la liste, pas encore invité
 *
 * `isRegistered` / `isOnboarding` sont calculés par jointure profiles.email =
 * waitlist.email : la source de vérité est l'existence du compte et l'état de
 * son pseudo, jamais une colonne stockée.
 */
function waitlistStatus(
  entry: BetaWaitlistEntry,
  isRegistered: boolean,
  isOnboarding: boolean,
): { label: string; badgeClass: string } {
  if (isRegistered)
    return {
      label: 'Inscrit',
      badgeClass: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
    }
  if (entry.email_status === 'failed')
    return {
      label: "Échec d'envoi",
      badgeClass: 'bg-[var(--color-error-bg)] text-[var(--color-error)]',
    }
  if (isOnboarding)
    return {
      label: 'En cours',
      badgeClass: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
    }
  if (entry.invited_at)
    return {
      label: 'Invité',
      badgeClass: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
    }
  return {
    label: 'En attente',
    badgeClass: 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]',
  }
}

/**
 * Traduit la raison d'échec d'une invitation en message actionnable pour le
 * super admin (affiché dans le toast d'erreur).
 */
function inviteErrorMessage(result: BetaInviteResult): string {
  switch (result.reason) {
    case 'already_member':
      return 'Cette personne a déjà un compte actif sur Naturegraph.'
    case 'rate_limited':
      return "Trop d'envois en peu de temps, réessaie dans quelques minutes."
    case 'not_admin':
      return 'Droits admin insuffisants, reconnecte-toi.'
    case 'waitlist_not_found':
      return "L'entrée waitlist est introuvable (déjà supprimée ?)."
    case 'invite_error':
      return "Supabase n'a pas pu envoyer l'email d'invitation. Réessaie dans un instant."
    default:
      return 'Erreur serveur inconnue. Réessaie dans un instant.'
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AdminBeta() {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  // BATCH 36 : hook centralise pour audit log (DRY, strategy ligne 562).
  // useIsAdmin n'est plus necessaire ici car useAdminAction l'utilise en interne.
  const { logAction } = useAdminAction()
  // Nicolas 2026-05-19 : permet au super admin de revoir la welcome screen
  // comme s'il découvrait le produit (clear le localStorage + redirect /welcome).
  const { revokeAccess } = useBetaAccess()
  // BATCH 107 : modale double-confirmation pour suppression réelle
  const [keyToDelete, setKeyToDelete] = useState<BetaAccessKey | null>(null)
  // BATCH 108 : tab actif (cohérence AdminUsers : Clés / Waitlist / Stats)
  const [activeTab, setActiveTab] = useState<'keys' | 'waitlist' | 'stats'>('keys')
  // BATCH 110 : multi-select pour actions bulk (désactiver/supprimer plusieurs clés)
  const [selectedKeyIds, setSelectedKeyIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<'deactivate' | 'delete' | null>(null)
  const [bulkProcessing, setBulkProcessing] = useState(false)
  // Nicolas 2026-05-20 : invitation / renvoi d'une entrée waitlist.
  // - waitlistToDelete : entrée à supprimer (ConfirmModal)
  // - processingId : id de l'entrée dont l'invitation part (spinner sur la
  //   bonne ligne ; couvre l'invitation initiale ET le renvoi)
  const [waitlistToDelete, setWaitlistToDelete] = useState<BetaWaitlistEntry | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  // Cohorte prelancement (Nicolas 2026-06-24) :
  // - sourceFilter : filtre la vue waitlist (Tous / Organique / Prelancement)
  // - import : modale de collage d'emails -> cohorte prelancement (dedup + exclusion comptes)
  // - waveSending : envoi de la prochaine vague de 20 en cours
  const [sourceFilter, setSourceFilter] = useState<'all' | 'organic' | 'prelaunch'>('all')
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [waveSending, setWaveSending] = useState(false)
  // Taille d'une vague d'envoi (Nicolas : 20 mails tous les 2 jours).
  const WAVE_SIZE = 20

  // Quota, Nicolas 2026-05-24 : `current_user_count` stale en DB (pas
  // de trigger pour le maintenir à jour) → on récupère le vrai compteur
  // de profils en parallèle et on l'utilise comme source de vérité.
  const { data: quota } = useQuery<BetaQuota | null>({
    queryKey: ['beta-quota'],
    queryFn: async () => {
      if (!supabase) return null
      const [{ data: config }, { count: realUserCount }] = await Promise.all([
        supabase
          .from('beta_quota_config')
          .select('current_phase, max_users_total, accepting_new_signups')
          .eq('id', 1)
          .maybeSingle(),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ])
      if (!config) return null
      return {
        ...(config as Omit<BetaQuota, 'current_user_count'>),
        current_user_count: realUserCount ?? 0,
      } as BetaQuota
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

  // BATCH 107 + Nicolas 2026-05-19 : Map user_id → profil COMPLET pour les clés utilisées.
  // Inclut email + username + first_name + last_name pour permettre au super admin
  // d'identifier qui a consommé chaque clé et de contacter la personne en cas d'erreur
  // (mailto: link dans la colonne "Utilisateur"). On groupe en un seul query .in('id', ids)
  // pour éviter N+1 requests.
  const { data: keyUsersMap = {} } = useQuery<
    Record<
      string,
      { username: string; first_name: string; last_name: string; email: string | null }
    >
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
        .select('id, username, first_name, last_name, email')
        .in('id', userIds)
      const map: Record<
        string,
        { username: string; first_name: string; last_name: string; email: string | null }
      > = {}
      for (const p of data ?? []) {
        map[p.id] = {
          username: p.username,
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email ?? null,
        }
      }
      return map
    },
    enabled: keys.length > 0,
    staleTime: STALE_TIMES.MEDIUM,
  })

  // Nicolas 2026-05-21 : pré-association clé ↔ destinataire AVANT consommation.
  // Beaucoup de clés sont créées pour une personne précise (invitation waitlist,
  // clé admin perpétuelle) mais ne sont pas encore consommées (`used_by_user_id`
  // est NULL). Le super admin doit voir à qui chaque clé est destinée pour le
  // suivi support, sinon la colonne reste vide en attendant la 1ʳᵉ connexion.
  //
  // Sources de vérité (par ordre de priorité) :
  //   1. used_by_user_id présent  → profil consommateur (keyUsersMap)
  //   2. notes "Invitation waitlist: <email>" → invité (cherche le profil si déjà
  //      inscrit, sinon affiche l'email seul + statut "en attente")
  //   3. notes contient "admin perpétuelle" ou "super admin" → super admin
  //      (lookup via super_admin role dans admin_users si dispo, sinon affiche
  //      le label "Admin permanent")
  //   4. sinon : clé de batch générique → "-"
  //
  // Le parsing du `notes` est volontairement simple (regex sur le texte écrit
  // par `send-beta-invite` et la doc admin). On accepte un peu de fragilité ici
  // pour éviter d'ajouter une colonne `assigned_to_email` à la table beta_access_keys.

  /** Extrait l'email d'un `notes` de type "Invitation waitlist: foo@bar.com". */
  function parseInviteEmail(notes: string | null): string | null {
    if (!notes) return null
    const m = notes.match(/Invitation waitlist:\s*([^\s,]+)/i)
    return m ? m[1].toLowerCase() : null
  }

  /** Heuristique : la clé est-elle marquée comme admin perpétuel dans `notes` ? */
  function isAdminPerpetualNote(notes: string | null): boolean {
    if (!notes) return false
    return /admin\s+perp[eé]tuelle|super\s+admin|admin\s+permanent/i.test(notes)
  }

  // Map email (lowercased) → profil minimal, utilisé pour résoudre les invités
  // déjà inscrits ET le profil de l'admin perpétuel.
  const { data: emailToProfile = {} } = useQuery<
    Record<string, { id: string; username: string; first_name: string; last_name: string }>
  >({
    queryKey: ['beta-keys-assigned-emails', keys.map((k) => k.notes ?? '').sort()],
    queryFn: async () => {
      const emails = Array.from(
        new Set(keys.map((k) => parseInviteEmail(k.notes)).filter((e): e is string => !!e)),
      )
      if (!supabase || emails.length === 0) return {}
      const { data } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, email')
        .in('email', emails)
      const map: Record<
        string,
        { id: string; username: string; first_name: string; last_name: string }
      > = {}
      for (const p of data ?? []) {
        if (p.email) {
          map[p.email.toLowerCase()] = {
            id: p.id,
            username: p.username,
            first_name: p.first_name,
            last_name: p.last_name,
          }
        }
      }
      return map
    },
    enabled: keys.length > 0,
    staleTime: STALE_TIMES.MEDIUM,
  })

  // Profil du super admin courant (Nicolas), utilisé pour afficher l'auteur
  // sur la clé admin perpétuelle quand `notes` la désigne.
  const { data: superAdminProfile = null } = useQuery<{
    id: string
    username: string
    first_name: string
    last_name: string
    email: string | null
  } | null>({
    queryKey: ['beta-super-admin-profile'],
    queryFn: async () => {
      if (!supabase) return null
      const { data: auth } = await supabase.auth.getUser()
      if (!auth?.user?.id) return null
      const { data } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, email')
        .eq('id', auth.user.id)
        .maybeSingle()
      return (
        (data as {
          id: string
          username: string
          first_name: string
          last_name: string
          email: string | null
        } | null) ?? null
      )
    },
    staleTime: STALE_TIMES.LONG,
  })

  // Waitlist, TOUTES les entrées (Nicolas 2026-05-20 : ne plus masquer les
  // invités via `.is('invited_at', null)`). Le statut de suivi est dérivé au
  // rendu (cf. helper `waitlistStatus`), l'entrée reste visible de bout en bout.
  const { data: waitlist = [] } = useQuery<BetaWaitlistEntry[]>({
    queryKey: ['beta-waitlist'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase
        .from('beta_waitlist')
        .select(
          'id, email, motivation, created_at, invited_at, invite_count, email_status, email_error, source, wave',
        )
        .order('created_at', { ascending: true })
        .limit(200)
      return (data ?? []) as unknown as BetaWaitlistEntry[]
    },
    staleTime: STALE_TIMES.LONG,
  })

  // Détection des inscrits : un email de la waitlist qui possède un profil =
  // la personne a créé son compte. Jointure par email, source de vérité
  // unique, pas de colonne de suivi à maintenir. Map clé = email en minuscule.
  const { data: registeredByEmail = {} } = useQuery<Record<string, RegisteredProfile>>({
    queryKey: ['beta-waitlist-registered', waitlist.map((w) => w.email).sort()],
    queryFn: async () => {
      const emails = waitlist.map((w) => w.email.toLowerCase())
      if (!supabase || emails.length === 0) return {}
      const { data } = await supabase
        .from('profiles')
        .select('id, username, email')
        .in('email', emails)
      const map: Record<string, RegisteredProfile> = {}
      for (const p of data ?? []) {
        if (p.email) map[p.email.toLowerCase()] = { id: p.id, username: p.username }
      }
      return map
    },
    enabled: waitlist.length > 0,
    staleTime: STALE_TIMES.MEDIUM,
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

  /**
   * Nicolas 2026-05-20 : envoie (ou renvoie) l'invitation beta via l'Edge
   * Function `send-beta-invite`. Côté serveur, Supabase Auth envoie lui-même
   * l'email d'invitation, le même canal que les emails de login.
   *
   * Un seul handler pour l'invitation initiale et le renvoi : c'est la même
   * opération (le serveur régénère l'invitation en attente si besoin). Le
   * retour envoyé / échoué est remonté dans un toast explicite.
   */
  async function handleInvite(entry: BetaWaitlistEntry) {
    if (processingId) return
    setProcessingId(entry.id)
    const isResend = !!entry.invited_at
    try {
      const result = await sendBetaInvite(entry.id)
      queryClient.invalidateQueries({ queryKey: ['beta-waitlist'] })

      if (result.sent) {
        toast.success(
          isResend ? `Invitation renvoyée à ${entry.email}` : `Invitation envoyée à ${entry.email}`,
          "Supabase a transmis l'email d'invitation (lien d'activation).",
        )
      } else {
        toast.error(`Invitation non envoyée, ${entry.email}`, inviteErrorMessage(result))
      }

      // Audit log fire-and-forget (ne bloque pas l'UX).
      logAction({
        action: isResend ? 'beta.waitlist_resend' : 'beta.waitlist_invite',
        targetType: 'beta_waitlist',
        targetId: entry.id,
        metadata: { email: entry.email, sent: result.sent, reason: result.reason ?? null },
      }).catch((e) => console.warn('[admin] audit log failed:', e))
    } finally {
      setProcessingId(null)
    }
  }

  /**
   * Nicolas 2026-05-19 : supprime une entrée de la waitlist (DELETE).
   * Utile pour nettoyer les doublons ou les emails invalides.
   */
  async function handleDeleteWaitlistEntry() {
    if (!supabase || !waitlistToDelete) return
    const target = waitlistToDelete
    try {
      // .select() après .delete() permet de récupérer les rows supprimées et
      // de détecter un échec silencieux (RLS qui bloque sans throw, bug
      // Nicolas 2026-05-24 où l'entrée réapparaissait dans le tableau).
      const { data, error } = await supabase
        .from('beta_waitlist')
        .delete()
        .eq('id', target.id)
        .select()
      if (error) throw error
      if (!data || data.length === 0) {
        // Échec silencieux RLS, surfacer le problème explicitement.
        throw new Error(
          "Suppression refusée par la base de données (politique d'accès). " +
            'Vérifie que tu es admin et que la migration RLS DELETE est appliquée.',
        )
      }
      toast.success(`Entrée ${target.email} supprimée de la waitlist`)
      await logAction({
        action: 'beta.waitlist_delete',
        targetType: 'beta_waitlist',
        targetId: target.id,
        metadata: { email: target.email },
      })
      queryClient.invalidateQueries({ queryKey: ['beta-waitlist'] })
    } catch (err) {
      toast.error('Erreur suppression', err instanceof Error ? err.message : undefined)
    } finally {
      setWaitlistToDelete(null)
    }
  }

  // ─── Cohorte prelancement (Nicolas 2026-06-24) ──────────────────────────

  /** Vue waitlist filtree par source (Tous / Organique / Prelancement). */
  const filteredWaitlist = useMemo(
    () => (sourceFilter === 'all' ? waitlist : waitlist.filter((w) => w.source === sourceFilter)),
    [waitlist, sourceFilter],
  )
  const prelaunchCount = useMemo(
    () => waitlist.filter((w) => w.source === 'prelaunch').length,
    [waitlist],
  )

  /** True si l'entree correspond a un compte pleinement inscrit (onboarding fini). */
  function isEntryFullyRegistered(entry: BetaWaitlistEntry): boolean {
    const reg = registeredByEmail[entry.email.toLowerCase()]
    if (!reg) return false
    // Pseudo auto "user_xxxx" = compte cree mais onboarding non termine.
    return !/^user_[0-9a-f]+$/i.test(reg.username)
  }

  /**
   * Importe des emails colles par l'admin dans la cohorte prelancement.
   * Dedup + exclusion des emails ayant deja un compte (cf. importPrelaunchEmails).
   */
  async function handleImportPrelaunch() {
    if (importing) return
    const emails = importText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (emails.length === 0) {
      toast.error('Aucun email a importer')
      return
    }
    setImporting(true)
    try {
      const res = await importPrelaunchEmails(emails)
      toast.success(
        `${res.added} email(s) ajoute(s) a la cohorte prelancement`,
        `Ignores : ${res.skippedDuplicate} doublon(s), ${res.skippedHasAccount} avec compte, ${res.invalid} invalide(s).`,
      )
      await logAction({
        action: 'beta.prelaunch_import',
        targetType: 'batch',
        metadata: {
          added: res.added,
          skipped_duplicate: res.skippedDuplicate,
          skipped_has_account: res.skippedHasAccount,
          invalid: res.invalid,
          total: res.total,
        },
      })
      queryClient.invalidateQueries({ queryKey: ['beta-waitlist'] })
      setImportText('')
      setImportOpen(false)
      setSourceFilter('prelaunch')
    } catch (err) {
      toast.error('Erreur import', err instanceof Error ? err.message : undefined)
    } finally {
      setImporting(false)
    }
  }

  /**
   * Bascule en cohorte prelancement les inscriptions waitlist organiques NON
   * terminees (pas de compte, ou onboarding inacheve). Aucune suppression :
   * on change juste `source` (l'entree quitte la vue organique pour la cohorte).
   */
  async function handleTagIncompleteAsPrelaunch() {
    if (!supabase) return
    const ids = waitlist
      .filter((w) => w.source !== 'prelaunch' && !isEntryFullyRegistered(w))
      .map((w) => w.id)
    if (ids.length === 0) {
      toast.error('Aucune inscription non terminee a basculer')
      return
    }
    if (!window.confirm(`Basculer ${ids.length} inscription(s) non terminee(s) en prelancement ?`))
      return
    try {
      const { error } = await supabase
        .from('beta_waitlist')
        .update({ source: 'prelaunch' })
        .in('id', ids)
      if (error) throw error
      await logAction({
        action: 'beta.prelaunch_tag_incomplete',
        targetType: 'batch',
        metadata: { count: ids.length },
      })
      toast.success(`${ids.length} inscription(s) basculee(s) en prelancement`)
      queryClient.invalidateQueries({ queryKey: ['beta-waitlist'] })
      setSourceFilter('prelaunch')
    } catch (err) {
      toast.error('Erreur bascule', err instanceof Error ? err.message : undefined)
    }
  }

  /**
   * Invite la prochaine vague (20 par defaut) de la cohorte prelancement :
   * les contacts prelancement pas encore invites et sans compte, par ordre
   * d'anciennete. Chaque envoi reussi est estampille du numero de vague.
   */
  async function handleInviteNextWave() {
    if (!supabase || waveSending) return
    const maxWave = waitlist.reduce((m, w) => (w.wave && w.wave > m ? w.wave : m), 0)
    const nextWave = maxWave + 1
    const candidates = waitlist
      .filter(
        (w) =>
          w.source === 'prelaunch' && !w.invited_at && !registeredByEmail[w.email.toLowerCase()],
      )
      .slice(0, WAVE_SIZE)
    if (candidates.length === 0) {
      toast.error('Aucun contact prelancement a inviter (tous invites ou inscrits)')
      return
    }
    setWaveSending(true)
    let sent = 0
    let failed = 0
    try {
      for (const entry of candidates) {
        const result = await sendBetaInvite(entry.id)
        if (result.sent) {
          sent++
          await supabase.from('beta_waitlist').update({ wave: nextWave }).eq('id', entry.id)
        } else {
          failed++
        }
      }
      await logAction({
        action: 'beta.prelaunch_wave',
        targetType: 'batch',
        metadata: { wave: nextWave, sent, failed, size: candidates.length },
      })
      queryClient.invalidateQueries({ queryKey: ['beta-waitlist'] })
      toast.success(
        `Vague ${nextWave} : ${sent} invitation(s) envoyee(s)`,
        failed > 0 ? `${failed} echec(s), a relancer.` : undefined,
      )
    } finally {
      setWaveSending(false)
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
            {t('admin.beta.title', { defaultValue: 'Prélancement' })}
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
        <div className="flex flex-wrap items-center gap-2">
          {/* Nicolas 2026-05-19 : bouton pour revoir l'écran d'accueil beta
              comme s'il était un nouvel utilisateur. Clear le localStorage
              `naturegraph-beta-access` + redirige vers /welcome.
              Le super admin peut ainsi tester le flow vu par ses testeurs. */}
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              revokeAccess()
              toast.success("Accès beta réinitialisé, redirection vers l'écran d'accueil…")
              setTimeout(() => navigate('/welcome'), 500)
            }}
            icon={<Eye className="size-4" aria-hidden="true" />}
          >
            Aperçu écran d&apos;accueil
          </Button>
        </div>
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
              Aucune clé d'accès. La génération de clés est désactivée depuis le passage en accès
              ouvert (les invitations se gèrent dans l'onglet Waitlist).
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
                    // Pré-association clé ↔ destinataire (cf. logique au-dessus).
                    const inviteEmail = parseInviteEmail(k.notes)
                    const inviteProfile = inviteEmail ? emailToProfile[inviteEmail] : null
                    const isAdminPerp = isAdminPerpetualNote(k.notes)
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
                              title="Clé utilisée, non sélectionnable"
                            >
                              -
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
                        {/* BATCH 107 + Nicolas 2026-05-19 : utilisateur ayant consommé la clé.
                            Affiche pseudo + nom complet + email pour permettre au super admin
                            d'identifier la personne et la contacter directement (mailto:)
                            si la clé a été utilisée par erreur ou s'il faut envoyer
                            une nouvelle clé. */}
                        <td className="px-5 py-3 text-xs">
                          {usedBy ? (
                            // Cas 1 : clé déjà consommée → profil complet du consommateur
                            <div className="flex flex-col gap-0.5">
                              <Link
                                to={`/profile/${usedBy.username}`}
                                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                title={`${usedBy.first_name} ${usedBy.last_name}`}
                              >
                                @{usedBy.username}
                                <ExternalLink className="size-3 opacity-60" aria-hidden="true" />
                              </Link>
                              {(usedBy.first_name || usedBy.last_name) && (
                                <span className="text-muted-foreground">
                                  {[usedBy.first_name, usedBy.last_name].filter(Boolean).join(' ')}
                                </span>
                              )}
                              {usedBy.email && (
                                <a
                                  href={`mailto:${usedBy.email}?subject=${encodeURIComponent(
                                    'Naturegraph, à propos de ta clé d’accès',
                                  )}&body=${encodeURIComponent(
                                    `Bonjour ${usedBy.first_name ?? usedBy.username},\n\nJe te recontacte au sujet de ta clé d'accès Naturegraph (${k.code}).\n\n[ton message]\n\nÀ très vite,\nNicolas\nNaturegraph`,
                                  )}`}
                                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary hover:underline"
                                  title="Contacter par email"
                                >
                                  <Mail className="size-3 shrink-0 opacity-70" aria-hidden="true" />
                                  {usedBy.email}
                                </a>
                              )}
                            </div>
                          ) : isUsed && k.used_by_user_id ? (
                            <span className="text-muted-foreground italic">
                              utilisateur supprimé
                            </span>
                          ) : isAdminPerp && superAdminProfile ? (
                            // Cas 2 : clé admin perpétuelle → super admin courant (Nicolas)
                            <div className="flex flex-col gap-0.5">
                              <Link
                                to={`/profile/${superAdminProfile.username}`}
                                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                title="Super admin"
                              >
                                @{superAdminProfile.username}
                                <ExternalLink className="size-3 opacity-60" aria-hidden="true" />
                              </Link>
                              <span className="text-muted-foreground inline-flex items-center gap-1">
                                <span className="px-1.5 py-0.5 rounded bg-primary-light text-primary text-[10px] font-bold uppercase tracking-wide">
                                  Super admin
                                </span>
                              </span>
                              {superAdminProfile.email && (
                                <span className="text-muted-foreground">
                                  {superAdminProfile.email}
                                </span>
                              )}
                            </div>
                          ) : inviteProfile ? (
                            // Cas 3a : clé d'invitation → invité déjà inscrit (profil existant)
                            <div className="flex flex-col gap-0.5">
                              <Link
                                to={`/profile/${inviteProfile.username}`}
                                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                title="Invité·e (compte créé)"
                              >
                                @{inviteProfile.username}
                                <ExternalLink className="size-3 opacity-60" aria-hidden="true" />
                              </Link>
                              <a
                                href={`mailto:${inviteEmail}`}
                                className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary hover:underline"
                                title="Contacter par email"
                              >
                                <Mail className="size-3 shrink-0 opacity-70" aria-hidden="true" />
                                {inviteEmail}
                              </a>
                            </div>
                          ) : inviteEmail ? (
                            // Cas 3b : clé d'invitation → invité PAS encore inscrit
                            // (email parsé du `notes`, profil pas encore créé en DB)
                            <div className="flex flex-col gap-0.5">
                              <a
                                href={`mailto:${inviteEmail}`}
                                className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary hover:underline font-medium"
                                title="Destinataire de l'invitation (compte non créé)"
                              >
                                <Mail className="size-3 shrink-0 opacity-70" aria-hidden="true" />
                                {inviteEmail}
                              </a>
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                Invité·e, en attente
                              </span>
                            </div>
                          ) : (
                            // Cas 4 : clé de batch générique (pas de destinataire pré-assigné)
                            <span className="text-muted-foreground">-</span>
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

      {/* ── Tab : Waitlist, Nicolas 2026-05-20 : suivi complet. L'entrée reste
          visible de l'inscription à la création de compte (statut dérivé). ── */}
      {activeTab === 'waitlist' && (
        <section className="bg-background border border-border rounded-lg overflow-hidden">
          {/* Barre cohorte prelancement (Nicolas 2026-06-24) : filtre par source,
              import d'emails, bascule des inscriptions non terminees, envoi par vague. */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-border bg-[var(--color-bg-secondary)]/30">
            <div className="inline-flex items-center gap-1">
              {[
                { key: 'all' as const, label: 'Tous', count: waitlist.length },
                {
                  key: 'organic' as const,
                  label: 'Organique',
                  count: waitlist.length - prelaunchCount,
                },
                { key: 'prelaunch' as const, label: 'Prélancement', count: prelaunchCount },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSourceFilter(f.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] ${
                    sourceFilter === f.key
                      ? 'bg-[var(--color-action-default)] text-white'
                      : 'bg-[var(--color-bg-secondary)] text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                  <span className="tabular-nums opacity-80">{f.count}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTagIncompleteAsPrelaunch}
                title="Basculer les inscriptions non terminees en cohorte prelancement"
              >
                Basculer non terminés
              </Button>
              {prelaunchCount > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleInviteNextWave}
                  disabled={waveSending}
                  icon={
                    waveSending ? (
                      <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="size-3.5" aria-hidden="true" />
                    )
                  }
                  title={`Inviter les ${WAVE_SIZE} prochains contacts prelancement`}
                >
                  {waveSending ? 'Envoi…' : `Inviter la vague (${WAVE_SIZE})`}
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setImportOpen(true)}
                icon={<Plus className="size-3.5" aria-hidden="true" />}
              >
                Importer (prélancement)
              </Button>
            </div>
          </div>
          {filteredWaitlist.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              {sourceFilter === 'prelaunch'
                ? 'Cohorte prélancement vide. Clique « Importer » pour coller tes adresses.'
                : 'Aucune entrée pour ce filtre.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground tracking-wider bg-[var(--color-bg-secondary)]/50">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold">Contact</th>
                    <th className="text-left px-5 py-3 font-semibold">Statut</th>
                    <th className="text-left px-5 py-3 font-semibold">Inscrit</th>
                    <th className="text-right px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWaitlist.map((entry, idx) => {
                    // Statut dérivé de l'état réel (cf. helper waitlistStatus).
                    const registered = registeredByEmail[entry.email.toLowerCase()]
                    // Nicolas 2026-06-06 : un profil au pseudo auto "user_xxxxxxxx"
                    // = compte créé mais onboarding NON terminé. On ne le considère
                    // pas comme "inscrit" → on garde le bouton "Renvoyer" (relance
                    // avec le MÊME code via l'edge function) au lieu de "Voir le
                    // profil". Permet de relancer les invités restés en chemin.
                    const isAutoUsername =
                      !!registered && /^user_[0-9a-f]+$/i.test(registered.username)
                    const isFullyRegistered = !!registered && !isAutoUsername
                    // En cours = compte cree mais onboarding non termine (pseudo auto).
                    const isOnboarding = isAutoUsername
                    const status = waitlistStatus(entry, isFullyRegistered, isOnboarding)
                    const isInvited = !!entry.invited_at
                    const isProcessing = processingId === entry.id
                    return (
                      <tr
                        key={entry.id}
                        className={`border-t border-border/40 transition-colors hover:bg-[var(--color-bg-secondary)]/60 ${
                          idx % 2 === 1 ? 'bg-[var(--color-bg-secondary)]/20' : ''
                        }`}
                      >
                        {/* Contact : email + motivation complete (Nicolas 2026-05-25 :
                            retire line-clamp-1 pour afficher le message complet en admin,
                            elargissement max-w pour laisser respirer le texte). */}
                        <td className="px-5 py-3 align-top">
                          <div className="flex flex-col gap-0.5 max-w-md">
                            <span className="text-foreground font-medium break-all">
                              {entry.email}
                            </span>
                            {entry.source === 'prelaunch' && (
                              <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary-light text-primary">
                                Prélancement
                                {entry.wave ? ` · vague ${entry.wave}` : ''}
                              </span>
                            )}
                            {entry.motivation && (
                              <span className="text-xs text-muted-foreground italic whitespace-pre-line">
                                « {entry.motivation} »
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Statut : badge dérivé + détail contextuel */}
                        <td className="px-5 py-3 align-top">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex w-fit items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.badgeClass}`}
                            >
                              {entry.email_status === 'failed' && !registered && (
                                <AlertTriangle className="size-3" aria-hidden="true" />
                              )}
                              {status.label}
                            </span>
                            {registered ? (
                              <span className="text-xs text-muted-foreground">
                                Compte créé, visible dans Migrateurs
                              </span>
                            ) : entry.email_status === 'failed' ? (
                              <span
                                className="text-xs text-[var(--color-error)] line-clamp-2 max-w-xs"
                                title={entry.email_error ?? undefined}
                              >
                                {entry.email_error ?? "L'email n'a pas pu être envoyé."}
                              </span>
                            ) : entry.invited_at ? (
                              <span className="text-xs text-muted-foreground">
                                Invitation envoyée {formatRelativeDate(entry.invited_at)}
                                {entry.invite_count > 1 && ` · ${entry.invite_count} envois`}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Pas encore invité·e
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Date d'inscription waitlist */}
                        <td className="px-5 py-3 align-top text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeDate(entry.created_at)}
                        </td>
                        {/* Actions, dépendent du statut */}
                        <td className="px-5 py-3 text-right align-top">
                          <div className="inline-flex items-center gap-1">
                            {isFullyRegistered && registered ? (
                              /* Inscrit : accès direct à son profil de migrateur */
                              <Link
                                to={`/profile/${registered.username}`}
                                title="Voir le profil du migrateur"
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] text-xs font-bold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-success)]"
                              >
                                Voir le profil
                                <ExternalLink className="size-3.5" aria-hidden="true" />
                              </Link>
                            ) : (
                              /* Inviter (1ʳᵉ fois) ou Renvoyer (déjà invité·e), même
                                 action : Supabase Auth (ré)envoie l'email d'invitation. */
                              <button
                                type="button"
                                onClick={() => handleInvite(entry)}
                                disabled={isProcessing}
                                aria-label={
                                  isInvited
                                    ? `Renvoyer l'invitation à ${entry.email}`
                                    : `Inviter ${entry.email}`
                                }
                                title={
                                  isInvited
                                    ? "Renvoyer l'email d'invitation"
                                    : "Envoyer l'email d'invitation"
                                }
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                              >
                                {isProcessing ? (
                                  <Loader2
                                    className="size-3.5 motion-safe:animate-spin"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Send className="size-3.5" aria-hidden="true" />
                                )}
                                {isProcessing ? 'Envoi…' : isInvited ? 'Renvoyer' : 'Inviter'}
                              </button>
                            )}
                            {/* Copier l'email (invitation manuelle de secours) */}
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
                            {/* Supprimer l'entrée de la waitlist (doublons / spam) */}
                            <button
                              type="button"
                              onClick={() => setWaitlistToDelete(entry)}
                              aria-label={`Supprimer ${entry.email} de la waitlist`}
                              title="Supprimer de la waitlist"
                              className="size-8 inline-flex items-center justify-center rounded-full hover:bg-[var(--color-error-bg)] text-muted-foreground hover:text-[var(--color-error)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)]"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </button>
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

      {/* Nicolas 2026-06-24 : modale d'import d'emails dans la cohorte prelancement. */}
      {importOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prelaunch-import-title"
        >
          <div className="w-full max-w-lg bg-background border border-border rounded-xl shadow-lg p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="prelaunch-import-title" className="text-lg font-bold text-foreground">
                Importer des emails (prélancement)
              </h2>
              <p className="text-sm text-muted-foreground">
                Un email par ligne (ou séparés par virgule). Les doublons et les adresses ayant déjà
                un compte sont ignorés automatiquement.
              </p>
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={8}
              placeholder={'alice@example.com\nbob@example.com'}
              disabled={importing}
              className="w-full px-3 py-2 rounded-md border border-border bg-[var(--color-bg-primary)] text-foreground text-sm font-mono resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] disabled:opacity-50"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setImportOpen(false)}
                disabled={importing}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleImportPrelaunch}
                disabled={importing || importText.trim() === ''}
                icon={
                  importing ? (
                    <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                  ) : undefined
                }
              >
                {importing ? 'Import…' : 'Importer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Nicolas 2026-05-19 : confirmation suppression entrée waitlist (DELETE). */}
      {waitlistToDelete && (
        <ConfirmModal
          title={`Supprimer ${waitlistToDelete.email} de la waitlist ?`}
          description="Cette action est irréversible. L'email sera retiré de la liste d'attente. À utiliser pour les doublons ou les emails invalides."
          confirmLabel="Supprimer"
          variant="danger"
          onCancel={() => setWaitlistToDelete(null)}
          onConfirm={handleDeleteWaitlistEntry}
        />
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
