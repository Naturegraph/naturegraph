/**
 * services/index.ts : Point d'entrée des services Naturegraph
 *
 * Tous les services exportent des fonctions pures qui abstraient Supabase.
 * Les composants importent depuis '@/services' : jamais depuis @/lib/supabase directement.
 *
 * Services ré-exportés ici (barrel) : profile, post, notification, media, settings,
 * search, notebook, identification, stats. D'autres services du dossier s'importent
 * directement (echangeService, blockService, reportService, savedPostsService, etc.).
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
