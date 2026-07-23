/**
 * EchangeMenu : actions rapides sur un echange
 * =============================================================================
 *
 * Reprend la DA du menu d'options d'une publication (`PostOptionsMenu`) :
 * icone, libelle en gras, phrase d'explication en dessous. Deux menus de la
 * meme application ne doivent pas se lire differemment.
 *
 * VOCABULAIRE DU PRODUIT : on ne "suit" pas quelqu'un, on MIGRE VERS. C'est le
 * verbe employe partout (profil, communaute, menu des publications), et l'icone
 * `TreeDeciduous` l'incarne. Ecrire "Suivre" ici aurait introduit un second
 * vocabulaire pour la meme action.
 *
 * LE CONTENU DEPEND DE QUI REGARDE :
 *   - son propre echange -> Modifier, Supprimer
 *   - celui d'un autre   -> Migrer vers, Signaler
 *
 * On n'affiche JAMAIS "Signaler" sur son propre message : se signaler soi-meme
 * n'a aucun sens et brouille la lecture du menu.
 */

import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, Pencil, Trash2, Flag, TreeDeciduous, UserX } from 'lucide-react'

interface EchangeMenuProps {
  estLeMien: boolean
  /** Visiteur sans compte : le menu ne propose rien d'actionnable. */
  peutAgir: boolean
  /** Migre deja vers cette personne ? */
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
    <div ref={conteneur} className="relative shrink-0">
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
          className="absolute right-0 top-full z-30 mt-1 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border-[0.5px] border-border bg-card shadow-xl"
        >
          {estLeMien ? (
            <>
              <ElementMenu
                icone={<Pencil className="size-5" />}
                libelle="Modifier mon échange"
                description="Corriger le texte publié"
                onClick={() => lancer(onModifier)}
              />
              <Separateur />
              <ElementMenu
                icone={<Trash2 className="size-5" />}
                libelle="Supprimer mon échange"
                description="Il disparaîtra pour tout le monde"
                danger
                onClick={() => lancer(onSupprimer)}
              />
            </>
          ) : (
            <>
              <ElementMenu
                icone={suit ? <UserX className="size-5" /> : <TreeDeciduous className="size-5" />}
                libelle={
                  suit ? `Ne plus migrer avec @${pseudoAuteur}` : `Migrer vers @${pseudoAuteur}`
                }
                description={
                  suit
                    ? 'Tu ne verras plus ses publications'
                    : 'Tu verras ses publications dans ton feed'
                }
                onClick={() => lancer(onBasculerSuivi)}
              />
              <Separateur />
              <ElementMenu
                icone={<Flag className="size-5" />}
                libelle="Signaler cet échange"
                description="Contenu inapproprié ou spam"
                danger
                onClick={() => lancer(onSignaler)}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Separateur() {
  return <div className="mx-5 h-px bg-border" aria-hidden="true" />
}

function ElementMenu({
  icone,
  libelle,
  description,
  onClick,
  danger = false,
}: {
  icone: React.ReactNode
  libelle: string
  description: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={[
        'flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
        danger ? 'hover:bg-[var(--color-error-bg)]/40' : 'hover:bg-muted/40',
      ].join(' ')}
    >
      <span
        className={['shrink-0', danger ? 'text-[var(--color-error)]' : 'text-foreground'].join(' ')}
      >
        {icone}
      </span>
      <span className="flex min-w-0 flex-col">
        <span
          className={[
            'text-sm font-semibold leading-tight',
            danger ? 'text-[var(--color-error)]' : 'text-foreground',
          ].join(' ')}
        >
          {libelle}
        </span>
        <span className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}
