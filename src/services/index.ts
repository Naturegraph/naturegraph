/**
 * services/index.ts — Point d'entrée des services Naturegraph
 *
 * Tous les services exportent des fonctions pures qui abstraient Supabase.
 * Les composants importent depuis '@/services' — jamais depuis @/lib/supabase directement.
 *
 * Structure :
 *   profileService  — profiles, follows, avatars
 *   postService     — posts, feed, réactions, commentaires
 *
 * TODO [BACKEND] — Services à créer lors du branchement Supabase :
 *
 *   statsService          — stats globales plateforme (Impact card) + stats utilisateur
 *                           (observations, espèces uniques, streak)
 *                           Ref: FeedSection, StatsSidebar, ProfileSidebar
 *
 *   notificationService   — notifications en temps réel (Supabase Realtime)
 *                           channel: 'notifications:user_id=eq.{id}'
 *                           Ref: NotificationsPanel, HomeNavbar (badge unread)
 *
 *   mediaService          — upload photos/vidéos (Supabase Storage, bucket 'post-media')
 *                           Ref: ContributeModal → formulaires contribution
 *
 *   identificationService — propositions d'identification collaborative
 *                           table: `identifications` (post_id, proposer_id, species, status)
 *                           Ref: NotificationsPanel (type 'identification')
 *
 *   notebookService       — carnets d'observations partagés
 *                           table: `notebooks` + `notebook_members`
 *                           Ref: NotificationsPanel (type 'notebook')
 *
 *   searchService         — recherche espèces dans species_master (GBIF + Wikidata,
 *                           Phase 1). Voir PRD_SPECIES_DATABASE.md.
 *                           Ref: SearchPanel, EncounterStep2 (autocomplete espèces).
 */

export * from './profileService'
export * from './postService'
export * from './notificationService'
export * from './mediaService'
export * from './settingsService'
export * from './searchService'
export * from './notebookService'
export * from './identificationService'
export * from './statsService'
