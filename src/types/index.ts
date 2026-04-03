export type {
  Profile,
  Comment,
  IdentificationProposal,
  Notebook,
  NotebookObservation,
  Notification,
  Database,
} from './database'
// Observation vit dans data/mock/observations.ts — pas dans le schéma DB
export type { Observation } from '../data/mock/observations'
export * from './data'
