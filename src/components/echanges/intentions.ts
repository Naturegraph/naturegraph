/**
 * Intentions d'echange : source de verite unique
 * =============================================================================
 *
 * Pourquoi demander une intention avant d'ecrire.
 *
 * Sur une communaute jeune, le premier frein n'est pas la mauvaise volonte,
 * c'est le champ vide : on ne sait pas quoi dire, donc on ne dit rien. Proposer
 * une intention debloque, et transforme une pile de "superbe photo" en savoir
 * naturaliste reellement exploitable.
 *
 * C'est aussi ce qui distingue un Echange Naturegraph d'un commentaire de
 * reseau social : ici, aider a identifier une espece a autant de valeur que
 * feliciter, et l'interface le dit.
 *
 * Couleurs : uniquement des tokens du design system, jamais de valeur en dur.
 */

export interface ConfigIntention {
  cle: 'reaction' | 'identification' | 'info_locale' | 'encouragement'
  emoji: string
  /** Libelle du bouton de choix, a l'infinitif : c'est une action. */
  libelle: string
  /** Texte d'invite du champ, adapte a l'intention choisie. */
  invite: string
  /** Pastille affichee sur l'echange publie. `null` = pas de pastille. */
  pastille: string | null
  /** Classes de la pastille (fond + texte), tokens du DS. */
  classes: string
}

/**
 * L'ordre compte : "Reagir" en premier car c'est le cas courant et le defaut.
 * Les trois autres sont des intentions plus engageantes, proposees mais jamais
 * imposees.
 */
export const INTENTIONS: ConfigIntention[] = [
  {
    cle: 'reaction',
    emoji: '💬',
    libelle: 'Réagir',
    invite: 'Partage ce que cette rencontre t’inspire…',
    // Pas de pastille sur le cas par defaut : afficher "Réaction" sur chaque
    // echange n'apporterait rien et alourdirait la lecture.
    pastille: null,
    classes: '',
  },
  {
    cle: 'identification',
    emoji: '🔍',
    libelle: 'Aider à identifier',
    invite: 'Quelle espèce reconnais-tu ? Donne les indices qui t’ont guidé…',
    pastille: 'Piste d’identification',
    classes: 'bg-teal-light/30 text-teal-dark',
  },
  {
    cle: 'info_locale',
    emoji: '📍',
    libelle: 'Info du coin',
    invite: 'Ce que tu sais de ce lieu, de la saison, des habitudes de l’espèce…',
    pastille: 'Info du coin',
    classes: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  },
  {
    cle: 'encouragement',
    emoji: '👏',
    libelle: 'Encourager',
    invite: 'Un mot pour la personne qui a partagé cette observation…',
    pastille: 'Encouragement',
    classes: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
  },
]

export function trouverIntention(cle: string): ConfigIntention {
  return INTENTIONS.find((i) => i.cle === cle) ?? INTENTIONS[0]
}
