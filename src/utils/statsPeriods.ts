/**
 * statsPeriods : source de verite UNIQUE des periodes des statistiques.
 * ============================================================================
 *
 * Toutes les stats (Impact + Tendances) calculent leur fenetre temporelle ici,
 * pour eviter d'avoir plusieurs logiques divergentes dans l'app.
 *
 * Quatre periodes, calculees dynamiquement a partir de "maintenant" :
 *
 *   | Periode        | Debut                       | Fin         | Type       |
 *   | -------------- | --------------------------- | ----------- | ---------- |
 *   | last7Days      | Aujourd'hui - 6 jours (00h) | Maintenant  | Glissante  |
 *   | currentMonth   | 1er jour du mois (00h)       | Maintenant  | Calendaire |
 *   | currentQuarter | 1er jour du trimestre (00h)  | Maintenant  | Calendaire |
 *   | currentYear    | 1er janvier (00h)           | Maintenant  | Calendaire |
 *
 * Trimestres CALENDAIRES (pas 3 mois glissants) :
 *   T1 janv-mars, T2 avril-juin, T3 juillet-sept, T4 oct-dec.
 *
 * FUSEAU HORAIRE : les bornes calendaires sont calculees en **America/Toronto**
 * (Quebec), et non selon le fuseau du navigateur. Raison : ces stats sont
 * GLOBALES (memes chiffres pour tous les utilisateurs), donc les frontieres de
 * mois/trimestre/annee doivent etre identiques quel que soit l'endroit d'ou on
 * consulte (un utilisateur en France et un au Quebec voient le meme "Ce mois-ci").
 * C'est aussi coherent avec la convention KPI du projet (semaines Quebec).
 *
 * Pourquoi pas "N derniers jours en millisecondes" pour le calendaire : un mois
 * ne fait pas toujours 30 jours, un trimestre pas toujours 90, une annee pas
 * toujours 365 (bissextiles). On raisonne donc sur les composantes calendaires
 * reelles (annee/mois/jour) via `Intl`, seul `last7Days` etant une vraie fenetre
 * glissante. Les transitions jour/mois/trimestre/annee sont donc automatiques.
 *
 * Testabilite : chaque fonction accepte un `now` injectable (defaut = `new Date()`)
 * pour simuler n'importe quelle date (cf. statsPeriods.test.ts).
 */

/** Identifiants de periode (source de verite, utilises partout dans les stats). */
export type StatsPeriod = 'last7Days' | 'currentMonth' | 'currentQuarter' | 'currentYear'

/** Bornes d'une periode, en ISO 8601 (UTC), pretes pour les requetes Supabase. */
export interface StatsPeriodBounds {
  /** Debut de la periode courante. La periode affichee est `[current, now]`. */
  current: string
  /**
   * Debut de la periode PRECEDENTE de MEME TYPE (mois/trimestre/annee precedent,
   * ou bloc de 7 jours precedent), pour un trend % "a periode comparable".
   */
  previousStart: string
  /**
   * Fin de la fenetre precedente = `previousStart` + la duree DEJA ECOULEE de la
   * periode courante. On compare ainsi "ce mois-ci au jour J" a "le mois dernier
   * au jour J" (meme point d'avancement), et non a un mois complet. La fenetre
   * precedente est donc `[previousStart, previousEnd)`.
   */
  previousEnd: string
}

/** Fuseau de reference du projet (Quebec). */
const TZ = 'America/Toronto'

/**
 * Composantes calendaires (annee/mois/jour) d'un instant, LUES dans le fuseau TZ.
 * Ex : un instant a 01:30 UTC le 1er aout est encore le 31 juillet a Toronto.
 */
function ymdInTZ(instant: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

/**
 * Decalage (en ms) entre l'heure murale TZ et UTC a un instant donne.
 * = (heure lue a Toronto interpretee comme UTC) - (instant UTC reel).
 * Positif ou negatif selon la saison (EST -5h, EDT -4h). Sert a convertir une
 * heure murale Toronto en instant UTC exact, DST comprise.
 */
function tzOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value)
  // `hour` peut valoir 24 a minuit selon l'environnement : on normalise a 0.
  const hour = get('hour') % 24
  const asIfUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second'),
  )
  return asIfUTC - instant.getTime()
}

/**
 * Instant UTC (ISO) correspondant a minuit (00:00:00) de la date calendaire
 * (year, month, day) DANS le fuseau TZ. `month` est 1-base (1 = janvier).
 *
 * Methode : on part de "minuit heure murale interpretee comme UTC", puis on
 * corrige avec l'offset TZ reel a cet instant. Une seule correction suffit :
 * l'offset ne change qu'aux transitions DST (2h du matin), jamais a minuit.
 */
