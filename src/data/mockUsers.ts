/**
 * Mock users — profils fictifs pour dev/tests
 * Utiliser uniquement en l'absence de données Supabase.
 */

export interface MockUser {
  id: string
  username: string
  avatar: string
  banner: string
  badges: string[]
  region: string
  stats: {
    observations: number
    species: number
    streak: number
  }
  weekProgress: {
    current: number
    goal: number
  }
}

export const mockUsers: MockUser[] = [
  {
    id: '1',
    username: 'Oiseaux_et_Nature',
    avatar:
      'https://images.unsplash.com/photo-1569171133563-f562ae163dc1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    banner:
      'https://images.unsplash.com/photo-1689094195667-3dae89dd11fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    badges: ['Oiseaux', 'Mammifères'],
    region: 'Bretagne',
    stats: { observations: 127, species: 48, streak: 14 },
    weekProgress: { current: 20, goal: 24 },
  },
  {
    id: '2',
    username: 'Marie_Nature',
    avatar:
      'https://images.unsplash.com/photo-1644313720910-9a2520bbd28f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    banner:
      'https://images.unsplash.com/photo-1689094195667-3dae89dd11fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    badges: ['Oiseaux', 'Reptiles'],
    region: 'Bretagne',
    stats: { observations: 203, species: 67, streak: 28 },
    weekProgress: { current: 18, goal: 20 },
  },
  {
    id: '3',
    username: 'Thomas.Wildlife',
    avatar:
      'https://images.unsplash.com/photo-1726167400703-240b34c4bc17?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    banner:
      'https://images.unsplash.com/photo-1665410618173-2ffade789974?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    badges: ['Insectes', 'Oiseaux'],
    region: 'Normandie',
    stats: { observations: 89, species: 34, streak: 7 },
    weekProgress: { current: 12, goal: 15 },
  },
  {
    id: '4',
    username: 'Lucas_Ornitho',
    avatar:
      'https://images.unsplash.com/photo-1671138552270-207fbe2a498d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    banner:
      'https://images.unsplash.com/photo-1689094195667-3dae89dd11fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    badges: ['Oiseaux'],
    region: 'Île-de-France',
    stats: { observations: 156, species: 52, streak: 21 },
    weekProgress: { current: 22, goal: 25 },
  },
  {
    id: '5',
    username: 'Sophie_Biodiv',
    avatar:
      'https://images.unsplash.com/photo-1600174097100-3f347cf15996?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    banner:
      'https://images.unsplash.com/photo-1689094195667-3dae89dd11fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    badges: ['Mammifères', 'Reptiles'],
    region: 'Pays de la Loire',
    stats: { observations: 145, species: 41, streak: 19 },
    weekProgress: { current: 15, goal: 18 },
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Shuffle déterministe via LCG — seed identique → même ordre */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s, 1664525) + 1013904223
    const j = Math.abs(s) % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Rotation quotidienne déterministe — change chaque jour, stable dans la journée */
export function getDailyRotation(count: number, excludeId?: string): MockUser[] {
  const pool = excludeId ? mockUsers.filter((u) => u.id !== excludeId) : mockUsers
  const seed = new Date()
    .toDateString()
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return seededShuffle(pool, seed).slice(0, count)
}

/** Décode des coordonnées GPS en région française (approximatif — usage mock) */
function getRegionFromCoords(lat: number, lon: number): string {
  if (lat >= 47.0 && lat <= 49.0 && lon >= -5.5 && lon <= -1.0) return 'Bretagne'
  if (lat >= 48.5 && lat <= 50.5 && lon >= -2.0 && lon <= 2.0) return 'Normandie'
  if (lat >= 48.5 && lat <= 49.2 && lon >= 1.5 && lon <= 3.5) return 'Île-de-France'
  if (lat >= 46.5 && lat <= 48.0 && lon >= -3.0 && lon <= 1.0) return 'Pays de la Loire'
  if (lat >= 42.0 && lat <= 44.5 && lon >= 0.0 && lon <= 5.0) return 'Occitanie'
  return ''
}

/**
 * Utilisateurs populaires dans le territoire de l'utilisateur.
 * Retourne aussi le label de région pour l'affichage.
 * En l'absence de correspondance, retourne la rotation quotidienne.
 */
export function getTerritoryUsers(
  lat: number,
  lon: number,
  count: number,
  excludeId?: string,
): { users: MockUser[]; region: string } {
  const region = getRegionFromCoords(lat, lon)
  const pool = excludeId ? mockUsers.filter((u) => u.id !== excludeId) : mockUsers
  const inRegion = pool.filter((u) => u.region === region)

  if (region && inRegion.length >= count) {
    return { users: inRegion.slice(0, count), region }
  }

  // Complète avec la rotation du jour si pas assez dans la région
  const seed = new Date()
    .toDateString()
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const others = seededShuffle(
    pool.filter((u) => !inRegion.includes(u)),
    seed,
  )
  return {
    users: [...inRegion, ...others].slice(0, count),
    region: region || 'France',
  }
}

/** Correspondance Interest (clé DB) → label français affiché */
export const INTEREST_LABELS: Record<string, string> = {
  birds: 'Oiseaux',
  mammals: 'Mammifères',
  insects: 'Insectes',
  reptiles: 'Reptiles',
  amphibians: 'Amphibiens',
  arachnids: 'Arachnides',
  mollusks: 'Mollusques',
  fish: 'Poissons',
  plants: 'Plantes',
  other: 'Autres',
}

/**
 * Suggestions basées sur les centres d'intérêts.
 * Trie les utilisateurs par nombre d'intérêts communs (descendant).
 * Fallback sur la rotation quotidienne si l'utilisateur n'a pas d'intérêts.
 */
export function getSuggestedUsersByInterests(
  interestLabels: string[],
  count: number,
  excludeId?: string,
): MockUser[] {
  const pool = excludeId ? mockUsers.filter((u) => u.id !== excludeId) : mockUsers
  if (!interestLabels.length) return getDailyRotation(count, excludeId)

  const scored = pool
    .map((u) => ({ user: u, score: u.badges.filter((b) => interestLabels.includes(b)).length }))
    .sort((a, b) => b.score - a.score)

  return scored.map((s) => s.user).slice(0, count)
}

/** Retourne n utilisateurs aléatoires en excluant l'utilisateur courant */
export function getRandomMockUsers(count: number, excludeId?: string): MockUser[] {
  const pool = excludeId ? mockUsers.filter((u) => u.id !== excludeId) : mockUsers
  return pool.slice(0, count)
}
