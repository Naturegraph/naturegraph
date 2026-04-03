/**
 * data/mock — Barrel export de toutes les données mockées
 *
 * Regroupement des données de développement fictives :
 *   mockPosts  — Publications avec images, réactions, auteurs
 *   mockUsers  — Profils utilisateurs, intérêts, suggestions
 *   mock/posts — Types NatureEncounter, NatureInstant (schéma DB)
 *   mock/users — Profils DB-compatibles (25 profils fictifs)
 *   species    — Catalogue d'espèces fictives
 *   observations — Observations nature mockées
 *   media      — Assets médias mockés
 */

// Les deux sources de mock data utilisées par les composants UI
export * from './mockPosts'
export * from './mockUsers'

// Les autres fichiers (posts, users, observations, species, media) ont des noms
// qui entrent en conflit (mockUsers, fetchUserById…) — importer directement :
//   @/data/mock/posts  @/data/mock/users  @/data/mock/observations
//   @/data/mock/species  @/data/mock/media
