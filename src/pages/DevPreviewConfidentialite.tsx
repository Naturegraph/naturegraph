/**
 * DevPreviewConfidentialite, page de preview pour la demo de la section
 * Confidentialite des Settings. Rend les 3 ecrans (entry SettingsCard +
 * SettingsHidden + SettingsBlocked) avec des donnees mockees, sans auth
 * ni Supabase, pour que Nicolas puisse voir le rendu visuel directement.
 *
 * Accessible uniquement en dev via /dev-preview/confidentialite. Ne sert
 * pas en prod (route guardee par import.meta.env.DEV dans le router).
 */

import { useState } from 'react'
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react'

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_HIDDEN = [
  {
    post_id: '1',
    preview:
      "Le brouillard ce matin sur le lac, magie absolue. J'ai pu photographier un héron pendant 20 minutes…",
    cover_url: null,
    author_username: 'marie_naturaliste',
    author_avatar: null,
    hidden_at: '2026-05-12T10:00:00Z',
  },
  {
    post_id: '2',
    preview: 'Petit champignon non identifié trouvé hier en forêt. Si quelqu un reconnaît, merci !',
    cover_url: null,
    author_username: 'forest_walker',
    author_avatar: null,
    hidden_at: '2026-05-08T14:23:00Z',
  },
]

const MOCK_BLOCKED = [
  {
    user_id: 'a',
    username: 'spam_bot_42',
    avatar_url: null,
    blocked_at: '2026-05-15T09:12:00Z',
  },
  {
    user_id: 'b',
    username: 'troll_account',
    avatar_url: null,
    blocked_at: '2026-04-28T16:45:00Z',
  },
]

// ─── Composant ────────────────────────────────────────────────────────────────

type View = 'settings' | 'hidden' | 'blocked'

export default function DevPreviewConfidentialite() {
  const [view, setView] = useState<View>('settings')

  return (
    <div className="min-h-screen bg-cream-lighter flex flex-col">
      {view === 'settings' && <SettingsView onNavigate={setView} />}
      {view === 'hidden' && <HiddenView onBack={() => setView('settings')} />}
      {view === 'blocked' && <BlockedView onBack={() => setView('settings')} />}
    </div>
  )
}

// ─── View 1, entry depuis Settings (juste la card Confidentialite) ─────────

function SettingsView({ onNavigate }: { onNavigate: (v: View) => void }) {
  return (
    <>
      <header className="sticky top-0 z-40 bg-cream-lighter border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 md:px-6 h-14">
          <button
            type="button"
            aria-label="Retour"
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="size-5 text-foreground" aria-hidden="true" />
          </button>
          <h1 className="font-bold text-foreground">Paramètres</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 md:px-6 py-6 flex flex-col gap-6 pb-24 md:pb-6">
        {/* Section Notifications, juste pour le contexte visuel */}
        <section className="bg-cream-lighter border-[0.5px] border-border rounded-card p-6 flex flex-col gap-5">
          <h2 className="text-base font-bold text-foreground">Notifications</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bell className="size-4" aria-hidden="true" />
            <span className="text-xs">Reçois des alertes sur tes activités</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Notifications email</span>
            <span className="text-xs text-muted-foreground">Activé</span>
          </div>
        </section>

        {/* Section Confidentialite (la nouveaute) */}
        <section className="bg-cream-lighter border-[0.5px] border-border rounded-card p-6 flex flex-col gap-5">
          <h2 className="text-base font-bold text-foreground">Confidentialité</h2>
          <p className="text-xs text-muted-foreground -mt-2">
            Gère les publications et les comptes que tu as choisi d écarter de ton feed.
          </p>

          <PrivacyNavRow
            icon={<EyeOff className="size-4" aria-hidden="true" />}
            label="Publications masquées"
            description="Réaffiche les publications retirées de ton feed."
            badge={MOCK_HIDDEN.length}
            onClick={() => onNavigate('hidden')}
          />

          <PrivacyNavRow
            icon={<ShieldOff className="size-4" aria-hidden="true" />}
            label="Comptes bloqués"
            description="Débloque les comptes pour les revoir dans ton feed."
            badge={MOCK_BLOCKED.length}
            onClick={() => onNavigate('blocked')}
          />
        </section>

        <section className="bg-cream-lighter border-[0.5px] border-border rounded-card p-6 flex flex-col gap-3">
          <h2 className="text-base font-bold text-foreground">Zone de danger</h2>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 text-red-600">
            <span className="text-sm font-medium">Supprimer le compte</span>
          </div>
        </section>
      </main>
    </>
  )
}

// ─── View 2, /settings/hidden ─────────────────────────────────────────────

