/**
 * observationDate — Helpers date d'observation (anti-decalage timezone)
 * =====================================================================
 *
 * V1.1.4 NG-027 round 12 (Nicolas 2026-06-03) : correction du bug "date -1".
 *
 * Probleme : la colonne `posts.encounter_date` est de type `timestamptz`.
 * Une date d'observation est pourtant une DATE pure (pas d'heure). Quand on
 * envoie "2026-04-08" a une colonne timestamptz, Postgres stocke
 * "2026-04-08T00:00:00+00" (minuit UTC). A la lecture/affichage en heure
 * locale negative (ex Quebec UTC-5), `new Date(...)` recule d'un jour ->
 * l'utilisateur voit le 07/04 au lieu du 08/04.
 *
 * Solution sans migration DB : on ancre la date a MIDI UTC a l'ecriture.
 * Midi UTC reste le meme jour calendaire pour tous les fuseaux habites
 * (UTC-12 a UTC+14), donc plus aucun decalage a l'affichage.
 *
 * A l'affichage, on lit uniquement la partie calendaire (YYYY-MM-DD) pour ne
 * jamais dependre du fuseau du navigateur.
 */

/**
 * Convertit une date saisie "YYYY-MM-DD" (input type=date) en timestamp
 * ancre a midi UTC, pret a etre stocke dans la colonne timestamptz sans
 * risque de decalage de jour.
 *
 * @example toStorageTimestamp('2026-04-08') -> '2026-04-08T12:00:00.000Z'
 */
export function toStorageTimestamp(dateOnly: string | null | undefined): string | undefined {
  if (!dateOnly) return undefined
  // On ne garde que la partie calendaire au cas ou une valeur complete
  // arriverait (idempotent).
  const day = dateOnly.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined
  return `${day}T12:00:00.000Z`
}

/**
 * Extrait la partie calendaire "YYYY-MM-DD" d'une valeur DB (timestamptz ou
 * date), pour pre-remplir un input type=date sans decalage. Robuste : prend
 * les 10 premiers caracteres de la string ISO (jamais de `new Date`).
 */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ''
  const day = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : ''
}

/**
 * Formate une date d'observation pour l'affichage (ex "08/04/2026"), sans
 * jamais dependre du fuseau du navigateur : on parse la partie calendaire et
 * on reconstruit l'ordre jour/mois/annee a la main.
 */
export function formatObservationDate(value: string | null | undefined): string {
  const day = toDateInputValue(value)
  if (!day) return ''
  const [y, m, d] = day.split('-')
  return `${d}/${m}/${y}`
}