function zonedMidnightISO(year: number, month: number, day: number): string {
  const wallClockAsUTC = Date.UTC(year, month - 1, day, 0, 0, 0)
  const offset = tzOffsetMs(new Date(wallClockAsUTC))
  return new Date(wallClockAsUTC - offset).toISOString()
}

/**
 * Debut de la periode courante (ISO UTC), calcule dans le fuseau TZ.
 * Exporte pour les tests ; le reste de l'app passe par getStatsPeriodBounds.
 */
export function getPeriodStartISO(period: StatsPeriod, now: Date = new Date()): string {
  const { year, month, day } = ymdInTZ(now)

  switch (period) {
    case 'last7Days': {
      // 7 derniers jours GLISSANTS : de minuit (today - 6) jusqu'a maintenant.
      // Date.UTC gere le passage de mois/annee quand day-6 <= 0 (ex: 3 - 6 = -3).
      const d = new Date(Date.UTC(year, month - 1, day - 6))
      return zonedMidnightISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
    }
    case 'currentMonth':
      // 1er jour du mois calendaire en cours.
      return zonedMidnightISO(year, month, 1)
    case 'currentQuarter': {
      // 1er jour du trimestre calendaire : T1=janv, T2=avril, T3=juillet, T4=oct.
      const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1
      return zonedMidnightISO(year, quarterStartMonth, 1)
    }
    case 'currentYear':
      // 1er janvier de l'annee en cours.
      return zonedMidnightISO(year, 1, 1)
  }
}

/**
 * Debut de la periode PRECEDENTE de meme type (ISO UTC), calcule dans le fuseau TZ :
 * mois precedent, trimestre precedent, annee precedente, ou bloc de 7 jours precedent.
 * Le passage d'annee (janvier -> decembre annee-1, T1 -> T4 annee-1) est gere par
 * l'arithmetique calendaire de `Date.UTC` (mois negatif -> annee precedente).
 * Exporte pour les tests.
 */
export function getPreviousPeriodStartISO(period: StatsPeriod, now: Date = new Date()): string {
  const { year, month, day } = ymdInTZ(now)

  switch (period) {
    case 'last7Days': {
      // Bloc des 7 jours PRECEDENTS : minuit (today - 13) = 7 jours avant (today - 6).
      const d = new Date(Date.UTC(year, month - 1, day - 13))
      return zonedMidnightISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
    }
    case 'currentMonth': {
      // 1er jour du mois precedent.
      const d = new Date(Date.UTC(year, month - 2, 1))
      return zonedMidnightISO(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
    }
    case 'currentQuarter': {
      const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1
      // -3 mois = 1er jour du trimestre precedent.
      const d = new Date(Date.UTC(year, quarterStartMonth - 1 - 3, 1))
      return zonedMidnightISO(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
    }
    case 'currentYear':
      // 1er janvier de l'annee precedente.
      return zonedMidnightISO(year - 1, 1, 1)
  }
}

/**
 * Bornes { current, previousStart, previousEnd } d'une periode, pour les stats.
 *
 * - `current` = debut de la periode courante ; la periode affichee est `[current, now]`.
 * - `previousStart` = debut de la periode PRECEDENTE de meme type (mois/trimestre/
 *   annee precedent, ou bloc 7j precedent).
 * - `previousEnd` = `previousStart` + duree deja ecoulee de la periode courante :
 *   on compare donc "au meme point d'avancement" (ex : "ce mois-ci au jour 2" vs
 *   "le mois dernier a son jour 2"), et non a une periode complete. Fenetre
 *   precedente = `[previousStart, previousEnd)`.
 *
 * @param period Periode demandee.
 * @param now Instant de reference (injectable pour les tests).
 */
export function getStatsPeriodBounds(
  period: StatsPeriod,
  now: Date = new Date(),
): StatsPeriodBounds {
  const currentISO = getPeriodStartISO(period, now)
  const currentMs = new Date(currentISO).getTime()
  const elapsed = now.getTime() - currentMs // duree deja ecoulee de la periode courante

  const previousStartISO = getPreviousPeriodStartISO(period, now)
  const previousStartMs = new Date(previousStartISO).getTime()
  // Meme portion ecoulee, projetee dans la periode precedente.
  const previousEndISO = new Date(previousStartMs + elapsed).toISOString()

  return {
    current: currentISO,
    previousStart: previousStartISO,
    previousEnd: previousEndISO,
  }
}