function HiddenView({ onBack }: { onBack: () => void }) {
  const [hidden, setHidden] = useState(MOCK_HIDDEN)

  return (
    <>
      <header className="sticky top-0 z-40 bg-cream-lighter border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 md:px-6 h-14">
          <button
            type="button"
            onClick={onBack}
            aria-label="Retour"
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="size-5 text-foreground" aria-hidden="true" />
          </button>
          <h1 className="font-bold text-foreground">Publications masquées</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 md:px-6 py-6 flex flex-col gap-4 pb-24 md:pb-6">
        <p className="text-sm text-muted-foreground">
          Les publications masquées ne s affichent plus dans ton feed. Tu peux les réafficher à tout
          moment.
        </p>

        {hidden.length === 0 ? (
          <EmptyHidden />
        ) : (
          <ul className="flex flex-col gap-3">
            {hidden.map((row) => (
              <li key={row.post_id}>
                <article className="bg-background border-[0.5px] border-border rounded-card overflow-hidden">
                  <div className="flex gap-3 p-3">
                    <div className="size-20 shrink-0 rounded-md overflow-hidden bg-[var(--color-action-light)] flex items-center justify-center">
                      <EyeOff className="size-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <div className="size-5 rounded-full bg-primary-light border border-border shrink-0" />
                        <span className="text-xs font-bold text-foreground truncate">
                          @{row.author_username}
                        </span>
                      </div>
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
                      onClick={() => setHidden((h) => h.filter((r) => r.post_id !== row.post_id))}
                      className="w-full h-9 inline-flex items-center justify-center gap-2 rounded-full text-sm font-bold bg-primary-light text-primary hover:bg-primary/15 transition-colors"
                    >
                      <Eye className="size-4" aria-hidden="true" />
                      Réafficher
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}

function EmptyHidden() {
  return (
    <div className="bg-background border-[0.5px] border-border rounded-card p-8 flex flex-col items-center text-center gap-3">
      <div className="size-12 rounded-full bg-primary-light flex items-center justify-center">
        <EyeOff className="size-6 text-primary" aria-hidden="true" />
      </div>
      <h2 className="text-base font-bold text-foreground">Aucune publication masquée</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Tu n as masqué aucune publication. Quand tu masques une publication depuis son menu, elle
        apparaîtra ici pour pouvoir être réaffichée.
      </p>
    </div>
  )
}

// ─── View 3, /settings/blocked ────────────────────────────────────────────

function BlockedView({ onBack }: { onBack: () => void }) {
  const [blocked, setBlocked] = useState(MOCK_BLOCKED)

  return (
    <>
      <header className="sticky top-0 z-40 bg-cream-lighter border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 md:px-6 h-14">
          <button
            type="button"
            onClick={onBack}
            aria-label="Retour"
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="size-5 text-foreground" aria-hidden="true" />
          </button>
          <h1 className="font-bold text-foreground">Comptes bloqués</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 md:px-6 py-6 flex flex-col gap-4 pb-24 md:pb-6">
        <p className="text-sm text-muted-foreground">
          Les comptes bloqués ne peuvent pas voir ton profil ni interagir avec tes publications. Tu
          peux les débloquer à tout moment.
        </p>

        {blocked.length === 0 ? (
          <EmptyBlocked />
        ) : (
          <ul className="flex flex-col gap-3">
            {blocked.map((row) => (
              <li key={row.user_id}>
                <article className="bg-background border-[0.5px] border-border rounded-card p-3 flex items-center gap-3">
                  <div className="size-12 rounded-full bg-primary-light border border-border shrink-0" />
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-sm font-bold text-foreground truncate">
                      @{row.username}
                    </span>
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
                    onClick={() => setBlocked((b) => b.filter((r) => r.user_id !== row.user_id))}
                    className="shrink-0 h-9 px-4 inline-flex items-center gap-2 rounded-full text-sm font-bold bg-primary-light text-primary hover:bg-primary/15 transition-colors"
                  >
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    Débloquer
                  </button>
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}

function EmptyBlocked() {
  return (
    <div className="bg-background border-[0.5px] border-border rounded-card p-8 flex flex-col items-center text-center gap-3">
      <div className="size-12 rounded-full bg-primary-light flex items-center justify-center">
        <ShieldOff className="size-6 text-primary" aria-hidden="true" />
      </div>
      <h2 className="text-base font-bold text-foreground">Aucun compte bloqué</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Tu n as bloqué aucun compte. Si tu rencontres un comportement inapproprié, tu peux bloquer
        un utilisateur depuis son profil ou un de ses posts.
      </p>
    </div>
  )
}

// ─── Sous-composants partages ─────────────────────────────────────────────

function PrivacyNavRow({
  icon,
  label,
  description,
  badge,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  description: string
  badge: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border text-foreground hover:bg-cream transition-colors text-left"
    >
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="flex-1 min-w-0 flex flex-col">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground truncate">{description}</span>
      </span>
      {badge > 0 && (
        <span
          aria-label={`${badge} elements`}
          className="text-xs font-bold tabular-nums bg-primary-light text-primary px-2 py-0.5 rounded-full"
        >
          {badge}
        </span>
      )}
      <ChevronRight className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
    </button>
  )
}

// Check icon used in mock-only context (kept here to avoid unused import in real pages)
export { Check }
