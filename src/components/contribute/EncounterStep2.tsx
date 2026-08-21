/**
 * EncounterStep2 : Étape 2 : Carnet d'observations
 *
 * Permet d'ajouter une ou plusieurs espèces observées à l'observation :
 *   - Recherche par nom commun ou scientifique dans species_master Supabase
 *     (Phase 1 : seed ~200 espèces FR+QC, Phase 2 : expansion ~5 000 via GBIF)
 *   - Chaque entrée comporte un compteur d'individus modifiable
 *   - Option "Je ne connais pas l'espèce" pour une entrée inconnue
 *   - Toggle "Activer l'aide à l'identification" pour les mystères
 *
 * Design inspiré du pattern "Carnet d'observations" Figma.
 * Phase 1 (Nicolas 2026-05-19) : source de données = GBIF + Wikidata (CC0).
 * TAXREF/INPN retiré du produit (cf. PRD_SPECIES_DATABASE.md).
 */

import { useState } from 'react'
import { Trash2, HelpCircle } from 'lucide-react'
import { NOTEBOOKS_ENABLED } from '@/lib/featureFlags'
import { useTranslation } from 'react-i18next'
import type { TaxonomicGroup } from '@/types/database'
import type { Notebook } from '@/services/notebookService'
import { CountStepper } from '@/components/ui/CountStepper'
// Logique pure du carnet d'espèces extraite dans encounterSpeciesLogic.ts (Lot 4).
import { groupConfig, groupObservations } from './encounterSpeciesLogic'
// Barre de recherche d'espèces extraite dans son propre fichier (Lot 4).
import { SpeciesSearchBar } from './SpeciesSearchBar'
import hermineImg from '@/assets/images/hermine-empty-state.png'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ObservationEntry {
  /** Identifiant temporaire local */
  id: string
  species: {
    id: string
    commonName: string
    scientificName: string
    group: TaxonomicGroup
    /** V1.1.0 : 'species' = identification precise, 'family' = fallback famille */
    rank?: 'species' | 'family'
  } | null
  /** true = espèce non déterminée (mystère) */
  isUnknown: boolean
  count: number
  /** Si l'espèce vient d'un carnet importé : id du carnet source. Permet de
   *  remplacer uniquement les espèces du carnet (et garder les ajouts manuels)
   *  quand l'user change de carnet (Nicolas 2026-06-08). Absent = ajout manuel. */
  sourceNotebookId?: string
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

/** Ligne d'une observation dans le carnet */
function ObservationRow({
  entry,
  onCountChange,
  onRemove,
}: {
  entry: ObservationEntry
  onCountChange: (id: string, delta: number) => void
  onRemove: (id: string) => void
}) {
  const { t } = useTranslation()

  return (
    // Ligne alignee sur le carnet (NotebookSpeciesList) pour une coherence
    // d'affichage totale entre Rencontre nature et Carnet d'observations.
    <li className="flex items-center gap-2">
      {/* Identite : avatar emoji 40px (#E7E9F7) + nom + nom latin */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span
          className="size-10 shrink-0 rounded-full bg-primary-light flex items-center justify-center text-lg leading-none"
          aria-hidden="true"
        >
          {entry.isUnknown ? (
            <HelpCircle className="size-5 text-[var(--color-link)]" />
          ) : (
            groupConfig(entry.species?.group ?? null).emoji
          )}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-foreground truncate">
            {entry.isUnknown ? t('contribute.panel.unknownSpecies') : entry.species?.commonName}
            {entry.species?.rank === 'family' && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-primary-light text-[var(--color-link)] align-middle">
                {t('contribute.panel.familyBadge', { defaultValue: 'Famille' })}
              </span>
            )}
          </span>
          <span className="text-xs italic text-[var(--color-text-secondary)] truncate tracking-wide">
            {entry.isUnknown
              ? t('contribute.panel.unknownSubtitle')
              : entry.species?.scientificName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Compteur : saisie directe possible (CountStepper, identique carnet) */}
        <CountStepper
          value={entry.count}
          onChange={(next) => onCountChange(entry.id, next - entry.count)}
          label={t('contribute.panel.individualCount')}
        />

        {/* Supprimer : neutre (pas de rouge, coherence carnet) */}
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          aria-label={`Supprimer ${entry.species?.commonName ?? 'cette observation'}`}
          className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface EncounterStep2Props {
  observations: ObservationEntry[]
  onAdd: (entry: ObservationEntry) => void
  onRemove: (id: string) => void
  onCountChange: (id: string, delta: number) => void
  helpIdentification: boolean
  onHelpIdentificationChange: (v: boolean) => void
  /** Carnets existants selectionnables via le bouton livre. */
  notebooks: Notebook[]
  /** Injecte toutes les especes d'un carnet existant dans les observations. */
  onPickNotebook: (notebookId: string) => Promise<void> | void
}

export function EncounterStep2({
  observations,
  onAdd,
  onRemove,
  onCountChange,
  // helpIdentification + onHelpIdentificationChange : props gardées dans
  // l'interface pour ne pas casser ContributeEncounterForm : le toggle UI a
  // été masqué (workflow aide collaborative reporté en P2).
  helpIdentification: _helpIdentification,
  onHelpIdentificationChange: _onHelpIdentificationChange,
  notebooks,
  onPickNotebook,
}: EncounterStep2Props) {
  const { t } = useTranslation()

  /** Crée une nouvelle entrée espèce et l'ajoute au carnet */
  function handleAddSpecies(species: ObservationEntry['species']) {
    onAdd({
      id: `obs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      species,
      isUnknown: false,
      count: 1,
    })
  }

  const hasObservations = observations.length > 0
  // Masque le placeholder "Aucun résultat" pendant que l user tape une recherche
  // (sinon il s affichait sous les suggestions, paradoxal : feedback Nicolas 2026-05-26).
  const [isSearching, setIsSearching] = useState(false)
  return (
    <div className="flex flex-col gap-4">
      {/* Barre de recherche.
          NG (Nicolas 2026-06-11) : sur le site public (mono-espece), on la
          masque des qu'une espece est ajoutee -> pas de multi-especes/carnet.
          Remplacee par un encart "Bientot" (ci-dessous). En dev/staging :
          comportement multi-especes complet inchange. */}
      {(NOTEBOOKS_ENABLED || !hasObservations) && (
        <SpeciesSearchBar
          onAdd={handleAddSpecies}
          onSearchActiveChange={setIsSearching}
          notebooks={notebooks}
          onPickNotebook={onPickNotebook}
        />
      )}

      {/* État vide : carte blanche bordurée (Figma Frame 4621) :
          hermine + pill menthe "Aucun résultat" + hint en Quicksand Bold.
          Masqué pendant la recherche active pour ne pas dupliquer le feedback. */}
      {!hasObservations && !isSearching && (
        <div className="rounded-xl border-[0.5px] border-border bg-background flex flex-col items-center overflow-hidden">
          <img src={hermineImg} alt="" width={230} height={128} className="mt-6" loading="lazy" />
          <div className="flex flex-col items-center gap-3 p-6 w-full">
            <span className="inline-flex items-center justify-center h-8 px-3 rounded-full bg-primary-light text-[var(--color-link)] text-sm font-body font-medium leading-none">
              {t('contribute.panel.noResultsBadge', { defaultValue: 'Aucun résultat' })}
            </span>
            <p className="font-title font-bold text-lg text-foreground text-center">
              {t('contribute.panel.emptyHint')}
            </p>
          </div>
        </div>
      )}

      {/* Carnet d'observations : groupe par classe (pills) + lignes, aligne
          sur NotebookSpeciesList pour une coherence d'affichage totale. */}
      {hasObservations && (
        <div className="flex flex-col gap-4">
          <p className="font-body text-base text-foreground">
            {t('contribute.panel.notebook')} ({observations.length})
          </p>
          {groupObservations(observations).map((grp) => (
            <section key={grp.key} aria-label={grp.label} className="flex flex-col gap-4">
              {/* Pill de groupe : token theme-aware (avant : bg #E7E9F7 en dur +
                  text-foreground = pilule blanche a texte invisible en dark,
                  retour Nicolas 2026-07-30). Meme combo prouve que les autres
                  pilules : bg-primary-light + texte --color-link. */}
              <span className="inline-flex items-center self-start h-8 px-3 rounded-full bg-primary-light text-[var(--color-link)] text-sm font-bold">
                {grp.label}
              </span>
              <ul className="flex flex-col gap-4">
                {grp.items.map((entry) => (
                  <ObservationRow
                    key={entry.id}
                    entry={entry}
                    onCountChange={onCountChange}
                    onRemove={onRemove}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Bouton "Ajouter une nouvelle observation" RETIRE (Nicolas 2026-06-08) :
          redondant avec la barre de recherche, toujours accessible en haut. */}

      {/* NG (Nicolas 2026-06-11) : sur le site public, mono-espece -> la barre de
          recherche est masquee des qu'une espece est ajoutee (cf. plus haut).
          Pas d'encart "Bientot" (eviter les faux espoirs, decision Nicolas). */}

      {/* Toggle "Activer l'aide à l'identification" : masqué pour le moment,
          sera retravaillé plus tard (workflow d'aide collaborative en P2).
          Logique gardée côté state (helpIdentification + handlers) pour ne
          pas casser ContributeEncounterForm. JSX archivé dans le bloc JSDoc
          ci-dessous : il suffira de le ré-introduire le jour venu.

          @example
          <label htmlFor={toggleId} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-background cursor-pointer">
            <span className="text-sm font-medium text-foreground">
              {t('contribute.panel.helpIdentification')}
            </span>
            <input id={toggleId} type="checkbox" checked={helpIdentification} onChange={(e) => onHelpIdentificationChange(e.target.checked)} role="switch" className="sr-only peer" />
            <div className={['relative w-10 h-5 rounded-full', helpIdentification ? 'bg-primary' : 'bg-muted'].join(' ')}>
              <span className={['absolute top-0.5 size-4 rounded-full bg-white shadow', helpIdentification ? 'translate-x-5' : 'translate-x-0.5'].join(' ')} />
            </div>
          </label>
       */}

      {/* Attribution sources (GBIF + Wikidata) affichée dans le footer
          de ContributeEncounterForm (sous les boutons Annuler/Suivant)
          : hiérarchie de l'info claire + visible en permanence. */}
    </div>
  )
}
