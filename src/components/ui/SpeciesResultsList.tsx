/**
 * SpeciesResultsList : liste de resultats d'une recherche d'espece
 * =============================================================================
 *
 * SOURCE UNIQUE du rendu des resultats de recherche d'espece (demande Nicolas
 * 2026-07-23 : "on doit avoir le meme visuel que la recherche d'especes partout
 * dans la plateforme").
 *
 * Le rendu etait jusqu'ici recopie dans `EncounterStep2` et `SearchPanel`, avec
 * deux definitions locales de `SpeciesCategoryIcon` dont l'une porte le
 * commentaire "pour rester DRY avec l'autre" : preuve que la duplication ne
 * tient pas dans le temps. Ce composant existe pour que la troisieme
 * utilisation, le fil d'Echanges, ne cree pas une troisieme divergence.
 *
 * TODO (hors perimetre NG-049) : faire pointer `EncounterStep2` et
 * `SearchPanel` sur ce composant, puis supprimer leurs copies locales.
 *
 * Rendu volontairement INLINE et non en survol : la liste pousse le contenu
 * vers le bas au lieu de le recouvrir. Un menu flottant masque ce qu'on vient
 * de taper sur un ecran etroit, et disparait au moindre defilement.
 */

import type { TaxonomyHit } from '@/services/searchService'
import { TAXONOMIC_GROUP_CONFIG } from '@/constants/commonSpecies'
import { highlightMatch } from '@/utils/highlightMatch'

/** Emoji + libelle FR d'un groupe. Repli "Autre" si inconnu. */
export function groupConfig(group: string | null): { emoji: string; label: string } {
  const key = (group ?? 'other').toLowerCase()
  return TAXONOMIC_GROUP_CONFIG[key] ?? TAXONOMIC_GROUP_CONFIG.other
}

/** Mapping classe iNaturalist vers groupe taxonomique de l'interface. */
export const CLASSE_VERS_GROUPE: Record<string, string> = {
  Aves: 'birds',
  Mammalia: 'mammals',
  Insecta: 'insects',
  Amphibia: 'amphibians',
  Reptilia: 'reptiles',
  Actinopterygii: 'fish',
  Arachnida: 'arachnids',
  Mollusca: 'mollusks',
}

/** Icone categorie : emoji du groupe dans un cercle lavande. */
export function SpeciesCategoryIcon({ group }: { group: string | null }) {
  return (
    <div
      className="size-10 shrink-0 rounded-full bg-primary-light flex items-center justify-center text-lg leading-none"
      aria-hidden="true"
    >
      {groupConfig(group).emoji}
    </div>
  )
}

interface SpeciesResultsListProps {
  resultats: TaxonomyHit[]
  /** Terme saisi, pour mettre en gras la portion qui correspond. */
  requete: string
  onChoisir: (hit: TaxonomyHit) => void
  /** Recherche en cours et aucun resultat encore affiche. */
  enChargement?: boolean
  /** Recherche terminee sans resultat. */
  vide?: boolean
  id?: string
}

export function SpeciesResultsList({
  resultats,
  requete,
  onChoisir,
  enChargement = false,
  vide = false,
  id,
}: SpeciesResultsListProps) {
  return (
    <div
      id={id}
      role="listbox"
      aria-label="Espèces trouvées"
      className="overflow-hidden rounded-2xl border border-border bg-background"
    >
      {enChargement && resultats.length === 0 && (
        <p className="px-5 py-6 text-center text-sm text-muted-foreground">Recherche en cours…</p>
      )}

      {resultats.map((hit, i) => {
        const groupe = hit.class ? (CLASSE_VERS_GROUPE[hit.class] ?? null) : null
        const nomCommun = hit.common_name_fr ?? hit.scientific_name
        return (
          <div key={hit.taxonomy_node_id} role="option" aria-selected={false}>
            {i > 0 && <div className="mx-5 h-px bg-border" aria-hidden="true" />}
            <button
              type="button"
              onClick={() => onChoisir(hit)}
              className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-primary-light/20 focus-visible:bg-primary-light/20 focus-visible:outline-none"
            >
              <SpeciesCategoryIcon group={groupe} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {highlightMatch(nomCommun, requete)}
                </p>
                <p className="truncate text-xs italic text-muted-foreground">
                  {highlightMatch(hit.scientific_name, requete)}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {groupConfig(groupe).label}
              </span>
            </button>
          </div>
        )
      })}

      {vide && (
        <div className="flex flex-col items-center gap-2 px-5 py-6 text-center">
          <p className="text-sm font-semibold text-foreground">
            Aucune espèce trouvée pour «&nbsp;{requete}&nbsp;»
          </p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Vérifie l’orthographe, ou essaie le nom scientifique.
          </p>
        </div>
      )}
    </div>
  )
}
