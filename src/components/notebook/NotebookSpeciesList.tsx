/**
 * NotebookSpeciesList, V1.2.0 (NG-005)
 *
 * Affiche la liste des especes d un carnet, regroupees par classe vernaculaire
 * (Mammiferes, Oiseaux, Insectes...). Reutilise :
 *   - dans NotebookPanel (mode terrain edition)
 *   - dans NotebookCardInFeed (post publie, lecture seule)
 *   - dans NotebookPublishDialog (recap avant publication)
 *
 * Props :
 *   - observations : la liste a afficher
 *   - onRemove(id) / onCountChange(id, delta) : si fournis -> mode editable
 *   - compact : true -> rendu condense (chips emoji + lignes plus serrees)
 */

import { Minus, Plus, Trash2 } from 'lucide-react'
import {
  classDisplayConfig,
  groupObservationsByClass,
  type NotebookObservation,
} from '@/services/notebookService'

interface NotebookSpeciesListProps {
  observations: NotebookObservation[]
  /** Si fourni : affiche bouton corbeille par espece (mode edition) */
  onRemove?: (observation: NotebookObservation) => void
  /** Si fourni : affiche compteur +/- (mode edition) */
  onCountChange?: (observation: NotebookObservation, delta: number) => void
  /** Densite compacte (sans boutons, pour affichage feed lecture seule) */
  compact?: boolean
}

export function NotebookSpeciesList({
  observations,
  onRemove,
  onCountChange,
  compact = false,
}: NotebookSpeciesListProps) {
  const groups = groupObservationsByClass(observations)
  const editable = !!(onRemove || onCountChange)

  if (observations.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Aucune espèce ajoutée pour le moment.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map(({ vernacularClass, items }) => {
        const cfg = classDisplayConfig(vernacularClass)
        return (
          <section key={vernacularClass} aria-label={cfg.label}>
            {/* Chip header de groupe */}
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-primary-light text-foreground text-sm font-medium">
                <span aria-hidden="true">{cfg.emoji}</span>
                <span>{cfg.label}</span>
              </span>
            </div>
            {/* Liste especes */}
            <ul className="flex flex-col gap-2 pl-1">
              {items.map((obs) => (
                <li
                  key={obs.id}
                  className={`flex items-center gap-3 ${compact ? 'py-0.5' : 'py-1'}`}
                >
                  {/* Bullet violet (cf maquette NG-005) */}
                  <span className="size-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0 text-sm">
                    <span className="font-semibold text-foreground">{obs.species_name}</span>
                    <span className="font-semibold text-foreground">
                      {' '}
                      ({obs.individuals_count})
                    </span>
                    {obs.scientific_name && (
                      <span className="text-muted-foreground italic"> - {obs.scientific_name}</span>
                    )}
                  </div>
                  {editable && (
                    <div className="flex items-center gap-1 shrink-0">
                      {onCountChange && (
                        <>
                          <button
                            type="button"
                            onClick={() => onCountChange(obs, -1)}
                            disabled={obs.individuals_count <= 1}
                            aria-label={`Diminuer ${obs.species_name}`}
                            className="size-7 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Minus className="size-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onCountChange(obs, +1)}
                            aria-label={`Ajouter ${obs.species_name}`}
                            className="size-7 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Plus className="size-3.5" aria-hidden="true" />
                          </button>
                        </>
                      )}
                      {onRemove && (
                        <button
                          type="button"
                          onClick={() => onRemove(obs)}
                          aria-label={`Retirer ${obs.species_name}`}
                          className="size-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive ml-1"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
