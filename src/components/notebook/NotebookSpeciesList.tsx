/**
 * NotebookSpeciesList, V1.2.0 (NG-005)
 *
 * Affiche la liste des especes d un carnet, regroupees par classe vernaculaire
 * (Mammiferes, Oiseaux, Insectes...). Reutilise :
 *   - dans NotebookPanel (mode terrain edition) -> rendu COMPLET (Figma)
 *   - dans NotebookCardInFeed (post publie, lecture seule) -> rendu COMPACT
 *   - dans NotebookPublishDialog (recap avant publication) -> rendu COMPLET
 *
 * Rendu COMPLET conforme Figma 6771-12164 :
 *   - pill de groupe (bg #E7E9F7 Content/Action/Light, label Muli 700 14px)
 *   - ligne espece : avatar emoji 40px (#E7E9F7) + nom (14px bold) + nom latin
 *     (12px #20203D) + compteur (boutons cercles 32px bordes) + corbeille rose
 *     (#FCCDD5 / icone #9E0F22).
 *
 * Props :
 *   - observations : la liste a afficher
 *   - onRemove(id) / onCountChange(id, delta) : si fournis -> mode editable
 *   - compact : true -> rendu condense (chips emoji, feed lecture seule)
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

  // ── Mode COMPACT (feed lecture seule) : chips condensees, inchange ─────────
  if (compact) {
    return (
      <div className="flex flex-col gap-4">
        {groups.map(({ vernacularClass, items }) => {
          const cfg = classDisplayConfig(vernacularClass)
          return (
            <section key={vernacularClass} aria-label={cfg.label}>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-[#e7e9f7] text-foreground text-xs font-bold">
                  <span aria-hidden="true">{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                </span>
              </div>
              <ul className="flex flex-col gap-1 pl-1">
                {items.map((obs) => (
                  <li key={obs.id} className="flex items-baseline gap-1 text-sm">
                    <span className="font-semibold text-foreground">{obs.species_name}</span>
                    <span className="font-semibold text-foreground">({obs.individuals_count})</span>
                    {obs.scientific_name && (
                      <span className="text-muted-foreground italic truncate">
                        {' '}
                        - {obs.scientific_name}
                      </span>
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

  // ── Mode COMPLET (Figma) : groupes + lignes especes detaillees ─────────────
  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ vernacularClass, items }) => {
        const cfg = classDisplayConfig(vernacularClass)
        return (
          <section key={vernacularClass} aria-label={cfg.label} className="flex flex-col gap-4">
            {/* Pill de groupe — bg #E7E9F7 (Content/Action/Light), label 14px bold */}
            <span className="inline-flex items-center self-start h-8 px-3 rounded-full bg-[#e7e9f7] text-foreground text-sm font-bold">
              {cfg.label}
            </span>

            {/* Lignes especes */}
            <ul className="flex flex-col gap-4">
              {items.map((obs) => (
                <li key={obs.id} className="flex items-center gap-2">
                  {/* Identite : avatar emoji 40px + nom + nom latin */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className="size-10 shrink-0 rounded-full bg-[#e7e9f7] flex items-center justify-center text-lg leading-none"
                      aria-hidden="true"
                    >
                      {cfg.emoji}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-foreground truncate">
                        {obs.species_name}
                      </span>
                      {obs.scientific_name && (
                        <span className="text-xs italic text-[var(--color-text-secondary)] truncate tracking-wide">
                          {obs.scientific_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {editable && (
                    <div className="flex items-center gap-2 shrink-0">
                      {onCountChange && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onCountChange(obs, -1)}
                            disabled={obs.individuals_count <= 1}
                            aria-label={`Diminuer ${obs.species_name}`}
                            className="size-8 rounded-full border-[0.5px] border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Minus className="size-5" aria-hidden="true" />
                          </button>
                          <span className="min-w-[1.5rem] text-center text-base tabular-nums text-foreground">
                            {obs.individuals_count}
                          </span>
                          <button
                            type="button"
                            onClick={() => onCountChange(obs, +1)}
                            aria-label={`Ajouter ${obs.species_name}`}
                            className="size-8 rounded-full border-[0.5px] border-border flex items-center justify-center text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Plus className="size-5" aria-hidden="true" />
                          </button>
                        </div>
                      )}
                      {onRemove && (
                        <button
                          type="button"
                          onClick={() => onRemove(obs)}
                          aria-label={`Retirer ${obs.species_name}`}
                          /* Semantic/Background/Negative #FCCDD5 + icone #9E0F22 */
                          className="size-8 rounded-full bg-[#fccdd5] text-[#9e0f22] flex items-center justify-center hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9e0f22]"
                        >
                          <Trash2 className="size-5" aria-hidden="true" />
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
