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
    setEditingPostId(null)
    setActiveType(postType)
  }

  function close(): void {
    setActiveType(null)
    setEditingPostId(null)
  }

  let panelNode: ReactNode = null
  if (activeType === 'nature_encounter') {
    panelNode = (
      <Suspense fallback={null}>
        <ContributeEncounterForm onClose={close} editingPostId={editingPostId ?? undefined} />
      </Suspense>
    )
  } else if (activeType === 'nature_instant') {
    panelNode = (
      <Suspense fallback={null}>
        <ContributeInstantPanel onClose={close} editingPostId={editingPostId ?? undefined} />
      </Suspense>
    )
  }

  return { onEditPost, openCreate, panelNode, isPanelOpen: activeType !== null }
}
