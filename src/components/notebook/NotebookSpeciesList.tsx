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

import { Trash2 } from 'lucide-react'
import {
  classDisplayConfig,
  groupObservationsByClass,
  type NotebookObservation,
} from '@/services/notebookService'
import { CountStepper } from '@/components/ui/CountStepper'

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

  // ── Mode COMPACT (feed, post publie) ──────────────────────────────────────
  // Conforme Figma 1171276288 : pills de groupe #E7E9F7, puce 6px #5F5DD8, nom
  // bold + (n) + nom latin #20203D, separateur 0.5px entre groupes.
  if (compact) {
    return (
      <div className="flex flex-col">
        {groups.map(({ vernacularClass, items }, i) => {
          const cfg = classDisplayConfig(vernacularClass)
          return (
            <section
              key={vernacularClass}
              aria-label={cfg.label}
              className={i > 0 ? 'border-t border-border pt-4 mt-4' : ''}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#e7e9f7] text-foreground text-base font-bold leading-none">
                  <span aria-hidden="true">{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {items.map((obs) => (
                  <li key={obs.id} className="flex items-baseline gap-2 text-base leading-normal">
                    <span
                      aria-hidden="true"
                      className="relative top-[-3px] size-1.5 shrink-0 rounded-full bg-[var(--color-action-default)]"
                    />
                    <span className="font-bold text-foreground">
                      {obs.species_name} ({obs.individuals_count})
                    </span>
                    {obs.scientific_name && (
                      <span className="text-[var(--color-text-secondary)]">
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
                        <CountStepper
                          value={obs.individuals_count}
                          onChange={(next) => onCountChange(obs, next - obs.individuals_count)}
                          label={`Nombre de ${obs.species_name}`}
                        />
                      )}
                      {onRemove && (
                        <button
                          type="button"
                          onClick={() => onRemove(obs)}
                          aria-label={`Retirer ${obs.species_name}`}
                          /* Neutre (Nicolas 2026-06-08 : pas de rouge, trop agressif) */
                          className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
