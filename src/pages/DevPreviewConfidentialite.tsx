/**
 * DevPreviewConfidentialite, preview du SettingsPanel (slide-over real)
 * avec la nouvelle entree Confidentialite + ses sous-vues.
 *
 * Reproduit fidelement la structure de src/components/settings/SettingsPanel.tsx :
 *   Securite, Confidentialite (nouvelle, Nicolas 2026-05-24), Notifications,
 *   Besoin d aide, Partage tes idees, Licence, Exporter, Deconnexion, Supprimer.
 *
 * 3 vues navigables in-place :
 *   - Liste principale (entree, montre Confidentialite avec badges)
 *   - Sub-view Confidentialite (2 nav rows : Publications masquees, Comptes bloques)
 *   - Pages dediees Publications masquees / Comptes bloques avec data mockee
 *
 * Accessible uniquement en dev via /dev-preview/confidentialite.
 * Ne ship pas en prod (route guard import.meta.env.DEV dans le router).
 */

import { useState } from 'react'
import {
  X,
  ChevronRight,
  ExternalLink,
  Unlock,
  Bell,
  Mail,
  AlignLeft,
  FileText,
  Download,
  LogOut,
  Trash2,
  ArrowLeft,
  ShieldOff,
  EyeOff,
  ShieldCheck,
  Eye,
} from 'lucide-react'

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_HIDDEN = [
  {
    post_id: '1',
    preview:
      'Le brouillard ce matin sur le lac, magie absolue. J ai pu photographier un héron pendant 20 minutes…',
    author_username: 'marie_naturaliste',
    hidden_at: '2026-05-12T10:00:00Z',
  },
  {
    post_id: '2',
    preview: 'Petit champignon non identifié trouvé hier en forêt. Si quelqu un reconnaît, merci !',
    author_username: 'forest_walker',
    hidden_at: '2026-05-08T14:23:00Z',
  },
]

const MOCK_BLOCKED = [
  { user_id: 'a', username: 'spam_bot_42', blocked_at: '2026-05-15T09:12:00Z' },
  { user_id: 'b', username: 'troll_account', blocked_at: '2026-04-28T16:45:00Z' },
]

// ─── Composant ────────────────────────────────────────────────────────────────

type View = 'list' | 'blocking' | 'hidden' | 'blocked'

export default function DevPreviewConfidentialite() {
  const [view, setView] = useState<View>('list')
  const [hidden, setHidden] = useState(MOCK_HIDDEN)
  const [blocked, setBlocked] = useState(MOCK_BLOCKED)

  const titles: Record<View, string> = {
    list: 'Paramètres',
    blocking: 'Blocages',
    hidden: 'Publications masquées',
    blocked: 'Comptes bloqués',
  }

  function back() {
    if (view === 'hidden' || view === 'blocked') setView('blocking')
    else if (view === 'blocking') setView('list')
  }

  return (
    // Simule le backdrop + panneau lateral droit 448px desktop, mais ici
    // on rend dans le viewport entier pour la preview.
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-6 px-6 py-6 shrink-0 max-w-[448px] w-full mx-auto md:mx-0">
        {view !== 'list' && (
          <button
            type="button"
            onClick={back}
            aria-label="Retour"
            className="size-10 shrink-0 inline-flex items-center justify-center rounded-full border-[0.5px] border-border bg-background hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
        )}
        <h2 className="font-title font-bold text-xl md:text-[32px] leading-[120%] text-foreground flex-1 text-balance">
          {titles[view]}
        </h2>
        <button
          type="button"
          aria-label="Fermer"
          className="size-6 flex items-center justify-center rounded-full hover:bg-cream"
        >
          <X className="size-6 text-foreground" aria-hidden="true" />
        </button>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto max-w-[448px] w-full mx-auto md:mx-0">
        {view === 'list' && (
          <ListView onOpen={setView} hiddenCount={hidden.length} blockedCount={blocked.length} />
        )}
        {view === 'blocking' && (
          <BlockingView
            onOpen={setView}
            hiddenCount={hidden.length}
            blockedCount={blocked.length}
          />
        )}
        {view === 'hidden' && (
          <HiddenView
            items={hidden}
            onUnhide={(id) => setHidden((h) => h.filter((r) => r.post_id !== id))}
          />
        )}
        {view === 'blocked' && (
          <BlockedView
            items={blocked}
            onUnblock={(id) => setBlocked((b) => b.filter((r) => r.user_id !== id))}
          />
        )}
      </div>

      {/* Footer (visible uniquement sur la liste principale) */}
      {view === 'list' && (
        <div className="shrink-0 px-6 pt-4 pb-6 flex flex-col items-center gap-2 max-w-[448px] w-full mx-auto md:mx-0">
          <div className="flex items-center gap-6">
            <button className="font-title font-bold text-base leading-6 underline text-[var(--color-action-default)]">
              CGU
            </button>
            <button className="font-title font-bold text-base leading-6 underline text-[var(--color-action-default)]">
              Politique de confidentialité
            </button>
          </div>
          <p className="font-body text-xs leading-5 text-[#424747] text-center">
            App version 1.0.0
          </p>
        </div>
      )}
    </div>
  )
}

