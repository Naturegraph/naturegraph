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

export * from './mockPosts'
export * from './mockUsers'
export * from './species'
export * from './observations'
export * from './media'
// Note: mock/posts.ts et mock/users.ts ont des exports en conflit avec mockPosts/mockUsers
// Les importer directement si besoin : @/data/mock/posts ou @/data/mock/users
