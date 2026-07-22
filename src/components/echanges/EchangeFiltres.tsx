/**
 * EchangeFiltres : retrouver une intention precise dans un fil
 * =============================================================================
 *
 * Sur une observation qui a suscite quinze echanges, la piste d'identification
 * est noyee au milieu des encouragements. Or c'est souvent l'information que
 * quelqu'un vient chercher.
 *
 * Ce filtre n'a de sens qu'a partir d'un certain volume : sous ce seuil, la
 * liste se lit d'un coup d'oeil et une rangee de boutons en plus ne serait que
 * du bruit. On n'affiche donc QUE les intentions reellement presentes, avec
 * leur nombre, jamais une liste theorique.
 */

import { INTENTIONS } from './intentions'
import type { Echange, IntentionEchange } from '@/services/echangeService'

/** En dessous, la liste se lit sans aide : le filtre resterait decoratif. */
export const SEUIL_FILTRES = 4

interface EchangeFiltresProps {
  echanges: Echange[]
  actif: IntentionEchange | null
  onChanger: (intention: IntentionEchange | null) => void
}

export function EchangeFiltres({ echanges, actif, onChanger }: EchangeFiltresProps) {
  if (echanges.length < SEUIL_FILTRES) return null

  // Uniquement les intentions presentes dans CE fil, avec leur compte.
  const presentes = INTENTIONS.map((i) => ({
    config: i,
    nombre: echanges.filter((e) => e.intention === i.cle).length,
  })).filter((x) => x.nombre > 0)

  // Une seule intention represente : filtrer ne trierait rien.
  if (presentes.length < 2) return null

  return (
    <div
      role="group"
      aria-label="Filtrer les échanges"
      className="mb-3 flex gap-2 overflow-x-auto pb-1 touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        type="button"
        onClick={() => onChanger(null)}
        aria-pressed={actif === null}
        className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          actif === null
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/40 text-muted-foreground hover:text-foreground'
        }`}
      >
        Tout ({echanges.length})
      </button>

      {presentes.map(({ config, nombre }) => {
        const estActif = actif === config.cle
        return (
          <button
            key={config.cle}
            type="button"
            onClick={() => onChanger(estActif ? null : config.cle)}
            aria-pressed={estActif}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              estActif
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            <span aria-hidden="true">{config.emoji}</span>
            {config.libelle} ({nombre})
          </button>
        )
      })}
    </div>
  )
}