// ─── View 1, liste principale du SettingsPanel ───────────────────────────────

function ListView({
  onOpen,
  hiddenCount,
  blockedCount,
}: {
  onOpen: (v: View) => void
  hiddenCount: number
  blockedCount: number
}) {
  const totalPrivacy = hiddenCount + blockedCount
  return (
    <ul className="flex flex-col px-6">
      <Item icon={<Unlock className="size-5" />} label="Sécurité" />
      <Item
        icon={<ShieldOff className="size-5" />}
        label="Blocages"
        onClick={() => onOpen('blocking')}
        badge={totalPrivacy}
      />
      <Item icon={<Bell className="size-5" />} label="Notifications" />
      <Item icon={<Mail className="size-5" />} label="Besoin d'aide ?" />
      <Item icon={<AlignLeft className="size-5" />} label="Partage tes idées et retours" external />
      <Item icon={<FileText className="size-5" />} label="Licence et droits d'auteur" />
      <Item icon={<Download className="size-5" />} label="Exporter mes données" noTrailing />
      <Item icon={<LogOut className="size-5" />} label="Déconnexion" noTrailing />
      <Item icon={<Trash2 className="size-5" />} label="Supprimer mon compte" noTrailing danger />
    </ul>
  )
}

// ─── View 2, sous-vue Confidentialite ────────────────────────────────────────

function BlockingView({
  onOpen,
  hiddenCount,
  blockedCount,
}: {
  onOpen: (v: View) => void
  hiddenCount: number
  blockedCount: number
}) {
  return (
    <ul className="flex flex-col px-6">
      <Item
        icon={<EyeOff className="size-5" />}
        label="Publications masquées"
        onClick={() => onOpen('hidden')}
        badge={hiddenCount}
      />
      <Item
        icon={<ShieldOff className="size-5" />}
        label="Comptes bloqués"
        onClick={() => onOpen('blocked')}
        badge={blockedCount}
      />
    </ul>
  )
}

// ─── View 3, Publications masquees ───────────────────────────────────────────

