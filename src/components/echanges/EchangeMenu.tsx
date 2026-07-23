/**
 * EchangeMenu : actions rapides sur un echange
 * =============================================================================
 *
 * Meme principe que le menu d'options d'une publication : les actions rares ou
 * engageantes vivent derriere un bouton discret plutot que dans la barre
 * principale. Reagir et repondre restent visibles ; modifier, suivre, signaler
 * et supprimer se rangent ici.
 *
 * LE CONTENU DEPEND DE QUI REGARDE :
 *   - son propre echange  -> Modifier, Supprimer
 *   - celui de quelqu'un  -> Suivre la personne, Signaler
 *
 * On n'affiche JAMAIS "Signaler" sur son propre message : se signaler soi-meme
 * n'a aucun sens et brouille la lecture du menu.
 */

import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, Pencil, Trash2, Flag, UserPlus, UserCheck } from 'lucide-react'

interface EchangeMenuProps {
  estLeMien: boolean
  /** Visiteur sans compte : le menu ne propose rien d'actionnable. */
  peutAgir: boolean
  /** `null` tant que l'etat d'abonnement n'est pas connu. */
  suit?: boolean | null
  onModifier: () => void
  onSupprimer: () => void
  onSignaler: () => void
  onBasculerSuivi: () => void
  pseudoAuteur: string
}

export function EchangeMenu({
  estLeMien,
  peutAgir,
  suit = null,
  onModifier,
  onSupprimer,
  onSignaler,
  onBasculerSuivi,
  pseudoAuteur,
}: EchangeMenuProps) {
  const [ouvert, setOuvert] = useState(false)
  const conteneur = useRef<HTMLDivElement>(null)

  // Fermeture au clic exterieur et a Echap : un menu qui reste ouvert derriere
  // le doigt sur mobile masque le message qu'on vient de lire.
  useEffect(() => {
    if (!ouvert) return
    function auClic(e: MouseEvent) {
      if (conteneur.current && !conteneur.current.contains(e.target as Node)) setOuvert(false)
    }
    function auClavier(e: KeyboardEvent) {
      if (e.key === 'Escape') setOuvert(false)
    }
    document.addEventListener('mousedown', auClic)
    document.addEventListener('keydown', auClavier)
    return () => {
      document.removeEventListener('mousedown', auClic)
      document.removeEventListener('keydown', auClavier)
    }
  }, [ouvert])

  // Un visiteur sans compte n'a aucune action disponible : afficher un menu
  // vide, ou qui renvoie systematiquement vers l'inscription, ne fait
  // qu'ajouter une deception de plus.
  if (!peutAgir) return null

  function lancer(action: () => void) {
    setOuvert(false)
    action()
  }

  return (
    <div ref={conteneur} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-haspopup="menu"
        aria-label={`Actions sur l’échange de ${pseudoAuteur}`}
        className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </button>

      {ouvert && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 min-w-52 overflow-hidden rounded-md border-[0.5px] border-border bg-card shadow-xl"
        >
          {estLeMien ? (
            <>
              <ElementMenu icone={Pencil} onClick={() => lancer(onModifier)}>
                Modifier
              </ElementMenu>
              <ElementMenu icone={Trash2} danger onClick={() => lancer(onSupprimer)}>
                Supprimer
              </ElementMenu>
            </>
          ) : (
            <>
              <ElementMenu
                icone={suit ? UserCheck : UserPlus}
                onClick={() => lancer(onBasculerSuivi)}
              >
                {suit ? `Ne plus suivre ${pseudoAuteur}` : `Suivre ${pseudoAuteur}`}
              </ElementMenu>
              <ElementMenu icone={Flag} danger onClick={() => lancer(onSignaler)}>
                Signaler cet échange
              </ElementMenu>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ElementMenu({
  icone: Icone,
  children,
  onClick,
  danger = false,
}: {
  icone: typeof Pencil
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={[
        'flex w-full items-center gap-2 border-b border-border px-4 py-2.5 text-left text-sm transition-colors last:border-b-0',
        'focus-visible:bg-muted/40 focus-visible:outline-none',
        danger
          ? 'text-[var(--color-error)] hover:bg-[var(--color-error-bg)]/40'
          : 'text-foreground hover:bg-muted/40',
      ].join(' ')}
    >
      <Icone className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{children}</span>
    </button>
  )
}
