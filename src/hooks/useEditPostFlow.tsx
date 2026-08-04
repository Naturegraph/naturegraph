/**
 * useEditPostFlow - Hook partage pour les panels Contribuer (creation + edition)
 *
 * NG-002 + cleanup V1.1.3 (Nicolas 2026-05-31) : avant ce hook, chaque page
 * qui voulait ouvrir le panel de contribution dupliquait l etat local (type
 * actif, ID en cours d edition, lazy imports, render conditionnel). Home,
 * Profile et PostDetail avaient chacun leur copie -> divergences.
 *
 * Ce hook expose :
 * - onEditPost(postId, postType) : pour les FeedPost / PostOptionsMenu
 * - openCreate(postType) : pour les boutons "Contribuer" / "Partager une
 *   rencontre" / "Instant Nature"
 * - panelNode : le JSX du panneau (a rendre dans le composant racine)
 *
 * Le state vit dans le hook. L user reste sur sa page courante, pas de
 * redirect vers Home.
 *
 * Usage type :
 *   function MyPage() {
 *     const { onEditPost, openCreate, panelNode } = useEditPostFlow()
 *     return (
 *       <>
 *         <Navbar onContribute={() => openCreate('nature_encounter')} />
 *         <FeedSection onEditPost={onEditPost} />
 *         {panelNode}
 *       </>
 *     )
 *   }
 */

import { lazy, Suspense, useState, type ReactNode } from 'react'
import { trackAction, trackFailure } from '@/lib/monitoring'
import { SectionErrorBoundary } from '@/components/layout/SectionErrorBoundary'

// Lazy-loaded - chunk separe, ne charge que quand un panel s ouvre vraiment.
const ContributeEncounterForm = lazy(() =>
  import('@/components/contribute/ContributeEncounterForm').then((m) => ({
    default: m.ContributeEncounterForm,
  })),
)
const ContributeInstantPanel = lazy(() =>
  import('@/components/contribute/ContributeInstantPanel').then((m) => ({
    default: m.ContributeInstantPanel,
  })),
)

type PanelType = 'nature_encounter' | 'nature_instant'

export interface UseEditPostFlowResult {
  /** Callback edition - a passer aux FeedPost / PostOptionsMenu */
  onEditPost: (postId: string, postType: PanelType) => void
  /** Callback creation - a brancher sur les boutons "Contribuer" */
  openCreate: (postType: PanelType) => void
  /** JSX du panneau actif a rendre dans le composant racine */
  panelNode: ReactNode
  /** Vrai si un panneau est actuellement ouvert (creation ou edition) */
  isPanelOpen: boolean
}

export function useEditPostFlow(): UseEditPostFlowResult {
  const [activeType, setActiveType] = useState<PanelType | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)

  function onEditPost(postId: string, postType: PanelType): void {
    setEditingPostId(postId)
    setActiveType(postType)
  }

  function openCreate(postType: PanelType): void {
    // Fil d'Ariane : on trace l'ouverture du panneau de partage. Si le bouton
    // "Partager une observation" semble mort (retour Nicolas 2026-07-30), soit
    // ce breadcrumb apparait (le clic est bien arrive, le souci est apres), soit
    // il manque (le clic n'arrive meme pas au handler -> piste DOM/state fige).
    trackAction('contribute.open', { postType })
    setEditingPostId(null)
    setActiveType(postType)
  }

  function close(): void {
    setActiveType(null)
    setEditingPostId(null)
  }

  // Le chargement du panneau est lazy (chunk separe). Si ce chunk echoue a se
  // charger (reseau stale au retour d'arriere-plan, ou hash perime apres un
  // deploiement), l'import rejette : SANS filet, le Suspense retombe sur son
  // fallback null -> le bouton "ne fait rien" en silence (LE bug remonte par
  // Nicolas). Avec la SectionErrorBoundary, cet echec devient (1) un evenement
  // Sentry capture (captureException) et (2) un encart visible + "Reessayer" qui
  // retente le chargement, au lieu d'un vide muet. `resetKeys={[activeType]}`
  // rearme le boundary quand on rouvre un panneau apres un echec.
  let panelInner: ReactNode = null
  if (activeType === 'nature_encounter') {
    panelInner = (
      <Suspense fallback={null}>
        <ContributeEncounterForm onClose={close} editingPostId={editingPostId ?? undefined} />
      </Suspense>
    )
  } else if (activeType === 'nature_instant') {
    panelInner = (
      <Suspense fallback={null}>
        <ContributeInstantPanel onClose={close} editingPostId={editingPostId ?? undefined} />
      </Suspense>
    )
  }

  const panelNode: ReactNode = panelInner ? (
    <SectionErrorBoundary
      label="panneau-contribution"
      resetKeys={[activeType]}
      onReset={() => trackAction('contribute.panel.retry', { postType: activeType })}
      fallback={(retry) => {
        // Le panneau n'a pas pu s'afficher : on le signale comme echec silencieux
        // (warning + video de session), puis on propose de reessayer ou fermer.
        trackFailure('contribute.panel', 'chunk-load-failed', { postType: activeType })
        return (
          <div
            role="alert"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-md flex-col items-center gap-3 rounded-t-card border border-border bg-card p-6 text-center shadow-lg"
          >
            <p className="font-body text-base text-foreground">
              Le panneau de partage n'a pas pu s'ouvrir. Verifie ta connexion puis reessaie.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={retry}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-action-default)] px-5 py-2.5 text-[var(--color-text-white)] transition-colors hover:opacity-90"
              >
                Reessayer
              </button>
              <button
                type="button"
                onClick={close}
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-foreground transition-colors hover:bg-muted"
              >
                Fermer
              </button>
            </div>
          </div>
        )
      }}
    >
      {panelInner}
    </SectionErrorBoundary>
  ) : null

  return { onEditPost, openCreate, panelNode, isPanelOpen: activeType !== null }
}