function HiddenView({
  items,
  onUnhide,
}: {
  items: typeof MOCK_HIDDEN
  onUnhide: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <div className="px-6 py-8 flex flex-col items-center text-center gap-3">
        <div className="size-12 rounded-full bg-primary-light flex items-center justify-center">
          <EyeOff className="size-6 text-primary" aria-hidden="true" />
        </div>
        <h3 className="text-base font-bold text-foreground">Aucune publication masquée</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Tu n as masqué aucune publication. Quand tu masques une publication depuis son menu, elle
          apparaîtra ici.
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3 px-6 pb-6">
      {items.map((row) => (
        <li key={row.post_id}>
          <article className="bg-background border-[0.5px] border-border rounded-card overflow-hidden">
            <div className="flex gap-3 p-3">
              <div className="size-20 shrink-0 rounded-md overflow-hidden bg-[var(--color-action-light)] flex items-center justify-center">
                <EyeOff className="size-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-xs font-bold text-foreground truncate">
                  @{row.author_username}
                </span>
                <p className="text-sm text-foreground line-clamp-2">{row.preview}</p>
                <p className="text-xs text-muted-foreground">
                  Masquée le{' '}
                  {new Date(row.hidden_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="px-3 pb-3">
              <button
                type="button"
                onClick={() => onUnhide(row.post_id)}
                className="w-full h-9 inline-flex items-center justify-center gap-2 rounded-full text-sm font-bold bg-primary-light text-primary hover:bg-primary/15"
              >
                <Eye className="size-4" aria-hidden="true" />
                Réafficher
              </button>
            </div>
          </article>
        </li>
      ))}
    </ul>
  )
}

// ─── View 4, Comptes bloques ──────────────────────────────────────────────────

function BlockedView({
  items,
  onUnblock,
}: {
  items: typeof MOCK_BLOCKED
  onUnblock: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <div className="px-6 py-8 flex flex-col items-center text-center gap-3">
        <div className="size-12 rounded-full bg-primary-light flex items-center justify-center">
          <ShieldOff className="size-6 text-primary" aria-hidden="true" />
        </div>
        <h3 className="text-base font-bold text-foreground">Aucun compte bloqué</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Tu n as bloqué aucun compte. Si tu rencontres un comportement inapproprié, tu peux bloquer
          un user depuis son profil ou un de ses posts.
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3 px-6 pb-6">
      {items.map((row) => (
        <li key={row.user_id}>
          <article className="bg-background border-[0.5px] border-border rounded-card p-3 flex items-center gap-3">
            <div className="size-12 rounded-full bg-primary-light border border-border shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col">
              <span className="text-sm font-bold text-foreground truncate">@{row.username}</span>
              <span className="text-xs text-muted-foreground">
                Bloqué le{' '}
                {new Date(row.blocked_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onUnblock(row.user_id)}
              className="shrink-0 h-9 px-4 inline-flex items-center gap-2 rounded-full text-sm font-bold bg-primary-light text-primary hover:bg-primary/15"
            >
              <ShieldCheck className="size-4" aria-hidden="true" />
              Débloquer
            </button>
          </article>
        </li>
      ))}
    </ul>
  )
}

// ─── Composant ligne reutilisable, fidele a SettingsItem du vrai panel ──────

function Item({
  icon,
  label,
  onClick,
  external,
  noTrailing,
  danger,
  badge,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  external?: boolean
  noTrailing?: boolean
  danger?: boolean
  badge?: number
}) {
  const stateClasses = danger
    ? 'text-[var(--color-error,_#9E0F22)]'
    : 'text-foreground hover:text-[var(--color-action-default)]'

  return (
    <li className="border-b border-[#C4C4CC] last:border-b-0">
      <button
        type="button"
        onClick={onClick}
        className={`w-full h-14 flex items-center gap-8 text-left transition-colors rounded ${stateClasses}`}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span className="shrink-0">{icon}</span>
          <span className="font-title font-bold text-base leading-6 truncate">{label}</span>
        </div>
        {badge !== undefined && badge > 0 && (
          <span
            aria-label={`${badge}`}
            className="shrink-0 text-xs font-bold tabular-nums bg-primary-light text-primary px-2 py-0.5 rounded-full"
          >
            {badge}
          </span>
        )}
        {!noTrailing && (
          <span aria-hidden="true" className="shrink-0">
            {external ? <ExternalLink className="size-6" /> : <ChevronRight className="size-6" />}
          </span>
        )}
      </button>
    </li>
  )
}
