/**
 * DevPreviewConfidentialite, page de preview pour la demo de la section
 * Confidentialite des Settings. Rend les 3 ecrans (entry SettingsCard +
 * SettingsHidden + SettingsBlocked) avec des donnees mockees, sans auth
 * ni Supabase, pour que Nicolas puisse voir le rendu visuel directement.
 *
 * Reproduit fidelement la structure de la vraie page Settings.tsx :
 * Profil, Localisation, Compte, Confidentialite (placee AU DESSUS de
 * Notifications, Nicolas 2026-05-24), Notifications, Zone de danger.
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
  Globe,
  LogOut,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from 'lucide-react'

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_HIDDEN = [
  {
    post_id: '1',
    preview:
      'Le brouillard ce matin sur le lac, magie absolue. J ai pu photographier un héron pendant 20 minutes…',
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
  { user_id: 'a', username: 'spam_bot_42', avatar_url: null, blocked_at: '2026-05-15T09:12:00Z' },
  { user_id: 'b', username: 'troll_account', avatar_url: null, blocked_at: '2026-04-28T16:45:00Z' },
]

const MOCK_PROFILE = {
  firstName: 'Nicolas',
  lastName: 'Dupont',
  username: 'nicolas_dev',
  bio: 'Naturaliste amateur passionne par les oiseaux du Quebec et de France. Photographe nature en herbe.',
  city: 'Montréal',
  region: 'Québec',
  email: 'nicolas@naturegraph.ca',
  interests: ['birds', 'mammals', 'amphibians'] as const,
}

const ALL_INTERESTS = [
  { id: 'birds', label: 'Oiseaux' },
  { id: 'mammals', label: 'Mammifères' },
  { id: 'insects', label: 'Insectes' },
  { id: 'amphibians', label: 'Amphibiens' },
  { id: 'reptiles', label: 'Reptiles' },
] as const

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

// ─── View 1, Settings complet avec toutes les sections ───────────────────────

function SettingsView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [isPublic, setIsPublic] = useState(true)
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const [weeklyGoal, setWeeklyGoal] = useState(7)
  const [notif, setNotif] = useState({ email: true, push: true, newsletter: false, motion: false })

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
        {/* Section Profil */}
        <SectionCard title="Profil">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-primary-light overflow-hidden flex items-center justify-center text-2xl">
              🦔
            </div>
            <button type="button" className="text-sm text-primary font-medium hover:underline">
              Changer la photo
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Prénom" value={MOCK_PROFILE.firstName} />
            <Field label="Nom" value={MOCK_PROFILE.lastName} />
          </div>
          <Field label="Nom d utilisateur" value={MOCK_PROFILE.username} />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="dev-preview-bio" className="text-sm font-medium text-foreground">
                Bio
              </label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {MOCK_PROFILE.bio.length}/160
              </span>
            </div>
            <textarea
              id="dev-preview-bio"
              value={MOCK_PROFILE.bio}
              readOnly
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border bg-cream-lighter text-foreground text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Ville" value={MOCK_PROFILE.city} />
            <Field label="Région" value={MOCK_PROFILE.region} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Centres d intérêts</span>
            <div className="flex flex-wrap gap-2">
              {ALL_INTERESTS.map((interest) => {
                const active = (MOCK_PROFILE.interests as readonly string[]).includes(interest.id)
                return (
                  <button
                    key={interest.id}
                    type="button"
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      active
                        ? 'border-primary bg-primary-light text-primary font-medium'
                        : 'border-border text-foreground'
                    }`}
                  >
                    {interest.label}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            className="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold text-sm"
          >
            Sauvegarder
          </button>
        </SectionCard>

        {/* Section Localisation */}
        <SectionCard title="Localisation">
          <p className="text-sm text-muted-foreground -mt-2">
            Sert a personnaliser ton feed avec la biodiversite proche de chez toi.
          </p>
          <Field label="Ville (autocomplete)" value="Montréal, Québec, Canada" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Rayon : 75 km</span>
            <span className="text-xs text-muted-foreground">Visibilité : Région</span>
          </div>
        </SectionCard>

        {/* Section Compte */}
        <SectionCard title="Compte">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Email</p>
              <p className="text-sm text-muted-foreground">{MOCK_PROFILE.email}</p>
            </div>
            <span className="flex items-center gap-1 text-xs text-teal-dark bg-teal-dark/10 px-2 py-0.5 rounded-full">
              <Check className="size-3" aria-hidden="true" />
              Vérifié
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Profil public</p>
              <p className="text-xs text-muted-foreground">
                {isPublic
                  ? 'Visible par tous les utilisateurs.'
                  : 'Visible uniquement par tes migrateurs.'}
              </p>
            </div>
            <Toggle value={isPublic} onChange={setIsPublic} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">Langue</span>
            </div>
            <div className="flex gap-1">
              {(['fr', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    lang === l
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'bg-cream text-foreground'
                  }`}
                >
                  {l === 'fr' ? 'FR' : 'EN'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Objectif hebdomadaire</p>
              <p className="text-xs text-muted-foreground">Nombre de partages visés par semaine</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeeklyGoal((g) => Math.max(1, g - 1))}
                className="size-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-cream"
              >
                −
              </button>
              <span className="text-sm font-bold text-foreground w-6 text-center">
                {weeklyGoal}
              </span>
              <button
                type="button"
                onClick={() => setWeeklyGoal((g) => Math.min(20, g + 1))}
                className="size-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-cream"
              >
                +
              </button>
            </div>
          </div>
        </SectionCard>

        {/* ✨ Section Confidentialite, NOUVELLE, placee AU DESSUS de Notifications */}
        <SectionCard title="Confidentialité">
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
        </SectionCard>

        {/* Section Notifications */}
        <SectionCard title="Notifications">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Bell className="size-4" aria-hidden="true" />
            <span className="text-xs">Reçois des alertes sur tes activités</span>
          </div>
          <ToggleRow
            label="Notifications email"
            value={notif.email}
            onChange={(v) => setNotif({ ...notif, email: v })}
          />
          <ToggleRow
            label="Notifications push"
            value={notif.push}
            onChange={(v) => setNotif({ ...notif, push: v })}
          />
          <ToggleRow
            label="Newsletter mensuelle"
            value={notif.newsletter}
            onChange={(v) => setNotif({ ...notif, newsletter: v })}
          />
          <ToggleRow
            label="Réduire les animations"
            value={notif.motion}
            onChange={(v) => setNotif({ ...notif, motion: v })}
          />
        </SectionCard>

        {/* Section Zone de danger */}
        <SectionCard title="Zone de danger">
          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border text-foreground hover:bg-cream"
          >
            <LogOut className="size-4" aria-hidden="true" />
            <div className="text-left">
              <p className="text-sm font-medium">Déconnexion</p>
              <p className="text-xs text-muted-foreground">Te déconnecter de ton compte.</p>
            </div>
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            <div className="text-left">
              <p className="text-sm font-medium">Supprimer le compte</p>
              <p className="text-xs text-red-400">Action irréversible.</p>
            </div>
          </button>
        </SectionCard>
      </main>
    </>
  )
}

// ─── View 2, Publications masquees ─────────────────────────────────────────

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

// ─── View 3, Comptes bloques ──────────────────────────────────────────────

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
                    className="shrink-0 h-9 px-4 inline-flex items-center gap-2 rounded-full text-sm font-bold bg-primary-light text-primary hover:bg-primary/15"
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-cream-lighter border-[0.5px] border-border rounded-card p-6 flex flex-col gap-5">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  const id = `dev-preview-field-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        readOnly
        className="w-full px-4 py-2.5 rounded-xl border border-border bg-cream-lighter text-foreground text-sm"
      />
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-border'}`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform shadow-sm ${value ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Toggle value={value} onChange={onChange} />
    </div>
  )
}

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
