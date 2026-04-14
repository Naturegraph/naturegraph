/**
 * observationsMapUtils — Types et helpers pour ObservationsMap
 * =============================================================
 * Séparé du composant pour éviter les conflits React Fast Refresh
 * (une fichier ne peut exporter que des composants React pour le HMR).
 */

// ─── Types ────────────────────────────────────────────────────

export interface MapObservation {
  id: string
  latitude: number
  longitude: number
  /** Groupe taxonomique pour la couleur du marker */
  taxonomicGroup: string | null
  /** Nom de l'espèce (affiché dans le popup) */
  speciesName: string | null
  /** Description courte */
  description: string
  /** Nom d'utilisateur de l'auteur */
  authorUsername: string
  /** Date d'observation */
  encounterDate: string
  /** true si les coordonnées ont été floutées côté serveur */
  locationHidden: boolean
}

// ─── Helper : PostFeedItem → MapObservation ──────────────────

/**
 * Convertit un PostFeedItem en MapObservation pour la carte.
 * Retourne null si le post n'a pas de coordonnées GPS.
 *
 * @param post - Post avec champs latitude/longitude (optionnels)
 */
export function postToMapObservation(post: {
  id: string
  latitude: number | null
  longitude: number | null
  taxonomic_group: string | null
  species_name: string | null
  description: string
  location_hidden: boolean
  encounter_date: string
  author: { username: string }
}): MapObservation | null {
  if (!post.latitude || !post.longitude) return null

  return {
    id: post.id,
    latitude: post.latitude,
    longitude: post.longitude,
    taxonomicGroup: post.taxonomic_group,
    speciesName: post.species_name,
    description: post.description,
    authorUsername: post.author.username,
    encounterDate: post.encounter_date,
    locationHidden: post.location_hidden,
  }
}
