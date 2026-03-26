/**
 * Données mockées pour les espèces
 * Structure préparée pour les futures intégrations backend
 */

export interface Species {
  id: string
  scientificName: string
  commonNameFr: string
  commonNameEn: string
  category: SpeciesCategory
  conservationStatus: ConservationStatus
  description: string
  habitat: string
  imageUrl?: string
  observations: number
  discoveryDate?: string
}

export type SpeciesCategory =
  | 'bird'
  | 'mammal'
  | 'reptile'
  | 'amphibian'
  | 'fish'
  | 'insect'
  | 'plant'
  | 'fungus'
  | 'other'

export type ConservationStatus =
  | 'extinct'
  | 'extinct_wild'
  | 'critically_endangered'
  | 'endangered'
  | 'vulnerable'
  | 'near_threatened'
  | 'least_concern'
  | 'data_deficient'
  | 'not_evaluated'

/**
 * Données mockées d'espèces
 * À utiliser pour les tests et le développement frontend
 */
export const mockSpecies: Species[] = [
  {
    id: '1',
    scientificName: 'Parus major',
    commonNameFr: 'Mésange charbonnière',
    commonNameEn: 'Great Tit',
    category: 'bird',
    conservationStatus: 'least_concern',
    description:
      'Petit passereau commun en Europe, reconnaissable à sa tête noire et ses joues blanches.',
    habitat: 'Forêts, parcs et jardins',
    observations: 1523,
  },
  {
    id: '2',
    scientificName: 'Cervus elaphus',
    commonNameFr: 'Cerf élaphe',
    commonNameEn: 'Red Deer',
    category: 'mammal',
    conservationStatus: 'least_concern',
    description: "Grand mammifère herbivore, le plus grand cervidé d'Europe.",
    habitat: 'Forêts tempérées et prairies',
    observations: 342,
  },
  {
    id: '3',
    scientificName: 'Amanita muscaria',
    commonNameFr: 'Amanite tue-mouches',
    commonNameEn: 'Fly Agaric',
    category: 'fungus',
    conservationStatus: 'not_evaluated',
    description: 'Champignon toxique emblématique avec son chapeau rouge à points blancs.',
    habitat: 'Forêts de conifères et feuillus',
    observations: 892,
  },
]

/**
 * Fonction utilitaire pour simuler un appel API
 */
export async function fetchSpecies(): Promise<Species[]> {
  // Simulation d'un délai réseau
  await new Promise((resolve) => setTimeout(resolve, 500))
  return mockSpecies
}

/**
 * Fonction utilitaire pour récupérer une espèce par son ID
 */
export async function fetchSpeciesById(id: string): Promise<Species | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return mockSpecies.find((species) => species.id === id)
}
